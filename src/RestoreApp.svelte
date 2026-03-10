<script lang="ts">
	import Icon from '@iconify/svelte';

	import { browser } from '$lib/stores/data';
	import type { Profile } from '$lib/types';
	import {
		decryptPayloadWithPassphrase,
		encryptProfilesForStorage,
		getStorageProtectionState,
		initializeStorageProtection,
		isEncryptedPayload,
		unlockStorage
	} from '$lib/utility/crypto-utils';

	let restoreStatus = $state<'idle' | 'success' | 'error'>('idle');
	let restoreMessage = $state('');
	let fileInput: HTMLInputElement;

	const requestPassphrase = (message: string): string => {
		const passphrase = window.prompt(message)?.trim() || '';
		if (passphrase.length < 8) throw new Error('Passphrase must be at least 8 characters long');
		return passphrase;
	};

	const requestConfirmedPassphrase = (message: string, confirmMessage: string): string => {
		const passphrase = requestPassphrase(message);
		const confirmation = window.prompt(confirmMessage)?.trim() || '';
		if (passphrase !== confirmation) throw new Error('Passphrases did not match');
		return passphrase;
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

	const ensureStorageReady = async (): Promise<void> => {
		const state = await getStorageProtectionState();
		if (state === 'setup') {
			const passphrase = requestConfirmedPassphrase(
				'Create an app passphrase to protect this device',
				'Type the app passphrase again'
			);
			await initializeStorageProtection(passphrase);
			return;
		}
		if (state === 'locked') {
			await unlockStorage(requestPassphrase('Enter your app passphrase'));
		}
	};

	const restoreSettings = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		try {
			const text = await file.text();
			const parsedData = JSON.parse(text);
			const backupData = isEncryptedPayload(parsedData)
				? await decryptPayloadWithPassphrase(
						parsedData,
						requestPassphrase('Enter the backup passphrase')
					)
				: parsedData;

			if (backupData.kind && backupData.kind !== 'backup') {
				throw new Error('This file is not a settings backup');
			}

			if (!backupData.version || !isValidProfileList(backupData.profiles)) {
				throw new Error('Invalid backup file format');
			}

			await ensureStorageReady();
			const encryptedProfiles = await encryptProfilesForStorage(backupData.profiles);
			await browser.set({ profiles: encryptedProfiles });

			const restoredProfile =
				backupData.profiles.find((profile: Profile) => profile.id === backupData.currentProfile) ||
				backupData.profiles[0];

			if (restoredProfile) {
				await browser.set({ currentProfile: restoredProfile.id });
			} else {
				await browser.set({ currentProfile: null });
			}

			if (backupData.theme) {
				await browser.set({ theme: backupData.theme });
				if (backupData.theme === 'dark') document.documentElement.classList.add('dark');
				else document.documentElement.classList.remove('dark');
			}

			if (backupData.duration) {
				await browser.set({ duration: backupData.duration });
			}

			restoreStatus = 'success';
			restoreMessage = `Restored ${backupData.profiles.length} profile(s). You can close this tab now.`;
			input.value = '';
		} catch (error) {
			console.error('Restore failed:', error);
			restoreStatus = 'error';
			restoreMessage = error instanceof Error ? error.message : 'Failed to restore backup';
			input.value = '';
		}
	};
</script>

<div class="kb-app-shell flex min-h-screen items-center justify-center p-6">
	<div class="kb-panel w-full max-w-xl p-6 sm:p-8">
		<div class="flex flex-col gap-6">
				<div class="flex items-center gap-4">
					<img src="assets/logo-on-64.png" alt="Yeti" class="size-14 rounded-2xl shadow-lg" />
				<div>
					<div class="kb-label">Restore data</div>
					<h1 class="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
						Get your account data back
					</h1>
					<p class="mt-1 text-sm text-[var(--kb-muted)]">
						Choose a backup file to restore your accounts and settings.
					</p>
				</div>
			</div>

			<div class="kb-card p-5">
				<input type="file" accept=".json" class="hidden" bind:this={fileInput} onchange={restoreSettings} />

				{#if restoreStatus === 'idle'}
					<button type="button" class="kb-button-primary w-full text-base" onclick={() => fileInput.click()}>
						<Icon icon="mdi:folder-open-outline" width={20} />
						Choose backup file
					</button>
				{/if}

				{#if restoreStatus === 'success'}
					<div class="kb-card-muted flex items-start gap-4 px-4 py-4">
						<span class="kb-site-orb">
							<Icon icon="mdi:check" width={18} />
						</span>
						<div>
							<div class="text-sm font-semibold text-[var(--kb-text)]">Restore complete</div>
							<div class="text-sm text-[var(--kb-muted)]">{restoreMessage}</div>
						</div>
					</div>

					<button type="button" class="kb-button-secondary mt-4 w-full" onclick={() => window.close()}>
						Close tab
					</button>
				{/if}

				{#if restoreStatus === 'error'}
					<div class="kb-card-muted flex items-start gap-4 px-4 py-4">
						<span class="kb-site-orb text-[var(--kb-danger)]">
							<Icon icon="mdi:alert-circle-outline" width={18} />
						</span>
						<div>
							<div class="text-sm font-semibold text-[var(--kb-text)]">Restore failed</div>
							<div class="text-sm text-[var(--kb-muted)]">{restoreMessage}</div>
						</div>
					</div>

					<button
						type="button"
						class="kb-button-primary mt-4 w-full"
						onclick={() => {
							restoreStatus = 'idle';
							fileInput.click();
						}}
					>
						Try another file
					</button>
				{/if}
			</div>

			<p class="text-sm text-[var(--kb-muted)]">
				Backup files are created from the app settings page.
			</p>
		</div>
	</div>
</div>
