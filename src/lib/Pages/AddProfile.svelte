<script lang="ts">
	import Icon from '@iconify/svelte';
	import { generatePrivateKey, getPublicKey, nip19 } from 'nostr-tools';

	import { AppPageItem } from '$lib/components/App';
	import InputField from '$lib/components/InputField.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { profileController } from '$lib/controllers/profile.controller';
	import { currentPage, profiles } from '$lib/stores/data';
	import { Page, type Relay } from '$lib/types';
	import { NostrUtil } from '$lib/utility';
	import { generateFriendlyAccountName } from '$lib/utility/friendly-name';
	import {
		applyBackupPayload,
		downloadEncryptedBackup,
		downloadEncryptedKeysExport,
		getRemoteBackupInfo,
		markBackupCompleted,
		relayUrlsFromRelayTags,
		restoreBackupFromRelays
	} from '$lib/utility/recovery-utils';

	type RecoveryStep = {
		accountName: string;
		generated: boolean;
		backupSaved: boolean;
		keysSaved: boolean;
	};

	let name = $state('');
	let key = $state('');
	let busy = $state(false);
	let fetchingProfile = $state(false);
	let error = $state(false);
	let generated = $state(false);
	let generatedKey = $state('');
	let relays = $state<any[]>([]);
	let metadata = $state<any>(undefined);
	let remoteBackupInfo = $state<{ exists: boolean; date: string | null } | null>(null);
	let remoteBackupBusy = $state<'idle' | 'checking' | 'restoring'>('idle');
	let remoteBackupMessage = $state('');
	let remoteBackupError = $state(false);
	let fetchVersion = 0;
	let recoveryStep = $state<RecoveryStep | null>(null);
	let recoveryBusy = $state<'backup' | 'keys' | 'none'>('none');
	let recoveryStatus = $state<'idle' | 'success' | 'error'>('idle');
	let recoveryMessage = $state('');
	const isExistingKeyInput = () => {
		const trimmedKey = key.trim();
		return (
			!generated &&
			((trimmedKey.startsWith('nsec') && trimmedKey.length >= 63) || trimmedKey.length === 64)
		);
	};

	$effect(() => {
		const trimmedKey = key.trim();

		if (generated && trimmedKey !== generatedKey) {
			generated = false;
		}

		if (!trimmedKey) {
			fetchingProfile = false;
			error = false;
			metadata = undefined;
			relays = [];
			remoteBackupInfo = null;
			remoteBackupMessage = '';
			remoteBackupError = false;
			generatedKey = '';
			if (!generated) name = '';
			return;
		}

		if (!isExistingKeyInput()) {
			fetchingProfile = false;
			error = false;
			if (generated) {
				metadata = undefined;
				relays = [];
				remoteBackupInfo = null;
				remoteBackupMessage = '';
				remoteBackupError = false;
			}
			return;
		}

		void fetchProfile(trimmedKey);
	});

	const fetchProfile = async (candidate: string) => {
		const currentFetch = ++fetchVersion;
		fetchingProfile = true;
		error = false;

		try {
			const pk = await NostrUtil.checkNSEC(candidate);
			if (!pk) throw new Error("That private key doesn't look right.");

			const [nextMetadata, nextRelays] = await Promise.all([
				NostrUtil.getMetadata(getPublicKey(pk)),
				NostrUtil.getRelays(getPublicKey(pk), true)
			]);

			if (currentFetch !== fetchVersion) return;

			metadata = nextMetadata;
			relays = nextRelays?.tags || [];
			remoteBackupBusy = 'checking';
			try {
				const backupInfo = await getRemoteBackupInfo(
					getPublicKey(pk),
					relayUrlsFromRelayTags((nextRelays?.tags || []) as string[][])
				);
				remoteBackupInfo = { exists: backupInfo.exists, date: backupInfo.date };
				remoteBackupMessage = backupInfo.exists
					? 'A relay backup was found for this identity.'
					: '';
				remoteBackupError = false;
			} catch {
				remoteBackupInfo = { exists: false, date: null };
				remoteBackupMessage = '';
				remoteBackupError = false;
			} finally {
				if (currentFetch === fetchVersion) remoteBackupBusy = 'idle';
			}
			if (nextMetadata?.name) name = nextMetadata.name as string;
		} catch (err) {
			if (currentFetch !== fetchVersion) return;
			metadata = undefined;
			relays = [];
			remoteBackupInfo = null;
			remoteBackupMessage = '';
			remoteBackupError = false;
			error = true;
		} finally {
			if (currentFetch === fetchVersion) fetchingProfile = false;
		}
	};

	const restoreFromRelays = async () => {
		remoteBackupError = false;
		remoteBackupMessage = '';
		remoteBackupBusy = 'restoring';

		try {
			const privateKey = await NostrUtil.checkNSEC(key.trim());
			const confirmed = window.confirm(
				'Restore the encrypted backup saved on relays? This will replace the Yeti data on this device.'
			);
			if (!confirmed) return;

			const backupData = await restoreBackupFromRelays(
				privateKey,
				relayUrlsFromRelayTags(relays as string[][])
			);
			await applyBackupPayload(backupData);
			await markBackupCompleted();
			remoteBackupInfo = { exists: true, date: new Date().toLocaleString() };
			remoteBackupMessage = `Restored ${backupData.profiles.length} profile(s) from relays.`;
			currentPage.set(Page.Home);
		} catch (err) {
			remoteBackupError = true;
			remoteBackupMessage =
				err instanceof Error ? err.message : 'Could not restore the relay backup.';
		} finally {
			remoteBackupBusy = 'idle';
		}
	};

	const save = async () => {
		busy = true;
		try {
			const savedName = name.trim();
			const wasGenerated = generated;
			const relayList: Relay[] = [];
			if (relays.length > 0) {
				relays.forEach((relay) => {
					relayList.push({
						url: relay[1],
						enabled: true,
						created_at: new Date(),
						access:
							relay.length > 2 ? (relay[2] === 'read' ? 0 : relay[2] === 'write' ? 1 : 2) : 2
					});
				});
			}

			await profileController.createProfile(name, key, metadata, relayList);
			if (generated) {
				try {
					await NostrUtil.createProfileMetadata(name, key);
				} catch (publishError) {
					console.error('Could not publish account details:', publishError);
				}
			}

			name = '';
			key = '';
			metadata = undefined;
			fetchingProfile = false;
			error = false;
			generated = false;
			generatedKey = '';
			relays = [];
			recoveryStep = {
				accountName: savedName,
				generated: wasGenerated,
				backupSaved: false,
				keysSaved: false
			};
			recoveryStatus = 'idle';
			recoveryMessage = '';
		} catch (err) {
			if (typeof document !== 'undefined') alert(err);
		} finally {
			busy = false;
		}
	};

	const generateKey = () => {
		const secretKey = generatePrivateKey();
		key = nip19.nsecEncode(secretKey);
		generatedKey = key;
		generated = true;
		name = generateFriendlyAccountName($profiles.map((profile) => profile.name || ''));
		metadata = undefined;
		error = false;
		relays = [];
	};

	const handleRecoveryAction = async (type: 'backup' | 'keys') => {
		recoveryBusy = type;
		recoveryStatus = 'idle';
		recoveryMessage = '';

		try {
			if (type === 'backup') {
				await downloadEncryptedBackup();
				if (recoveryStep) recoveryStep.backupSaved = true;
				recoveryMessage = 'Backup downloaded. Keep it somewhere safe.';
			} else {
				await downloadEncryptedKeysExport();
				if (recoveryStep) recoveryStep.keysSaved = true;
				recoveryMessage = 'Key export downloaded. Keep it somewhere safe.';
			}

			recoveryStatus = 'success';
		} catch (err) {
			recoveryStatus = 'error';
			recoveryMessage = err instanceof Error ? err.message : 'Could not create that file.';
		} finally {
			recoveryBusy = 'none';
		}
	};

	const leaveRecoveryStep = () => {
		if (!recoveryStep) {
			currentPage.set(Page.Home);
			return;
		}

		const hasSavedCopy = recoveryStep.backupSaved || recoveryStep.keysSaved;
		if (!hasSavedCopy) {
			const confirmed = window.confirm(
				recoveryStep.generated
					? `Leave without saving anything? Yeti cannot recover ${recoveryStep.accountName} if you later forget your passphrase and do not have this key saved somewhere else.`
					: 'Leave without saving anything? Only continue if this key is already saved somewhere safe outside Yeti.'
			);
			if (!confirmed) return;
		}

		recoveryStep = null;
		recoveryStatus = 'idle';
		recoveryMessage = '';
		currentPage.set(Page.Home);
	};
</script>

<AppPageItem name="add-identity">
	<div class="flex h-full min-h-0 flex-col gap-2 overflow-x-hidden overflow-y-auto pb-1 pt-1">
		{#if recoveryStep}
			<div class="kb-card min-w-0 p-4">
				<div class="kb-label">Recovery</div>
				<div class="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
					Save a recovery copy before you leave
				</div>
				<div class="mt-1 text-sm text-[var(--kb-muted)]">
					{recoveryStep.accountName} is now saved in Yeti.
				</div>
			</div>

			<div class="kb-card min-w-0 flex flex-col gap-3 p-4">
				<div class="kb-card-muted flex items-start gap-3 px-3 py-3">
					<span class="kb-site-orb shrink-0 text-[var(--kb-warning)]">
						<Icon icon="solar:danger-triangle-linear" width={18} />
					</span>
					<div>
						<div class="text-sm font-semibold text-[var(--kb-text)]">
							Yeti cannot recover a lost passphrase
						</div>
						<div class="text-sm text-[var(--kb-muted)]">
							{#if recoveryStep.generated}
								This key was created in Yeti. If you forget your passphrase and do not save a
								copy now, this account can be lost.
							{:else}
								If this key is not already saved somewhere else, download a backup or export now.
							{/if}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-2">
					<button
						type="button"
						class="kb-button-primary w-full justify-between px-4 text-left"
						disabled={recoveryBusy !== 'none'}
						onclick={() => handleRecoveryAction('backup')}
					>
						<span class="flex items-center gap-3">
							<Icon icon="mdi:backup-restore" width={18} />
							Create backup
						</span>
						{#if recoveryStep.backupSaved}
							<span class="rounded-full bg-white/96 px-2.5 py-1 text-[11px] font-semibold text-[var(--kb-accent-strong)] shadow-sm">
								Saved
							</span>
						{/if}
					</button>

					<div class="px-1 text-xs text-[var(--kb-muted)]">
						One file with your accounts and settings.
					</div>

					<button
						type="button"
						class="kb-button-secondary w-full justify-between px-4 text-left"
						disabled={recoveryBusy !== 'none'}
						onclick={() => handleRecoveryAction('keys')}
					>
						<span class="flex items-center gap-3">
							<Icon icon="mdi:key-outline" width={18} />
							Export keys
						</span>
						{#if recoveryStep.keysSaved}
							<span class="rounded-full bg-white/96 px-2.5 py-1 text-[11px] font-semibold text-[var(--kb-accent-strong)] shadow-sm">
								Saved
							</span>
						{/if}
					</button>

					<div class="px-1 text-xs text-[var(--kb-muted)]">
						Just the secret keys, for moving to another app.
					</div>
				</div>

				{#if recoveryStatus !== 'idle'}
					<div
						class="kb-card-muted px-3 py-3 text-sm"
						style:color={recoveryStatus === 'error' ? 'var(--kb-danger)' : 'var(--kb-text)'}
					>
						{recoveryMessage}
					</div>
				{/if}

				<button type="button" class="kb-button-ghost w-full" onclick={leaveRecoveryStep}>
					{#if recoveryStep.backupSaved || recoveryStep.keysSaved}
						Done
					{:else if recoveryStep.generated}
						Skip for now
					{:else}
						I already saved it elsewhere
					{/if}
				</button>
			</div>
		{:else}
			<div class="kb-card min-w-0 p-4">
				<div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
					<div class="min-w-0">
						<div class="kb-label">Add an identity</div>
						<div class="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
							Use an existing key or create one
						</div>
					</div>

					<button
						type="button"
						class="kb-button-secondary h-10 w-full shrink-0 px-3 py-2 text-sm sm:w-auto"
						onclick={generateKey}
					>
						<Icon icon="solar:magic-stick-3-linear" width={16} />
						Generate
					</button>
				</div>
			</div>

			<div class="kb-card min-w-0 flex flex-col gap-3 p-4">
				<div class="kb-section-stack">
					<label class="kb-label" for="private-key">Private key</label>
					<InputField bind:value={key} placeholder="Paste your private key" />
				</div>

				{#if isExistingKeyInput()}
					<div class="kb-section-stack">
						<label class="kb-label" for="profile-name">Display name</label>
						<InputField bind:value={name} placeholder="Identity name" />
					</div>
				{/if}

				{#if fetchingProfile}
					<div class="kb-card-muted flex items-center gap-3 px-3 py-3">
						<Spinner sizeClass="size-8" />
						<div>
							<div class="text-sm font-semibold text-[var(--kb-text)]">Loading identity details</div>
							<div class="text-sm text-[var(--kb-muted)]">
								Getting the name, picture, and network info.
							</div>
						</div>
					</div>
				{:else if metadata?.name && isExistingKeyInput()}
					<div class="kb-card-muted flex items-center gap-3 px-3 py-3">
						{#if metadata?.picture}
							<img src={metadata.picture} alt={metadata.name} class="size-12 rounded-full object-cover shadow-lg" />
						{:else}
							<div class="flex size-12 items-center justify-center rounded-full bg-[image:var(--kb-avatar-bg)] text-sm font-bold text-[var(--kb-avatar-fg)]">
								{metadata.name?.slice(0, 1)?.toUpperCase()}
							</div>
						{/if}
						<div class="min-w-0 flex-1">
							<div class="text-base font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
								{metadata.name}
							</div>
							<div class="text-xs text-[var(--kb-muted)]">
								{relays.length} network hint{relays.length === 1 ? '' : 's'} found
							</div>
						</div>
						<span class="kb-chip" data-tone="success">
							<Icon icon="mdi:check" width={14} />
							Ready
						</span>
					</div>
				{:else if generated && key}
					<div class="kb-card-muted flex items-center gap-3 px-3 py-3">
						<span class="kb-site-orb">
							<Icon icon="solar:shield-keyhole-linear" width={18} />
						</span>
						<div>
							<div class="text-sm font-semibold text-[var(--kb-text)]">New key created</div>
							<div class="text-sm text-[var(--kb-muted)]">
							Give this identity a name, then add it.
							</div>
						</div>
					</div>
				{:else if error}
					<div class="kb-card-muted flex items-center gap-3 px-3 py-3">
						<span class="kb-site-orb text-[var(--kb-danger)]">
							<Icon icon="solar:danger-triangle-linear" width={18} />
						</span>
						<div>
							<div class="text-sm font-semibold text-[var(--kb-text)]">Could not load identity details</div>
							<div class="text-sm text-[var(--kb-muted)]">
								You can still add this key by typing a name yourself.
							</div>
						</div>
					</div>
				{/if}

				{#if isExistingKeyInput() && (remoteBackupBusy === 'checking' || remoteBackupInfo?.exists || remoteBackupMessage)}
					<div class="kb-card-muted flex flex-col gap-3 px-3 py-3">
						<div class="flex items-start gap-3">
							<span class="kb-site-orb shrink-0">
								<Icon icon="solar:cloud-download-linear" width={18} />
							</span>
							<div class="min-w-0">
								<div class="text-sm font-semibold text-[var(--kb-text)]">
									{#if remoteBackupBusy === 'checking'}
										Checking relays for a saved backup
									{:else if remoteBackupInfo?.exists}
										Relay backup found
									{:else}
										No relay backup found
									{/if}
								</div>
								<div
									class="text-sm"
									style:color={remoteBackupError ? 'var(--kb-danger)' : 'var(--kb-muted)'}
								>
									{#if remoteBackupBusy === 'checking'}
										Looking for an encrypted Yeti backup on this identity's relays.
									{:else if remoteBackupInfo?.exists && remoteBackupInfo.date}
										Saved on {remoteBackupInfo.date}. You can restore it instead of setting things up by hand.
									{:else if remoteBackupMessage}
										{remoteBackupMessage}
									{:else}
										If this identity already saved a Yeti backup on relays, it will show up here.
									{/if}
								</div>
							</div>
						</div>

						{#if remoteBackupInfo?.exists}
							<button
								type="button"
								class="kb-button-secondary w-full text-sm"
								disabled={remoteBackupBusy !== 'idle'}
								onclick={restoreFromRelays}
							>
								<Icon icon="solar:cloud-download-linear" width={18} />
								{remoteBackupBusy === 'restoring' ? 'Restoring from relays...' : 'Restore from relays'}
							</button>
						{/if}
					</div>
				{/if}
			</div>

			<div class="sticky bottom-0 z-20 mt-auto bg-[linear-gradient(180deg,transparent,var(--kb-bg)_32%)] pt-2">
				<div class="grid min-w-0 grid-cols-2 gap-2">
					<button type="button" class="kb-button-secondary min-w-0 w-full" onclick={generateKey}>
						<Icon icon="mdi:refresh" width={18} />
						New key
					</button>
					<button
						type="button"
						class="kb-button-primary min-w-0 w-full"
						disabled={busy || !name || !key}
						onclick={save}
					>
						<Icon icon="carbon:save" width={18} />
						{busy ? 'Adding...' : 'Add identity'}
					</button>
				</div>
			</div>
		{/if}
	</div>
</AppPageItem>
