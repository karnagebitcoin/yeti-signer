import './styles.css';
import { mount } from 'svelte';
import RestoreApp from './RestoreApp.svelte';

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
		console.log('RestoreApp initialized successfully');
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
