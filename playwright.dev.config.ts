import { defineConfig } from '@playwright/test';
import { serverPort } from './scripts/port';

// Port 5199, or a free one when 5199 is taken (set DEV_E2E_PORT to choose).
const port = serverPort('DEV_E2E_PORT', 5199);
const url = `http://localhost:${port}`;

// Dev-server tests for tools that never ship (the bank review tool). Not part of `npm run check`.
export default defineConfig({
  testDir: 'tests/e2e-dev',
  use: { browserName: 'chromium', baseURL: url },
  webServer: { command: `npx vite --port ${port} --strictPort`, url, reuseExistingServer: false },
});
