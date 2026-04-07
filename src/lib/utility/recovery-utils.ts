import { nip19 } from 'nostr-tools';
import { get } from 'svelte/store';

import { SimplePool, finishEvent, getPublicKey, type Event, type UnsignedEvent } from 'nostr-tools';

import type { Duration, Profile, Relay } from '$lib/types';
import { profileController } from '$lib/controllers/profile.controller';
import { backupCompleted, browser, duration, profiles, theme, userProfile } from '$lib/stores/data';
import {
	encryptPayloadWithPassphrase,
	getStorageProtectionState,
	lockStorage,
	unlockStorage
} from '$lib/utility/crypto-utils';
import { decryptNip44Compat, encryptNip44 } from '$lib/utility/nip44-utils';
import { SIGNER_BEHAVIOR_KEY } from '$lib/utility/signer-behavior';
import { web } from '$lib/utility/utils';

const SESSION_UNLOCK_STORAGE = 'lynxUnlockedLocalKey';
const BACKUP_COMPLETED_STORAGE = 'lynxBackupCompletedAt';
const REMOTE_BACKUP_KIND = 30078;
const REMOTE_BACKUP_D_TAG = 'yeti/settings-backup';
const DEFAULT_REMOTE_BACKUP_RELAYS = ['wss://nos.lol', 'wss://relay.damus.io', 'wss://nostr.wine'];
const remoteBackupPool = new SimplePool();

export interface BackupPayload {
	kind: 'backup';
	version: 1;
	exportDate: string;
	profiles: Profile[];
	currentProfile?: string | null;
	theme?: string;
	duration?: Duration;
}

export interface RemoteBackupInfo {
	exists: boolean;
	timestamp: number | null;
	date: string | null;
	event: Event | null;
}

const getSessionArea = () =>
	(web.storage as typeof web.storage & { session?: typeof web.storage.local }).session;

const downloadJsonFile = (filename: string, payload: unknown) => {
	const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
};

const isValidProfileList = (input: unknown): input is Profile[] => {
	if (!Array.isArray(input)) return false;
	return input.every(
		(profile) =>
			typeof profile === 'object' &&
			profile !== null &&
			typeof (profile as Profile).id === 'string' &&
			typeof (profile as Profile).data?.privateKey === 'string'
	);
};

const isValidBackupPayload = (input: unknown): input is BackupPayload => {
	if (!input || typeof input !== 'object') return false;
	const backup = input as Partial<BackupPayload>;
	return backup.version === 1 && isValidProfileList(backup.profiles) && backup.kind === 'backup';
};

const normalizeRelayUrl = (url: string): string =>
	url.trim().replace(/\/+$/, '').replace(/^ws:\/\//i, 'wss://');

const resolveRelayUrls = (relayUrls: string[] = []): string[] => {
	const merged = [...relayUrls, ...DEFAULT_REMOTE_BACKUP_RELAYS]
		.filter((relay): relay is string => typeof relay === 'string' && relay.trim().length > 0)
		.map(normalizeRelayUrl);
	return [...new Set(merged)];
};

export const relayUrlsFromProfileRelays = (relayList: Relay[] = []): string[] =>
	resolveRelayUrls(relayList.map((relay) => relay.url));

export const relayUrlsFromRelayTags = (tags: string[][] = []): string[] =>
	resolveRelayUrls(
		tags
			.filter((tag) => tag[0] === 'r' && typeof tag[1] === 'string')
			.map((tag) => tag[1] as string)
	);

export const buildBackupPayload = async (
	profileList: Profile[] = get(profiles)
): Promise<BackupPayload> => {
	const storedData = await web.storage.local.get(['currentProfile', 'theme', 'duration']);
	return {
		kind: 'backup',
		version: 1,
		exportDate: new Date().toISOString(),
		profiles: profileList,
		currentProfile: (storedData.currentProfile as string | null | undefined) ?? null,
		theme: storedData.theme as string | undefined,
		duration: storedData.duration as Duration | undefined
	};
};

export const applyBackupPayload = async (backupData: BackupPayload): Promise<void> => {
	if (!isValidBackupPayload(backupData)) {
		throw new Error('Invalid backup file format');
	}

	profiles.set(backupData.profiles);
	await profileController.saveProfiles();

	const restoredProfile =
		backupData.profiles.find((profile) => profile.id === backupData.currentProfile) ||
		backupData.profiles[0];

	if (restoredProfile) {
		await profileController.loadProfile(restoredProfile);
	} else {
		await browser.set({ currentProfile: null });
		userProfile.set({} as Profile);
	}

	if (backupData.theme) {
		await browser.set({ theme: backupData.theme });
		theme.set(backupData.theme);
		if (backupData.theme === 'dark') document.documentElement.classList.add('dark');
		else document.documentElement.classList.remove('dark');
	}

	if (backupData.duration) {
		await browser.set({ duration: backupData.duration });
		duration.set(backupData.duration as Duration);
	}
};

export const getRemoteBackupInfo = async (
	pubkey: string,
	relayUrls: string[] = []
): Promise<RemoteBackupInfo> => {
	const event =
		(await remoteBackupPool.get(resolveRelayUrls(relayUrls), {
			kinds: [REMOTE_BACKUP_KIND],
			authors: [pubkey],
			'#d': [REMOTE_BACKUP_D_TAG]
		})) || null;

	if (!event) {
		return { exists: false, timestamp: null, date: null, event: null };
	}

	const timestamp = event.created_at * 1000;
	return {
		exists: true,
		timestamp,
		date: new Date(timestamp).toLocaleString(),
		event
	};
};

export const restoreBackupFromRelays = async (
	privateKey: string,
	relayUrls: string[] = []
): Promise<BackupPayload> => {
	const pubkey = getPublicKey(privateKey);
	const backupInfo = await getRemoteBackupInfo(pubkey, relayUrls);
	if (!backupInfo.event) {
		throw new Error('No relay backup was found for this identity');
	}

	const decrypted = decryptNip44Compat(privateKey, pubkey, backupInfo.event.content);
	const parsedData = JSON.parse(decrypted);

	if (!isValidBackupPayload(parsedData)) {
		throw new Error('The relay backup format was not recognized');
	}

	return parsedData;
};

export const saveBackupToRelays = async (
	profile: Profile,
	profileList: Profile[] = get(profiles)
): Promise<void> => {
	if (!profile.data?.privateKey || !profile.data?.pubkey) {
		throw new Error('Pick an active identity before saving a relay backup');
	}

	await confirmAppPassphrase('save an encrypted relay backup');

	const backupData = await buildBackupPayload(profileList);
	const encrypted = encryptNip44(
		profile.data.privateKey,
		profile.data.pubkey,
		JSON.stringify(backupData)
	);
	const draftEvent: UnsignedEvent = {
		kind: REMOTE_BACKUP_KIND,
		pubkey: profile.data.pubkey,
		content: encrypted,
		created_at: Math.floor(Date.now() / 1000),
		tags: [
			['d', REMOTE_BACKUP_D_TAG],
			['l', 'yeti/backup'],
			['client', 'yeti']
		]
	};

	const signedEvent = finishEvent(draftEvent, profile.data.privateKey);
	remoteBackupPool.publish(relayUrlsFromProfileRelays(profile.data.relays || []), signedEvent);
	await markBackupCompleted();
};

export const loadBackupCompletedState = async (): Promise<boolean> => {
	const result = await web.storage.local.get(BACKUP_COMPLETED_STORAGE);
	const isCompleted = typeof result?.[BACKUP_COMPLETED_STORAGE] === 'string';
	backupCompleted.set(isCompleted);
	return isCompleted;
};

export const markBackupCompleted = async (): Promise<void> => {
	await web.storage.local.set({ [BACKUP_COMPLETED_STORAGE]: new Date().toISOString() });
	backupCompleted.set(true);
};

export const requestPassphrase = (message: string): string => {
	const promptValue = window.prompt(message);
	if (promptValue === null) {
		throw new Error('Passphrase entry was cancelled');
	}

	const passphrase = promptValue.trim();
	if (passphrase.length < 8) {
		throw new Error('Passphrase must be at least 8 characters long');
	}
	return passphrase;
};

export const requestConfirmedPassphrase = (message: string, confirmMessage: string): string => {
	const passphrase = requestPassphrase(message);
	const confirmation = window.prompt(confirmMessage)?.trim() || '';
	if (passphrase !== confirmation) {
		throw new Error('Passphrases did not match');
	}
	return passphrase;
};

export const confirmAppPassphrase = async (action: string): Promise<void> => {
	const protectionState = await getStorageProtectionState();
	if (protectionState === 'setup') {
		throw new Error('Set up an app passphrase before revealing or exporting secret material');
	}

	const passphrase = requestPassphrase(`Enter your Yeti passphrase to ${action}`);

	try {
		await unlockStorage(passphrase);
		await web.runtime.sendMessage({ internal: 'storage.unlock', passphrase });
	} catch {
		throw new Error('That Yeti passphrase was not correct');
	}
};

export const downloadEncryptedKeysExport = async (
	profileList: Profile[] = get(profiles)
): Promise<void> => {
	await confirmAppPassphrase('export your secret keys');

	const exportData = profileList.map((profile) => ({
		name: profile.name || 'Unknown',
		nsec: profile.data?.privateKey ? nip19.nsecEncode(profile.data.privateKey) : 'N/A'
	}));

	const passphrase = requestPassphrase('Create a passphrase for this key export');
	const encryptedExport = await encryptPayloadWithPassphrase(
		{
			kind: 'keys-export',
			version: 1,
			entries: exportData
		},
		passphrase
	);

	downloadJsonFile('yeti-keys-encrypted.json', encryptedExport);
};

export const downloadEncryptedBackup = async (
	profileList: Profile[] = get(profiles)
): Promise<void> => {
	await confirmAppPassphrase('create an encrypted backup');

	const backupData = await buildBackupPayload(profileList);
	const passphrase = requestPassphrase('Create a passphrase for this backup');
	const encryptedBackup = await encryptPayloadWithPassphrase(backupData, passphrase);
	const date = new Date().toISOString().split('T')[0];
	downloadJsonFile(`yeti-backup-${date}.json`, encryptedBackup);
	await markBackupCompleted();
};

export const resetAppData = async (): Promise<void> => {
	await lockStorage();

	const sessionArea = getSessionArea();
	if (sessionArea?.clear) await sessionArea.clear();
	else if (sessionArea?.remove) await sessionArea.remove(SESSION_UNLOCK_STORAGE);

	await web.storage.local.remove([
		'profiles',
		'currentProfile',
		'theme',
		'duration',
		'sessionData',
		SIGNER_BEHAVIOR_KEY,
		BACKUP_COMPLETED_STORAGE,
		'lynxLocalEncryptionKey',
		'lynxProtectedLocalKey'
	]);
	backupCompleted.set(false);

	if (web.permissions?.remove) {
		try {
			await web.permissions.remove({ origins: ['https://*/*', 'http://*/*'] });
		} catch {}
	}
};
