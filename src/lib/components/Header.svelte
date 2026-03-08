<script lang="ts">
import { onMount } from 'svelte';
import Icon from '@iconify/svelte';

import { Page } from '$lib/types';
import { backupCompleted, currentPage, profiles, theme } from '$lib/stores/data';
import { profileController } from '$lib/controllers/profile.controller';
import { loadBackupCompletedState } from '$lib/utility/recovery-utils';

const pageTitle = (page: string) =>
	page.slice(0, 1).toUpperCase() + page.slice(1).replaceAll('-', ' ');

onMount(() => {
	loadBackupCompletedState().catch(() => {});
});
</script>

{#if $currentPage === Page.Home}
	<div class="flex items-center justify-between gap-3">
		<div class="min-w-0 flex items-center gap-2.5">
			<div class="group relative shrink-0">
				<img
					src="assets/logo-on-64.png"
					alt="Yeti logo"
					class="size-9 rounded-full object-cover"
				/>
				<div
					class="pointer-events-none absolute left-0 top-full z-20 mt-2 whitespace-nowrap rounded-full border border-[var(--kb-border-strong)] bg-[var(--kb-surface-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--kb-text)] opacity-0 shadow-[var(--kb-shadow)] transition duration-150 group-hover:opacity-100"
				>
					Brr-hello! ❄️
				</div>
			</div>
			<div class="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
				Yeti
			</div>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="kb-icon-button kb-icon-button-sm"
				aria-label={$theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
				onclick={() => {
					$theme = $theme === 'dark' ? 'light' : 'dark';
					profileController.switchTheme($theme);
				}}
			>
				<Icon icon={$theme === 'dark' ? 'solar:sun-2-linear' : 'solar:moon-stars-linear'} width={18} />
			</button>

			<button
				type="button"
				class="kb-icon-button kb-icon-button-sm relative"
				aria-label="Open settings"
				onclick={() => {
					$currentPage = Page.Settings;
				}}
			>
				<Icon icon="solar:settings-linear" width={18} />
				{#if $profiles.length > 0 && !$backupCompleted}
					<span
						class="absolute right-1 top-1 size-2.5 rounded-full border-2 border-[var(--kb-surface-strong)] bg-[var(--kb-danger)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--kb-danger)_18%,transparent)]"
					></span>
				{/if}
			</button>
		</div>
	</div>
{:else}
	<div class="relative flex min-h-[2.85rem] items-center justify-center">
		<button
			type="button"
			class="kb-icon-button absolute left-0 top-1/2 -translate-y-1/2"
			aria-label="Go back"
			onclick={() => {
				$currentPage = Page.Home;
			}}
		>
			<Icon icon="solar:arrow-left-linear" width={20} />
		</button>

		<div class="min-w-0 px-14 text-center">
			<div class="truncate text-lg font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
				{pageTitle($currentPage)}
			</div>
		</div>
	</div>
{/if}
