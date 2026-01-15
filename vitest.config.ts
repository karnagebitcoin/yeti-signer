import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
	plugins: [svelte()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['node_modules', 'dist', 'build', 'build-firefox'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'src/test/',
				'**/*.d.ts',
				'**/*.config.*',
				'**/mockData',
				'dist/',
				'build/',
				'build-firefox/'
			]
		}
	},
	resolve: {
		alias: {
			'$lib': resolve(__dirname, 'src/lib'),
			'$test': resolve(__dirname, 'src/test')
		}
	}
});
