<script lang="ts">
	import Icon from '@iconify/svelte';
	import { nip19 } from 'nostr-tools';
	import { createEventDispatcher, tick } from 'svelte';
	import { get } from 'svelte/store';

	import Avatar from '$lib/components/ui/Avatar.svelte';
	import { profileController } from '$lib/controllers/profile.controller';
	import { currentPage, profiles, userProfile } from '$lib/stores/data';
	import { Page } from '$lib/types';

	import type { Profile } from '$lib/types/profile';

	const dispatch = createEventDispatcher<{ showActivity: undefined }>();

	let openMenuProfileId = $state<string | null>(null);
	let busyProfileId = $state<string | null>(null);
	let copiedNpubProfileId = $state<string | null>(null);
	let menuDialog = $state<HTMLDialogElement | null>(null);
	let selectedMenuProfile = $derived(
		$profiles.find((profile) => profile.id === openMenuProfileId)
	);

	const closeProfileMenu = () => {
		openMenuProfileId = null;
	};

	const setActiveProfile = async (profile: Profile) => {
		if (!profile.id) return;
		if (busyProfileId) return;
		if (get(userProfile)?.id === profile.id) return;
		busyProfileId = profile.id;
		try {
			await profileController.loadProfile(profile);
		} finally {
			busyProfileId = null;
		}
	};

	const removeProfile = async (profile: Profile) => {
		const profileName = profile.name || 'this account';
		const confirmed = window.confirm(
			`Delete ${profileName}?\n\nThis will remove it from Yeti and cannot be undone.`
		);
		if (!confirmed) return;

		await profileController.deleteProfile(profile);
		await tick();
		openMenuProfileId = null;
	};

	const shouldIgnoreSwitch = (event: MouseEvent | KeyboardEvent): boolean => {
		const target = event.target;
		return target instanceof Element && !!target.closest('[data-no-switch="true"]');
	};

	const openProfileMenu = async (_event: MouseEvent, profile: Profile) => {
		if (!profile.id) return;

		if (openMenuProfileId === profile.id) {
			openMenuProfileId = null;
			return;
		}

		openMenuProfileId = profile.id;
		await tick();
	};

	const copyNpub = async (profile: Profile) => {
		const pubkey = profile.data?.pubkey || profile.id || '';
		if (!pubkey) return;

		try {
			await navigator.clipboard.writeText(nip19.npubEncode(pubkey));
			copiedNpubProfileId = profile.id || null;
			window.setTimeout(() => {
				if (copiedNpubProfileId === profile.id) copiedNpubProfileId = null;
			}, 1800);
		} catch {
			alert('Could not copy npub.');
		}
	};

	const getShortNpub = (profile: Profile): string => {
		const pubkey = profile.data?.pubkey || profile.id || '';
		if (!pubkey) return '';

		try {
			const npub = nip19.npubEncode(pubkey);
			return `${npub.slice(0, 14)}...`;
		} catch {
			return `${pubkey.slice(0, 14)}...`;
		}
	};

	$effect(() => {
		if (!openMenuProfileId) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') openMenuProfileId = null;
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	$effect(() => {
		if (!menuDialog) return;

		if (selectedMenuProfile) {
			if (!menuDialog.open) menuDialog.showModal();
			return;
		}

		if (menuDialog.open) menuDialog.close();
	});

	const handleDialogClose = () => {
		if (openMenuProfileId) openMenuProfileId = null;
	};

	const handleDialogClick = (event: MouseEvent) => {
		if (event.target === menuDialog) {
			menuDialog?.close();
		}
	};
</script>

<div class="relative overflow-visible">
	<div class="kb-card overflow-visible p-4">
		<div class="flex items-center justify-between gap-3">
			<div>
				<div class="text-lg font-semibold tracking-[-0.02em] text-[var(--kb-text)]">Identities</div>
			</div>
			<button
				type="button"
				class="kb-button-secondary kb-button-secondary-compact px-4 text-sm"
				onclick={() => currentPage.set(Page.AddProfile)}
			>
				<Icon icon="mdi:plus" width={16} />
				Add
			</button>
		</div>

		{#if $profiles.length === 0}
			<div class="kb-card-muted mt-3 px-4 py-5 text-sm text-[var(--kb-muted)]">
				No identities yet. Add one to start signing.
			</div>
		{:else}
			<div class="mt-3 flex flex-col gap-2 overflow-visible">
				{#each $profiles as profile}
					<div
						class="relative cursor-pointer rounded-2xl border px-3 py-3 transition"
						class:z-20={openMenuProfileId === profile.id}
						style:background={$userProfile?.id === profile.id ? 'var(--kb-surface-strong)' : 'var(--kb-surface-muted)'}
						style:border-color={$userProfile?.id === profile.id ? 'var(--kb-accent)' : 'var(--kb-border)'}
						onclick={(event) => {
							if (shouldIgnoreSwitch(event)) return;
							setActiveProfile(profile);
						}}
						onkeydown={(event) => {
							if (shouldIgnoreSwitch(event)) return;
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								setActiveProfile(profile);
							}
						}}
						role="button"
						tabindex="0"
					>
						<div class="flex items-center justify-between gap-3">
							<div class="min-w-0 flex items-center gap-3">
								<Avatar
									alt={profile.name || 'Account'}
									sizeClass="size-10"
									src={profile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
								/>
								<div class="min-w-0">
									<div class="truncate text-sm font-semibold text-[var(--kb-text)]">
										{profile.name || 'Unnamed account'}
									</div>
									<div class="truncate text-xs text-[var(--kb-muted)]">{getShortNpub(profile)}</div>
								</div>
							</div>

							<div class="flex shrink-0 items-center gap-2">
								{#if $userProfile?.id === profile.id}
									<span class="kb-chip" data-tone="success">Active</span>
								{/if}
								<button
									type="button"
									class="kb-icon-button size-7 rounded-[0.85rem]"
									aria-label="Open account menu"
									data-no-switch="true"
									data-menu-trigger-id={profile.id}
									onclick={(event) => openProfileMenu(event, profile)}
								>
									<Icon icon="solar:menu-dots-bold" width={14} />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<dialog
		bind:this={menuDialog}
		class="kb-dialog-sheet"
		onclose={handleDialogClose}
		onclick={handleDialogClick}
		oncancel={() => {
			openMenuProfileId = null;
		}}
	>
		{#if selectedMenuProfile}
			<div class="kb-card-strong mx-auto flex max-h-[calc(100dvh-1.5rem)] w-[min(100vw-1.5rem,22rem)] min-h-0 flex-col overflow-hidden p-3 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
				<div class="mb-2 flex items-center gap-3 rounded-2xl bg-[var(--kb-surface-muted)] px-3 py-3">
					<Avatar
						alt={selectedMenuProfile.name || 'Account'}
						sizeClass="size-10"
						src={selectedMenuProfile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
					/>
					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-semibold text-[var(--kb-text)]">
							{selectedMenuProfile.name || 'Unnamed account'}
						</div>
						<div class="truncate text-xs text-[var(--kb-muted)]">
							{getShortNpub(selectedMenuProfile)}
						</div>
					</div>
					{#if $userProfile?.id === selectedMenuProfile.id}
						<span class="kb-chip" data-tone="success">Active</span>
					{/if}
				</div>

				<div class="kb-menu min-h-0 flex-1 overflow-y-auto">
					<button
						type="button"
						class="kb-menu-item"
						onclick={async () => {
							await setActiveProfile(selectedMenuProfile);
							dispatch('showActivity');
							closeProfileMenu();
						}}
					>
						<span class="text-sm text-[var(--kb-text)]">View activity</span>
						<Icon icon="solar:history-linear" width={16} class="text-[var(--kb-muted)]" />
					</button>
					<button
						type="button"
						class="kb-menu-item"
						onclick={() => copyNpub(selectedMenuProfile)}
					>
						<span class="text-sm text-[var(--kb-text)]">
							{copiedNpubProfileId === selectedMenuProfile.id
								? 'Copied public key'
								: 'Copy public key'}
						</span>
						<Icon
							icon={copiedNpubProfileId === selectedMenuProfile.id ? 'mdi:check' : 'solar:copy-linear'}
							width={16}
							class={copiedNpubProfileId === selectedMenuProfile.id
								? 'text-[var(--kb-success)]'
								: 'text-[var(--kb-muted)]'}
						/>
					</button>
					<button
						type="button"
						class="kb-menu-item"
						onclick={() => {
							currentPage.set(Page.Settings);
							closeProfileMenu();
						}}
					>
						<span class="text-sm text-[var(--kb-text)]">Open settings</span>
						<Icon icon="solar:settings-linear" width={16} class="text-[var(--kb-muted)]" />
					</button>
					<button
						type="button"
						class="kb-menu-item"
						onclick={() => removeProfile(selectedMenuProfile)}
					>
						<span class="text-sm text-[var(--kb-danger)]">Delete identity</span>
						<Icon icon="mdi:trash-can-outline" width={16} class="text-[var(--kb-danger)]" />
					</button>
				</div>

				<button
					type="button"
					class="mt-2 w-full rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--kb-muted)] transition hover:bg-[var(--kb-surface-muted)] hover:text-[var(--kb-text)]"
					onclick={closeProfileMenu}
				>
					Close
				</button>
			</div>
		{/if}
	</dialog>
</div>

<style>
	:global(.kb-dialog-sheet) {
		width: 100%;
		max-width: none;
		border: 0;
		padding: 0.75rem;
		background: transparent;
	}

	:global(.kb-dialog-sheet::backdrop) {
		background: rgba(19, 15, 10, 0.18);
		backdrop-filter: blur(1px);
	}
</style>
