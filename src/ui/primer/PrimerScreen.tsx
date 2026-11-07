import { useMemo, useState } from 'react';
import { GROUP_TITLES, PRIMER_GROUPS } from '../../domain/primer';
import { basicsTopics, examTopics } from '../../primer/match';
import { PRACTICE_LINKS, PRIMER_TOPICS } from '../../primer/topics';
import { useFocusHeading } from '../kit';
import { ExternalLink, LINKS_NOTE } from './ExternalLink';
import { TopicView } from './TopicView';
import './primer.css';

const headingId = (id: string) => `primer-topic-${id}`;

/** The standalone primer for one exam: Shell basics, then the exam's own topics by group. */
export function PrimerScreen({ examCode }: { examCode: string }) {
  const headingRef = useFocusHeading();
  const [all, setAll] = useState(false);
  const own = useMemo(() => examTopics(examCode, PRIMER_TOPICS).filter((t) => t.group !== 'basics'), [examCode]);
  const basics = basicsTopics(PRIMER_TOPICS);
  const shown = all ? PRIMER_TOPICS.filter((t) => t.group !== 'basics') : own;
  const groups = PRIMER_GROUPS.filter((g) => g !== 'basics')
    .map((g) => ({ g, topics: shown.filter((t) => t.group === g) }))
    .filter((x) => x.topics.length > 0);

  return (
    <section className="primer-screen" aria-labelledby="primer-h">
      <h2 id="primer-h" ref={headingRef} tabIndex={-1}>{`Command primer: ${examCode}`}</h2>
      <p>
        Nothing on this page runs a command. It shows what the commands in this exam's questions do, in Bash and in
        PowerShell. If a terminal is new to you, read Shell basics first.
      </p>
      {PRACTICE_LINKS.length > 0 && (
        <>
          <h3>Practice safely</h3>
          <ul className="primer-links">
            {PRACTICE_LINKS.map((l) => (
              <li key={l.url}>
                <ExternalLink href={l.url}>{l.label}</ExternalLink>
                {`: ${l.what}`}
              </li>
            ))}
          </ul>
          <p>{LINKS_NOTE}</p>
        </>
      )}
      <button type="button" aria-pressed={all} onClick={() => setAll((a) => !a)}>
        Show all topics
      </button>
      <nav aria-label="Topics on this page">
        <ul className="primer-choices">
          {[...basics, ...groups.flatMap((x) => x.topics)].map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => document.getElementById(headingId(t.id))?.focus()}>
                {t.title}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <h3>{GROUP_TITLES.basics}</h3>
      {basics.map((t) => (
        <TopicView key={t.id} topic={t} level={4} headingId={headingId(t.id)} />
      ))}
      {groups.map(({ g, topics }) => (
        <section key={g} aria-labelledby={`primer-group-${g}`}>
          <h3 id={`primer-group-${g}`}>{GROUP_TITLES[g]}</h3>
          {topics.map((t) => (
            <TopicView key={t.id} topic={t} level={4} headingId={headingId(t.id)} />
          ))}
        </section>
      ))}
    </section>
  );
}
