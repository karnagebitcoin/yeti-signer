<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';

	import { AppPage } from '$lib/components/App';
	import AccountSwitcher from '$lib/components/AccountSwitcher.svelte';
	import Authorization from '$lib/components/Authorization.svelte';
	import SignerOnboarding from '$lib/components/SignerOnboarding.svelte';
	import StorageUnlock from '$lib/components/StorageUnlock.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import { profileController } from '$lib/controllers/profile.controller';
	import { PageAddProfile, PageHome, PageSettings } from '$lib/Pages';
	import { browserController } from '$lib/controllers';
	import { urlToDomain, urlToScope, NostrUtil } from '$lib/utility';
	import {
		getStorageProtectionState,
		initializeStorageProtection,
		isStorageLockedError,
		unlockStorage
	} from '$lib/utility/crypto-utils';
	import { resetAppData } from '$lib/utility/recovery-utils';
	import { SIGNER_BEHAVIOR_KEY } from '$lib/utility/signer-behavior';
	import { currentPage, profiles, sessionData, userProfile } from '$lib/stores/data';
	import { web } from '$lib/utility';
	import { Page } from '$lib/types';

	import type { PopupParams } from '$lib/types';

	let parameter = $state<PopupParams | null>(null);
	let isAuthorizationRequest = $state(false);
	let needsOnboarding = $state(false);
	let storageLockMode = $state<'none' | 'setup' | 'unlock'>('none');
	let storageLockError = $state('');
	let storageBusy = $state(false);

	const syncBackgroundUnlock = async (passphrase: string) => {
		await web.runtime.sendMessage({ internal: 'storage.unlock', passphrase });
	};

	const hydrateRequestState = async () => {
		const urlParams = new URLSearchParams(document.location.search);
		const queryParam = urlParams?.get('query');

		if (!queryParam) {
			isAuthorizationRequest = false;
			parameter = null;
			return;
		}

		try {
			const dataId = atob(queryParam);
			parameter = (await sessionData.getById(dataId)) || null;
			isAuthorizationRequest = !!parameter;

			if (isAuthorizationRequest) {
				document.body.style.minWidth = '420px';
				document.body.style.minHeight = '560px';
				document.body.style.width = '100%';
				document.body.style.height = '100%';
				document.title = 'Yeti Authorization';
				needsOnboarding = false;
			}
		} catch (error) {
			console.error('[Popup] Error parsing query param:', error);
			parameter = null;
			isAuthorizationRequest = false;
			needsOnboarding = false;
		}
	};

	const finishUnlockedLoad = async () => {
		await profileController.loadProfiles();

		if (!isAuthorizationRequest) {
			const behavior = await browserController.get(SIGNER_BEHAVIOR_KEY);
			needsOnboarding = !behavior?.[SIGNER_BEHAVIOR_KEY];
		}
	};

	async function handleData() {
		await profileController.loadTheme();
		await profileController.loadDuration();
		NostrUtil.prepareRelayPool();
		await hydrateRequestState();

		const protectionState = await getStorageProtectionState();
		if (protectionState === 'setup') {
			storageLockMode = 'setup';
			return;
		}
		if (protectionState === 'locked') {
			storageLockMode = 'unlock';
			return;
		}

		await finishUnlockedLoad();
	}

	const handleStorageSubmit = async (event: CustomEvent<{ passphrase: string }>) => {
		storageBusy = true;
		storageLockError = '';
		try {
			if (storageLockMode === 'setup') {
				await initializeStorageProtection(event.detail.passphrase);
			} else {
				await unlockStorage(event.detail.passphrase);
			}
			await syncBackgroundUnlock(event.detail.passphrase);
			storageLockMode = 'none';
			await finishUnlockedLoad();
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Could not open your saved accounts.';
			storageLockError = message;
			if (!isStorageLockedError(error)) {
				console.error('[Popup] Storage unlock failed:', error);
			}
		} finally {
			storageBusy = false;
		}
	};

	const getUnlockedViewUrl = () => {
		if (window.location.pathname.endsWith('sidepanel.html')) {
			return web.runtime.getURL('sidepanel.html');
		}

		return web.runtime.getURL('popup.html');
	};

	const handleStorageReset = async () => {
		const confirmed = window.confirm(
			'Reset Yeti on this device? This removes every saved account, your passphrase, and saved website choices from this browser. Only do this if you still have your key or a backup somewhere else.'
		);
		if (!confirmed) return;

		storageBusy = true;
		storageLockError = '';

		try {
			await web.runtime.sendMessage({ internal: 'storage.reset' });
			await resetAppData();
			profiles.set([]);
			userProfile.set({});
			currentPage.set(Page.Home);
			needsOnboarding = false;
			parameter = null;
			isAuthorizationRequest = false;
			window.location.replace(getUnlockedViewUrl());
		} catch (error) {
			storageLockError =
				error instanceof Error ? error.message : 'Could not reset Yeti on this device.';
		} finally {
			storageBusy = false;
		}
	};

	const promise = handleData();

	onMount(() => {
		const isSidePanel = document.getElementById('sidepanel') !== null;

		if (!isAuthorizationRequest && !isSidePanel) {
			document.body.style.width = '420px';
			document.body.style.height = '600px';
		}
	});
</script>

{#await promise}
	<div class="kb-app-shell flex h-full min-h-[600px] flex-col items-center justify-center p-5">
		<div class="kb-panel flex w-full max-w-sm flex-col items-center gap-4 p-8 text-center">
			<Spinner sizeClass="size-12" />
			<div>
				<div class="text-lg font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
					Getting things ready
				</div>
				<div class="mt-1 text-sm text-[var(--kb-muted)]">
					Loading your accounts and settings.
				</div>
			</div>
		</div>
	</div>
	{:then}
	{#if isAuthorizationRequest && parameter}
		<div class="kb-app-shell h-full min-h-[560px] p-3">
			<div class="kb-panel flex h-full flex-col gap-3 p-3">
				{#if storageLockMode !== 'none'}
					<StorageUnlock
						mode={storageLockMode === 'setup' ? 'setup' : 'unlock'}
						busy={storageBusy}
						errorMessage={storageLockError}
						on:submit={handleStorageSubmit}
						on:reset={handleStorageReset}
					/>
				{:else}
				{#if parameter.previousProfile && parameter.previousProfile.id !== $userProfile.id}
					<div class="kb-card-muted flex items-start gap-3 px-4 py-3">
						<span class="kb-site-orb text-[var(--kb-warning)]">
							<Icon icon="solar:danger-triangle-linear" width={18} />
						</span>
						<div class="text-sm text-[var(--kb-muted-strong)]">
							<div class="font-semibold text-[var(--kb-text)]">Using a different account</div>
							<div>
								This request started with <span class="font-semibold">{parameter.previousProfile.name}</span>.
							</div>
						</div>
					</div>
				{/if}

				<AccountSwitcher
					canEdit={false}
					eyebrow="Account for this request"
					note="This account will be used for the choice below."
				/>

				<div class="min-h-0 flex-1">
						<Authorization
							domain={urlToDomain(parameter.url || '')}
							scope={urlToScope(parameter.url || '')}
							eventData={parameter.data}
							isPopup={true}
						popupType={parameter.type}
						oncancel={(event) =>
							browserController.sendAuthorizationResponse(
								false,
								event.detail.duration,
								parameter?.url,
								parameter?.requestId || ''
							)}
						onaccepted={(event) =>
							browserController.sendAuthorizationResponse(
								true,
								event.detail.duration,
								parameter?.url,
								parameter?.requestId || ''
							)}
					/>
				</div>
				{/if}
			</div>
		</div>
		{:else}
			<div class="kb-app-shell h-full min-h-[600px] p-3">
				<div class="kb-panel flex h-full min-h-0 w-full flex-col overflow-hidden p-4">
					{#if storageLockMode !== 'none'}
						<StorageUnlock
							mode={storageLockMode === 'setup' ? 'setup' : 'unlock'}
							busy={storageBusy}
							errorMessage={storageLockError}
							on:submit={handleStorageSubmit}
							on:reset={handleStorageReset}
						/>
					{:else if needsOnboarding}
						<SignerOnboarding
							on:complete={() => {
							needsOnboarding = false;
						}}
					/>
				{:else}
					<AppPage>
						<PageHome />
						<PageSettings />
						<PageAddProfile />
					</AppPage>
				{/if}
			</div>
		</div>
	{/if}
{/await}
