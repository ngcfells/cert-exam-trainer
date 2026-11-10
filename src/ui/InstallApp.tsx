import { useSyncExternalStore } from 'react';
import { getInstallKind, promptInstall, startInstall, subscribeInstall } from '../install';

/** Settings section: put the app on the device so it opens like any other app and works without a connection. */
export function InstallApp() {
  startInstall();
  const kind = useSyncExternalStore(subscribeInstall, getInstallKind);
  if (kind === 'none') return null;
  return (
    <section className="install-app" aria-labelledby="install-h">
      <h3 id="install-h">Install as an app</h3>
      {kind === 'prompt' && (
        <>
          <p>Put this on your device. It then opens like any other app and works without a connection.</p>
          <button type="button" onClick={() => void promptInstall()}>
            Install app
          </button>
        </>
      )}
      {kind === 'ios' && (
        <p>In Safari, tap the Share button, then Add to Home Screen. It then opens like any other app and works without a connection.</p>
      )}
      {kind === 'manual' && (
        <p>
          Your browser has not offered an install button. Open its menu (in Chrome, the three dots at the top right) and
          choose Install app or Add to Home screen. It then opens like any other app and works without a connection.
        </p>
      )}
      {kind === 'installed' && <p>Installed. It works offline.</p>}
    </section>
  );
}
