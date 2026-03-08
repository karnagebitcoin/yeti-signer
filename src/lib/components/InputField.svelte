<script lang="ts">
	export let placeholder = '';
	export let value = '';
	export let type = 'text';
</script>

<input class="kb-input" {placeholder} {type} bind:value autocomplete="off" />
