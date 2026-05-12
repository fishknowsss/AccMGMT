import { describe, expect, it } from 'vitest';
import { advanceDeveloperTapCount, advanceDeveloperSequence, canUseDeveloperShortcut, developerSequence, normalizeDeveloperKey } from '../src/lib/developer-mode';

describe('developer mode sequence', () => {
  it('normalizes arrow keys and letter keys', () => {
    expect(normalizeDeveloperKey('ArrowUp')).toBe('up');
    expect(normalizeDeveloperKey('ArrowLeft')).toBe('left');
    expect(normalizeDeveloperKey('b')).toBe('b');
    expect(normalizeDeveloperKey('A')).toBe('a');
  });

  it('unlocks after up up down down left right left right b a', () => {
    let index = 0;
    let unlocked = false;

    for (const key of developerSequence) {
      const result = advanceDeveloperSequence(index, key);
      index = result.index;
      unlocked = result.unlocked;
    }

    expect(unlocked).toBe(true);
    expect(index).toBe(0);
  });

  it('keeps partial progress when a wrong key can restart the sequence', () => {
    const first = advanceDeveloperSequence(0, 'up');
    const second = advanceDeveloperSequence(first.index, 'right');
    const third = advanceDeveloperSequence(second.index, 'up');

    expect(second.index).toBe(0);
    expect(third.index).toBe(1);
  });

  it('only accepts the shortcut on the settings section', () => {
    expect(canUseDeveloperShortcut('accounts')).toBe(true);
    expect(canUseDeveloperShortcut('board')).toBe(false);
    expect(canUseDeveloperShortcut('groups')).toBe(false);
    expect(canUseDeveloperShortcut('projects')).toBe(false);
  });

  it('unlocks after seven taps on the settings summary trigger', () => {
    let count = 0;
    let unlocked = false;

    for (let i = 0; i < 7; i += 1) {
      const result = advanceDeveloperTapCount(count);
      count = result.count;
      unlocked = result.unlocked;
    }

    expect(unlocked).toBe(true);
    expect(count).toBe(0);
  });
});
