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
  defaultUser: User;
};

export function createMockSnapshot(now = new Date()): MockSnapshot {
  const groups: Group[] = [
    { id: 'group-a', name: 'A组' },
    { id: 'group-b', name: 'B组' },
    { id: 'group-c', name: 'C组' },
    { id: 'group-design', name: '设计组' },
  ];

  const users: User[] = [
    { id: 'user-wang', name: '小王', email: 'wang@studio.local', groupId: 'group-a' },
    { id: 'user-lin', name: '小林', email: 'lin@studio.local', groupId: 'group-b' },
    { id: 'user-chen', name: '陈也', email: 'chen@studio.local', groupId: 'group-c' },
    { id: 'user-zhou', name: '周宁', email: 'zhou@studio.local', groupId: 'group-design' },
  ];

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const accounts: Account[] = runwayAccountEmails.map((email, index) => {
    const number = index + 1;
    return {
      id: `account-${number}`,
      email,
      label: `R-${String(number).padStart(2, '0')}`,
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
    defaultUser: users[0],
  };
}

export const runwayAccountEmails = [
  'RaeLopez75097@outlook.com',
  'GabrielleShell101444@outlook.com',
  'JoanneMerino63875@outlook.com',
  'GraceCain80741@outlook.com',
  'KfocahZmlscy479999@outlook.com',
  'GlendaMattice85518@outlook.com',
  'AnnaWalzer8658@outlook.com',
  'TcbmwXhat6440@outlook.com',
  'PknhQebpiv097920@outlook.com',
  'KennethHernandez74421@outlook.com',
  'JosephDillon7994@outlook.com',
  'LjrhDkubg843141@outlook.com',
  'NicoleHale0973@outlook.com',
  'DorothyNicolaou372942@outlook.com',
  'MznofEdayye28106@outlook.com',
  'LesterJohnson3767@outlook.com',
  'UqltxxWtzxy8813@outlook.com',
  'EmilyPaez1015@outlook.com',
  'XpmfdlAjrbp706588@outlook.com',
  'XycixrQhcvk991241@outlook.com',
  'RichardCarter205621@outlook.com',
  'FwlwbTankv91206@outlook.com',
  'JamesHowell244774@outlook.com',
  'LeonaCox646320@outlook.com',
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
