<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		submit: { passphrase: string };
		reset: void;
	}>();

	let {
		mode = 'unlock',
		busy = false,
		errorMessage = ''
	}: {
		mode?: 'setup' | 'unlock';
		busy?: boolean;
		errorMessage?: string;
	} = $props();

	let passphrase = $state('');
	let confirmPassphrase = $state('');

	const handleSubmit = () => {
		const trimmedPassphrase = passphrase.trim();
		if (trimmedPassphrase.length < 8) return;
		if (mode === 'setup' && trimmedPassphrase !== confirmPassphrase.trim()) return;
		dispatch('submit', { passphrase: trimmedPassphrase });
	};

	const handleReset = () => {
		dispatch('reset');
	};
</script>

<div class="flex h-full min-h-0 flex-col justify-center py-2">
	<div class="kb-card-strong p-5">
		<div class="mb-3 flex items-center gap-3">
			<img
				src="assets/logo-on-64.png"
				alt="Yeti logo"
				class="size-11 shrink-0 rounded-full object-cover shadow-[0_10px_24px_rgba(61,126,234,0.18)]"
			/>
			<div class="min-w-0">
				<div class="kb-label">App lock</div>
				<h2 class="mt-1 text-xl font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
					{mode === 'setup' ? 'Set an app passphrase' : 'Unlock Yeti'}
				</h2>
			</div>
		</div>
		<p class="mt-2 text-sm text-[var(--kb-muted)]">
			{mode === 'setup'
				? 'This passphrase unlocks your saved accounts on this device. Yeti cannot recover it for you.'
				: 'Enter your passphrase to open your saved accounts.'}
		</p>
	</div>

	<div class="kb-card mt-3 flex flex-col gap-3 p-4">
		{#if mode === 'unlock'}
			<div class="kb-card-muted px-3 py-3 text-sm text-[var(--kb-muted)]">
				If you forgot this passphrase, reset Yeti on this device and start over with a saved key
				or backup.
			</div>
		{:else}
			<div class="kb-card-muted px-3 py-3 text-sm text-[var(--kb-muted)]">
				Keep this passphrase somewhere safe. If you lose it, you will need a saved key or backup
				to get back in.
			</div>
		{/if}

		<div>
			<div class="kb-label">Passphrase</div>
			<input
				type="password"
				class="kb-input mt-2"
				placeholder="At least 8 characters"
				bind:value={passphrase}
				autocomplete={mode === 'setup' ? 'new-password' : 'current-password'}
				onkeydown={(event) => {
					if (event.key === 'Enter') handleSubmit();
				}}
			/>
		</div>

		{#if mode === 'setup'}
			<div>
				<div class="kb-label">Type it again</div>
				<input
					type="password"
					class="kb-input mt-2"
					placeholder="Repeat the passphrase"
					bind:value={confirmPassphrase}
					autocomplete="new-password"
					onkeydown={(event) => {
						if (event.key === 'Enter') handleSubmit();
					}}
				/>
			</div>
		{/if}

		{#if errorMessage}
			<div class="kb-card-muted px-3 py-2 text-sm text-[var(--kb-danger)]">
				{errorMessage}
			</div>
		{/if}

		<button
			type="button"
			class="kb-button-primary w-full"
			disabled={busy || passphrase.trim().length < 8 || (mode === 'setup' && passphrase.trim() !== confirmPassphrase.trim())}
			onclick={handleSubmit}
		>
			{#if busy}
				Working...
			{:else if mode === 'setup'}
				Set passphrase
			{:else}
				Unlock
			{/if}
		</button>

		{#if mode === 'unlock'}
			<button
				type="button"
				class="kb-button-ghost w-full"
				disabled={busy}
				style:color={'var(--kb-danger)'}
				onclick={handleReset}
			>
				{busy ? 'Working...' : 'Forgot passphrase? Reset Yeti'}
			</button>
		{/if}
	</div>
</div>
