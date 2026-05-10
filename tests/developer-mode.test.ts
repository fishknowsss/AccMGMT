import { describe, expect, it } from 'vitest';
import { advanceDeveloperSequence, canUseDeveloperShortcut, developerSequence, normalizeDeveloperKey } from '../src/lib/developer-mode';

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
  });
});
