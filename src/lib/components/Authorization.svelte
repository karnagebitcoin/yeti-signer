<script lang="ts">
	import Icon from '@iconify/svelte';

	import { accept } from '$lib/services/authorization';
	import { tr } from '$lib/utility/utils';

	import Duration from './Duration.svelte';

	let durationChoice = $state(0);
	let showRawEvent = $state(false);

	let {
		domain,
		scope = '',
		popupType,
		eventData,
		isPopup = false,
		onaccepted,
		oncancel
		}: {
			domain: string;
			scope?: string;
			popupType: string;
			eventData?: any;
			isPopup?: boolean;
		onaccepted?: (event: { detail: { duration: number } }) => void;
		oncancel?: (event: { detail: { duration: number } }) => void;
	} = $props();

	function handleDurationChange(event: { detail: { value: number } }) {
		durationChoice = event.detail.value;
	}

	function formatJsonWithHighlight(data: any): string {
		const json = JSON.stringify(data, null, 2);
		let result = '';
		let i = 0;

		while (i < json.length) {
			const char = json[i];

			if (char === '"') {
				let str = '"';
				i++;
				while (i < json.length && json[i] !== '"') {
					if (json[i] === '\\' && i + 1 < json.length) {
						str += json[i] + json[i + 1];
						i += 2;
					} else {
						str += json[i];
						i++;
					}
				}
				str += '"';
				i++;

				const escaped = str
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');

				let j = i;
				while (j < json.length && (json[j] === ' ' || json[j] === '\t')) j++;

				if (json[j] === ':') result += `<span style="color:#fb923c;">${escaped}</span>`;
				else result += `<span style="color:#7dd3fc;">${escaped}</span>`;
			} else if (char === '-' || (char >= '0' && char <= '9')) {
				let num = '';
				while (
					i < json.length &&
					(json[i] === '-' || json[i] === '.' || (json[i] >= '0' && json[i] <= '9'))
				) {
					num += json[i];
					i++;
				}
				result += `<span style="color:#bef264;">${num}</span>`;
			} else if (json.substring(i, i + 4) === 'true') {
				result += '<span style="color:#facc15;">true</span>';
				i += 4;
			} else if (json.substring(i, i + 5) === 'false') {
				result += '<span style="color:#facc15;">false</span>';
				i += 5;
			} else if (json.substring(i, i + 4) === 'null') {
				result += '<span style="color:#94a3b8;">null</span>';
				i += 4;
			} else {
				if (char === '<') result += '&lt;';
				else if (char === '>') result += '&gt;';
				else if (char === '&') result += '&amp;';
				else result += char;
				i++;
			}
		}

		return result;
	}
</script>

<div class="flex h-full flex-col gap-3">
	<div class="kb-card flex flex-1 flex-col gap-4 p-4">
		<div class="flex items-start justify-between gap-4">
			<div class="min-w-0">
				<div class="kb-label">Website request</div>
				<div class="mt-2 flex items-center gap-3">
					<span class="kb-site-orb">
						<Icon icon="solar:shield-keyhole-linear" width={18} />
					</span>
					<div class="min-w-0">
						<div class="truncate text-xl font-semibold tracking-[-0.02em] text-[var(--kb-text)]">
							{domain}
						</div>
						<div class="text-sm text-[var(--kb-muted)]">
							This website wants access.
						</div>
					</div>
				</div>
			</div>

			<span class="kb-chip whitespace-nowrap">
				<Icon icon={isPopup ? 'mdi:open-in-new' : 'mdi:gesture-tap-button'} width={14} />
				{isPopup ? 'Popup' : 'In this tab'}
			</span>
		</div>

		<div class="kb-card-muted flex items-start gap-3 px-4 py-4">
			<span class="kb-site-orb">
				<Icon icon="mdi:check-decagram-outline" width={18} />
			</span>
			<div class="min-w-0">
				<div class="text-sm font-semibold text-[var(--kb-text)]">What it wants to do</div>
				<div class="mt-1 text-sm text-[var(--kb-muted)]">
					{#if isPopup}
						{tr(popupType)}
					{:else}
						{tr('permission')}
					{/if}
				</div>
			</div>
		</div>

		{#if eventData && (popupType === 'signEvent' || popupType === 'nip04.encrypt' || popupType === 'nip04.decrypt' || popupType === 'nip44.encrypt' || popupType === 'nip44.decrypt')}
			<div class="kb-card-muted overflow-hidden px-4 py-3">
				<button
					type="button"
					class="flex w-full items-center justify-between gap-3 text-left"
					onclick={() => (showRawEvent = !showRawEvent)}
				>
					<div>
						<div class="text-sm font-semibold text-[var(--kb-text)]">Full request details</div>
						<div class="text-xs text-[var(--kb-muted)]">
							Open this to see exactly what the website sent.
						</div>
					</div>
					<Icon icon={showRawEvent ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} class="text-[var(--kb-muted)]" />
				</button>

				{#if showRawEvent}
					<div class="kb-code-panel mt-3 overflow-auto">
						<pre class="whitespace-pre-wrap break-all text-xs leading-relaxed text-slate-100">{@html formatJsonWithHighlight(eventData)}</pre>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<Duration on:durationChange={handleDurationChange} />

	<div class="grid grid-cols-2 gap-3">
			<button
				type="button"
				class="kb-button-secondary"
				onclick={async () => {
					try {
						await accept(false, scope || domain, durationChoice, popupType);
						oncancel?.({ detail: { duration: durationChoice } });
					} catch (error) {
						console.error('Error in reject:', error);
				}
			}}
		>
			<Icon icon="mdi:close" width={18} />
			Reject
		</button>

			<button
				type="button"
				class="kb-button-primary"
				onclick={async () => {
					try {
						await accept(true, scope || domain, durationChoice, popupType);
						onaccepted?.({ detail: { duration: durationChoice } });
					} catch (error) {
						console.error('Error in confirm:', error);
				}
			}}
		>
			Approve
			<Icon icon="mdi:check" width={18} />
		</button>
	</div>
</div>
