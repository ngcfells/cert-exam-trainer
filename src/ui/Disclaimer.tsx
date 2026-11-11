import { isOfficial } from '../integrity/official';
import { APP_NAME, DISCLAIMER, ONLINE_APP_URL } from './legal';

export { DISCLAIMER } from './legal';

/** The footer on every page. A copy that is not the official app says so here (issue #11). */
export function Disclaimer({ official = isOfficial() }: { official?: boolean }) {
  return (
    <footer>
      {!official && (
        <p>
          <strong>{`This is not the official copy of ${APP_NAME}.`}</strong> The official app is at{' '}
          <a href={ONLINE_APP_URL}>{ONLINE_APP_URL}</a>.
        </p>
      )}
      <p>{DISCLAIMER}</p>
    </footer>
  );
}
