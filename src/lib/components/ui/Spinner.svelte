<script lang="ts">
	export let sizeClass = 'size-10';
	export let className = '';
	export let label = 'Loading';
</script>

<div class={`relative inline-flex items-center justify-center ${sizeClass} ${className}`} role="status" aria-label={label}>
	<div class="absolute inset-0 rounded-full border-2 border-[var(--kb-border-strong)]"></div>
	<div class="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--kb-accent)] border-r-[var(--kb-accent)]"></div>
</div>
