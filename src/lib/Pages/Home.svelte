<script lang="ts">
	import Icon from '@iconify/svelte';
	import { AppPageItem } from '$lib/components/App';
	import Authorization from '$lib/components/Authorization.svelte';
	import AuthorizedApp from '$lib/components/AuthorizedApp.svelte';
	import IdentityList from '$lib/components/IdentityList.svelte';
	import RecentActivity from '$lib/components/RecentActivity.svelte';
	import { browserController } from '$lib/controllers';
	import { currentTab } from '$lib/stores/data';
	import { urlToDomain, urlToScope } from '$lib/utility/utils';

	let showAuthorization = $state(false);
	let activeTab = $state<'identities' | 'activity'>('identities');
</script>

<AppPageItem name="home">
	<div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pb-1 pt-1">
		{#if !showAuthorization}
			<div class="kb-card p-2">
				<div class="grid grid-cols-2 gap-2">
					<button
						type="button"
						class="rounded-2xl px-3 py-2 text-sm font-semibold transition"
						style:background={activeTab === 'identities' ? 'var(--kb-surface-strong)' : 'transparent'}
						style:color={activeTab === 'identities' ? 'var(--kb-text)' : 'var(--kb-muted)'}
						onclick={() => (activeTab = 'identities')}
					>
						<Icon icon="solar:user-id-linear" width={16} class="mr-2 inline-block" />
						Identities
					</button>
					<button
						type="button"
						class="rounded-2xl px-3 py-2 text-sm font-semibold transition"
						style:background={activeTab === 'activity' ? 'var(--kb-surface-strong)' : 'transparent'}
						style:color={activeTab === 'activity' ? 'var(--kb-text)' : 'var(--kb-muted)'}
						onclick={() => (activeTab = 'activity')}
					>
						<Icon icon="solar:history-linear" width={16} class="mr-2 inline-block" />
						Activity
					</button>
				</div>
			</div>

			{#if activeTab === 'identities'}
				<IdentityList on:showActivity={() => (activeTab = 'activity')} />
				{:else}
					<AuthorizedApp
						domain={urlToDomain($currentTab?.url || '')}
						url={$currentTab?.url || ''}
					on:showAuthorization={() => {
						showAuthorization = !showAuthorization;
					}}
					/>
					<RecentActivity domain={urlToScope($currentTab?.url || '')} />
				{/if}
			{:else}
				<Authorization
					domain={urlToDomain($currentTab?.url || '')}
					scope={urlToScope($currentTab?.url || '')}
					isPopup={false}
					popupType={'permission'}
				oncancel={async (event) => {
					try {
						await browserController.sendAuthorizationResponse(
							false,
							event.detail.duration,
							$currentTab?.url,
							undefined
						);
						await browserController.switchIcon({ tabId: $currentTab?.id as number });
					} catch (error) {
						console.error('Error processing cancel:', error);
					}
					showAuthorization = false;
				}}
				onaccepted={async (event) => {
					try {
						await browserController.sendAuthorizationResponse(
							true,
							event.detail.duration,
							$currentTab?.url,
							undefined
						);
						await browserController.switchIcon({ tabId: $currentTab?.id as number });
					} catch (error) {
						console.error('Error processing accept:', error);
					}
					showAuthorization = false;
				}}
			/>
		{/if}
	</div>
</AppPageItem>
