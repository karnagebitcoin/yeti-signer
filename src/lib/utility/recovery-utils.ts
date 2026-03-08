import { nip19 } from 'nostr-tools';
import { get } from 'svelte/store';

import type { Profile } from '$lib/types';
import { backupCompleted, profiles } from '$lib/stores/data';
import {
	encryptPayloadWithPassphrase,
	getStorageProtectionState,
	lockStorage,
	unlockStorage
} from '$lib/utility/crypto-utils';
import { SIGNER_BEHAVIOR_KEY } from '$lib/utility/signer-behavior';
import { web } from '$lib/utility/utils';

const SESSION_UNLOCK_STORAGE = 'lynxUnlockedLocalKey';
const BACKUP_COMPLETED_STORAGE = 'lynxBackupCompletedAt';

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

	const storedData = await web.storage.local.get(['currentProfile', 'theme', 'duration']);
	const backupData = {
		kind: 'backup',
		version: 1,
		exportDate: new Date().toISOString(),
		profiles: profileList,
		currentProfile: storedData.currentProfile,
		theme: storedData.theme,
		duration: storedData.duration
	};

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
