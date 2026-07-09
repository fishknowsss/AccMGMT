import type { Account, Booking, BookingDraft, Group, User } from '../../lib/domain';

type AccountRow = {
  id: string;
  email: string;
  password: string | null;
  notes: string | null;
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

type UserRow = {
  id: string;
  name: string;
  email: string | null;
  group_id: string;
  is_active: number;
};

type GroupRow = {
  id: string;
  name: string;
  concurrent_limit: number;
  sort_order: number;
  is_active: number;
};

type ProjectRow = {
  name: string;
  sort_order: number;
};

export type D1Repository = {
  listSnapshot(): Promise<{ accounts: Account[]; bookings: Booking[]; users: User[]; groups: Group[]; projects: string[] }>;
  createAccount(input: { email: string; password?: string | null; notes?: string | null; label: string; renewalDate: string | null; isActive: boolean; sortOrder: number }): Promise<Account>;
  updateAccount(id: string, input: { email: string; password?: string | null; notes?: string | null; label: string; renewalDate: string | null; isActive: boolean; sortOrder: number }): Promise<Account | null>;
  deleteAccount(id: string): Promise<boolean>;
  createBooking(input: BookingDraft): Promise<Booking>;
  updateFutureBooking(id: string, input: BookingDraft, now: string): Promise<Booking | null>;
  cancelFutureBooking(id: string, releasedAt: string): Promise<Booking | null>;
  releaseBooking(id: string, releasedAt: string): Promise<Booking | null>;
  listUsers(): Promise<User[]>;
  createUser(input: { name: string; email: string | null; groupId: string; isActive: boolean }): Promise<User>;
  updateUser(id: string, input: { name: string; email: string | null; groupId: string; isActive: boolean }): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
  listGroups(): Promise<Group[]>;
  createGroup(input: { name: string; concurrentLimit: number; isActive: boolean }): Promise<Group>;
  updateGroup(id: string, input: { name: string; concurrentLimit: number; isActive: boolean }): Promise<Group | null>;
  reorderGroups(groupIds: string[]): Promise<Group[]>;
  deleteGroup(id: string): Promise<boolean>;
  createProject(name: string): Promise<string>;
  reorderProjects(projects: string[]): Promise<string[]>;
  renameProject(oldName: string, newName: string): Promise<number>;
  deleteProject(name: string): Promise<number>;
};

export function createRepository(db: D1Database): D1Repository {
  return {
    async listSnapshot() {
      const [accountsResult, bookingsResult, usersResult, groupsResult, projectsResult] = await Promise.all([
        db.prepare('SELECT id, email, password, notes, label, renewal_date, is_active, sort_order, created_at FROM accounts ORDER BY sort_order ASC, email ASC').all<AccountRow>(),
        db
          .prepare(
            `SELECT id, account_id, user_name, group_name, project_name, start_at, end_at, released_at, created_at
             FROM bookings
             ORDER BY start_at ASC`,
          )
          .all<BookingRow>(),
        db.prepare('SELECT id, name, email, group_id, is_active FROM users ORDER BY name ASC').all<UserRow>(),
        db.prepare('SELECT id, name, concurrent_limit, sort_order, is_active FROM groups ORDER BY sort_order ASC, name ASC').all<GroupRow>(),
        db.prepare('SELECT name, sort_order FROM projects ORDER BY sort_order ASC, name ASC').all<ProjectRow>(),
      ]);

      const projects = mergeProjectNames(
        projectsResult.results.map((project) => project.name),
        bookingsResult.results.map((booking) => booking.project_name),
      );

      return {
        accounts: accountsResult.results.map(mapAccount),
        bookings: bookingsResult.results.map(mapBooking),
        users: usersResult.results.map(mapUser),
        groups: groupsResult.results.map(mapGroup),
        projects,
      };
    },

    async createAccount(input) {
      const id = crypto.randomUUID();
      await db
        .prepare('INSERT INTO accounts (id, email, password, notes, label, renewal_date, is_active, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)')
        .bind(id, input.email, input.password ?? null, input.notes ?? null, input.label, input.renewalDate, input.isActive ? 1 : 0, input.sortOrder)
        .run();

      const account = await getAccountById(db, id);
      if (!account) {
        throw new Error('ACCOUNT_CREATE_FAILED');
      }
      return account;
    },

    async updateAccount(id, input) {
      await db
        .prepare('UPDATE accounts SET email = ?1, password = ?2, notes = ?3, label = ?4, renewal_date = ?5, is_active = ?6, sort_order = ?7 WHERE id = ?8')
        .bind(input.email, input.password ?? null, input.notes ?? null, input.label, input.renewalDate, input.isActive ? 1 : 0, input.sortOrder, id)
        .run();

      return getAccountById(db, id);
    },

    async deleteAccount(id) {
      const result = await db.prepare('DELETE FROM accounts WHERE id = ?1').bind(id).run();
      return getChangedRows(result) > 0;
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

      await assertGroupConcurrentLimit(db, input);

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

    async updateFutureBooking(id, input, now) {
      const conflict = await db
        .prepare(
          `SELECT id
           FROM bookings
           WHERE id != ?1
             AND account_id = ?2
             AND released_at IS NULL
             AND start_at < ?4
             AND ?3 < end_at
           LIMIT 1`,
        )
        .bind(id, input.accountId, input.startAt, input.endAt)
        .first<{ id: string }>();

      if (conflict) {
        throw new Error('BOOKING_CONFLICT');
      }

      await assertGroupConcurrentLimit(db, input, id);

      const result = await db
        .prepare(
          `UPDATE bookings
           SET account_id = ?1, user_name = ?2, group_name = ?3, project_name = ?4, start_at = ?5, end_at = ?6
           WHERE id = ?7 AND released_at IS NULL AND start_at > ?8`,
        )
        .bind(input.accountId, input.userName, input.groupName, input.projectName, input.startAt, input.endAt, id, now)
        .run();

      if (getChangedRows(result) === 0) {
        return null;
      }

      return getBookingById(db, id);
    },

    async cancelFutureBooking(id, releasedAt) {
      const result = await db
        .prepare('UPDATE bookings SET released_at = ?1 WHERE id = ?2 AND released_at IS NULL AND start_at > ?1')
        .bind(releasedAt, id)
        .run();

      if (getChangedRows(result) === 0) {
        return null;
      }

      return getBookingById(db, id);
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

    async listUsers() {
      const result = await db.prepare('SELECT id, name, email, group_id, is_active FROM users ORDER BY name ASC').all<UserRow>();
      return result.results.map(mapUser);
    },

    async createUser(input) {
      const id = crypto.randomUUID();
      await db
        .prepare('INSERT INTO users (id, name, email, group_id, is_active) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(id, input.name, input.email, input.groupId, input.isActive ? 1 : 0)
        .run();
      const row = await db.prepare('SELECT id, name, email, group_id, is_active FROM users WHERE id = ?1').bind(id).first<UserRow>();
      if (!row) throw new Error('USER_CREATE_FAILED');
      return mapUser(row);
    },

    async updateUser(id, input) {
      await db
        .prepare('UPDATE users SET name = ?1, email = ?2, group_id = ?3, is_active = ?4 WHERE id = ?5')
        .bind(input.name, input.email, input.groupId, input.isActive ? 1 : 0, id)
        .run();
      const row = await db.prepare('SELECT id, name, email, group_id, is_active FROM users WHERE id = ?1').bind(id).first<UserRow>();
      return row ? mapUser(row) : null;
    },

    async deleteUser(id) {
      const result = await db.prepare('DELETE FROM users WHERE id = ?1').bind(id).run();
      return getChangedRows(result) > 0;
    },

    async listGroups() {
      const result = await db.prepare('SELECT id, name, concurrent_limit, sort_order, is_active FROM groups ORDER BY sort_order ASC, name ASC').all<GroupRow>();
      return result.results.map(mapGroup);
    },

    async createGroup(input) {
      const id = crypto.randomUUID();
      const maxOrderRow = await db.prepare('SELECT MAX(sort_order) AS max_order FROM groups').first<{ max_order: number | null }>();
      const sortOrder = (maxOrderRow?.max_order ?? 0) + 1;
      await db
        .prepare('INSERT INTO groups (id, name, concurrent_limit, sort_order, is_active) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(id, input.name, input.concurrentLimit, sortOrder, input.isActive ? 1 : 0)
        .run();
      const row = await db.prepare('SELECT id, name, concurrent_limit, sort_order, is_active FROM groups WHERE id = ?1').bind(id).first<GroupRow>();
      if (!row) throw new Error('GROUP_CREATE_FAILED');
      return mapGroup(row);
    },

    async updateGroup(id, input) {
      await db
        .prepare('UPDATE groups SET name = ?1, concurrent_limit = ?2, is_active = ?3 WHERE id = ?4')
        .bind(input.name, input.concurrentLimit, input.isActive ? 1 : 0, id)
        .run();
      const row = await db.prepare('SELECT id, name, concurrent_limit, sort_order, is_active FROM groups WHERE id = ?1').bind(id).first<GroupRow>();
      return row ? mapGroup(row) : null;
    },

    async reorderGroups(groupIds) {
      const orderedIds = Array.from(new Set(groupIds.map((id) => id.trim()).filter(Boolean)));
      for (let index = 0; index < orderedIds.length; index += 1) {
        await db
          .prepare('UPDATE groups SET sort_order = ?1 WHERE id = ?2')
          .bind(index + 1, orderedIds[index])
          .run();
      }

      const result = await db.prepare('SELECT id, name, concurrent_limit, sort_order, is_active FROM groups ORDER BY sort_order ASC, name ASC').all<GroupRow>();
      return result.results.map(mapGroup);
    },

    async deleteGroup(id) {
      const result = await db.prepare('DELETE FROM groups WHERE id = ?1').bind(id).run();
      return getChangedRows(result) > 0;
    },

    async createProject(name) {
      const maxOrderRow = await db.prepare('SELECT MAX(sort_order) AS max_order FROM projects').first<{ max_order: number | null }>();
      const sortOrder = (maxOrderRow?.max_order ?? 0) + 1;
      await db
        .prepare('INSERT INTO projects (name, sort_order) VALUES (?1, ?2)')
        .bind(name, sortOrder)
        .run();
      return name;
    },

    async reorderProjects(projects) {
      const orderedProjects = Array.from(new Set(projects.map((project) => project.trim()).filter(Boolean)));
      for (const project of orderedProjects) {
        await db
          .prepare('INSERT OR IGNORE INTO projects (name, sort_order) VALUES (?1, ?2)')
          .bind(project, 0)
          .run();
      }

      const existingResult = await db.prepare('SELECT name, sort_order FROM projects ORDER BY sort_order ASC, name ASC').all<ProjectRow>();
      const orderedProjectSet = new Set(orderedProjects);
      const finalProjects = [
        ...orderedProjects,
        ...existingResult.results.map((project) => project.name).filter((project) => !orderedProjectSet.has(project)),
      ];

      for (let index = 0; index < finalProjects.length; index += 1) {
        await db
          .prepare('UPDATE projects SET sort_order = ?1 WHERE name = ?2')
          .bind(index + 1, finalProjects[index])
          .run();
      }

      return finalProjects;
    },

    async renameProject(oldName, newName) {
      const maxOrderRow = await db.prepare('SELECT MAX(sort_order) AS max_order FROM projects').first<{ max_order: number | null }>();
      const sortOrder = (maxOrderRow?.max_order ?? 0) + 1;
      await db
        .prepare('INSERT OR IGNORE INTO projects (name, sort_order) VALUES (?1, ?2)')
        .bind(oldName, sortOrder)
        .run();
      await db
        .prepare('UPDATE projects SET name = ?1, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\', \'now\') WHERE name = ?2')
        .bind(newName, oldName)
        .run();
      const result = await db
        .prepare('UPDATE bookings SET project_name = ?1 WHERE project_name = ?2')
        .bind(newName, oldName)
        .run();
      return getChangedRows(result);
    },

    async deleteProject(name) {
      await db.prepare('DELETE FROM projects WHERE name = ?1').bind(name).run();
      const result = await db
        .prepare("UPDATE bookings SET project_name = '' WHERE project_name = ?1")
        .bind(name)
        .run();
      return getChangedRows(result);
    },
  };
}

async function getAccountById(db: D1Database, id: string): Promise<Account | null> {
  const row = await db
    .prepare('SELECT id, email, password, notes, label, renewal_date, is_active, sort_order, created_at FROM accounts WHERE id = ?1')
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
    password: row.password,
    notes: row.notes,
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

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    groupId: row.group_id,
    isActive: Boolean(row.is_active),
  };
}

function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    concurrentLimit: row.concurrent_limit,
    sortOrder: row.sort_order,
    isActive: Boolean(row.is_active),
  };
}

function getChangedRows(result: D1Result): number {
  return (result.meta as { changes?: number }).changes ?? 0;
}

function mergeProjectNames(orderedProjects: string[], bookingProjects: string[]): string[] {
  const seen = new Set<string>();
  const projects: string[] = [];

  for (const project of [...orderedProjects, ...bookingProjects]) {
    const name = project.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    projects.push(name);
  }

  return projects;
}

async function assertGroupConcurrentLimit(db: D1Database, input: BookingDraft, ignoredBookingId?: string): Promise<void> {
  if (isBossGroupName(input.groupName)) {
    return;
  }

  const limit = await getGroupConcurrentLimit(db, input.groupName);
  const concurrent = await countOverlappingGroupBookings(db, input, ignoredBookingId);

  if (concurrent >= limit) {
    throw new Error('GROUP_CONCURRENT_LIMIT');
  }
}

async function getGroupConcurrentLimit(db: D1Database, groupName: string): Promise<number> {
  const row = await db
    .prepare('SELECT concurrent_limit FROM groups WHERE name = ?1 LIMIT 1')
    .bind(groupName)
    .first<{ concurrent_limit: number | null }>();

  const limit = row?.concurrent_limit;
  return typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? limit : 2;
}

async function countOverlappingGroupBookings(db: D1Database, input: BookingDraft, ignoredBookingId?: string): Promise<number> {
  const row = ignoredBookingId
    ? await db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM bookings
           WHERE id != ?1
             AND group_name = ?2
             AND released_at IS NULL
             AND start_at < ?4
             AND ?3 < end_at`,
        )
        .bind(ignoredBookingId, input.groupName, input.startAt, input.endAt)
        .first<{ count: number }>()
    : await db
        .prepare(
          `SELECT COUNT(*) AS count
           FROM bookings
           WHERE group_name = ?1
             AND released_at IS NULL
             AND start_at < ?3
             AND ?2 < end_at`,
        )
        .bind(input.groupName, input.startAt, input.endAt)
        .first<{ count: number }>();

  return row?.count ?? 0;
}

function isBossGroupName(groupName: string): boolean {
  const normalized = groupName.replace(/\s/g, '').toLowerCase();
  return normalized === 'boss' || normalized === 'boss组' || normalized === 'boss小组';
}
