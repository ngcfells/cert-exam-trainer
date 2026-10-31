/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import { reviewPlugin } from './scripts/review-plugin';

const single = process.env.SINGLE === '1';
const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

// The hosted build (dist/) is the PWA; the single file runs from file:// and never gets a service worker.
const pwa = VitePWA({
  registerType: 'autoUpdate',
  injectRegister: false,
  includeAssets: ['icon.svg'],
  manifest: {
    name: 'Cert Exam Trainer',
    short_name: 'Exam Trainer',
    description: 'Offline practice-exam trainer for IT certification exams.',
    start_url: './',
    scope: './',
    display: 'standalone',
    theme_color: '#1f2d3d',
    background_color: '#ffffff',
    icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,webmanifest}'],
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  },
});

export default defineConfig(({ command }) => ({
  base: './',
  // The single file stays one file: no public/ assets copied beside it.
  publicDir: single ? false : 'public',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __PWA__: JSON.stringify(command === 'build' && !single),
  },
  plugins: [react(), reviewPlugin(), ...(single ? [viteSingleFile()] : [pwa])],
  build: { outDir: process.env.VITE_BANK === 'fixture' ? 'dist-e2e' : single ? 'dist-single' : 'dist' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    passWithNoTests: true,
    env: { VITE_BANK: 'fixture' },
  },
}));
