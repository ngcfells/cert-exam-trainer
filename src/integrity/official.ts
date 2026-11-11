import { ONLINE_APP_URL } from '../ui/legal';

/**
 * Is this the official app? Only the hosted build served from the official address is. A one-file copy, a build
 * on another site and a local preview are not, and say so in the footer.
 */
export function isOfficial(href: string = location.href, pwa: boolean = __PWA__): boolean {
  return pwa && href.startsWith(ONLINE_APP_URL);
}
