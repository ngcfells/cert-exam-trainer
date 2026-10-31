export const APP_NAME = 'Cert Exam Trainer';

/** Spec §11 disclaimer, in spec order. The README must list these verbatim (legal-files.test.ts). */
export const DISCLAIMER_POINTS = [
  'This app is not affiliated with or endorsed by CompTIA.',
  'CompTIA and its exam names are trademarks of CompTIA, Inc.',
  'All content is original and written from publicly available exam objectives.',
  'No exam content is included.',
  'This app is not a guarantee of passing.',
] as const;

export const DISCLAIMER = DISCLAIMER_POINTS.join(' ');

export const LICENSE_SUMMARY =
  'Free to use and share, including by businesses and trainers. You may not sell it or charge for access to it.';

export const KOFI_URL = 'https://ko-fi.com/M5K429C47U';
