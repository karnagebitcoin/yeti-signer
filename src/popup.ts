import '@fontsource-variable/inter';
import './styles.css';
import { mount } from 'svelte';
import PopupApp from './PopupApp.svelte';
import { debugLog } from '$lib/utility/logger';

// Wait for DOM to be ready
function initPopup() {
	const target = document.getElementById('popup');
	
	if (!target) {
		console.error('Popup target element not found');
		return;
	}

	try {
		const app = mount(PopupApp, {
			target
		});
		debugLog('Popup initialized');
		return app;
	} catch (error) {
		console.error('Error initializing PopupApp:', error);
	}
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initPopup);
} else {
	initPopup();
}
