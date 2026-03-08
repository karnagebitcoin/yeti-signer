type Handler = (() => void) | undefined;

export function clickOutside(node: HTMLElement, handler?: Handler) {
	let callback = handler;

	const handleClick = (event: MouseEvent) => {
		const target = event.target;
		if (!(target instanceof Node)) return;
		if (!node.contains(target)) callback?.();
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') callback?.();
	};

	document.addEventListener('click', handleClick, true);
	document.addEventListener('keydown', handleKeydown);

	return {
		update(nextHandler?: Handler) {
			callback = nextHandler;
		},
		destroy() {
			document.removeEventListener('click', handleClick, true);
			document.removeEventListener('keydown', handleKeydown);
		}
	};
}
