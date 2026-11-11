import { useEffect, useRef } from 'react';
import { APP_NAME, DISCLAIMER_POINTS, KOFI_URL, LICENSE_SUMMARY, ONLINE_APP_URL, REPORT_PRIVACY } from './legal';
import { ReportButton } from './report/ReportButton';

export function About({ protocol = location.protocol }: { protocol?: string }) {
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
      <p>Your progress and questions stay in this browser. The app sends nothing over the network unless you send a report or check the content.</p>
      <p>Questions you add or import are yours; do not add copyrighted exam content.</p>

      <h3>Checking the content</h3>
      <p>
        The official app is at <a href={ONLINE_APP_URL}>{ONLINE_APP_URL}</a>. There, Settings has a Check content button. It compares the
        stock questions, lessons and exam details with the official list of SHA-512/256 hashes and says whether they match the current
        release. It sends none of your data; it fetches one public file from GitHub.
      </p>
      <p>
        A copy from anywhere else, such as a file someone gave you, may have been changed, and a changed copy can also change what its
        own check says. If you did not open the app from the official address, do not rely on it.
      </p>

      <h3>Problems and ideas</h3>
      <p>{REPORT_PRIVACY}</p>
      {protocol === 'file:' ? (
        <p>
          To report a problem, use <a href={ONLINE_APP_URL}>the online app</a>.
        </p>
      ) : (
        <ReportButton context={{}} label="Report a bug or request a feature" />
      )}

      <div className="kofi-tip">
        <p>If you would like to help cover the costs of development, you can leave a tip on Ko-fi.</p>
        <a className="kofi-button" href={KOFI_URL} target="_blank" rel="noopener noreferrer" aria-label="Tips (opens Ko-fi in a new tab)">
          Tips
        </a>
      </div>
    </section>
  );
}
