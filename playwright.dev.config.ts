import { defineConfig } from '@playwright/test';

// Dev-server tests for tools that never ship (the bank review tool). Not part of `npm run check`.
export default defineConfig({
  testDir: 'tests/e2e-dev',
  use: { browserName: 'chromium', baseURL: 'http://localhost:5199' },
  webServer: { command: 'npx vite --port 5199 --strictPort', url: 'http://localhost:5199', reuseExistingServer: false },
});
