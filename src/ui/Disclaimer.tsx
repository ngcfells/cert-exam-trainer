export const DISCLAIMER =
  'Not affiliated with or endorsed by CompTIA. CompTIA and its exam names are trademarks of CompTIA, Inc. ' +
  'All content is original, written from publicly available exam objectives; no exam content is included. ' +
  'Not a guarantee of passing.';

export function Disclaimer() {
  return (
    <footer>
      <p>{DISCLAIMER}</p>
    </footer>
  );
}
