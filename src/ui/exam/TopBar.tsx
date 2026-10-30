import { useEffect, useRef, useState } from 'react';
import { formatTime } from './formatTime';

const MILESTONES = [10, 5, 1];

export function TopBar({
  index,
  total,
  remainingMs,
  flagged,
  onToggleFlag,
}: {
  index: number;
  total: number;
  remainingMs: number;
  flagged: boolean;
  onToggleFlag: () => void;
}) {
  const [announcement, setAnnouncement] = useState('');
  const announced = useRef(new Set<number>());

  useEffect(() => {
    const crossed = MILESTONES.filter((m) => remainingMs < m * 60_000 && !announced.current.has(m));
    if (crossed.length === 0) return;
    crossed.forEach((m) => announced.current.add(m));
    const m = Math.min(...crossed);
    setAnnouncement(`${m} ${m === 1 ? 'minute' : 'minutes'} remaining`);
  }, [remainingMs]);

  return (
    <header className="exam-topbar">
      <span>{`Question ${index + 1} of ${total}`}</span>
      <span className="timer">
        <span aria-label="Time remaining" role="timer">{formatTime(remainingMs)}</span>
      </span>
      <button type="button" aria-pressed={flagged} onClick={onToggleFlag}>
        {flagged ? '⚑ Flagged for review' : '⚐ Flag for review'}
      </button>
      <span className="visually-hidden" aria-live="polite" data-testid="timer-announcer">
        {announcement}
      </span>
    </header>
  );
}
