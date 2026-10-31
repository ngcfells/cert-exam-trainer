import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  use: { browserName: 'chromium' },
  projects: [
    // Fixture bank build (dist-e2e).
    { name: 'fixture', testIgnore: /bank\.spec\.ts$/ },
    // Shipped bank build (dist-single).
    { name: 'bank', testMatch: /bank\.spec\.ts$/ },
  ],
});
