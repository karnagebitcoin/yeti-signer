import type { Profile } from '$lib/types/profile';
import { web } from '$lib/utility/utils';

const LEGACY_LOCAL_KEY_STORAGE = 'lynxLocalEncryptionKey';
const PROTECTED_LOCAL_KEY_STORAGE = 'lynxProtectedLocalKey';
const SESSION_UNLOCK_STORAGE = 'lynxUnlockedLocalKey';
const PROFILE_KEY_PREFIX = 'enc:v1';
const PASSPHRASE_ITERATIONS = 250000;

const encoder = new TextEncoder();
const decoder = new TextDecoder();
let unlockedLocalKey: CryptoKey | null = null;
let unlockedLocalKeyRaw: string | null = null;

export interface EncryptedPayload {
	encrypted: true;
	version: 1;
	salt: string;
	iv: string;
	ciphertext: string;
}

interface ProtectedLocalKeyPayload {
	kind: 'local-key';
	rawKey: string;
}

export type StorageProtectionState = 'setup' | 'locked' | 'unlocked';

export class StorageLockedError extends Error {
	constructor(message: string = 'Yeti is locked. Enter your passphrase to continue.') {
		super(message);
		this.name = 'StorageLockedError';
	}
}

const bytesToBase64 = (bytes: Uint8Array): string => {
	let binary = '';
	for (const value of bytes) binary += String.fromCharCode(value);
	return btoa(binary);
};

const base64ToBytes = (base64: string): Uint8Array => {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
};

const getSessionArea = () =>
	(web.storage as typeof web.storage & { session?: typeof web.storage.local }).session;

const importLocalKey = async (encoded: string): Promise<CryptoKey> =>
	crypto.subtle.importKey('raw', base64ToBytes(encoded), 'AES-GCM', false, ['encrypt', 'decrypt']);

const createRawLocalKey = (): string => bytesToBase64(crypto.getRandomValues(new Uint8Array(32)));

const getProtectedLocalKeyEnvelope = async (): Promise<EncryptedPayload | null> => {
	const result = await web.storage.local.get(PROTECTED_LOCAL_KEY_STORAGE);
	const envelope = result?.[PROTECTED_LOCAL_KEY_STORAGE];
	return isEncryptedPayload(envelope) ? envelope : null;
};

const getLegacyLocalKey = async (): Promise<string | null> => {
	const result = await web.storage.local.get(LEGACY_LOCAL_KEY_STORAGE);
	const rawKey = result?.[LEGACY_LOCAL_KEY_STORAGE];
	return typeof rawKey === 'string' && rawKey ? rawKey : null;
};

const persistUnlockedKeyToSession = async (rawKey: string | null): Promise<void> => {
	const sessionArea = getSessionArea();
	if (!sessionArea) return;
	if (rawKey) {
		await sessionArea.set({ [SESSION_UNLOCK_STORAGE]: rawKey });
		return;
	}
	await sessionArea.remove(SESSION_UNLOCK_STORAGE);
};

const hydrateUnlockedKeyFromSession = async (): Promise<boolean> => {
	if (unlockedLocalKey && unlockedLocalKeyRaw) return true;

	const sessionArea = getSessionArea();
	if (!sessionArea) return false;

	const result = await sessionArea.get(SESSION_UNLOCK_STORAGE);
	const rawKey = result?.[SESSION_UNLOCK_STORAGE];
	if (typeof rawKey !== 'string' || !rawKey) return false;

	unlockedLocalKeyRaw = rawKey;
	unlockedLocalKey = await importLocalKey(rawKey);
	return true;
};

const cacheUnlockedKey = async (rawKey: string): Promise<void> => {
	unlockedLocalKeyRaw = rawKey;
	unlockedLocalKey = await importLocalKey(rawKey);
	await persistUnlockedKeyToSession(rawKey);
};

const isProtectedLocalKeyPayload = (value: unknown): value is ProtectedLocalKeyPayload => {
	if (!value || typeof value !== 'object') return false;
	const payload = value as Partial<ProtectedLocalKeyPayload>;
	return payload.kind === 'local-key' && typeof payload.rawKey === 'string' && payload.rawKey.length > 0;
};

const derivePassphraseKey = async (
	passphrase: string,
	salt: Uint8Array,
	usage: KeyUsage[]
): Promise<CryptoKey> => {
	const baseKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(passphrase),
		'PBKDF2',
		false,
		['deriveKey']
	);

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: PASSPHRASE_ITERATIONS,
			hash: 'SHA-256'
		},
		baseKey,
		{ name: 'AES-GCM', length: 256 },
		false,
		usage
	);
};

export const encryptPayloadWithPassphrase = async (
	payload: unknown,
	passphrase: string
): Promise<EncryptedPayload> => {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const key = await derivePassphraseKey(passphrase, salt, ['encrypt']);
	const data = encoder.encode(JSON.stringify(payload));
	const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

	return {
		encrypted: true,
		version: 1,
		salt: bytesToBase64(salt),
		iv: bytesToBase64(iv),
		ciphertext: bytesToBase64(new Uint8Array(ciphertext))
	};
};

export const decryptPayloadWithPassphrase = async (
	payload: EncryptedPayload,
	passphrase: string
): Promise<any> => {
	const salt = base64ToBytes(payload.salt);
	const iv = base64ToBytes(payload.iv);
	const ciphertext = base64ToBytes(payload.ciphertext);
	const key = await derivePassphraseKey(passphrase, salt, ['decrypt']);
	const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
	return JSON.parse(decoder.decode(decrypted));
};

const getUnlockedLocalKey = async (): Promise<CryptoKey> => {
	if (unlockedLocalKey) return unlockedLocalKey;
	if (await hydrateUnlockedKeyFromSession()) return unlockedLocalKey as CryptoKey;

	const protectedEnvelope = await getProtectedLocalKeyEnvelope();
	if (protectedEnvelope) throw new StorageLockedError();

	const legacyKey = await getLegacyLocalKey();
	if (!legacyKey) {
		throw new StorageLockedError('Set up an app passphrase before you save an account.');
	}

	await cacheUnlockedKey(legacyKey);
	return unlockedLocalKey as CryptoKey;
};

const getUnlockedRawLocalKey = async (): Promise<string> => {
	if (unlockedLocalKeyRaw) return unlockedLocalKeyRaw;
	if (await hydrateUnlockedKeyFromSession()) return unlockedLocalKeyRaw as string;

	const protectedEnvelope = await getProtectedLocalKeyEnvelope();
	if (protectedEnvelope) throw new StorageLockedError();

	const legacyKey = await getLegacyLocalKey();
	if (!legacyKey) {
		throw new StorageLockedError('Set up an app passphrase before you save an account.');
	}

	await cacheUnlockedKey(legacyKey);
	return unlockedLocalKeyRaw as string;
};

export const getStorageProtectionState = async (): Promise<StorageProtectionState> => {
	const protectedEnvelope = await getProtectedLocalKeyEnvelope();
	if (!protectedEnvelope) return 'setup';
	return (unlockedLocalKey || (await hydrateUnlockedKeyFromSession())) ? 'unlocked' : 'locked';
};

export const initializeStorageProtection = async (passphrase: string): Promise<void> => {
	const protectedEnvelope = await getProtectedLocalKeyEnvelope();
	if (protectedEnvelope) {
		await unlockStorage(passphrase);
		return;
	}

	const rawKey = (await getLegacyLocalKey()) || createRawLocalKey();
	const wrappedKey = await encryptPayloadWithPassphrase({ kind: 'local-key', rawKey }, passphrase);

	await web.storage.local.set({ [PROTECTED_LOCAL_KEY_STORAGE]: wrappedKey });
	await web.storage.local.remove(LEGACY_LOCAL_KEY_STORAGE);
	await cacheUnlockedKey(rawKey);
};

export const unlockStorage = async (passphrase: string): Promise<void> => {
	const protectedEnvelope = await getProtectedLocalKeyEnvelope();
	if (!protectedEnvelope) {
		throw new StorageLockedError('Set up an app passphrase first.');
	}

	const payload = await decryptPayloadWithPassphrase(protectedEnvelope, passphrase);
	if (!isProtectedLocalKeyPayload(payload)) {
		throw new Error('Stored protection data is invalid');
	}

	await cacheUnlockedKey(payload.rawKey);
};

export const updateStoragePassphrase = async (passphrase: string): Promise<void> => {
	const rawKey = await getUnlockedRawLocalKey();
	const wrappedKey = await encryptPayloadWithPassphrase({ kind: 'local-key', rawKey }, passphrase);
	await web.storage.local.set({ [PROTECTED_LOCAL_KEY_STORAGE]: wrappedKey });
	await web.storage.local.remove(LEGACY_LOCAL_KEY_STORAGE);
};

export const lockStorage = async (): Promise<void> => {
	unlockedLocalKey = null;
	unlockedLocalKeyRaw = null;
	await persistUnlockedKeyToSession(null);
};

export const isStorageLockedError = (error: unknown): error is StorageLockedError =>
	error instanceof StorageLockedError || (error instanceof Error && error.name === 'StorageLockedError');

export const protectPrivateKey = async (privateKey: string): Promise<string> => {
	if (!privateKey || privateKey.startsWith(`${PROFILE_KEY_PREFIX}:`)) return privateKey;

	const key = await getUnlockedLocalKey();
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encrypted = await crypto.subtle.encrypt(
		{ name: 'AES-GCM', iv },
		key,
		encoder.encode(privateKey)
	);

	return `${PROFILE_KEY_PREFIX}:${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(encrypted))}`;
};

export const revealPrivateKey = async (storedValue: string): Promise<string> => {
	if (!storedValue || !storedValue.startsWith(`${PROFILE_KEY_PREFIX}:`)) return storedValue;

	const [, version, ivB64, dataB64] = storedValue.split(':');
	if (version !== 'v1' || !ivB64 || !dataB64) {
		throw new Error('Invalid encrypted private key format');
	}

	const key = await getUnlockedLocalKey();
	const decrypted = await crypto.subtle.decrypt(
		{ name: 'AES-GCM', iv: base64ToBytes(ivB64) },
		key,
		base64ToBytes(dataB64)
	);

	return decoder.decode(decrypted);
};

const cloneProfile = (profile: Profile): Profile => ({
	...profile,
	data: profile.data
		? {
				...profile.data
			}
		: profile.data
});

export const encryptProfilesForStorage = async (profileList: Profile[]): Promise<Profile[]> =>
	Promise.all(
		profileList.map(async (profile) => {
			const copy = cloneProfile(profile);
			if (!copy.data?.privateKey) return copy;
			copy.data.privateKey = await protectPrivateKey(copy.data.privateKey);
			return copy;
		})
	);

export const decryptProfilesFromStorage = async (profileList: Profile[]): Promise<Profile[]> =>
	Promise.all(
		profileList.map(async (profile) => {
			const copy = cloneProfile(profile);
			if (!copy.data?.privateKey) return copy;
			copy.data.privateKey = await revealPrivateKey(copy.data.privateKey);
			return copy;
		})
	);

export const isEncryptedPayload = (value: unknown): value is EncryptedPayload => {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Partial<EncryptedPayload>;
	return (
		candidate.encrypted === true &&
		candidate.version === 1 &&
		typeof candidate.salt === 'string' &&
		typeof candidate.iv === 'string' &&
		typeof candidate.ciphertext === 'string'
	);
};

export { bytesToBase64, base64ToBytes };
