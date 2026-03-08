<script lang="ts">
	import Icon from '@iconify/svelte';
	import { createEventDispatcher, onMount } from 'svelte';

	import { clickOutside } from '$lib/actions/clickOutside';
	import { duration } from '$lib/stores/data';
	import { profileController } from '$lib/controllers/profile.controller';

	const dispatch = createEventDispatcher();

	interface DurationOption {
		name: string;
		value: number;
	}

	const durationOptions: DurationOption[] = [
		{ name: 'One time', value: 0 },
		{ name: 'Always', value: 1 },
		{ name: 'Next 5 minutes', value: 2 },
		{ name: 'Next hour', value: 3 },
		{ name: 'Next 5 hours', value: 4 },
		{ name: 'Next 5 days', value: 5 }
	];

	let isOpen = $state(false);

	const selectDuration = async (selectedDuration: DurationOption) => {
		await profileController.updateDuration(selectedDuration);
		isOpen = false;
		dispatch('durationChange', { value: selectedDuration.value });
	};

	onMount(() => {
		dispatch('durationChange', { value: $duration.value });
	});
</script>

<div class="kb-card p-4">
	<div class="flex flex-col gap-4">
		<div>
			<div class="kb-label">Remember this choice</div>
			<div class="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--kb-text)]">
				How long should we remember this?
			</div>
			<div class="text-sm text-[var(--kb-muted)]">
				If you are unsure, choose one time.
			</div>
		</div>

		<div class="relative w-full" use:clickOutside={isOpen ? () => (isOpen = false) : undefined}>
			<button
				type="button"
				class="kb-button-secondary w-full justify-between px-4"
				aria-expanded={isOpen}
				aria-haspopup="menu"
				onclick={() => (isOpen = !isOpen)}
			>
				<span>{$duration.name}</span>
				<Icon icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} />
			</button>

			{#if isOpen}
				<div class="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50">
					<div class="kb-menu">
						{#each durationOptions as option}
							<button
								type="button"
								class="kb-menu-item"
								onclick={() => selectDuration(option)}
							>
								<div class="flex flex-col items-start">
									<span class="text-sm font-semibold text-[var(--kb-text)]">{option.name}</span>
									<span class="text-xs text-[var(--kb-muted)]">
										{option.value === 0
											? 'Ask every time.'
											: option.value === 1
												? 'Keep allowing it until you change it.'
												: 'Allow it for a short time.'}
									</span>
								</div>
								{#if $duration.name === option.name}
									<Icon icon="mdi:check" width={18} class="text-[var(--kb-accent)]" />
								{/if}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
