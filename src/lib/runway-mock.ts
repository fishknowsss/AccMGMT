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
  currentUser: User;
};

export function createMockSnapshot(now = new Date()): MockSnapshot {
  const groups: Group[] = [
    { id: 'group-a', name: 'A组' },
    { id: 'group-b', name: 'B组' },
    { id: 'group-c', name: 'C组' },
    { id: 'group-design', name: '设计组' },
  ];

  const users: User[] = [
    { id: 'user-wang', name: '小王', email: 'wang@studio.local', groupId: 'group-a', role: 'member' },
    { id: 'user-lin', name: '小林', email: 'lin@studio.local', groupId: 'group-b', role: 'admin' },
    { id: 'user-chen', name: '陈也', email: 'chen@studio.local', groupId: 'group-c', role: 'member' },
    { id: 'user-zhou', name: '周宁', email: 'zhou@studio.local', groupId: 'group-design', role: 'member' },
  ];

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const accounts: Account[] = Array.from({ length: 12 }, (_, index) => {
    const number = index + 1;
    return {
      id: `account-${number}`,
      email: `runway-${String(number).padStart(2, '0')}@studio.local`,
      label: `R-${String(number).padStart(2, '0')}`,
      renewalDate: dateOnly(addDays(today, renewalOffsets[index] ?? 40)),
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
    currentUser: users[0],
  };
}

const renewalOffsets = [-2, 3, 6, 12, 18, 27, 35, 42, 50, 58, 65, 73];

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

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
