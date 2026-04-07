// @vitest-environment node

import { describe, expect, it } from 'vitest';
import { getPublicKey, nip44 as legacyNip44 } from 'nostr-tools';

import {
	decryptNip44,
	decryptNip44Compat,
	encryptNip44,
	getNip44ConversationKey
} from './nip44-utils';

const hexToBytes = (hex: string): Uint8Array => {
	const normalized = hex.trim();
	if (normalized.length % 2 !== 0) throw new Error('Hex input must have an even length');

	const bytes = new Uint8Array(normalized.length / 2);
	for (let i = 0; i < normalized.length; i += 2) {
		bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
	}
	return bytes;
};

const bytesToHex = (bytes: Uint8Array): string =>
	Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');

describe('nip44-utils', () => {
	it('matches the official NIP-44 v2 test vector', () => {
		const sec1 = '0000000000000000000000000000000000000000000000000000000000000001';
		const sec2 = '0000000000000000000000000000000000000000000000000000000000000002';
		const pub1 = getPublicKey(sec1);
		const pub2 = getPublicKey(sec2);
		const nonce = hexToBytes(
			'0000000000000000000000000000000000000000000000000000000000000001'
		);
		const expectedConversationKey =
			'c41c775356fd92eadc63ff5a0dc1da211b268cbea22316767095b2871ea1412d';
		const expectedPayload =
			'AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABee0G5VSK0/9YypIObAtDKfYEAjD35uVkHyB0F4DwrcNaCXlCWZKaArsGrY6M9wnuTMxWfp1RTN9Xga8no+kF5Vsb';

		expect(bytesToHex(getNip44ConversationKey(sec1, pub2))).toBe(expectedConversationKey);
		expect(encryptNip44(sec1, pub2, 'a', nonce)).toBe(expectedPayload);
		expect(decryptNip44(sec2, pub1, expectedPayload)).toBe('a');
	});

	it('can still decrypt legacy Yeti NIP-44 ciphertext as a fallback', () => {
		const sec1 = '1111111111111111111111111111111111111111111111111111111111111111';
		const sec2 = '2222222222222222222222222222222222222222222222222222222222222222';
		const pub1 = getPublicKey(sec1);
		const pub2 = getPublicKey(sec2);
		const legacyCiphertext = legacyNip44.encrypt(
			legacyNip44.utils.v2.getConversationKey(sec1, pub2),
			'legacy-message'
		);

		expect(() => decryptNip44(sec2, pub1, legacyCiphertext)).toThrow();
		expect(decryptNip44Compat(sec2, pub1, legacyCiphertext)).toBe('legacy-message');
	});
});
