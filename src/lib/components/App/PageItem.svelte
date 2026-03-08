<script lang="ts">
	import { currentPage } from '$lib/stores/data';

	let {
		name = '',
		children
	}: {
		name?: string;
		children?: () => any;
	} = $props();
</script>

{#if $currentPage.toString() === name}
	<div class="flex h-full min-h-0 w-full flex-grow flex-col">
		{@render children?.()}
	</div>
{/if}
