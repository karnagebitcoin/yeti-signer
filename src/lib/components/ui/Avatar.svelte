	<script lang="ts">
		export let src = '';
		export let alt = 'Yeti';
		export let sizeClass = 'size-11';
		export let className = '';

	let hasError = false;

		$: initials = alt.trim().charAt(0).toUpperCase() || 'Y';
	$: resolvedSrc = hasError ? '' : src;
</script>

<div
	class={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-[image:var(--kb-avatar-bg)] text-[var(--kb-avatar-fg)] shadow-[0_14px_28px_rgba(15,23,42,0.18)] ${sizeClass} ${className}`}
>
	{#if resolvedSrc}
		<img class="h-full w-full object-cover" {alt} src={resolvedSrc} on:error={() => (hasError = true)} />
	{:else}
		<span class="text-[0.95rem] font-bold uppercase">{initials}</span>
	{/if}
</div>
