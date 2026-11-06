export interface ReportEnv {
  VITE_REPORT_URL?: string;
  VITE_TURNSTILE_SITEKEY?: string;
}

/**
 * Where reports go, or null when reporting is off: either setting is missing (test and fixture builds), or the
 * page was opened from disk, where Turnstile cannot run.
 */
export function reportConfig(
  env: ReportEnv = import.meta.env,
  protocol: string = location.protocol,
): { url: string; siteKey: string } | null {
  const url = env.VITE_REPORT_URL?.trim().replace(/\/+$/, '');
  const siteKey = env.VITE_TURNSTILE_SITEKEY?.trim();
  if (!url || !siteKey || protocol === 'file:') return null;
  return { url, siteKey };
}
