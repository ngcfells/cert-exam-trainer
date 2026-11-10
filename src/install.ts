/** "Install as an app" support for the hosted (PWA) build. The browser fires `beforeinstallprompt` once, early, so it is
 *  caught at start-up (main.tsx) and kept until the Settings panel asks for it. */

/** `manual`: the browser has made no install offer (yet, or ever, e.g. already dismissed), so say where its menu installs. */
export type InstallKind = 'none' | 'prompt' | 'ios' | 'installed' | 'manual';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Env {
  pwa: boolean;
  standalone: boolean;
  ios: boolean;
}

export function installKind(s: Env & { hasPrompt: boolean }): InstallKind {
  if (!s.pwa) return 'none';
  if (s.standalone) return 'installed';
  if (s.hasPrompt) return 'prompt';
  if (s.ios) return 'ios';
  return 'manual';
}

function detectEnv(): Env {
  const nav = navigator as Navigator & { standalone?: boolean };
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = nav.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches);
  return { pwa: __PWA__, standalone, ios };
}

let env: Env | null = null;
let deferred: InstallPromptEvent | null = null;
let installed = false;
let started = false;
const listeners = new Set<() => void>();
let snapshot: InstallKind = 'none';

function recompute() {
  const e = env ?? detectEnv();
  const next = installKind({ ...e, standalone: e.standalone || installed, hasPrompt: deferred !== null });
  if (next !== snapshot) {
    snapshot = next;
    listeners.forEach((l) => l());
  }
}

/** Listen for the browser's install offer. Safe to call more than once. */
export function startInstall(): void {
  if (started) return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    recompute();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installed = true;
    recompute();
  });
  recompute();
}

export function subscribeInstall(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getInstallKind(): InstallKind {
  return snapshot;
}

/** Opens the browser's own install dialog. */
export async function promptInstall(): Promise<void> {
  const e = deferred;
  if (!e) return;
  await e.prompt();
  const choice = await e.userChoice;
  if (choice.outcome === 'accepted') {
    deferred = null;
    installed = true;
    recompute();
  }
}

/** Tests only. */
export function setInstallEnv(next: Env): void {
  env = next;
  startInstall();
  recompute();
}

export function resetInstallEnv(): void {
  env = null;
  deferred = null;
  installed = false;
  snapshot = 'none';
}
