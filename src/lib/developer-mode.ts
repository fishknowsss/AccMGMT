export type DeveloperKey = 'up' | 'down' | 'left' | 'right' | 'b' | 'a';

export const developerSequence: DeveloperKey[] = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a'];
export const developerTapThreshold = 7;

export function normalizeDeveloperKey(key: string): DeveloperKey | null {
  const value = key.toLowerCase();

  if (value === 'arrowup') return 'up';
  if (value === 'arrowdown') return 'down';
  if (value === 'arrowleft') return 'left';
  if (value === 'arrowright') return 'right';
  if (value === 'b') return 'b';
  if (value === 'a') return 'a';

  return null;
}

export function advanceDeveloperSequence(index: number, key: DeveloperKey): { index: number; unlocked: boolean } {
  const expected = developerSequence[index];

  if (key === expected) {
    const nextIndex = index + 1;
    if (nextIndex === developerSequence.length) {
      return { index: 0, unlocked: true };
    }

    return { index: nextIndex, unlocked: false };
  }

  return { index: key === developerSequence[0] ? 1 : 0, unlocked: false };
}

export function canUseDeveloperShortcut(section: string): boolean {
  return section === 'accounts';
}

export function advanceDeveloperTapCount(count: number): { count: number; unlocked: boolean } {
  const nextCount = count + 1;

  if (nextCount >= developerTapThreshold) {
    return { count: 0, unlocked: true };
  }

  return { count: nextCount, unlocked: false };
}
