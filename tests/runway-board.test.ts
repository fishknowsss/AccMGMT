import { describe, expect, it } from 'vitest';
import {
  buildAccountsView,
  canReleaseBooking,
  findBookingConflict,
  fromLocalInputValue,
  getActiveGroups,
  getActiveUsers,
  getAccountRuntime,
  getNextAccountLabel,
  canManageFutureBooking,
  parseMemberImportNames,
  selectAvailableAccounts,
  validateGroupDeletion,
  validateGroupDraft,
  validateUserDeletion,
  validateUserDraft,
  validateBookingDraft,
  type Account,
  type Booking,
  type Group,
  type User,
} from '../src/lib/runway-board';

const now = new Date('2026-05-09T10:00:00.000Z');

const accounts: Account[] = [
  {
    id: 'account-1',
    email: 'runway01@example.com',
    label: 'R-01',
    renewalDate: '2026-05-12',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'account-2',
    email: 'runway02@example.com',
    label: 'R-02',
    renewalDate: '2026-06-10',
    isActive: true,
    sortOrder: 2,
  },
];

const groups: Group[] = [
  { id: 'group-a', name: 'A组' },
  { id: 'group-b', name: 'B组' },
  { id: 'group-boss', name: 'Boss小组' },
];

const users: User[] = [
  { id: 'user-1', name: '小王', email: 'wang@example.com', groupId: 'group-a' },
  { id: 'user-2', name: '小林', email: 'lin@example.com', groupId: 'group-b' },
  { id: 'user-boss', name: '老板', email: 'boss@example.com', groupId: 'group-boss' },
];

const booking = (partial: Partial<Booking>): Booking => ({
  id: 'booking-1',
  accountId: 'account-1',
  userId: 'user-1',
  groupId: 'group-a',
  projectName: '广告片',
  startTime: '2026-05-09T09:00:00.000Z',
  endTime: '2026-05-09T11:00:00.000Z',
  status: 'confirmed',
  ...partial,
});

describe('getAccountRuntime', () => {
  it('marks an account as in use when a confirmed booking covers now', () => {
    const runtime = getAccountRuntime('account-1', [booking({})], now);

    expect(runtime.kind).toBe('in_use');
    expect(runtime.current?.projectName).toBe('广告片');
    expect(runtime.next).toBeNull();
  });

  it('keeps an account idle when it only has a future booking', () => {
    const runtime = getAccountRuntime(
      'account-1',
      [booking({ startTime: '2026-05-09T12:00:00.000Z', endTime: '2026-05-09T14:00:00.000Z' })],
      now,
    );

    expect(runtime.kind).toBe('idle');
    expect(runtime.current).toBeNull();
    expect(runtime.next?.startTime).toBe('2026-05-09T12:00:00.000Z');
  });

  it('ignores cancelled bookings when calculating current and next usage', () => {
    const runtime = getAccountRuntime(
      'account-1',
      [
        booking({ status: 'cancelled' }),
        booking({
          id: 'booking-2',
          startTime: '2026-05-09T12:00:00.000Z',
          endTime: '2026-05-09T14:00:00.000Z',
          status: 'cancelled',
        }),
      ],
      now,
    );

    expect(runtime.kind).toBe('idle');
    expect(runtime.current).toBeNull();
    expect(runtime.next).toBeNull();
  });
});

describe('findBookingConflict', () => {
  it('returns the conflicting confirmed booking on the same account', () => {
    const conflict = findBookingConflict(
      {
        accountId: 'account-1',
        startTime: '2026-05-09T10:30:00.000Z',
        endTime: '2026-05-09T12:00:00.000Z',
      },
      [booking({})],
    );

    expect(conflict?.id).toBe('booking-1');
  });

  it('allows a booking that starts exactly when the previous one ends', () => {
    const conflict = findBookingConflict(
      {
        accountId: 'account-1',
        startTime: '2026-05-09T11:00:00.000Z',
        endTime: '2026-05-09T12:00:00.000Z',
      },
      [booking({})],
    );

    expect(conflict).toBeNull();
  });
});

describe('validateBookingDraft', () => {
  it('returns a validation error instead of throwing when local time input is empty', () => {
    const result = validateBookingDraft(
      {
        accountId: 'account-1',
        userId: 'user-1',
        groupId: 'group-a',
        projectName: '广告片',
        startTime: fromLocalInputValue(''),
        endTime: '2026-05-09T13:00:00.000Z',
      },
      {
        bookings: [],
        mode: 'reserve',
        now,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('时间格式不正确');
    }
  });

  it('blocks immediate use when the end time is later than the next booking start', () => {
    const result = validateBookingDraft(
      {
        accountId: 'account-1',
        userId: 'user-1',
        groupId: 'group-a',
        projectName: '广告片',
        startTime: '2026-05-09T10:00:00.000Z',
        endTime: '2026-05-09T13:00:00.000Z',
      },
      {
        bookings: [booking({ startTime: '2026-05-09T12:00:00.000Z', endTime: '2026-05-09T14:00:00.000Z' })],
        mode: 'use_now',
        now,
        nextBooking: booking({ startTime: '2026-05-09T12:00:00.000Z', endTime: '2026-05-09T14:00:00.000Z' }),
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('下一预约');
    }
  });
  it('blocks a second concurrent account booking for the same user', () => {
    const result = validateBookingDraft(
      {
        accountId: 'account-2',
        userId: 'user-1',
        groupId: 'group-a',
        projectName: '广告片',
        startTime: '2026-05-09T09:30:00.000Z',
        endTime: '2026-05-09T12:00:00.000Z',
      },
      {
        bookings: [booking({})],
        mode: 'reserve',
        now,
        groups,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('1 个账号');
    }
  });

  it('allows Boss group members to hold any number of accounts at the same time', () => {
    const result = validateBookingDraft(
      {
        accountId: 'account-2',
        userId: 'user-boss',
        groupId: 'group-boss',
        projectName: '重点项目',
        startTime: '2026-05-09T09:30:00.000Z',
        endTime: '2026-05-09T12:00:00.000Z',
      },
      {
        bookings: [
          booking({
            accountId: 'account-1',
            userId: 'user-boss',
            groupId: 'group-boss',
          }),
          booking({
            id: 'booking-2',
            accountId: 'account-3',
            userId: 'user-boss',
            groupId: 'group-boss',
          }),
          booking({
            id: 'booking-3',
            accountId: 'account-4',
            userId: 'user-boss',
            groupId: 'group-boss',
          }),
        ],
        mode: 'reserve',
        now,
        groups,
      },
    );

    expect(result.ok).toBe(true);
  });

  it('allows editing a booking without treating the original booking as a conflict', () => {
    const result = validateBookingDraft(
      {
        accountId: 'account-1',
        userId: 'user-1',
        groupId: 'group-a',
        projectName: '广告片',
        startTime: '2026-05-09T12:30:00.000Z',
        endTime: '2026-05-09T14:30:00.000Z',
      },
      {
        bookings: [
          booking({
            id: 'booking-1',
            startTime: '2026-05-09T12:00:00.000Z',
            endTime: '2026-05-09T14:00:00.000Z',
          }),
        ],
        editingBookingId: 'booking-1',
        mode: 'reserve',
        now,
        groups,
      },
    );

    expect(result.ok).toBe(true);
  });

  it('still blocks editing a booking into another confirmed booking', () => {
    const result = validateBookingDraft(
      {
        accountId: 'account-1',
        userId: 'user-1',
        groupId: 'group-a',
        projectName: '广告片',
        startTime: '2026-05-09T15:30:00.000Z',
        endTime: '2026-05-09T16:30:00.000Z',
      },
      {
        bookings: [
          booking({
            id: 'booking-1',
            startTime: '2026-05-09T12:00:00.000Z',
            endTime: '2026-05-09T14:00:00.000Z',
          }),
          booking({
            id: 'booking-2',
            startTime: '2026-05-09T15:00:00.000Z',
            endTime: '2026-05-09T17:00:00.000Z',
          }),
        ],
        editingBookingId: 'booking-1',
        mode: 'reserve',
        now,
        groups,
      },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.conflict?.id).toBe('booking-2');
    }
  });
});

describe('canManageFutureBooking', () => {
  it('allows the current user to manage their future booking', () => {
    expect(
      canManageFutureBooking(
        booking({
          userId: 'user-1',
          startTime: '2026-05-09T12:00:00.000Z',
          endTime: '2026-05-09T14:00:00.000Z',
        }),
        'user-1',
        now,
      ),
    ).toBe(true);
  });

  it('does not allow managing other members bookings or already started bookings', () => {
    expect(
      canManageFutureBooking(
        booking({
          userId: 'user-2',
          startTime: '2026-05-09T12:00:00.000Z',
          endTime: '2026-05-09T14:00:00.000Z',
        }),
        'user-1',
        now,
      ),
    ).toBe(false);
    expect(canManageFutureBooking(booking({ userId: 'user-1' }), 'user-1', now)).toBe(false);
  });
});

describe('buildAccountsView', () => {
  it('computes stats and filters by search, status, group, and renewal window', () => {
    const view = buildAccountsView({
      accounts,
      bookings: [booking({})],
      users,
      groups,
      now,
      filters: {
        query: 'runway01',
        status: 'in_use',
        groupId: 'group-a',
        renewal: '7d',
      },
    });

    expect(view.stats.idle).toBe(1);
    expect(view.stats.inUse).toBe(1);
    expect(view.stats.renewalSoon).toBe(1);
    expect(view.rows).toHaveLength(1);
    expect(view.rows[0].account.label).toBe('R-01');
  });

  it('allows any visitor to release an occupied account from the board', () => {
    const view = buildAccountsView({
      accounts,
      bookings: [booking({ userId: users[1].id, groupId: users[1].groupId })],
      users,
      groups,
      now,
      filters: {
        query: '',
        status: 'all',
        groupId: 'all',
        renewal: 'all',
      },
    });

    expect(view.rows[0].canRelease).toBe(true);
  });
});

describe('canReleaseBooking', () => {
  it('allows visitors to release their own current booking', () => {
    expect(canReleaseBooking(booking({ userId: users[0].id }))).toBe(true);
  });

  it('allows visitors to release other peoples current bookings', () => {
    expect(canReleaseBooking(booking({ userId: users[0].id }))).toBe(true);
  });
});

describe('getNextAccountLabel', () => {
  it('returns the next short Runway account label', () => {
    expect(getNextAccountLabel(accounts)).toBe('R-03');
  });

  it('skips gaps and continues after the largest label number', () => {
    expect(
      getNextAccountLabel([
        { ...accounts[0], label: 'R-01' },
        { ...accounts[1], label: 'R-07' },
      ]),
    ).toBe('R-08');
  });
});

describe('member and group editing rules', () => {
  it('validates a new group name and rejects duplicates', () => {
    expect(validateGroupDraft({ name: ' D组 ' }, groups)).toEqual({ ok: true, value: { name: 'D组', isActive: true } });
    expect(validateGroupDraft({ name: 'A组' }, groups)).toEqual({ ok: false, reason: '这个小组已经存在' });
  });

  it('validates member name and group (email is optional)', () => {
    expect(validateUserDraft({ name: ' 小周 ', email: ' zhou@example.com ', groupId: 'group-a' }, users, groups)).toEqual({
      ok: true,
      value: { name: '小周', email: 'zhou@example.com', groupId: 'group-a', isActive: true },
    });
    // email is optional — omitting it should still pass
    expect(validateUserDraft({ name: '小周', groupId: 'group-a' }, users, groups)).toEqual({
      ok: true,
      value: { name: '小周', email: '', groupId: 'group-a', isActive: true },
    });
    // duplicate email is still checked when provided
    expect(validateUserDraft({ name: '小周', email: 'wang@example.com', groupId: 'group-a' }, users, groups)).toEqual({
      ok: false,
      reason: '这个邮箱已经存在',
    });
    expect(validateUserDraft({ name: ' 小王 ', groupId: 'group-a' }, users, groups)).toEqual({
      ok: false,
      reason: '这个成员已经存在',
    });
  });

  it('parses pasted member names and rejects duplicates from existing users or the pasted text', () => {
    expect(parseMemberImportNames(' 小周\n\n陈也 \n 小赵 ', users)).toEqual({
      ok: true,
      value: ['小周', '陈也', '小赵'],
    });

    expect(parseMemberImportNames('小周\n小王', users)).toEqual({
      ok: false,
      reason: '这个成员已经存在：小王',
    });

    expect(parseMemberImportNames('小周\n 小周 ', users)).toEqual({
      ok: false,
      reason: '名单里有重复姓名：小周',
    });
  });

  it('keeps inactive members out of new booking choices while preserving existing booking display', () => {
    const inactiveUsers: User[] = [{ ...users[0], isActive: false }, users[1]];
    const view = buildAccountsView({
      accounts,
      bookings: [booking({})],
      users: inactiveUsers,
      groups,
      now,
      filters: {
        query: '',
        status: 'all',
        groupId: 'all',
        renewal: 'all',
      },
    });

    expect(getActiveUsers(inactiveUsers).map((user) => user.id)).toEqual(['user-2']);
    expect(view.rows[0].current?.user?.name).toBe('小王');
  });

  it('hides inactive empty groups from new choices but keeps groups with active members', () => {
    const editableGroups: Group[] = [{ ...groups[0], isActive: false }, { ...groups[1], isActive: false }];
    const editableUsers: User[] = [{ ...users[0], isActive: true }, { ...users[1], isActive: false }];

    expect(getActiveGroups(editableGroups, editableUsers).map((group) => group.id)).toEqual(['group-a']);
  });

  it('always allows deleting members regardless of bookings', () => {
    expect(validateUserDeletion('user-2', [])).toEqual({ ok: true, value: 'user-2' });
    expect(validateUserDeletion('user-1', [booking({})])).toEqual({ ok: true, value: 'user-1' });
  });

  it('allows deleting groups freely unless a booking is currently active for that group', () => {
    expect(validateGroupDeletion('group-empty', users, [])).toEqual({ ok: true, value: 'group-empty' });
    expect(validateGroupDeletion('group-a', users, [])).toEqual({ ok: true, value: 'group-a' });
    // default booking fixture spans 09:00–11:00, now=10:00 → currently active → should block
    expect(validateGroupDeletion('group-c', [], [booking({ groupId: 'group-c' })])).toEqual({ ok: false, reason: '这个小组当前有账号使用中，暂时无法删除' });
  });
});

describe('selectAvailableAccounts', () => {
  it('returns up to five idle accounts and prefers accounts without future bookings', () => {
    const accountPool: Account[] = Array.from({ length: 7 }, (_, index) => ({
      id: `account-${index + 1}`,
      email: `runway${index + 1}@example.com`,
      label: `R-${String(index + 1).padStart(2, '0')}`,
      renewalDate: '2026-06-10',
      isActive: true,
      sortOrder: index + 1,
    }));
    const selected = selectAvailableAccounts(
      accountPool,
      [
        booking({
          accountId: 'account-1',
          startTime: '2026-05-09T12:00:00.000Z',
          endTime: '2026-05-09T14:00:00.000Z',
        }),
        booking({
          accountId: 'account-2',
          startTime: '2026-05-09T09:00:00.000Z',
          endTime: '2026-05-09T11:00:00.000Z',
        }),
      ],
      now,
    );

    expect(selected.map((account) => account.id)).toEqual(['account-3', 'account-4', 'account-5', 'account-6', 'account-7']);
  });
});
