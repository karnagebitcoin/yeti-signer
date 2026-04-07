import { nip44 as legacyNip44 } from 'nostr-tools';
import { nip44 as specNip44 } from 'nostr-tools-v2';

const hexToBytes = (hex: string): Uint8Array => {
	const normalized = hex.trim();
	if (normalized.length % 2 !== 0) throw new Error('Hex input must have an even length');

	const bytes = new Uint8Array(normalized.length / 2);
	for (let i = 0; i < normalized.length; i += 2) {
		bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
	}
	return bytes;
};

export const getNip44ConversationKey = (privateKey: string, peerPubkey: string): Uint8Array =>
	specNip44.getConversationKey(hexToBytes(privateKey), peerPubkey);

export const encryptNip44 = (
	privateKey: string,
	peerPubkey: string,
	plaintext: string,
	nonce?: Uint8Array
): string => {
	const conversationKey = getNip44ConversationKey(privateKey, peerPubkey);
	return specNip44.v2.encrypt(plaintext, conversationKey, nonce);
};

export const decryptNip44 = (
	privateKey: string,
	peerPubkey: string,
	ciphertext: string
): string => {
	const conversationKey = getNip44ConversationKey(privateKey, peerPubkey);
	return specNip44.v2.decrypt(ciphertext, conversationKey);
};

export const decryptNip44Compat = (
	privateKey: string,
	peerPubkey: string,
	ciphertext: string
): string => {
	try {
		return decryptNip44(privateKey, peerPubkey, ciphertext);
	} catch (specError) {
		try {
			const legacyConversationKey = legacyNip44.utils.v2.getConversationKey(
				privateKey,
				peerPubkey
			);
			return legacyNip44.decrypt(legacyConversationKey, ciphertext);
		} catch {
			throw specError;
		}
	}
};
