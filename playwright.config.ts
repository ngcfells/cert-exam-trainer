import { defineConfig, devices } from '@playwright/test';

const responsive = /responsive\.spec\.ts$/;
const pwa = /pwa\.spec\.ts$/;

export default defineConfig({
  testDir: 'tests/e2e',
  use: { browserName: 'chromium' },
  // Serves the hosted build (dist/, from `npm run build`) under the GitHub Pages subpath for the pwa project.
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort --base /cert-exam-trainer/',
    url: 'http://localhost:4173/cert-exam-trainer/',
    reuseExistingServer: true,
  },
  projects: [
    // Fixture bank build (dist-e2e).
    { name: 'fixture', testIgnore: [/bank\.spec\.ts$/, responsive, pwa] },
    // Shipped bank build (dist-single).
    { name: 'bank', testMatch: /bank\.spec\.ts$/ },
    // Phone and tablet layout and touch checks on the fixture build.
    { name: 'phone', testMatch: responsive, use: { ...devices['Pixel 7'], browserName: 'chromium', viewport: { width: 360, height: 780 } } },
    { name: 'tablet', testMatch: responsive, use: { browserName: 'chromium', viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    // Hosted PWA build (dist/): service worker and offline.
    { name: 'pwa', testMatch: pwa },
  ],
});
