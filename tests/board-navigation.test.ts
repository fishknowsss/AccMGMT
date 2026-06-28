import { describe, expect, it } from 'vitest';
import {
  boardSections,
  getBoardSectionMeta,
  getOccupancyPercent,
  type BoardSection,
} from '../src/lib/board-navigation';

describe('board navigation', () => {
  it('defines board, members, projects, records, and settings sections', () => {
    expect(boardSections.map((section) => section.id)).toEqual<BoardSection[]>(['board', 'groups', 'projects', 'records', 'accounts']);
  });

  it('returns concise Chinese labels for every section', () => {
    expect(getBoardSectionMeta('board').label).toBe('账号使用与管理面板');
    expect(getBoardSectionMeta('accounts').label).toBe('账号设置');
    expect(getBoardSectionMeta('groups').label).toBe('成员小组');
    expect(getBoardSectionMeta('projects').label).toBe('项目列表');
    expect(getBoardSectionMeta('records').label).toBe('使用记录');
  });
});

describe('operations metrics', () => {
  it('computes occupancy percent from idle and in-use accounts', () => {
    expect(getOccupancyPercent({ idle: 10, inUse: 2 })).toBe(17);
  });

  it('returns zero when there are no active accounts', () => {
    expect(getOccupancyPercent({ idle: 0, inUse: 0 })).toBe(0);
  });
});
