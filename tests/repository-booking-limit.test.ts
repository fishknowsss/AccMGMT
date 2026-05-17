import { describe, expect, it } from 'vitest';
import { createRepository } from '../functions/_lib/repository';
import type { Booking } from '../lib/domain';

type GroupRow = {
  id: string;
  name: string;
  concurrent_limit: number;
  sort_order: number;
  is_active: number;
};

type BookingRow = {
  id: string;
  account_id: string;
  user_name: string;
  group_name: string;
  project_name: string;
  start_at: string;
  end_at: string;
  released_at: string | null;
  created_at: string;
};

function booking(partial: Partial<BookingRow>): BookingRow {
  return {
    id: 'booking-1',
    account_id: 'account-1',
    user_name: '林一',
    group_name: 'A组',
    project_name: '广告片',
    start_at: '2026-05-09T06:00:00.000Z',
    end_at: '2026-05-09T08:00:00.000Z',
    released_at: null,
    created_at: '2026-05-09T05:50:00.000Z',
    ...partial,
  };
}

function createFakeDb(input: { groups: GroupRow[]; bookings: BookingRow[] }): D1Database {
  const rows = {
    groups: [...input.groups],
    bookings: [...input.bookings],
  };

  return {
    prepare(sql: string) {
      let bound: unknown[] = [];

      return {
        bind(...values: unknown[]) {
          bound = values;
          return this;
        },
        async first() {
          if (sql.includes('SELECT concurrent_limit FROM groups')) {
            return rows.groups.find((row) => row.name === bound[0]) ?? null;
          }

          if (sql.includes('COUNT(*) AS count') && sql.includes('group_name')) {
            const ignoredId = sql.includes('id != ?1') ? String(bound[0]) : null;
            const groupName = String(bound[ignoredId ? 1 : 0]);
            const startAt = String(bound[ignoredId ? 2 : 1]);
            const endAt = String(bound[ignoredId ? 3 : 2]);
            const count = rows.bookings.filter(
              (row) =>
                row.id !== ignoredId &&
                row.group_name === groupName &&
                row.released_at === null &&
                row.start_at < endAt &&
                startAt < row.end_at,
            ).length;
            return { count };
          }

          if (sql.includes('FROM bookings') && sql.includes('WHERE id = ?1')) {
            return rows.bookings.find((row) => row.id === bound[0]) ?? null;
          }

          if (sql.includes('FROM bookings') && sql.includes('account_id')) {
            const ignoredId = sql.includes('id != ?1') ? String(bound[0]) : null;
            const accountId = String(bound[ignoredId ? 1 : 0]);
            const startAt = String(bound[ignoredId ? 2 : 1]);
            const endAt = String(bound[ignoredId ? 3 : 2]);
            return rows.bookings.find(
              (row) =>
                row.id !== ignoredId &&
                row.account_id === accountId &&
                row.released_at === null &&
                row.start_at < endAt &&
                startAt < row.end_at,
            );
          }

          return null;
        },
        async all() {
          return { results: [] };
        },
        async run() {
          if (sql.includes('INSERT INTO bookings')) {
            rows.bookings.push(
              booking({
                id: String(bound[0]),
                account_id: String(bound[1]),
                user_name: String(bound[2]),
                group_name: String(bound[3]),
                project_name: String(bound[4]),
                start_at: String(bound[5]),
                end_at: String(bound[6]),
              }),
            );
          }

          if (sql.includes('UPDATE bookings') && sql.includes('SET account_id')) {
            const row = rows.bookings.find((item) => item.id === String(bound[6]) && item.released_at === null && item.start_at > String(bound[7]));
            if (!row) return { meta: { changes: 0 } };
            row.account_id = String(bound[0]);
            row.user_name = String(bound[1]);
            row.group_name = String(bound[2]);
            row.project_name = String(bound[3]);
            row.start_at = String(bound[4]);
            row.end_at = String(bound[5]);
            return { meta: { changes: 1 } };
          }

          return { meta: { changes: 1 } };
        },
      };
    },
  } as unknown as D1Database;
}

const groups: GroupRow[] = [
  { id: 'group-a', name: 'A组', concurrent_limit: 2, sort_order: 1, is_active: 1 },
  { id: 'group-boss', name: 'Boss小组', concurrent_limit: 2, sort_order: 2, is_active: 1 },
];

describe('D1 booking group concurrent limit', () => {
  it('rejects creating a booking when the group already has two overlapping accounts', async () => {
    const repo = createRepository(
      createFakeDb({
        groups,
        bookings: [
          booking({ id: 'booking-1', account_id: 'account-1', group_name: 'A组' }),
          booking({ id: 'booking-2', account_id: 'account-2', group_name: 'A组' }),
        ],
      }),
    );

    await expect(
      repo.createBooking({
        accountId: 'account-3',
        userName: '林三',
        groupName: 'A组',
        projectName: '短片',
        startAt: '2026-05-09T07:00:00.000Z',
        endAt: '2026-05-09T09:00:00.000Z',
      }),
    ).rejects.toThrow('GROUP_CONCURRENT_LIMIT');
  });

  it('rejects changing a future booking into an over-limit group slot', async () => {
    const repo = createRepository(
      createFakeDb({
        groups,
        bookings: [
          booking({ id: 'booking-1', account_id: 'account-1', group_name: 'A组', start_at: '2026-05-09T10:00:00.000Z', end_at: '2026-05-09T12:00:00.000Z' }),
          booking({ id: 'booking-2', account_id: 'account-2', group_name: 'A组', start_at: '2026-05-09T10:00:00.000Z', end_at: '2026-05-09T12:00:00.000Z' }),
          booking({ id: 'booking-3', account_id: 'account-3', group_name: 'B组', start_at: '2026-05-09T14:00:00.000Z', end_at: '2026-05-09T15:00:00.000Z' }),
        ],
      }),
    );

    await expect(
      repo.updateFutureBooking(
        'booking-3',
        {
          accountId: 'account-3',
          userName: '林三',
          groupName: 'A组',
          projectName: '短片',
          startAt: '2026-05-09T10:30:00.000Z',
          endAt: '2026-05-09T11:30:00.000Z',
        },
        '2026-05-09T09:00:00.000Z',
      ),
    ).rejects.toThrow('GROUP_CONCURRENT_LIMIT');
  });

  it('allows Boss group to exceed the default limit', async () => {
    const repo = createRepository(
      createFakeDb({
        groups,
        bookings: [
          booking({ id: 'booking-1', account_id: 'account-1', group_name: 'Boss小组' }),
          booking({ id: 'booking-2', account_id: 'account-2', group_name: 'Boss小组' }),
        ],
      }),
    );

    const created = await repo.createBooking({
      accountId: 'account-3',
      userName: '老板',
      groupName: 'Boss小组',
      projectName: '短片',
      startAt: '2026-05-09T07:00:00.000Z',
      endAt: '2026-05-09T09:00:00.000Z',
    });

    expect((created as Booking).groupName).toBe('Boss小组');
  });
});
