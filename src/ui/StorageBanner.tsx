import { useEffect, useState } from 'react';

/** The live region stays mounted and the text arrives after mount, so screen readers announce it. */
export function StorageBanner({ persistent }: { persistent: boolean }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    setMessage(persistent ? '' : "Progress won't be saved in this browser session.");
  }, [persistent]);
  return (
    <p role="status" className={message ? 'banner' : undefined}>
      {message}
    </p>
  );
}
