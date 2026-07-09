import { describe, expect, it } from 'vitest';
import { reorderItems } from '../src/components/account-board/account-board-page';

describe('drag reorder helper', () => {
  it('moves an item before a later target', () => {
    expect(reorderItems(['A', 'B', 'C', 'D'], 'A', 'C')).toEqual(['B', 'C', 'A', 'D']);
  });

  it('moves an item before an earlier target', () => {
    expect(reorderItems(['A', 'B', 'C', 'D'], 'D', 'B')).toEqual(['A', 'D', 'B', 'C']);
  });

  it('keeps order unchanged when the dragged or target item is missing', () => {
    const items = ['A', 'B', 'C'];
    expect(reorderItems(items, 'X', 'B')).toBe(items);
    expect(reorderItems(items, 'A', 'X')).toBe(items);
  });
});
