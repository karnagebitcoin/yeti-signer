<script lang="ts">
	import Icon from '@iconify/svelte';
	import { createEventDispatcher } from 'svelte';

	import { browser } from '$lib/stores/data';
	import {
		DEFAULT_SIGNER_BEHAVIOR,
		SIGNER_BEHAVIOR_KEY,
		SIGNER_BEHAVIOR_OPTIONS,
		type SignerBehaviorMode
	} from '$lib/utility/signer-behavior';

	const dispatch = createEventDispatcher<{ complete: { mode: SignerBehaviorMode } }>();

	let selectedMode = $state<SignerBehaviorMode>(DEFAULT_SIGNER_BEHAVIOR);
	let saving = $state(false);

	const saveAndContinue = async () => {
		saving = true;
		try {
			await browser.set({ [SIGNER_BEHAVIOR_KEY]: selectedMode });
			dispatch('complete', { mode: selectedMode });
		} finally {
			saving = false;
		}
	};
</script>

<div class="flex h-full min-h-0 flex-col gap-3 overflow-y-auto pb-1 pt-1">
	<div class="kb-card-strong p-5">
		<div class="kb-label">Quick setup</div>
		<h2 class="mt-2 text-xl font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
			How should the signer behave?
		</h2>
		<p class="mt-2 text-sm text-[var(--kb-muted)]">
			Pick a mode. You can change this later in settings.
		</p>
	</div>

	<div class="kb-card p-4">
		<div class="flex flex-col gap-2">
			{#each SIGNER_BEHAVIOR_OPTIONS as option}
				<button
					type="button"
					class="rounded-2xl border px-4 py-3 text-left transition"
					style:background={selectedMode === option.mode ? 'var(--kb-surface-strong)' : 'transparent'}
					style:border-color={selectedMode === option.mode ? 'var(--kb-accent)' : 'var(--kb-border)'}
					onclick={() => (selectedMode = option.mode)}
				>
					<div class="flex items-start gap-3">
						<span
							class="flex size-10 shrink-0 items-center justify-center rounded-2xl border"
							style:background={selectedMode === option.mode ? 'var(--kb-accent-soft)' : 'var(--kb-surface-muted)'}
							style:border-color={selectedMode === option.mode ? 'transparent' : 'var(--kb-border)'}
							style:color={selectedMode === option.mode ? 'var(--kb-accent-strong)' : 'var(--kb-muted)'}
						>
							<Icon icon={option.icon} width={18} />
						</span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<div class="text-sm font-semibold text-[var(--kb-text)]">{option.title}</div>
								<div class="text-sm text-[var(--kb-muted-strong)]">{option.summary}</div>
							</div>
							<div class="mt-1 text-xs text-[var(--kb-muted)]">{option.description}</div>
						</div>
						<span
							class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border"
							style:background={selectedMode === option.mode ? 'var(--kb-accent-soft)' : 'transparent'}
							style:border-color={selectedMode === option.mode ? 'color-mix(in srgb, var(--kb-accent) 26%, var(--kb-border))' : 'var(--kb-border)'}
							style:color={selectedMode === option.mode ? 'var(--kb-accent-strong)' : 'transparent'}
						>
							<Icon icon="mdi:check" width={16} />
						</span>
					</div>
				</button>
			{/each}
		</div>

		<button
			type="button"
			class="kb-button-primary mt-4 w-full"
			disabled={saving}
			onclick={saveAndContinue}
		>
			{saving ? 'Saving...' : 'Continue'}
		</button>
	</div>
</div>
