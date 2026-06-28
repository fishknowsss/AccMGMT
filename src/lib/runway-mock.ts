import {
  addHours,
  roundToNextFiveMinutes,
  type Account,
  type Booking,
  type Group,
  type User,
} from './runway-board';

export type MockSnapshot = {
  accounts: Account[];
  users: User[];
  groups: Group[];
  bookings: Booking[];
  projects: string[];
  defaultUser: User;
};

export function createMockSnapshot(now = new Date()): MockSnapshot {
  const groups: Group[] = [
    { id: 'group-a', name: 'A组', concurrentLimit: 2 },
    { id: 'group-b', name: 'B组', concurrentLimit: 2 },
    { id: 'group-c', name: 'C组', concurrentLimit: 2 },
    { id: 'group-design', name: '设计组', concurrentLimit: 2 },
  ];

  const users: User[] = [
    { id: 'user-wang', name: '小王', email: 'wang@studio.local', groupId: 'group-a' },
    { id: 'user-lin', name: '小林', email: 'lin@studio.local', groupId: 'group-b' },
    { id: 'user-chen', name: '陈也', email: 'chen@studio.local', groupId: 'group-c' },
    { id: 'user-zhou', name: '周宁', email: 'zhou@studio.local', groupId: 'group-design' },
  ];

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const accounts: Account[] = pixverseAccountEmails.map((email, index) => {
    const number = index + 1;
    return {
      id: `account-${number}`,
      email,
      label: `P-${String(number).padStart(2, '0')}`,
      renewalDate: defaultRenewalDate,
      isActive: true,
      sortOrder: number,
    };
  });

  const currentStart = addHours(now, -1.25);
  const currentEnd = addHours(now, 1.1);
  const shortCurrentEnd = addHours(now, 0.5);
  const nextSlot = roundToNextFiveMinutes(addHours(now, 3));
  const tomorrow = addDays(today, 1);

  const bookings: Booking[] = [
    {
      id: 'booking-current-1',
      accountId: 'account-1',
      userId: 'user-wang',
      groupId: 'group-a',
      projectName: '品牌短片',
      startTime: currentStart.toISOString(),
      endTime: currentEnd.toISOString(),
      status: 'confirmed',
    },
    {
      id: 'booking-current-2',
      accountId: 'account-3',
      userId: 'user-lin',
      groupId: 'group-b',
      projectName: '新品演示',
      startTime: addHours(now, -0.5).toISOString(),
      endTime: shortCurrentEnd.toISOString(),
      status: 'confirmed',
    },
    {
      id: 'booking-next-2',
      accountId: 'account-2',
      userId: 'user-chen',
      groupId: 'group-c',
      projectName: '素材补帧',
      startTime: nextSlot.toISOString(),
      endTime: addHours(nextSlot, 2).toISOString(),
      status: 'confirmed',
    },
    {
      id: 'booking-next-4',
      accountId: 'account-4',
      userId: 'user-zhou',
      groupId: 'group-design',
      projectName: 'KV 动态稿',
      startTime: addHours(now, 5).toISOString(),
      endTime: addHours(now, 7).toISOString(),
      status: 'confirmed',
    },
    {
      id: 'booking-today-5',
      accountId: 'account-5',
      userId: 'user-wang',
      groupId: 'group-a',
      projectName: '直播片头',
      startTime: setClock(today, 19, 0).toISOString(),
      endTime: setClock(today, 21, 0).toISOString(),
      status: 'confirmed',
    },
    {
      id: 'booking-tomorrow-6',
      accountId: 'account-6',
      userId: 'user-lin',
      groupId: 'group-b',
      projectName: '产品过场',
      startTime: setClock(tomorrow, 10, 0).toISOString(),
      endTime: setClock(tomorrow, 12, 0).toISOString(),
      status: 'confirmed',
    },
  ];

  return {
    accounts,
    users,
    groups,
    bookings,
    projects: Array.from(new Set(bookings.map((booking) => booking.projectName))).sort(),
    defaultUser: users[0],
  };
}

export const pixverseAccountEmails = [
  'pixverse01@studio.local',
  'pixverse02@studio.local',
  'pixverse03@studio.local',
  'pixverse04@studio.local',
  'pixverse05@studio.local',
  'pixverse06@studio.local',
  'pixverse07@studio.local',
  'pixverse08@studio.local',
  'pixverse09@studio.local',
  'pixverse10@studio.local',
  'pixverse11@studio.local',
  'pixverse12@studio.local',
  'pixverse13@studio.local',
  'pixverse14@studio.local',
  'pixverse15@studio.local',
  'pixverse16@studio.local',
  'pixverse17@studio.local',
  'pixverse18@studio.local',
  'pixverse19@studio.local',
  'pixverse20@studio.local',
  'pixverse21@studio.local',
  'pixverse22@studio.local',
  'pixverse23@studio.local',
  'pixverse24@studio.local',
] as const;

const defaultRenewalDate = '2026-06-01';

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function setClock(date: Date, hours: number, minutes: number): Date {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}
