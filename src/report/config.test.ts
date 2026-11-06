import { describe, expect, it } from 'vitest';
import { reportConfig } from './config';

const both = { VITE_REPORT_URL: 'https://relay.example.workers.dev', VITE_TURNSTILE_SITEKEY: '0xKEY' };

describe('reportConfig', () => {
  it('is null when either variable is missing', () => {
    expect(reportConfig({ VITE_TURNSTILE_SITEKEY: '0xKEY' }, 'https:')).toBeNull();
    expect(reportConfig({ VITE_REPORT_URL: both.VITE_REPORT_URL }, 'https:')).toBeNull();
    expect(reportConfig({ ...both, VITE_REPORT_URL: '' }, 'https:')).toBeNull();
  });
  it('is null on file:', () => {
    expect(reportConfig(both, 'file:')).toBeNull();
  });
  it('returns the values on https:', () => {
    expect(reportConfig(both, 'https:')).toEqual({ url: 'https://relay.example.workers.dev', siteKey: '0xKEY' });
  });
  it('drops a trailing slash from the url', () => {
    expect(reportConfig({ ...both, VITE_REPORT_URL: 'https://relay.example.workers.dev/' }, 'http:')?.url).toBe(
      'https://relay.example.workers.dev',
    );
  });
});
