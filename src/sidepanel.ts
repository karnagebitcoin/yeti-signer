import './styles.css';
import { mount } from 'svelte';
import PopupApp from './PopupApp.svelte';

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
		console.log('SidePanel initialized successfully');
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
