<script lang="ts">
	import { derived } from 'svelte/store';
	import Icon from '@iconify/svelte';

	import { clickOutside } from '$lib/actions/clickOutside';
	import { userProfile } from '$lib/stores/data';
	import AccountDropdownMenu from '$lib/components/AccountDropdownMenu.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';

	let {
		canEdit = true,
		eyebrow = 'Current account',
		note = 'Pick the account this website will use.'
	}: {
		canEdit?: boolean;
		eyebrow?: string;
		note?: string;
	} = $props();

	let isOpen = $state(false);

	const displayName = derived(userProfile, ($userProfile) => {
		const name = $userProfile?.metadata?.name || $userProfile?.name || 'Select account';
		return name.length > 18 ? `${name.slice(0, 18)}...` : name;
	});
</script>

<div class="relative" use:clickOutside={isOpen ? () => (isOpen = false) : undefined}>
	<button
		type="button"
		class="kb-card group flex w-full flex-col gap-3 p-4 text-left"
		onclick={() => (isOpen = !isOpen)}
		aria-expanded={isOpen}
		aria-haspopup="menu"
	>
		<div class="flex items-center justify-between gap-3">
			<span class="kb-label">{eyebrow}</span>
			<span class="kb-chip">
				<Icon icon="solar:key-linear" width={16} />
				Signing
			</span>
		</div>

		<div class="flex items-center gap-3">
			<Avatar
				alt={$displayName}
				sizeClass="size-12"
				src={$userProfile?.metadata?.picture || 'https://toastr.space/images/toastr.png'}
			/>
			<div class="min-w-0 flex-1">
				<div class="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
					{$displayName}
				</div>
				<div class="truncate text-sm text-[var(--kb-muted)]">{note}</div>
			</div>
			<div class="flex size-9 items-center justify-center rounded-2xl bg-white/50 text-[var(--kb-muted-strong)] transition group-hover:bg-white/80 dark:bg-white/5 dark:group-hover:bg-white/10">
				<Icon icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} />
			</div>
		</div>
	</button>

	<AccountDropdownMenu
		accountDropdownMenuOpen={isOpen}
		{canEdit}
		onclose={() => (isOpen = false)}
	/>
</div>
