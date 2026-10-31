/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { reviewPlugin } from './scripts/review-plugin';

const single = process.env.SINGLE === '1';
const version = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [react(), reviewPlugin(), ...(single ? [viteSingleFile()] : [])],
  build: { outDir: process.env.VITE_BANK === 'fixture' ? 'dist-e2e' : single ? 'dist-single' : 'dist' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    passWithNoTests: true,
    env: { VITE_BANK: 'fixture' },
  },
});
