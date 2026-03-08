<script lang="ts">
	import Icon from '@iconify/svelte';
	import { createEventDispatcher } from 'svelte';

	import { timeAgo } from '$lib/utility';
	import { isAccepted, isAlways, timeStop } from '$lib/stores/data';

	export let domain = '';

	const dispatcher = createEventDispatcher();

	$: statusLabel = $isAlways
		? $isAccepted
			? 'Allowed'
			: 'Blocked'
		: $isAccepted
			? timeAgo.format($timeStop).replace('in ', 'Ends in ')
			: 'No saved choice';
</script>

<div class="kb-card p-4">
	<div class="flex items-start justify-between gap-4">
		<div class="min-w-0 flex-1">
			<div class="kb-label">This website</div>
			<div class="mt-2 min-w-0">
				<div class="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
					{domain || 'No active tab'}
				</div>
				<div class="text-sm text-[var(--kb-muted)]">
					Control what this website can ask your account to do.
				</div>
			</div>
		</div>

		<div class="flex shrink-0 flex-col items-end gap-3">
			<span class="kb-chip" data-tone={$isAccepted ? 'success' : 'danger'}>
				<Icon icon={$isAccepted ? 'mdi:check-circle-outline' : 'mdi:close-circle-outline'} width={14} />
				{statusLabel}
			</span>
			<button
				type="button"
				class="kb-icon-button"
				aria-label="Configure authorization"
				onclick={() => dispatcher('showAuthorization', true)}
			>
				<Icon icon="solar:tuning-2-linear" width={18} />
			</button>
		</div>
	</div>
</div>
