import { DISCLAIMER } from './legal';

export { DISCLAIMER } from './legal';

export function Disclaimer({ onAbout }: { onAbout?: () => void }) {
  return (
    <footer>
      <p>{DISCLAIMER}</p>
      {onAbout && (
        <button type="button" className="link-button" onClick={onAbout}>About</button>
      )}
    </footer>
  );
}
