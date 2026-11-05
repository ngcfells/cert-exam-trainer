import { defineConfig, devices } from '@playwright/test';
import { serverPort } from './scripts/port';

const responsive = /responsive\.spec\.ts$/;
const pwa = /pwa\.spec\.ts$/;
const bounds = /bounds\.spec\.ts$/;
// Port 4173, or a free one when 4173 is taken (set PWA_PORT to choose). tests/e2e/util.ts reads PWA_PORT.
const port = serverPort('PWA_PORT', 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  use: { browserName: 'chromium' },
  // Serves the hosted build (dist/, from `npm run build`) under the GitHub Pages subpath for the pwa project.
  webServer: {
    command: `npx vite preview --port ${port} --strictPort --base /cert-exam-trainer/`,
    url: `http://localhost:${port}/cert-exam-trainer/`,
    reuseExistingServer: true,
  },
  projects: [
    // Fixture bank build (dist-e2e).
    { name: 'fixture', testIgnore: [/bank\.spec\.ts$/, bounds, responsive, pwa] },
    // Shipped bank build (dist-single).
    { name: 'bank', testMatch: /bank\.spec\.ts$/ },
    // Shipped bank build: every question's text stays in bounds (issues #4 and #7).
    { name: 'bounds', testMatch: bounds },
    // Phone and tablet layout and touch checks on the fixture build.
    { name: 'phone', testMatch: responsive, use: { ...devices['Pixel 7'], browserName: 'chromium', viewport: { width: 360, height: 780 } } },
    { name: 'tablet', testMatch: responsive, use: { browserName: 'chromium', viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true } },
    // Hosted PWA build (dist/): service worker and offline.
    { name: 'pwa', testMatch: pwa },
  ],
});
