import { useId, useState } from 'react';

export const NOTICE_SETTING = 'userContentNoticeAccepted';

/** Spec §9: shown before the first add or import. */
export function ContentNotice({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  const id = useId();
  return (
    <section className="content-notice" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`}>Before you add questions</h3>
      <p>
        Questions you add are your own content. You are solely responsible for them. Do not add NDA-protected exam content or
        braindump material. Your questions stay in this browser and are never bundled with the app.
      </p>
      <label>
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.currentTarget.checked)} />
        I understand
      </label>
      <button type="button" className="primary" disabled={!checked} onClick={onAccept}>
        Continue
      </button>
    </section>
  );
}
