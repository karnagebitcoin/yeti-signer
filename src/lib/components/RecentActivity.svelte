<script lang="ts">
	import Icon from '@iconify/svelte';

	import { timeAgo, tr } from '$lib/utility';
	import { userProfile } from '$lib/stores/data';

	import type { WebSiteHistory } from '$lib/types';

	export let domain = '';

	let historyList: WebSiteHistory[] = [];
	let historyCount = 0;

	$: if ($userProfile.data?.webSites) {
		const histories = $userProfile.data?.webSites[domain]?.history || [];
		historyCount = histories.length;
		historyList = histories.toReversed().slice(0, 8) as WebSiteHistory[];
	}
</script>

<div class="kb-card flex flex-1 flex-col p-4">
	<div class="flex items-center justify-between gap-3">
		<div class="kb-label">Recent Activity</div>
		<span class="kb-chip whitespace-nowrap">
			<Icon icon="solar:history-linear" width={14} />
			{historyCount} items
		</span>
	</div>

	{#if historyList.length === 0}
		<div class="kb-card-muted mt-4 flex flex-1 items-center justify-center px-4 py-6 text-center text-sm text-[var(--kb-muted)]">
			No activity yet for this website.
		</div>
	{:else}
		<div class="mt-4 flex flex-col gap-2">
			{#each historyList as siteHistory}
				<div class="flex items-center justify-between gap-3 rounded-2xl border border-[var(--kb-border)] bg-white/35 px-3 py-3 dark:bg-white/[0.03]">
					<div class="flex min-w-0 items-center gap-3">
						<span
							class="kb-site-orb h-9 w-9 text-sm"
							style:color={!siteHistory.accepted ? 'var(--kb-danger)' : 'var(--kb-accent)'}
						>
							<Icon icon={siteHistory.accepted ? 'mdi:check' : 'mdi:close'} width={16} />
						</span>
						<div class="min-w-0">
							<div class="truncate text-sm font-semibold text-[var(--kb-text)]">
								{tr(siteHistory.type)}
							</div>
							<div class="text-xs text-[var(--kb-muted)]">
								{siteHistory.accepted ? 'Approved' : 'Rejected'}
							</div>
						</div>
					</div>
					<div class="shrink-0 text-xs text-[var(--kb-muted)]">
						{timeAgo.format(new Date(siteHistory.created_at))}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
