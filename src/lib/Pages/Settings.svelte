<script lang="ts">
	import Icon from '@iconify/svelte';
	import { nip19 } from 'nostr-tools';
	import { onMount } from 'svelte';

	import { AppPageItem } from '$lib/components/App';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { profileController } from '$lib/controllers/profile.controller';
	import { backupCompleted, browser, duration, profiles, theme, userProfile } from '$lib/stores/data';
	import type { Duration, Profile, Relay } from '$lib/types';
	import {
		decryptPayloadWithPassphrase,
		isEncryptedPayload,
		lockStorage,
		updateStoragePassphrase
	} from '$lib/utility/crypto-utils';
	import {
		confirmAppPassphrase,
		downloadEncryptedBackup,
		downloadEncryptedKeysExport,
		loadBackupCompletedState,
		requestConfirmedPassphrase,
		requestPassphrase
	} from '$lib/utility/recovery-utils';
	import { web } from '$lib/utility';
	import {
		DEFAULT_SIGNER_BEHAVIOR,
		SIGNER_BEHAVIOR_KEY,
		SIGNER_BEHAVIOR_OPTIONS,
		type SignerBehaviorMode
	} from '$lib/utility/signer-behavior';

	type SettingsSection = 'general' | 'account';

	let relays = $state<Relay[]>([]);
	let relayInput = $state('');
	let showNsec = $state(false);
	let activeSection = $state<SettingsSection>('general');
	let copiedStates = $state({
		pubkey: false,
		npub: false,
		nsec: false
	});
	let restoreStatus = $state<'idle' | 'success' | 'error'>('idle');
	let restoreMessage = $state('');
	let fileInput = $state<HTMLInputElement | undefined>(undefined);
	let signerBehavior = $state<SignerBehaviorMode>(DEFAULT_SIGNER_BEHAVIOR);
	const settingsSections: Array<{ id: SettingsSection; label: string; icon: string }> = [
		{ id: 'general', label: 'General', icon: 'solar:settings-linear' },
		{ id: 'account', label: 'Account', icon: 'solar:user-id-linear' },
	];

	$effect(() => {
		relays = $userProfile.data?.relays || [];
	});

	onMount(async () => {
		const [storedValue] = await Promise.all([
			browser.get(SIGNER_BEHAVIOR_KEY),
			loadBackupCompletedState()
		]);
		const mode = storedValue?.[SIGNER_BEHAVIOR_KEY] as SignerBehaviorMode | undefined;
		signerBehavior = mode || DEFAULT_SIGNER_BEHAVIOR;
	});

	const updateSignerBehavior = async (mode: SignerBehaviorMode) => {
		signerBehavior = mode;
		await browser.set({ [SIGNER_BEHAVIOR_KEY]: mode });
	};

	const normalizeRelayInput = (value: string): string =>
		value
			.trim()
			.replace(/^(?:wss?:\/\/)/i, '')
			.replace(/^\/+/, '');

	const getNpub = () => ($userProfile.data?.pubkey ? nip19.npubEncode($userProfile.data.pubkey) : '');
	const getNsec = () =>
		$userProfile.data?.privateKey ? nip19.nsecEncode($userProfile.data.privateKey) : '';

	const addRelay = () => {
		const normalizedRelay = normalizeRelayInput(relayInput);
		if (!normalizedRelay) return;
		profileController.addRelayToProfile(normalizedRelay).then(() => {
			relayInput = '';
		});
	};

	const removeRelay = (relay: Relay) => {
		profileController.removeRelayFromProfile(relay);
	};

	const copyToClipboard = async (text: string, key: keyof typeof copiedStates) => {
		if (!text) return;

		try {
			await navigator.clipboard.writeText(text);
			copiedStates[key] = true;
			setTimeout(() => {
				copiedStates[key] = false;
			}, 2000);
		} catch (error) {
			console.error('Failed to copy to clipboard:', error);
		}
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

	const parseImportedData = async (raw: unknown): Promise<any> => {
		if (!isEncryptedPayload(raw)) return raw;
		const passphrase = requestPassphrase('Enter the backup passphrase');
		return decryptPayloadWithPassphrase(raw, passphrase);
	};

	const exportKeys = async () => {
		try {
			await downloadEncryptedKeysExport($profiles);
		} catch (error) {
			console.error('Export failed:', error);
			alert(error instanceof Error ? error.message : 'Failed to export keys');
		}
	};

	const backupSettings = async () => {
		try {
			await downloadEncryptedBackup($profiles);
		} catch (error) {
			console.error('Backup failed:', error);
			alert(error instanceof Error ? error.message : 'Failed to create backup');
		}
	};

	const toggleNsecVisibility = async () => {
		if (showNsec) {
			showNsec = false;
			return;
		}

		try {
			await confirmAppPassphrase('reveal this private key');
			showNsec = true;
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Could not reveal private key');
		}
	};

	const copyNsec = async () => {
		try {
			await confirmAppPassphrase('copy this private key');
			await copyToClipboard(getNsec(), 'nsec');
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Could not copy private key');
		}
	};

	const restoreSettings = async (event: Event) => {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		try {
			const text = await file.text();
			const parsedData = JSON.parse(text);
			const backupData = await parseImportedData(parsedData);

			if (backupData.kind && backupData.kind !== 'backup') {
				throw new Error('This file is not a settings backup');
			}

			if (!backupData.version || !isValidProfileList(backupData.profiles)) {
				throw new Error('Invalid backup file format');
			}

			profiles.set(backupData.profiles);
			await profileController.saveProfiles();

			const restoredProfile =
				backupData.profiles.find((p: Profile) => p.id === backupData.currentProfile) ||
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

			restoreStatus = 'success';
			restoreMessage = `Restored ${backupData.profiles.length} profile(s) successfully.`;
			input.value = '';

			setTimeout(() => {
				restoreStatus = 'idle';
				restoreMessage = '';
			}, 3000);
		} catch (error) {
			console.error('Restore failed:', error);
			restoreStatus = 'error';
			restoreMessage = error instanceof Error ? error.message : 'Failed to restore backup';
			input.value = '';

			setTimeout(() => {
				restoreStatus = 'idle';
				restoreMessage = '';
			}, 3000);
		}
	};

	const changeAppPassphrase = async () => {
		try {
			const passphrase = requestConfirmedPassphrase(
				'Create a new app passphrase',
				'Type the new app passphrase again'
			);
			await updateStoragePassphrase(passphrase);
			await web.runtime.sendMessage({ internal: 'storage.unlock', passphrase });
			alert('App passphrase updated');
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Could not update the app passphrase');
		}
	};

	const lockAppNow = async () => {
		await lockStorage();
		await web.runtime.sendMessage({ internal: 'storage.lock' });
		window.location.reload();
	};

	const openRestorePicker = () => {
		// @ts-ignore
		const isFirefox = typeof __BROWSER__ !== 'undefined' && __BROWSER__ === 'firefox';
		if (isFirefox) web.tabs.create({ url: web.runtime.getURL('restore.html') });
		else fileInput.click();
	};
</script>

<AppPageItem name="settings">
	<div class="flex h-full min-h-0 flex-col gap-2 overflow-y-auto pb-1 pt-1">
		<div class="kb-card p-2">
			<div class="grid grid-cols-2 gap-2">
				{#each settingsSections as section}
					<button
						type="button"
						class="rounded-2xl px-3 py-2 text-sm font-semibold transition"
						style:background={activeSection === section.id ? 'var(--kb-surface-strong)' : 'transparent'}
						style:color={activeSection === section.id ? 'var(--kb-text)' : 'var(--kb-muted)'}
						onclick={() => (activeSection = section.id)}
					>
						<Icon icon={section.icon} width={16} class="mr-2 inline-block" />
						{section.label}
					</button>
				{/each}
			</div>
		</div>

		{#if activeSection === 'general'}
			<div
				class="kb-card p-4"
				style:border-color={$profiles.length > 0 && !$backupCompleted ? 'color-mix(in srgb, var(--kb-accent) 56%, var(--kb-border))' : 'var(--kb-border)'}
				style:background={$profiles.length > 0 && !$backupCompleted
					? 'color-mix(in srgb, var(--kb-accent-soft) 56%, var(--kb-surface-strong))'
					: 'var(--kb-surface)'}
			>
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<div class="text-base font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
							{$profiles.length > 0 && !$backupCompleted ? 'Backup needed' : 'Backup'}
						</div>
						<div class="text-xs text-[var(--kb-muted)]">
							{#if $profiles.length === 0}
								Add an account first, then save a backup file.
							{:else if !$backupCompleted}
								Save a backup now. If you lose your passphrase and do not have a saved key or backup,
								Yeti cannot recover your account.
							{:else}
								Keep your backup file somewhere safe so you can restore Yeti later.
							{/if}
						</div>
					</div>

					{#if $profiles.length > 0 && !$backupCompleted}
						<span class="kb-chip whitespace-nowrap px-2.5 py-1 text-[11px] leading-none" data-tone="danger">
							Needs attention
						</span>
					{:else if $profiles.length > 0}
						<span class="kb-chip" data-tone="success">Saved</span>
					{/if}
				</div>

				<div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
					<button
						type="button"
						class="kb-button-primary w-full text-sm"
						disabled={$profiles.length === 0}
						onclick={backupSettings}
					>
						<Icon icon="mdi:backup-restore" width={18} />
						{$backupCompleted ? 'Create new backup' : 'Create backup'}
					</button>
					<button
						type="button"
						class="kb-button-secondary w-full text-sm"
						disabled={$profiles.length === 0}
						onclick={exportKeys}
					>
						<Icon icon="mdi:download" width={18} />
						Export all keys
					</button>
				</div>
			</div>

			<div class="kb-card flex flex-col gap-3 p-4">
				<div>
					<div class="kb-label">Signing</div>
					<div class="mt-1 text-base font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
						How Yeti should handle requests
					</div>
					<div class="text-xs text-[var(--kb-muted)]">
						Pick the amount of control you want before something gets signed.
					</div>
				</div>

				<div class="grid grid-cols-1 gap-2">
					{#each SIGNER_BEHAVIOR_OPTIONS as option}
						<button
							type="button"
							class="rounded-[1.4rem] border px-4 py-3 text-left transition"
							style:background={signerBehavior === option.mode ? 'var(--kb-surface-strong)' : 'transparent'}
							style:border-color={signerBehavior === option.mode ? 'var(--kb-accent)' : 'var(--kb-border)'}
							onclick={() => updateSignerBehavior(option.mode)}
						>
							<div class="flex items-start gap-3">
								<span
									class="flex size-10 shrink-0 items-center justify-center rounded-2xl border"
									style:background={signerBehavior === option.mode ? 'var(--kb-accent-soft)' : 'var(--kb-surface-muted)'}
									style:border-color={signerBehavior === option.mode ? 'transparent' : 'var(--kb-border)'}
									style:color={signerBehavior === option.mode ? 'var(--kb-accent-strong)' : 'var(--kb-muted)'}
								>
									<Icon icon={option.icon} width={18} />
								</span>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<div class="text-sm font-semibold text-[var(--kb-text)]">{option.title}</div>
										<div class="text-[11px] font-semibold text-[var(--kb-muted)]">{option.summary}</div>
									</div>
									<div class="mt-1 max-w-[34ch] text-xs leading-relaxed text-[var(--kb-muted)]">
										{option.description}
									</div>
								</div>
								<span
									class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border"
									style:background={signerBehavior === option.mode ? 'var(--kb-accent-soft)' : 'transparent'}
									style:border-color={signerBehavior === option.mode ? 'color-mix(in srgb, var(--kb-accent) 26%, var(--kb-border))' : 'var(--kb-border)'}
									style:color={signerBehavior === option.mode ? 'var(--kb-accent-strong)' : 'transparent'}
								>
									<Icon icon="mdi:check" width={14} />
								</span>
							</div>
						</button>
					{/each}
				</div>
			</div>

			<div class="kb-card flex flex-col gap-3 p-4">
				<div>
					<div class="kb-label">App lock</div>
					<div class="mt-1 text-base font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
						Protect saved accounts
					</div>
					<div class="text-xs text-[var(--kb-muted)]">
						Yeti asks for this passphrase before it can open your saved accounts. If you lose it,
						you will need a saved key or backup.
					</div>
				</div>

				<div class="kb-card-muted flex flex-col gap-3 px-3 py-3">
					<div class="flex items-center justify-between gap-3">
						<div>
							<div class="text-sm font-semibold text-[var(--kb-text)]">App passphrase</div>
							<div class="text-xs text-[var(--kb-muted)]">
								This is separate from any one identity.
							</div>
						</div>
						<span class="kb-chip">On</span>
					</div>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<button type="button" class="kb-button-secondary w-full text-sm" onclick={changeAppPassphrase}>
							Change passphrase
						</button>
						<button type="button" class="kb-button-ghost w-full text-sm" onclick={lockAppNow}>
							Lock now
						</button>
					</div>
				</div>

				<div class="kb-card-muted flex flex-col gap-3 px-3 py-3">
					<div>
						<div class="text-sm font-semibold text-[var(--kb-text)]">Restore backup</div>
						<div class="text-xs text-[var(--kb-muted)]">
							Bring back an earlier backup file when you are setting Yeti up again.
						</div>
					</div>

					<input
						type="file"
						accept=".json"
						class="hidden"
						bind:this={fileInput}
						onchange={restoreSettings}
					/>

					<div class="grid grid-cols-1 gap-2">
						<button type="button" class="kb-button-secondary w-full text-sm" onclick={openRestorePicker}>
							<Icon icon="mdi:upload" width={18} />
							Restore backup
						</button>
					</div>

					{#if restoreStatus !== 'idle'}
						<div class="rounded-2xl border border-[var(--kb-border)] bg-white/40 px-3 py-2.5 dark:bg-white/[0.04]">
							<div
								class="text-sm font-semibold"
								style:color={restoreStatus === 'error' ? 'var(--kb-danger)' : 'var(--kb-text)'}
							>
								{restoreStatus === 'success' ? 'Backup restored' : 'Could not restore backup'}
							</div>
							<div
								class="mt-1 text-xs"
								style:color={restoreStatus === 'error' ? 'var(--kb-danger)' : 'var(--kb-muted)'}
							>
								{restoreMessage}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{:else}
			<div class="kb-card p-4">
				<div class="flex items-center gap-3">
					<Avatar
						alt={$userProfile?.metadata?.name || $userProfile?.name || 'Yeti'}
						sizeClass="size-12"
						src={$userProfile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
					/>
					<div class="min-w-0 flex-1">
						<div class="kb-label">Selected account</div>
						<div class="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
							{$userProfile?.metadata?.name || $userProfile?.name || 'No account selected'}
						</div>
						<div class="text-xs text-[var(--kb-muted)]">
							These settings only affect this one account.
						</div>
					</div>
					{#if $userProfile?.id}
						<span class="kb-chip">
							<Icon icon="solar:server-linear" width={14} />
							{relays.length} connection{relays.length === 1 ? '' : 's'}
						</span>
					{/if}
				</div>
			</div>

			{#if !$userProfile?.id}
				<div class="kb-card-muted px-4 py-4 text-sm text-[var(--kb-muted)]">
					Choose an account from the identities screen to manage its connections and keys.
				</div>
			{:else}
				<div class="kb-card flex flex-col gap-4 p-4">
					<div class="flex items-center justify-between gap-3">
						<div>
							<div class="kb-label">Account</div>
							<div class="mt-1 text-base font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
								Connections for this account
							</div>
							<div class="text-xs text-[var(--kb-muted)]">
								Choose which relays this account should use.
							</div>
						</div>
						<span class="kb-chip">
							<Icon icon="solar:server-square-cloud-linear" width={14} />
							{relays.length}
						</span>
					</div>

					<div class="kb-card-muted px-3 py-3 text-sm text-[var(--kb-muted)]">
						These connections only apply to <span class="font-semibold text-[var(--kb-text)]">
							{$userProfile?.metadata?.name || $userProfile?.name || 'this account'}
						</span>.
					</div>

					<div class="flex flex-col gap-2">
						{#if relays.length > 0}
							{#each relays as relay}
								<div class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--kb-border)] bg-white/35 px-3 py-2.5 dark:bg-white/[0.03]">
									<div class="min-w-0">
										<div class="truncate text-sm font-semibold text-[var(--kb-text)]">{relay?.url}</div>
										<div class="text-xs text-[var(--kb-muted)]">
											{relay.access === 0 ? 'Read only' : relay.access === 1 ? 'Write only' : 'Read and write'}
										</div>
									</div>
									<button type="button" class="kb-icon-button size-9" onclick={() => removeRelay(relay)}>
										<Icon icon="mdi:trash-can-outline" width={16} />
									</button>
								</div>
							{/each}
						{:else}
							<div class="kb-card-muted px-4 py-3 text-sm text-[var(--kb-muted)]">
								No connections yet. Add one below.
							</div>
						{/if}
					</div>

					<div class="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
						<div class="flex min-w-0 items-center overflow-hidden rounded-[1.15rem] border border-[var(--kb-border)] bg-[var(--kb-surface-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
							<span class="flex shrink-0 items-center self-stretch border-r border-[var(--kb-border)] px-3 font-mono text-sm text-[var(--kb-muted)]">
								wss://
							</span>
							<input
								type="text"
								class="min-w-0 flex-1 bg-transparent px-3 py-3 text-[var(--kb-text)] outline-none placeholder:text-[var(--kb-muted)]"
								value={relayInput}
								placeholder="relay.example.com"
								oninput={(event) => {
									const target = event.currentTarget as HTMLInputElement;
									relayInput = normalizeRelayInput(target.value);
								}}
								onkeydown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										addRelay();
									}
								}}
							/>
						</div>

						<button type="button" class="kb-button-primary px-4 text-sm sm:w-auto" onclick={addRelay}>
							<Icon icon="mdi:plus" width={18} />
							Add connection
						</button>
					</div>
				</div>

				<div class="kb-card flex flex-col gap-3 p-4">
					<div>
						<div class="kb-label">Quick copies</div>
						<div class="mt-1 text-base font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
							Public account details
						</div>
						<div class="text-xs text-[var(--kb-muted)]">
							Use these when another app asks for your public account details.
						</div>
					</div>
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<button
							type="button"
							class="kb-inline-button justify-start"
							onclick={() => copyToClipboard($userProfile.data?.pubkey || '', 'pubkey')}
						>
							<Icon icon={copiedStates.pubkey ? 'mdi:check' : 'mdi:key'} width={16} class="text-[var(--kb-accent)]" />
							{copiedStates.pubkey ? 'Copied public key' : 'Copy public key'}
						</button>
						<button
							type="button"
							class="kb-inline-button justify-start"
							onclick={() => copyToClipboard(getNpub(), 'npub')}
						>
							<Icon icon={copiedStates.npub ? 'mdi:check' : 'mdi:key-plus'} width={16} class="text-[var(--kb-accent)]" />
							{copiedStates.npub ? 'Copied npub' : 'Copy npub'}
						</button>
					</div>
				</div>

				<div class="kb-card flex flex-col gap-3 p-4">
					<div>
						<div class="kb-label">Secret keys</div>
						<div class="mt-1 text-base font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
							Move this account somewhere else
						</div>
						<div class="text-xs text-[var(--kb-muted)]">
							Only reveal these when you are moving this account to another app.
						</div>
					</div>

					<div class="rounded-2xl border border-[var(--kb-border)] bg-white/40 px-3 py-3 dark:bg-white/[0.04]">
						<div class="flex items-center justify-between gap-3">
							<div>
								<div class="text-sm font-semibold text-[var(--kb-text)]">Private key</div>
								<div class="text-xs text-[var(--kb-muted)]">Shown as nsec, which is what most Nostr apps ask for.</div>
							</div>
								<button type="button" class="kb-button-ghost" onclick={toggleNsecVisibility}>
									<Icon icon={showNsec ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} width={16} />
									{showNsec ? 'Hide' : 'Reveal'}
								</button>
						</div>

						{#if showNsec}
							<div class="mt-3 min-w-0 overflow-x-auto rounded-2xl border border-[var(--kb-border)] bg-white/50 p-2.5 font-mono text-sm text-[var(--kb-text)] dark:bg-white/[0.06]">
								{getNsec() || 'No private key available'}
							</div>
								<button
									type="button"
									class="kb-inline-button mt-3 justify-start"
									onclick={copyNsec}
								>
								<Icon icon={copiedStates.nsec ? 'mdi:check' : 'mdi:key-star'} width={16} class="text-[var(--kb-accent)]" />
								{copiedStates.nsec ? 'Copied nsec' : 'Copy nsec'}
							</button>
						{/if}
					</div>
				</div>
			{/if}
		{/if}

		<div class="mx-auto flex flex-col items-center gap-1 px-3 py-2 text-center">
			<a
				class="inline-flex items-center gap-2 text-xs text-[var(--kb-muted)] transition hover:text-[var(--kb-text)]"
				href="https://zapmeacoffee.com/npub1r0rs5q2gk0e3dk3nlc7gnu378ec6cnlenqp8a3cjhyzu6f8k5sgs4sq9ac"
				target="_blank"
			>
				<Icon icon="mdi:lightning-bolt" width={16} />
				Enjoying Yeti? Zap me a coffee
			</a>
			<div class="text-[11px] text-[var(--kb-muted)]">
				A fork of
				<a
					class="underline decoration-[var(--kb-border-strong)] underline-offset-2 transition hover:text-[var(--kb-text)]"
					href="https://keys.band/"
					target="_blank"
					rel="noreferrer"
				>
					keys.band
				</a>
			</div>
		</div>
	</div>
</AppPageItem>
