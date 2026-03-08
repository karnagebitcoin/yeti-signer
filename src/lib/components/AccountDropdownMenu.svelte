<script lang="ts">
	import Icon from '@iconify/svelte';
	import { tick } from 'svelte';

	import { Page } from '$lib/types';
	import { currentPage, profiles, userProfile } from '$lib/stores/data';
	import { profileController } from '$lib/controllers/profile.controller';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	import type { Profile } from '$lib/types/profile';

	export let accountDropdownMenuOpen = false;
	export let canEdit = true;
	export let onclose: () => void = () => {};

	const load = async (profile: Profile) => {
		await profileController.loadProfile(profile);
		onclose();
	};

	const deleteProfile = async (profile: Profile) => {
		const profileName = profile.name || 'this account';
		const confirmed = window.confirm(
			`Delete ${profileName}?\n\nThis will remove it from Yeti and cannot be undone.`
		);
		if (!confirmed) return;

		await profileController.deleteProfile(profile);
		await tick();
		onclose();
	};
</script>

{#if accountDropdownMenuOpen}
	<div class="absolute inset-x-0 top-[calc(100%+0.75rem)] z-50">
		<div class="kb-menu">
			<div class="flex items-center justify-between px-3 pb-2 pt-1">
				<div class="kb-label">Accounts</div>
				<span class="text-xs text-[var(--kb-muted)]">{$profiles.length} saved</span>
			</div>

			<div class="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
				{#each $profiles as profile}
					<div class="kb-menu-item">
						<button
							type="button"
							class="flex min-w-0 flex-1 items-center gap-3 text-left"
							onclick={() => load(profile)}
						>
								<Avatar
									alt={profile.name || 'Yeti'}
									sizeClass="size-10"
									src={profile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
								/>
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm font-semibold text-[var(--kb-text)]">
									{profile.name || 'Unnamed account'}
								</div>
								<div class="truncate text-xs text-[var(--kb-muted)]">
									{profile.id?.slice(0, 12)}...
								</div>
							</div>
						</button>

						<div class="flex items-center gap-2">
							{#if $userProfile?.id === profile?.id}
								<span class="kb-chip" data-tone="success">
									<Icon icon="mdi:check" width={14} />
									Current
								</span>
							{/if}

							{#if canEdit}
								<button
									type="button"
									class="kb-icon-button size-9"
									title="Delete profile"
									onclick={() => deleteProfile(profile)}
								>
									<Icon icon="mdi:trash-can-outline" width={16} />
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>

			{#if canEdit}
				<div class="kb-divider my-2"></div>
				<button
					type="button"
					class="kb-menu-item text-[var(--kb-text)]"
					onclick={() => {
						currentPage.set(Page.AddProfile);
						onclose();
					}}
				>
					<div class="flex items-center gap-3">
						<span class="kb-site-orb">
							<Icon icon="mdi:plus" width={18} />
						</span>
						<div>
							<div class="text-sm font-semibold">Add another identity</div>
							<div class="text-xs text-[var(--kb-muted)]">Use a key you already have or create a new one.</div>
						</div>
					</div>
					<Icon icon="mdi:arrow-right" width={18} class="text-[var(--kb-muted)]" />
				</button>
			{/if}
		</div>
	</div>
{/if}
