const DEBUG_LOGS_ENABLED = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

export const debugLog = (...args: unknown[]): void => {
	if (!DEBUG_LOGS_ENABLED) return;
	console.debug('[Yeti]', ...args);
};
