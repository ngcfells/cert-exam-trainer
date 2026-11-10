import { useId, useState } from 'react';
import type { PrimerTopic } from '../../domain/primer';
import { RichText } from '../RichText';
import { ExternalLink, LINKS_NOTE } from './ExternalLink';
import { FormsTable } from './FormsTable';
import './primer.css';

type Level = 3 | 4;

function Heading({ level, children, id }: { level: number; children: string; id?: string }) {
  const H = `h${level}` as 'h3';
  return (
    // Headings take focus from the primer screen's contents list.
    <H id={id} tabIndex={id ? -1 : undefined}>
      {children}
    </H>
  );
}

/** One primer topic: what an exam needs, then more on request. */
export function TopicView({ topic, level, headingId }: { topic: PrimerTopic; level: Level; headingId?: string }) {
  const [more, setMore] = useState(false);
  const moreId = useId();
  const sub = level + 1;
  const single = topic.where !== undefined;
  const caption = (name: string) => `${name}: ${single ? 'what to type' : 'Bash and PowerShell'}`;
  return (
    <article className="primer-topic">
      <Heading level={level} id={headingId}>
        {topic.title}
      </Heading>
      <p>{topic.purpose}</p>
      {topic.where && (
        <p>
          <RichText text={topic.where} />
        </p>
      )}
      <Heading level={sub}>What it does</Heading>
      {topic.what.map((p, i) => (
        <p key={i}>
          <RichText text={p} />
        </p>
      ))}
      <FormsTable caption={caption(topic.title)} rows={topic.forms} single={single} />
      <Heading level={sub}>Worked example</Heading>
      <p>
        <RichText text={topic.example.intro} />
      </p>
      <ol className="primer-example">
        {topic.example.lines.map((l, i) => (
          <li key={i}>
            <code>{l.line}</code>
            <p>
              <RichText text={l.note} />
            </p>
          </li>
        ))}
      </ol>
      <Heading level={sub}>Exam trap</Heading>
      <p>
        <strong>
          <RichText text={topic.trap.wrong} />
        </strong>{' '}
        <RichText text={topic.trap.why} />
      </p>
      <button type="button" aria-expanded={more} aria-controls={moreId} onClick={() => setMore((m) => !m)}>
        Learn more
      </button>
      <div id={moreId} hidden={!more}>
        {more && (
          <>
            {topic.more.map((m, i) => (
              <section key={i}>
                <Heading level={sub}>{m.heading}</Heading>
                {m.paragraphs.map((p, j) => (
                  <p key={j}>
                    <RichText text={p} />
                  </p>
                ))}
                {m.forms && <FormsTable caption={caption(m.heading)} rows={m.forms} single={single} />}
              </section>
            ))}
            {topic.links.length > 0 && (
              <>
                <ul className="primer-links">
                  {topic.links.map((l) => (
                    <li key={l.url}>
                      <ExternalLink href={l.url}>{l.label}</ExternalLink>
                    </li>
                  ))}
                </ul>
                <p>{LINKS_NOTE}</p>
              </>
            )}
          </>
        )}
      </div>
    </article>
  );
}
