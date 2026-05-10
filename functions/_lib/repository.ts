import type { Account, Booking, BookingDraft } from '../../lib/domain';

type AccountRow = {
  id: string;
  email: string;
  label: string;
  renewal_date: string | null;
  is_active: number;
  sort_order: number;
  created_at: string;
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

export type D1Repository = {
  listSnapshot(): Promise<{ accounts: Account[]; bookings: Booking[] }>;
  createAccount(input: { email: string; label: string; renewalDate: string | null; isActive: boolean; sortOrder: number }): Promise<Account>;
  updateAccount(id: string, input: { email: string; label: string; renewalDate: string | null; isActive: boolean; sortOrder: number }): Promise<Account | null>;
  createBooking(input: BookingDraft): Promise<Booking>;
  releaseBooking(id: string, releasedAt: string): Promise<Booking | null>;
};

export function createRepository(db: D1Database): D1Repository {
  return {
    async listSnapshot() {
      const [accountsResult, bookingsResult] = await Promise.all([
        db.prepare('SELECT id, email, label, renewal_date, is_active, sort_order, created_at FROM accounts ORDER BY sort_order ASC, email ASC').all<AccountRow>(),
        db
          .prepare(
            `SELECT id, account_id, user_name, group_name, project_name, start_at, end_at, released_at, created_at
             FROM bookings
             ORDER BY start_at ASC`,
          )
          .all<BookingRow>(),
      ]);

      return {
        accounts: accountsResult.results.map(mapAccount),
        bookings: bookingsResult.results.map(mapBooking),
      };
    },

    async createAccount(input) {
      const id = crypto.randomUUID();
      await db
        .prepare('INSERT INTO accounts (id, email, label, renewal_date, is_active, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
        .bind(id, input.email, input.label, input.renewalDate, input.isActive ? 1 : 0, input.sortOrder)
        .run();

      const account = await getAccountById(db, id);
      if (!account) {
        throw new Error('ACCOUNT_CREATE_FAILED');
      }
      return account;
    },

    async updateAccount(id, input) {
      await db
        .prepare('UPDATE accounts SET email = ?1, label = ?2, renewal_date = ?3, is_active = ?4, sort_order = ?5 WHERE id = ?6')
        .bind(input.email, input.label, input.renewalDate, input.isActive ? 1 : 0, input.sortOrder, id)
        .run();

      return getAccountById(db, id);
    },

    async createBooking(input) {
      const conflict = await db
        .prepare(
          `SELECT id
           FROM bookings
           WHERE account_id = ?1
             AND released_at IS NULL
             AND start_at < ?3
             AND ?2 < end_at
           LIMIT 1`,
        )
        .bind(input.accountId, input.startAt, input.endAt)
        .first<{ id: string }>();

      if (conflict) {
        throw new Error('BOOKING_CONFLICT');
      }

      const id = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO bookings (id, account_id, user_name, group_name, project_name, start_at, end_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
        )
        .bind(id, input.accountId, input.userName, input.groupName, input.projectName, input.startAt, input.endAt)
        .run();

      const booking = await getBookingById(db, id);
      if (!booking) {
        throw new Error('BOOKING_CREATE_FAILED');
      }
      return booking;
    },

    async releaseBooking(id, releasedAt) {
      const result = await db
        .prepare('UPDATE bookings SET released_at = ?1 WHERE id = ?2 AND released_at IS NULL AND start_at <= ?1 AND end_at > ?1')
        .bind(releasedAt, id)
        .run();

      if (getChangedRows(result) === 0) {
        return null;
      }

      return getBookingById(db, id);
    },
  };
}

async function getAccountById(db: D1Database, id: string): Promise<Account | null> {
  const row = await db
    .prepare('SELECT id, email, label, renewal_date, is_active, sort_order, created_at FROM accounts WHERE id = ?1')
    .bind(id)
    .first<AccountRow>();

  return row ? mapAccount(row) : null;
}

async function getBookingById(db: D1Database, id: string): Promise<Booking | null> {
  const row = await db
    .prepare(
      `SELECT id, account_id, user_name, group_name, project_name, start_at, end_at, released_at, created_at
       FROM bookings
       WHERE id = ?1`,
    )
    .bind(id)
    .first<BookingRow>();

  return row ? mapBooking(row) : null;
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    email: row.email,
    label: row.label,
    renewalDate: row.renewal_date,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    accountId: row.account_id,
    userName: row.user_name,
    groupName: row.group_name,
    projectName: row.project_name,
    startAt: row.start_at,
    endAt: row.end_at,
    releasedAt: row.released_at,
    createdAt: row.created_at,
  };
}

function getChangedRows(result: D1Result): number {
  return (result.meta as { changes?: number }).changes ?? 0;
}
