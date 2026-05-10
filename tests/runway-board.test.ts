import { describe, expect, it } from 'vitest';
import {
  buildAccountsView,
  canUserReleaseBooking,
  findBookingConflict,
  getAccountRuntime,
  getNextAccountLabel,
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
];

const users: User[] = [
  { id: 'user-1', name: '小王', email: 'wang@example.com', groupId: 'group-a', role: 'member' },
  { id: 'user-2', name: '小林', email: 'lin@example.com', groupId: 'group-b', role: 'admin' },
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
});

describe('buildAccountsView', () => {
  it('computes stats and filters by search, status, group, and renewal window', () => {
    const view = buildAccountsView({
      accounts,
      bookings: [booking({})],
      users,
      groups,
      currentUser: users[0],
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
});

describe('canUserReleaseBooking', () => {
  it('allows members to release their own current booking', () => {
    expect(canUserReleaseBooking(booking({ userId: users[0].id }), users[0])).toBe(true);
  });

  it('blocks members from releasing other members bookings', () => {
    expect(canUserReleaseBooking(booking({ userId: users[1].id }), users[0])).toBe(false);
  });

  it('allows admins to release any current booking', () => {
    expect(canUserReleaseBooking(booking({ userId: users[0].id }), users[1])).toBe(true);
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
