import '@fontsource-variable/inter';
import './styles.css';
import { mount } from 'svelte';
import PopupApp from './PopupApp.svelte';
import { debugLog } from '$lib/utility/logger';

// Wait for DOM to be ready
function initSidePanel() {
	const target = document.getElementById('sidepanel');

	if (!target) {
		console.error('SidePanel target element not found');
		return;
	}

	try {
		const app = mount(PopupApp, {
			target
		});
		debugLog('Side panel initialized');
		return app;
	} catch (error) {
		console.error('Error initializing SidePanel:', error);
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initSidePanel);
} else {
	initSidePanel();
}
