export type Account = {
  id: string;
  email: string;
  label: string;
  renewalDate: string;
  isActive: boolean;
  sortOrder: number;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  groupId: string;
  isActive?: boolean;
};

export type Group = {
  id: string;
  name: string;
  isActive?: boolean;
};

export type BookingStatus = 'confirmed' | 'cancelled';

export type Booking = {
  id: string;
  accountId: string;
  userId: string;
  groupId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
};

export type BookingDraft = Omit<Booking, 'id' | 'status'>;

export type AccountRuntime = {
  kind: 'idle' | 'in_use';
  current: Booking | null;
  next: Booking | null;
};

export type StatusFilter = 'all' | 'idle' | 'in_use' | 'reserved';
export type RenewalFilter = 'all' | '7d' | '30d';

export type AccountFiltersState = {
  query: string;
  status: StatusFilter;
  groupId: string;
  renewal: RenewalFilter;
};

export type BookingDisplay = Booking & {
  user: User | null;
  group: Group | null;
};

export type AccountRow = {
  account: Account;
  runtime: AccountRuntime;
  current: BookingDisplay | null;
  next: BookingDisplay | null;
  renewalState: RenewalState;
  canRelease: boolean;
};

export type RenewalState = 'normal' | 'soon' | 'overdue';

export type AccountsViewInput = {
  accounts: Account[];
  bookings: Booking[];
  users: User[];
  groups: Group[];
  now: Date;
  filters: AccountFiltersState;
};

export type AccountsView = {
  rows: AccountRow[];
  allRows: AccountRow[];
  stats: {
    idle: number;
    inUse: number;
    todayBookings: number;
    renewalSoon: number;
  };
};

export type BookingValidationContext = {
  bookings: Booking[];
  groups?: Group[];
  editingBookingId?: string;
  mode: 'use_now' | 'reserve';
  now: Date;
  nextBooking?: Booking | null;
};

type Slot = {
  accountId: string;
  startTime: string;
  endTime: string;
};

type ValidationResult<T> = { ok: true; value: T } | { ok: false; reason: string; conflict?: Booking };

export type UserDraft = {
  name: string;
  email?: string;
  groupId: string;
  isActive?: boolean;
};

export type GroupDraft = {
  name: string;
  isActive?: boolean;
};

export const emptyFilters: AccountFiltersState = {
  query: '',
  status: 'all',
  groupId: 'all',
  renewal: 'all',
};

export function getAccountRuntime(accountId: string, bookings: Booking[], now = new Date()): AccountRuntime {
  const confirmedBookings = bookings
    .filter((booking) => booking.accountId === accountId && booking.status === 'confirmed')
    .sort((a, b) => timestamp(a.startTime) - timestamp(b.startTime));

  const current = confirmedBookings.find((booking) => containsTime(booking.startTime, booking.endTime, now)) ?? null;
  const next = confirmedBookings.find((booking) => timestamp(booking.startTime) > now.getTime()) ?? null;

  return {
    kind: current ? 'in_use' : 'idle',
    current,
    next: current?.id === next?.id ? null : next,
  };
}

export function findBookingConflict(slot: Slot, bookings: Booking[], ignoredBookingId?: string): Booking | null {
  return (
    bookings.find((booking) => {
      if (booking.id === ignoredBookingId) {
        return false;
      }

      if (booking.accountId !== slot.accountId || booking.status !== 'confirmed') {
        return false;
      }

      return rangesOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime);
    }) ?? null
  );
}

export function validateBookingDraft(draft: BookingDraft, context: BookingValidationContext): ValidationResult<BookingDraft> {
  const value = {
    accountId: draft.accountId.trim(),
    userId: draft.userId.trim(),
    groupId: draft.groupId.trim(),
    projectName: draft.projectName.trim(),
    startTime: draft.startTime,
    endTime: draft.endTime,
  };

  if (!value.accountId) {
    return { ok: false, reason: '请选择账号' };
  }

  if (!value.userId) {
    return { ok: false, reason: '请选择使用人' };
  }

  if (!value.groupId) {
    return { ok: false, reason: '请选择小组' };
  }

  if (!value.projectName) {
    return { ok: false, reason: '请填写项目' };
  }

  const start = timestamp(value.startTime);
  const end = timestamp(value.endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, reason: '时间格式不正确' };
  }

  if (start >= end) {
    return { ok: false, reason: '开始时间必须早于结束时间' };
  }

  if (context.mode === 'use_now' && start > context.now.getTime() + 60_000) {
    return { ok: false, reason: '立即使用的开始时间应为当前时间' };
  }

  if (context.mode === 'use_now' && context.nextBooking && end > timestamp(context.nextBooking.startTime)) {
    return { ok: false, reason: `结束时间不能晚于下一预约 ${formatShortTime(context.nextBooking.startTime)}` };
  }

  const conflict = findBookingConflict(value, context.bookings, context.editingBookingId);
  if (conflict) {
    return { ok: false, reason: '该时间段与已有预约冲突', conflict };
  }

  if (!isBossGroup(value.groupId, context.groups ?? [])) {
    const concurrentCount = context.bookings.filter(
      (b) =>
        b.userId === value.userId &&
        b.id !== context.editingBookingId &&
        b.status === 'confirmed' &&
        timestamp(b.startTime) < timestamp(value.endTime) &&
        timestamp(b.endTime) > timestamp(value.startTime),
    ).length;

    if (concurrentCount >= 1) {
      return { ok: false, reason: '该成员在此时间段已占用 1 个账号' };
    }
  }

  return { ok: true, value };
}

export function validateGroupDraft(draft: GroupDraft, groups: Group[], editingGroupId?: string): ValidationResult<Required<GroupDraft>> {
  const value = {
    name: draft.name.trim(),
    isActive: draft.isActive ?? true,
  };

  if (!value.name) {
    return { ok: false, reason: '请填写小组名称' };
  }

  const duplicate = groups.some((group) => group.id !== editingGroupId && group.name.trim().toLowerCase() === value.name.toLowerCase());
  if (duplicate) {
    return { ok: false, reason: '这个小组已经存在' };
  }

  return { ok: true, value };
}

export function validateUserDraft(draft: UserDraft, users: User[], groups: Group[], editingUserId?: string): ValidationResult<Required<UserDraft>> {
  const value = {
    name: draft.name.trim(),
    email: draft.email?.trim() ?? '',
    groupId: draft.groupId.trim(),
    isActive: draft.isActive ?? true,
  };

  if (!value.name) {
    return { ok: false, reason: '请填写成员姓名' };
  }

  if (!groups.some((group) => group.id === value.groupId)) {
    return { ok: false, reason: '请选择小组' };
  }

  const duplicateName = users.some((user) => user.id !== editingUserId && user.name.trim().toLowerCase() === value.name.toLowerCase());
  if (duplicateName) {
    return { ok: false, reason: '这个成员已经存在' };
  }

  if (value.email) {
    const duplicate = users.some((user) => user.id !== editingUserId && (user.email ?? '').trim().toLowerCase() === value.email.toLowerCase());
    if (duplicate) {
      return { ok: false, reason: '这个邮箱已经存在' };
    }
  }

  return { ok: true, value };
}

export function parseMemberImportNames(text: string, users: User[]): ValidationResult<string[]> {
  const names = text
    .split(/\r?\n/)
    .map((name) => name.trim())
    .filter(Boolean);

  if (!names.length) {
    return { ok: false, reason: '请填写成员姓名' };
  }

  const existingNames = new Set(users.map((user) => user.name.trim().toLowerCase()));
  const duplicateExisting = names.find((name) => existingNames.has(name.toLowerCase()));
  if (duplicateExisting) {
    return { ok: false, reason: `这个成员已经存在：${duplicateExisting}` };
  }

  const seen = new Set<string>();
  const duplicateInText = names.find((name) => {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      return true;
    }
    seen.add(key);
    return false;
  });
  if (duplicateInText) {
    return { ok: false, reason: `名单里有重复姓名：${duplicateInText}` };
  }

  return { ok: true, value: names };
}

export function getActiveUsers(users: User[]): User[] {
  return users.filter((user) => user.isActive !== false);
}

export function getActiveGroups(groups: Group[], users: User[]): Group[] {
  const activeGroupIds = new Set(getActiveUsers(users).map((user) => user.groupId));
  return groups.filter((group) => group.isActive !== false || activeGroupIds.has(group.id));
}

export function validateUserDeletion(userId: string, _bookings: Booking[]): ValidationResult<string> {
  return { ok: true, value: userId };
}

export function validateGroupDeletion(groupId: string, _users: User[], bookings: Booking[]): ValidationResult<string> {
  if (bookings.some((booking) => booking.groupId === groupId)) {
    return { ok: false, reason: '这个小组当前有账号使用中，暂时无法删除' };
  }

  return { ok: true, value: groupId };
}

export function buildAccountsView(input: AccountsViewInput): AccountsView {
  const activeAccounts = input.accounts.filter((account) => account.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const rows = activeAccounts.map((account) => buildAccountRow(account, input));
  const todayRange = getTodayRange(input.now);

  const stats = rows.reduce(
    (acc, row) => {
      if (row.runtime.kind === 'in_use') {
        acc.inUse += 1;
      } else {
        acc.idle += 1;
      }

      if (row.renewalState === 'soon') {
        acc.renewalSoon += 1;
      }

      return acc;
    },
    { idle: 0, inUse: 0, todayBookings: 0, renewalSoon: 0 },
  );

  stats.todayBookings = input.bookings.filter((booking) => {
    if (booking.status !== 'confirmed') {
      return false;
    }

    const start = timestamp(booking.startTime);
    return start >= todayRange.start && start < todayRange.end;
  }).length;

  return {
    stats,
    allRows: rows,
    rows: rows.filter((row) => matchesFilters(row, input.filters, input.now)),
  };
}

export function selectAvailableAccounts(accounts: Account[], bookings: Booking[], now = new Date(), limit = 5): Account[] {
  return accounts
    .filter((account) => account.isActive)
    .map((account) => ({ account, runtime: getAccountRuntime(account.id, bookings, now) }))
    .filter((item) => item.runtime.kind === 'idle')
    .sort((a, b) => {
      const aHasNext = a.runtime.next ? 1 : 0;
      const bHasNext = b.runtime.next ? 1 : 0;
      return aHasNext - bHasNext || a.account.sortOrder - b.account.sortOrder;
    })
    .slice(0, limit)
    .map((item) => item.account);
}

export function describeConflict(conflict: Booking, users: User[], groups: Group[]): string {
  const user = users.find((item) => item.id === conflict.userId)?.name ?? '未知成员';
  const group = groups.find((item) => item.id === conflict.groupId)?.name ?? '未知小组';
  return `与已有预约冲突：${formatBookingRange(conflict.startTime, conflict.endTime)} / ${user} / ${group} / ${conflict.projectName}`;
}

export function canReleaseBooking(booking: Booking | null): boolean {
  if (!booking) {
    return false;
  }

  return true;
}

export function canManageFutureBooking(booking: Booking | null, currentUserId: string, now = new Date()): boolean {
  if (!booking || booking.status !== 'confirmed' || !currentUserId) {
    return false;
  }

  return booking.userId === currentUserId && timestamp(booking.startTime) > now.getTime();
}

export function formatBookingRange(startTime: string, endTime: string, now = new Date()): string {
  return `${formatRelativeDay(startTime, now)} ${formatClock(startTime)}-${formatClock(endTime)}`;
}

export function minutesUntil(endTime: string, now = new Date()): number {
  return Math.max(0, Math.ceil((timestamp(endTime) - now.getTime()) / 60_000));
}

export function getRenewalState(renewalDate: string, now = new Date()): RenewalState {
  const days = daysUntil(renewalDate, now);

  if (days < 0) {
    return 'overdue';
  }

  if (days <= 7) {
    return 'soon';
  }

  return 'normal';
}

export function getNextAccountLabel(accounts: Account[]): string {
  const maxNumber = accounts.reduce((max, account) => {
    const match = /^R-(\d+)$/i.exec(account.label.trim());
    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  return `R-${String(maxNumber + 1).padStart(2, '0')}`;
}

export function toLocalInputValue(date: Date): string {
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export function fromLocalInputValue(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

export function roundToNextFiveMinutes(date: Date): Date {
  const next = new Date(date);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  next.setMinutes(minutes + ((5 - (minutes % 5)) % 5));
  return next;
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function buildAccountRow(account: Account, input: AccountsViewInput): AccountRow {
  const runtime = getAccountRuntime(account.id, input.bookings, input.now);

  return {
    account,
    runtime,
    current: runtime.current ? decorateBooking(runtime.current, input.users, input.groups) : null,
    next: runtime.next ? decorateBooking(runtime.next, input.users, input.groups) : null,
    renewalState: getRenewalState(account.renewalDate, input.now),
    canRelease: canReleaseBooking(runtime.current),
  };
}

function decorateBooking(booking: Booking, users: User[], groups: Group[]): BookingDisplay {
  return {
    ...booking,
    user: users.find((item) => item.id === booking.userId) ?? null,
    group: groups.find((item) => item.id === booking.groupId) ?? null,
  };
}

function matchesFilters(row: AccountRow, filters: AccountFiltersState, now: Date): boolean {
  const query = filters.query.trim().toLowerCase();
  const usageGroupId = row.runtime.current?.groupId ?? row.runtime.next?.groupId ?? '';

  if (query && !`${row.account.email} ${row.account.label}`.toLowerCase().includes(query)) {
    return false;
  }

  if (filters.status === 'idle' && row.runtime.kind !== 'idle') {
    return false;
  }

  if (filters.status === 'in_use' && row.runtime.kind !== 'in_use') {
    return false;
  }

  if (filters.status === 'reserved' && !row.runtime.next) {
    return false;
  }

  if (filters.groupId !== 'all' && usageGroupId !== filters.groupId) {
    return false;
  }

  if (filters.renewal !== 'all') {
    const days = daysUntil(row.account.renewalDate, now);
    const limit = filters.renewal === '7d' ? 7 : 30;
    if (days < 0 || days > limit) {
      return false;
    }
  }

  return true;
}

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return timestamp(startA) < timestamp(endB) && timestamp(endA) > timestamp(startB);
}

function containsTime(startTime: string, endTime: string, time: Date): boolean {
  const value = time.getTime();
  return timestamp(startTime) <= value && value < timestamp(endTime);
}

function timestamp(value: string): number {
  return new Date(value).getTime();
}

function isBossGroup(groupId: string, groups: Group[]): boolean {
  const groupName = groups.find((group) => group.id === groupId)?.name.replace(/\s/g, '').toLowerCase();
  return groupName === 'boss' || groupName === 'boss组' || groupName === 'boss小组';
}

function daysUntil(dateValue: string, now: Date): number {
  const date = new Date(`${dateValue}T00:00:00`);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86_400_000);
}

function getTodayRange(now: Date): { start: number; end: number } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

function formatRelativeDay(value: string, now: Date): string {
  const date = new Date(value);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (dayDiff === 0) {
    return '今天';
  }

  if (dayDiff === 1) {
    return '明天';
  }

  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date);
}

function formatShortTime(value: string): string {
  return formatClock(value);
}

function formatClock(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
