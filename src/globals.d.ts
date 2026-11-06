/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />

/** Injected by vite.config.ts `define`. */
declare const __APP_VERSION__: string;
/** True for the hosted PWA build (dist/), false for the single-file and dev builds. */
declare const __PWA__: boolean;

/** Public report settings (relay URL, Turnstile site key). Unset means reporting is off. */
interface ImportMetaEnv {
  readonly VITE_REPORT_URL?: string;
  readonly VITE_TURNSTILE_SITEKEY?: string;
}
