import { registerSW } from 'virtual:pwa-register';

/** Hosted (PWA) build only: precache everything for offline use and pick up new deploys on the next load. */
export function registerPwa(): void {
  registerSW({ immediate: true });
}
