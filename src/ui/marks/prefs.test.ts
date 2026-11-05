import { afterEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createMemoryRepo } from '../../storage/memoryRepo';
import { applyMarks, DEFAULT_MARKS, getMarks, loadMarks, MARK_NAMES, MARK_STYLES, MARKS_SETTING, SOUND_SETTING, useMarks } from './prefs';

afterEach(() => applyMarks(DEFAULT_MARKS));

describe('mark preferences', () => {
  it('defaults to the banner with sound off', async () => {
    expect(DEFAULT_MARKS).toEqual({ style: 'banner', sound: false });
    expect(await loadMarks(createMemoryRepo())).toEqual(DEFAULT_MARKS);
  });

  it.each(['neon', 42, null, { style: 'stamp' }])('an unknown stored style (%j) falls back to the banner', async (bad) => {
    const repo = createMemoryRepo();
    await repo.setSetting(MARKS_SETTING, bad);
    await repo.setSetting(SOUND_SETTING, 'yes');
    expect(await loadMarks(repo)).toEqual(DEFAULT_MARKS);
  });

  it('loads a stored style and sound', async () => {
    const repo = createMemoryRepo();
    await repo.setSetting(MARKS_SETTING, 'stamp');
    await repo.setSetting(SOUND_SETTING, true);
    expect(await loadMarks(repo)).toEqual({ style: 'stamp', sound: true });
  });

  it('lists seven styles, banner first, each with a Settings name', () => {
    expect(MARK_STYLES).toEqual(['banner', 'smiley', 'thumbs', 'stamp', 'shapes', 'edge', 'plain']);
    expect(MARK_STYLES.map((s) => MARK_NAMES[s])).toEqual([
      'Check and X banner',
      'Smiley and frowny',
      'Thumbs up and down',
      "Grader's stamp",
      'Circle, triangle, cross',
      'Quiet edge',
      'Plain text',
    ]);
  });

  it('useMarks follows applyMarks', () => {
    const { result } = renderHook(() => useMarks());
    expect(result.current).toEqual(DEFAULT_MARKS);
    act(() => applyMarks({ style: 'edge', sound: true }));
    expect(result.current).toEqual({ style: 'edge', sound: true });
    expect(getMarks()).toEqual({ style: 'edge', sound: true });
  });
});
