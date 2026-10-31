import { useEffect, useRef } from 'react';
import { APP_NAME, DISCLAIMER_POINTS, KOFI_URL, LICENSE_SUMMARY } from './legal';

export function About({ onExit }: { onExit: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);

  return (
    <section className="about" aria-labelledby="about-h">
      <h2 id="about-h" ref={headingRef} tabIndex={-1}>{`About ${APP_NAME}`}</h2>
      <p>{`Version ${__APP_VERSION__}`}</p>
      <p>An offline practice-exam trainer for IT certification exams, with mock exams, practice, cram and acronym drills.</p>

      <h3 id="about-disclaimer">Disclaimer</h3>
      <ul aria-labelledby="about-disclaimer">
        {DISCLAIMER_POINTS.map((p) => <li key={p}>{p}</li>)}
      </ul>

      <h3>License</h3>
      <p>{LICENSE_SUMMARY}</p>
      <ul>
        <li>Code: MIT with the Commons Clause.</li>
        <li>Bundled questions: CC BY-NC 4.0, with an extra permission for teaching and internal training at no charge to learners.</li>
      </ul>

      <h3>Your data</h3>
      <p>Your progress and questions stay in this browser. The app sends nothing over the network.</p>
      <p>Questions you add or import are yours; do not add copyrighted exam content.</p>

      <div className="kofi-tip">
        <p>If you would like to help cover costs of development please click here.</p>
        <a className="kofi-button" href={KOFI_URL} target="_blank" rel="noopener noreferrer" aria-label="Tips (opens Ko-fi in a new tab)">
          Tips
        </a>
      </div>

      <button type="button" onClick={onExit}>Back</button>
    </section>
  );
}
