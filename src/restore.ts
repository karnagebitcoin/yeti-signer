import '@fontsource-variable/inter';
import './styles.css';
import { mount } from 'svelte';
import RestoreApp from './RestoreApp.svelte';
import { debugLog } from '$lib/utility/logger';

// Wait for DOM to be ready
function initRestore() {
	const target = document.getElementById('app');

	if (!target) {
		console.error('Restore target element not found');
		return;
	}

	try {
		const app = mount(RestoreApp, {
			target
		});
		debugLog('Restore view initialized');
		return app;
	} catch (error) {
		console.error('Error initializing RestoreApp:', error);
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initRestore);
} else {
	initRestore();
}
