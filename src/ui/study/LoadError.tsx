export function LoadError({ onExit }: { onExit: () => void }) {
  return (
    <section aria-label="Error">
      <p role="alert">Could not load your data.</p>
      <button type="button" onClick={onExit}>
        Back to home
      </button>
    </section>
  );
}
