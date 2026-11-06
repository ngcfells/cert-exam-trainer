import type { Tip } from './types';

/** The owner's own tips (spec §5). Each must stay in the list. */
export const OWNER_TIP_IDS = ['no-reading-aloud', 'silly-answers', 'know-acronyms', 'key-word', 'last-sentence-first'] as const;

/** Every tip. General tips have no exam; exam tips name a shipped exam code. Original wording only. */
export const TIPS: readonly Tip[] = [
  {
    id: 'no-reading-aloud',
    group: 'test-room',
    text: 'Saying a question out loud can help it sink in, but do part of your practice in silence. In the test room you have to read every question quietly.',
  },
  {
    id: 'silly-answers',
    group: 'test-room',
    text: 'Some options are there to be silly, so cross them off fast. Keep the laugh to yourself, though: noise draws the proctor, who can end your exam.',
  },
  {
    id: 'know-acronyms',
    group: 'study',
    text: 'Know your acronyms. A question can hinge on one set of letters, and the exam will not spell it out for you.',
  },
  {
    id: 'key-word',
    group: 'test-room',
    text: 'Hunt for the key word, such as BEST, FIRST, MOST, LEAST or NOT. It decides which of several true-sounding options is the answer.',
  },
  {
    id: 'last-sentence-first',
    group: 'test-room',
    text: 'On a long question, read the last sentence first to see what is being asked. Then go back through the story with that goal in mind.',
  },
];
