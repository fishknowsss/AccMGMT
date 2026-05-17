import { type Account, type Booking, type Group, type User } from './runway-board';

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

export type CloudUser = {
  id: string;
  name: string;
  email: string | null;
  groupId: string;
  isActive?: boolean;
};

export type CloudGroup = {
  id: string;
  name: string;
  concurrentLimit?: number;
  isActive?: boolean;
};

export type CloudSnapshot = {
  accounts: CloudAccount[];
  bookings: CloudBooking[];
  users: CloudUser[];
  groups: CloudGroup[];
  defaultUser: User;
};

export type BoardSnapshot = {
  accounts: Account[];
  bookings: Booking[];
  users: User[];
  groups: Group[];
  defaultUser: User;
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
  const users: User[] = snapshot.users.map(mapCloudUser);
  const groups: Group[] = snapshot.groups.map((g) => ({ id: g.id, name: g.name, concurrentLimit: g.concurrentLimit, isActive: g.isActive ?? true }));

  // 不从 booking 文本字段合成虚拟小组/成员——
  // 合成对象只存在于本地状态，D1 没有对应记录，
  // 导致小组删除后从历史 booking 重建，以及成员更新时 API 返回 404。
  // groups/users 只保留数据库中真实存在的记录。

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
    defaultUser: snapshot.defaultUser,
  };
}

export function mapCloudUser(u: CloudUser): User {
  return {
    id: u.id,
    name: u.name,
    ...(u.email != null ? { email: u.email } : {}),
    groupId: u.groupId,
    isActive: u.isActive ?? true,
  };
}

export async function getCloudSnapshot(baseSnapshot: BoardSnapshot): Promise<BoardSnapshot> {
  const response = await fetch('/api/accounts');
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as { accounts: CloudAccount[]; bookings: CloudBooking[]; users: CloudUser[]; groups: CloudGroup[] };
  return mapCloudSnapshot({
    accounts: data.accounts,
    bookings: data.bookings,
    users: data.users ?? baseSnapshot.users.map((u) => ({ id: u.id, name: u.name, email: u.email ?? null, groupId: u.groupId })),
    groups: data.groups ?? baseSnapshot.groups.map((g) => ({ id: g.id, name: g.name, concurrentLimit: g.concurrentLimit })),
    defaultUser: baseSnapshot.defaultUser,
  });
}

export async function createCloudAccount(payload: AccountWritePayload): Promise<CloudAccount> {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: writeHeaders(),
    body: JSON.stringify(payload),
  });
  return readCloudEntity(response, 'account');
}

export async function updateCloudAccount(accountId: string, payload: AccountWritePayload): Promise<CloudAccount> {
  const response = await fetch(`/api/accounts/${accountId}`, {
    method: 'PATCH',
    headers: writeHeaders(),
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

export async function updateCloudBooking(bookingId: string, payload: BookingWritePayload): Promise<CloudBooking> {
  const response = await fetch(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: bookingWriteHeaders(),
    body: JSON.stringify(payload),
  });
  return readCloudEntity(response, 'booking');
}

export async function cancelCloudBooking(bookingId: string): Promise<CloudBooking> {
  const response = await fetch(`/api/bookings/${bookingId}`, {
    method: 'DELETE',
  });
  return readCloudEntity(response, 'booking');
}

export async function createCloudUser(payload: { name: string; email?: string; groupId: string; isActive: boolean }): Promise<CloudUser> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: writeHeaders(),
    body: JSON.stringify(payload),
  });
  return readSingleEntity<CloudUser>(response, 'user');
}

export async function updateCloudUser(userId: string, payload: { name: string; email?: string; groupId: string; isActive: boolean }): Promise<CloudUser> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'PATCH',
    headers: writeHeaders(),
    body: JSON.stringify(payload),
  });
  return readSingleEntity<CloudUser>(response, 'user');
}

export async function deleteCloudUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function createCloudGroup(payload: { name: string; concurrentLimit: number; isActive: boolean }): Promise<CloudGroup> {
  const response = await fetch('/api/groups', {
    method: 'POST',
    headers: writeHeaders(),
    body: JSON.stringify(payload),
  });
  return readSingleEntity<CloudGroup>(response, 'group');
}

export async function updateCloudGroup(groupId: string, payload: { name: string; concurrentLimit: number; isActive: boolean }): Promise<CloudGroup> {
  const response = await fetch(`/api/groups/${groupId}`, {
    method: 'PATCH',
    headers: writeHeaders(),
    body: JSON.stringify(payload),
  });
  return readSingleEntity<CloudGroup>(response, 'group');
}

export async function deleteCloudGroup(groupId: string): Promise<void> {
  const response = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function renameCloudProject(oldName: string, newName: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(oldName)}`, {
    method: 'PATCH',
    headers: writeHeaders(),
    body: JSON.stringify({ name: newName }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

export async function deleteCloudProject(name: string): Promise<void> {
  const response = await fetch(`/api/projects/${encodeURIComponent(name)}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
}

function writeHeaders(): HeadersInit {
  return {
    'content-type': 'application/json',
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

async function readSingleEntity<T>(response: Response, key: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const data = (await response.json()) as Record<string, T>;
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
