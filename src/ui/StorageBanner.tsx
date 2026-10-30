export function StorageBanner({ persistent }: { persistent: boolean }) {
  if (persistent) return null;
  return (
    <p role="status" className="banner">
      Progress won&apos;t be saved in this browser session.
    </p>
  );
}
