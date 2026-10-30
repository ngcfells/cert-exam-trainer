export interface ReviewEntry {
  index: number;
  answered: boolean;
  flagged: boolean;
}

export function ReviewGrid({ items, onJump }: { items: ReviewEntry[]; onJump: (index: number) => void }) {
  return (
    <ul className="review-grid">
      {items.map((it) => {
        const label = [`Question ${it.index + 1}`, it.answered ? 'answered' : 'unanswered', ...(it.flagged ? ['flagged'] : [])].join(', ');
        return (
          <li key={it.index}>
            <button
              type="button"
              aria-label={label}
              className={`review-cell${it.answered ? ' answered' : ''}${it.flagged ? ' flagged' : ''}`}
              onClick={() => onJump(it.index)}
            >
              <span aria-hidden="true">
                {it.index + 1}
                <small>{it.answered ? '✓' : '○'}{it.flagged ? ' ⚑' : ''}</small>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
