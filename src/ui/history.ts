/**
 * Browser Back inside the app. While the app is below the landing page it keeps one extra
 * ("trap") history entry. Browser Back pops it, and `onBack` does what the on-screen Back does;
 * the caller then re-arms if the app is still below the landing page. On the landing page there
 * is no trap, so Back leaves the app as usual.
 */

// Shared by every instance: React StrictMode builds the controller twice, and the second one must
// know that the first already started a history.back() whose popstate is not the user's.
let ignoring = false;
let armAfterIgnore = false;

export function armHistory(onBack: () => void, isHome: () => boolean): { arm(): void; disarm(): void; dispose(): void } {
  const isTrap = (state: unknown) => (state as { trap?: boolean } | null)?.trap === true;
  // After a reload below the landing page the current entry is still a trap; own it, so the
  // first disarm on the landing page removes it.
  let armed = !ignoring && isTrap(window.history.state);

  const push = () => {
    window.history.pushState({ trap: true }, '');
    armed = true;
  };
  const popOwnTrap = () => {
    armed = false;
    ignoring = true;
    window.history.back();
  };

  const onPop = (e: PopStateEvent) => {
    if (ignoring) {
      ignoring = false;
      if (armAfterIgnore) {
        armAfterIgnore = false;
        push();
      }
      return;
    }
    if (armed) {
      armed = false;
      onBack();
      return;
    }
    // Browser Forward onto an old trap entry: keep it below the landing page, drop it on it.
    if (isTrap(e.state)) {
      if (isHome()) popOwnTrap();
      else armed = true;
    }
  };
  window.addEventListener('popstate', onPop);

  return {
    arm() {
      if (ignoring) armAfterIgnore = true;
      else if (!armed) push();
    },
    disarm() {
      armAfterIgnore = false;
      if (armed) popOwnTrap();
    },
    dispose() {
      window.removeEventListener('popstate', onPop);
    },
  };
}
