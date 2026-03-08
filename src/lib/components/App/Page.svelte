<script lang="ts">
	import Header from '../Header.svelte';

	let { children }: { children?: () => any } = $props();
</script>

<div class="flex h-full min-h-0 w-full flex-col gap-3">
	<Header />
	{@render children?.()}
</div>
