export type BoardSection = 'board' | 'accounts' | 'groups';

export type BoardSectionMeta = {
  id: BoardSection;
  label: string;
  shortLabel: string;
};

export const boardSections: BoardSectionMeta[] = [
  { id: 'board', label: 'Runway 看板', shortLabel: '看板' },
  { id: 'accounts', label: '账号设置', shortLabel: '账号' },
  { id: 'groups', label: '成员小组', shortLabel: '小组' },
];

export function getBoardSectionMeta(section: BoardSection): BoardSectionMeta {
  return boardSections.find((item) => item.id === section) ?? boardSections[0];
}

export function getOccupancyPercent(stats: { idle: number; inUse: number }): number {
  const total = stats.idle + stats.inUse;
  if (total === 0) {
    return 0;
  }

  return Math.round((stats.inUse / total) * 100);
}
