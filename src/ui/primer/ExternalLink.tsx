/** A link to another site: opens in a new tab and says so. */
export function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
      <span className="visually-hidden"> (opens in a new tab)</span>
    </a>
  );
}

export const LINKS_NOTE = 'Links open in a new tab and need an internet connection.';
