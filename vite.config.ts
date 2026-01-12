import { defineConfig, type ConfigEnv } from 'vite';
import type { PreRenderedChunk } from 'rollup';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const __dirname = new URL('.', import.meta.url).pathname;

export default defineConfig(({ command }: ConfigEnv) => {
  const isDev = command === 'serve';

  return {
    base: './',
    plugins: [
      svelte(),
      viteStaticCopy({
        targets: [
          {
            src: 'static/manifest.json',
            dest: '.'
          },
          {
            src: 'static/assets/*',
            dest: 'assets'
          },
          {
            src: 'static/favicon.png',
            dest: '.'
          }
        ]
      })
    ],
    build: {
      // Enable watch mode for development
      watch: isDev ? {} : null,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          sidepanel: resolve(__dirname, 'sidepanel.html'),
          background: resolve(__dirname, 'src/background.ts'),
          content: resolve(__dirname, 'src/content.ts')
        },
        output: {
          entryFileNames: (chunkInfo: PreRenderedChunk) => {
            if (chunkInfo.name === 'background') return 'background.js';
            if (chunkInfo.name === 'content') return 'content.js';
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          format: 'es'
        }
      },
      outDir: 'build',
      emptyOutDir: true,
      target: 'esnext',
      assetsDir: 'assets'
    },
    resolve: {
      alias: {
        '$lib': resolve(__dirname, 'src/lib')
      }
    },
    define: {
      global: 'globalThis'
    }
  };
});
