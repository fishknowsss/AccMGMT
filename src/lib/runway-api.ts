import { type Account, type Booking, type Group, type User, type UserRole } from './runway-board';

export type CloudAccount = {
  id: string;
  email: string;
  label?: string | null;
  renewalDate: string | null;
  isActive: boolean;
  sortOrder?: number | null;
  createdAt: string;
};

export type CloudBooking = {
  id: string;
  accountId: string;
  userName: string;
  groupName: string;
  projectName: string;
  startAt: string;
  endAt: string;
  releasedAt: string | null;
  createdAt: string;
};

export type CloudSnapshot = {
  accounts: CloudAccount[];
  bookings: CloudBooking[];
  users: User[];
  groups: Group[];
  currentUser: User;
};

export type BoardSnapshot = {
  accounts: Account[];
  bookings: Booking[];
  users: User[];
  groups: Group[];
  currentUser: User;
};

export type AccountWritePayload = {
  email: string;
  label: string;
  renewalDate: string;
  isActive: boolean;
  sortOrder?: number;
};

export type BookingWritePayload = {
  accountId: string;
  userName: string;
  groupName: string;
  projectName: string;
  startAt: string;
  endAt: string;
};

export function mapCloudSnapshot(snapshot: CloudSnapshot): BoardSnapshot {
  const users = [...snapshot.users];
  const groups = [...snapshot.groups];

  for (const booking of snapshot.bookings) {
    ensureGroup(groups, booking.groupName);
    ensureUser(users, groups, booking.userName, booking.groupName);
  }

  return {
    accounts: snapshot.accounts.map((account, index) => ({
      id: account.id,
      email: account.email,
      label: account.label?.trim() || `R-${String(index + 1).padStart(2, '0')}`,
      renewalDate: account.renewalDate || todayDateInputValue(),
      isActive: account.isActive,
      sortOrder: account.sortOrder ?? index + 1,
    })),
    bookings: snapshot.bookings.map((booking) => ({
      id: booking.id,
      accountId: booking.accountId,
      userId: findUserId(users, booking.userName),
      groupId: findGroupId(groups, booking.groupName),
      projectName: booking.projectName,
      startTime: booking.startAt,
      endTime: booking.releasedAt ?? booking.endAt,
      status: booking.releasedAt ? 'cancelled' : 'confirmed',
    })),
    users,
    groups,
    currentUser: snapshot.currentUser,
  };
}

export async function getCloudSnapshot(baseSnapshot: BoardSnapshot): Promise<BoardSnapshot> {
  const response = await fetch('/api/accounts');
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as { accounts: CloudAccount[]; bookings: CloudBooking[] };
  return mapCloudSnapshot({
    accounts: data.accounts,
    bookings: data.bookings,
    users: baseSnapshot.users,
    groups: baseSnapshot.groups,
    currentUser: baseSnapshot.currentUser,
  });
}

export async function createCloudAccount(payload: AccountWritePayload, pin: string): Promise<CloudAccount> {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: writeHeaders(pin),
    body: JSON.stringify(payload),
  });
  return readCloudEntity(response, 'account');
}

export async function updateCloudAccount(accountId: string, payload: AccountWritePayload, pin: string): Promise<CloudAccount> {
  const response = await fetch(`/api/accounts/${accountId}`, {
    method: 'PATCH',
    headers: writeHeaders(pin),
    body: JSON.stringify(payload),
  });
  return readCloudEntity(response, 'account');
}

export async function createCloudBooking(payload: BookingWritePayload): Promise<CloudBooking> {
  const response = await fetch('/api/bookings', {
    method: 'POST',
    headers: bookingWriteHeaders(),
    body: JSON.stringify(payload),
  });
  return readCloudEntity(response, 'booking');
}

export async function releaseCloudBooking(bookingId: string): Promise<CloudBooking> {
  const response = await fetch(`/api/bookings/${bookingId}/release`, {
    method: 'POST',
  });
  return readCloudEntity(response, 'booking');
}

function writeHeaders(pin: string): HeadersInit {
  return {
    'content-type': 'application/json',
    'x-operator-pin': pin,
  };
}

function bookingWriteHeaders(): HeadersInit {
  return {
    'content-type': 'application/json',
  };
}

async function readCloudEntity<T extends 'account' | 'booking'>(
  response: Response,
  key: T,
): Promise<T extends 'account' ? CloudAccount : CloudBooking> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as Record<T, T extends 'account' ? CloudAccount : CloudBooking>;
  return data[key];
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message || '操作失败';
  } catch {
    return '操作失败';
  }
}

function ensureGroup(groups: Group[], name: string): Group {
  const existing = groups.find((group) => group.name === name);
  if (existing) {
    return existing;
  }

  const group = { id: `group-${slugId(name)}`, name };
  groups.push(group);
  return group;
}

function ensureUser(users: User[], groups: Group[], name: string, groupName: string): User {
  const existing = users.find((user) => user.name === name);
  if (existing) {
    return existing;
  }

  const group = ensureGroup(groups, groupName);
  const user = {
    id: `user-${slugId(name)}`,
    name,
    email: `${slugId(name)}@studio.local`,
    groupId: group.id,
    role: 'member' as UserRole,
  };
  users.push(user);
  return user;
}

function findUserId(users: User[], name: string): string {
  return users.find((user) => user.name === name)?.id ?? `user-${slugId(name)}`;
}

function findGroupId(groups: Group[], name: string): string {
  return groups.find((group) => group.name === name)?.id ?? `group-${slugId(name)}`;
}

function slugId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || encodeURIComponent(value.trim()).replace(/%/g, '').toLowerCase() || 'unknown';
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}
