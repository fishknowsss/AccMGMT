import { useEffect, useMemo, useState } from 'react';
import {
  addHours,
  buildAccountsView,
  describeConflict,
  emptyFilters,
  fromLocalInputValue,
  getAccountRuntime,
  getActiveGroups,
  getActiveUsers,
  getNextAccountLabel,
  roundToNextFiveMinutes,
  toLocalInputValue,
  validateGroupDeletion,
  validateGroupDraft,
  validateBookingDraft,
  validateUserDeletion,
  validateUserDraft,
  type Account,
  type AccountFiltersState,
  type Booking,
  type BookingDraft,
  type GroupDraft,
  type User,
  type UserDraft,
} from '../lib/runway-board';
import { createMockSnapshot } from '../lib/runway-mock';
import {
  createCloudAccount,
  createCloudBooking,
  getCloudSnapshot,
  releaseCloudBooking,
  updateCloudAccount,
  type AccountWritePayload,
  type BookingWritePayload,
} from '../lib/runway-api';

export type UseNowFormState = {
  accountId: string;
  userId: string;
  groupId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  error: string;
};

export type BookingFormState = {
  accountId: string;
  userId: string;
  groupId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  error: string;
};

export type AccountDraftState = {
  email: string;
  label: string;
  renewalDate: string;
  isActive: boolean;
};

export type MemberDraftState = UserDraft;
export type GroupDraftState = GroupDraft;

export function useAccountsViewModel() {
  const [snapshot] = useState(() => createMockSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>(snapshot.users);
  const [groups, setGroups] = useState(snapshot.groups);
  const [filters, setFilters] = useState<AccountFiltersState>(emptyFilters);
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState('');
  const [toast, setToast] = useState('');
  const [useNowForm, setUseNowForm] = useState<UseNowFormState | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingFormState | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    getCloudSnapshot(snapshot)
      .then((cloudSnapshot) => {
        if (cancelled) {
          return;
        }

        setAccounts(cloudSnapshot.accounts);
        setBookings(cloudSnapshot.bookings);
        setUsers(cloudSnapshot.users);
        setGroups(cloudSnapshot.groups);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAccounts(snapshot.accounts);
        setBookings(snapshot.bookings);
        setUsers(snapshot.users);
        setGroups(snapshot.groups);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(''), 1600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeUsers = useMemo(() => getActiveUsers(users), [users]);
  const activeGroups = useMemo(() => getActiveGroups(groups, users), [groups, users]);

  const defaultUser = useMemo(() => {
    return activeUsers.find((user) => user.id === snapshot.defaultUser.id) ?? activeUsers[0] ?? users[0] ?? snapshot.defaultUser;
  }, [activeUsers, snapshot.defaultUser, users]);

  const view = useMemo(
    () =>
      buildAccountsView({
        accounts,
        bookings,
        users,
        groups,
        now,
        filters,
      }),
    [accounts, bookings, filters, groups, now, users],
  );

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  function updateFilters(next: Partial<AccountFiltersState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function openUseNow(accountId: string) {
    setNotice('');
    setUseNowForm(createUseNowForm(accountId, bookings, now, defaultUser));
  }

  function openBooking(accountId: string) {
    setNotice('');
    setBookingForm(createBookingForm(accountId, now, defaultUser));
  }

  function updateUseNowForm(next: Partial<UseNowFormState>) {
    setUseNowForm((current) => {
      if (!current) {
        return current;
      }

      if (next.userId && next.userId !== current.userId) {
        const user = userById.get(next.userId);
        return { ...current, ...next, groupId: user?.groupId ?? current.groupId, error: '' };
      }

      return { ...current, ...next, error: next.error ?? '' };
    });
  }

  function updateBookingForm(next: Partial<BookingFormState>) {
    setBookingForm((current) => {
      if (!current) {
        return current;
      }

      if (next.userId && next.userId !== current.userId) {
        const user = userById.get(next.userId);
        return { ...current, ...next, groupId: user?.groupId ?? current.groupId, error: '' };
      }

      return { ...current, ...next, error: next.error ?? '' };
    });
  }

  async function submitUseNow() {
    if (!useNowForm) {
      return;
    }

    const draft: BookingDraft = {
      accountId: useNowForm.accountId,
      userId: useNowForm.userId,
      groupId: useNowForm.groupId,
      projectName: useNowForm.projectName,
      startTime: fromLocalInputValue(useNowForm.startTime),
      endTime: fromLocalInputValue(useNowForm.endTime),
    };
    const runtime = getAccountRuntime(useNowForm.accountId, bookings, now);
    const validation = validateBookingDraft(draft, {
      bookings,
      mode: 'use_now',
      now,
      nextBooking: runtime.next,
    });

    if (!validation.ok) {
      setUseNowForm({
        ...useNowForm,
        error: validation.conflict ? describeConflict(validation.conflict, users, groups) : validation.reason,
      });
      return;
    }

    try {
      const booking = await saveCloudBooking(validation.value, users, groups);
      setBookings((current) => [...current, booking]);
      setUseNowForm(null);
      setNotice('已开始使用账号。');
    } catch (error) {
      setUseNowForm({ ...useNowForm, error: error instanceof Error ? error.message : '操作失败' });
    }
  }

  async function submitBooking() {
    if (!bookingForm) {
      return;
    }

    const draft: BookingDraft = {
      accountId: bookingForm.accountId,
      userId: bookingForm.userId,
      groupId: bookingForm.groupId,
      projectName: bookingForm.projectName,
      startTime: fromLocalInputValue(bookingForm.startTime),
      endTime: fromLocalInputValue(bookingForm.endTime),
    };
    const validation = validateBookingDraft(draft, {
      bookings,
      mode: 'reserve',
      now,
    });

    if (!validation.ok) {
      setBookingForm({
        ...bookingForm,
        error: validation.conflict ? describeConflict(validation.conflict, users, groups) : validation.reason,
      });
      return;
    }

    try {
      const booking = await saveCloudBooking(validation.value, users, groups);
      setBookings((current) => [...current, booking]);
      setBookingForm(null);
      setNotice('预约已保存。');
    } catch (error) {
      setBookingForm({ ...bookingForm, error: error instanceof Error ? error.message : '操作失败' });
    }
  }

  async function releaseBooking(booking: Booking) {
    try {
      const cloudBooking = await releaseCloudBooking(booking.id);
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                endTime: cloudBooking.releasedAt ?? now.toISOString(),
                status: 'cancelled',
              }
            : item,
        ),
      );
      setNotice('已结束使用。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '操作失败');
    }
  }

  function findAvailableAccount() {
    const account = accounts
      .filter((item) => item.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .find((item) => getAccountRuntime(item.id, bookings, now).kind === 'idle');

    if (!account) {
      setNotice('当前没有可用账号。');
      return;
    }

    setFilters({ ...emptyFilters, query: account.email });
    setUseNowForm(createUseNowForm(account.id, bookings, now, defaultUser));
    setNotice(`已找到 ${account.label}。`);
  }

  async function copyAccountEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setToast('账号邮箱已复制。');
    } catch {
      setToast('复制失败，请手动复制。');
    }
  }

  async function updateAccount(accountId: string, next: Partial<Pick<Account, 'email' | 'label' | 'renewalDate' | 'isActive'>>) {
    const account = accounts.find((item) => item.id === accountId);
    if (!account) {
      setNotice('账号不存在。');
      return;
    }

    const payload: AccountWritePayload = {
      email: next.email?.trim() || account.email,
      label: next.label?.trim() || account.label,
      renewalDate: next.renewalDate || account.renewalDate,
      isActive: next.isActive ?? account.isActive,
      sortOrder: account.sortOrder,
    };

    try {
      const cloudAccount = await updateCloudAccount(accountId, payload);
      setAccounts((current) =>
        current.map((item) =>
          item.id === accountId
            ? {
                ...item,
                email: cloudAccount.email,
                label: cloudAccount.label?.trim() || payload.label,
                renewalDate: cloudAccount.renewalDate || payload.renewalDate,
                isActive: cloudAccount.isActive,
                sortOrder: cloudAccount.sortOrder ?? item.sortOrder,
              }
            : item,
        ),
      );
      setNotice('账号信息已更新。');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '操作失败');
    }
  }

  async function createAccount(draft: AccountDraftState): Promise<{ ok: true } | { ok: false; reason: string }> {
    const email = draft.email.trim();
    const label = draft.label.trim();

    if (!email) {
      return { ok: false, reason: '请填写账号邮箱' };
    }

    if (!label) {
      return { ok: false, reason: '请填写账号编号' };
    }

    if (accounts.some((account) => account.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, reason: '这个邮箱已经存在' };
    }

    try {
      const sortOrder = accounts.reduce((max, account) => Math.max(max, account.sortOrder), 0) + 1;
      const cloudAccount = await createCloudAccount(
        {
          email,
          label,
          renewalDate: draft.renewalDate || todayDateInputValue(),
          isActive: draft.isActive,
          sortOrder,
        },
      );
      setAccounts((current) => [
        ...current,
        {
          id: cloudAccount.id,
          email: cloudAccount.email,
          label: cloudAccount.label?.trim() || label,
          renewalDate: cloudAccount.renewalDate || draft.renewalDate || todayDateInputValue(),
          isActive: cloudAccount.isActive,
          sortOrder: cloudAccount.sortOrder ?? sortOrder,
        },
      ]);
      setNotice('账号已新增。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  function createGroup(draft: GroupDraftState): { ok: true } | { ok: false; reason: string } {
    const validation = validateGroupDraft(draft, groups);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    const group = {
      id: nextEntityId('group', validation.value.name, groups.map((item) => item.id)),
      ...validation.value,
    };
    setGroups((current) => [...current, group]);
    setNotice('小组已新增。');
    return { ok: true };
  }

  function updateGroup(groupId: string, draft: GroupDraftState): { ok: true } | { ok: false; reason: string } {
    const validation = validateGroupDraft(draft, groups, groupId);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    setGroups((current) => current.map((group) => (group.id === groupId ? { ...group, ...validation.value } : group)));
    setNotice('小组已更新。');
    return { ok: true };
  }

  function deleteGroup(groupId: string): { ok: true } | { ok: false; reason: string } {
    const validation = validateGroupDeletion(groupId, users, bookings);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    setGroups((current) => current.filter((group) => group.id !== groupId));
    setNotice('小组已删除。');
    return { ok: true };
  }

  function createUser(draft: MemberDraftState): { ok: true } | { ok: false; reason: string } {
    const validation = validateUserDraft(draft, users, groups);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    const user = {
      id: nextEntityId('user', validation.value.email || validation.value.name, users.map((item) => item.id)),
      ...validation.value,
    };
    setUsers((current) => [...current, user]);
    setNotice('成员已新增。');
    return { ok: true };
  }

  function updateUser(userId: string, draft: MemberDraftState): { ok: true } | { ok: false; reason: string } {
    const validation = validateUserDraft(draft, users, groups, userId);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, ...validation.value } : user)));
    setNotice('成员已更新。');
    return { ok: true };
  }

  function deleteUser(userId: string): { ok: true } | { ok: false; reason: string } {
    const validation = validateUserDeletion(userId, bookings);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    setUsers((current) => current.filter((user) => user.id !== userId));
    setNotice('成员已删除。');
    return { ok: true };
  }

  function getEmptyAccountDraft(): AccountDraftState {
    return {
      email: '',
      label: getNextAccountLabel(accounts),
      renewalDate: todayDateInputValue(),
      isActive: true,
    };
  }

  return {
    accounts,
    users,
    groups,
    activeUsers,
    activeGroups,
    isLoading,
    now,
    filters,
    view,
    notice,
    toast,
    useNowForm,
    bookingForm,
    accountById,
    updateFilters,
    openUseNow,
    openBooking,
    updateUseNowForm,
    updateBookingForm,
    submitUseNow,
    submitBooking,
    releaseBooking,
    findAvailableAccount,
    copyAccountEmail,
    updateAccount,
    createAccount,
    createGroup,
    updateGroup,
    deleteGroup,
    createUser,
    updateUser,
    deleteUser,
    getEmptyAccountDraft,
    closeUseNow: () => setUseNowForm(null),
    closeBooking: () => setBookingForm(null),
  };
}

function nextEntityId(prefix: 'group' | 'user', value: string, existingIds: string[]): string {
  const base = `${prefix}-${slugId(value)}`;
  if (!existingIds.includes(base)) {
    return base;
  }

  let index = 2;
  while (existingIds.includes(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
}

function slugId(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return normalized || encodeURIComponent(value.trim()).replace(/%/g, '').toLowerCase() || 'unknown';
}

async function saveCloudBooking(draft: BookingDraft, users: User[], groups: Array<{ id: string; name: string }>): Promise<Booking> {
  const payload = bookingDraftToCloudPayload(draft, users, groups);
  const cloudBooking = await createCloudBooking(payload);
  return {
    id: cloudBooking.id,
    accountId: cloudBooking.accountId,
    userId: draft.userId,
    groupId: draft.groupId,
    projectName: cloudBooking.projectName,
    startTime: cloudBooking.startAt,
    endTime: cloudBooking.endAt,
    status: 'confirmed',
  };
}

function bookingDraftToCloudPayload(draft: BookingDraft, users: User[], groups: Array<{ id: string; name: string }>): BookingWritePayload {
  return {
    accountId: draft.accountId,
    userName: users.find((user) => user.id === draft.userId)?.name ?? draft.userId,
    groupName: groups.find((group) => group.id === draft.groupId)?.name ?? draft.groupId,
    projectName: draft.projectName,
    startAt: draft.startTime,
    endAt: draft.endTime,
  };
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function createUseNowForm(accountId: string, bookings: Booking[], now: Date, defaultUser: User): UseNowFormState {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const runtime = getAccountRuntime(accountId, bookings, now);
  const nextStart = runtime.next ? new Date(runtime.next.startTime) : null;
  const defaultEnd = addHours(start, 2);
  const end = nextStart && defaultEnd > nextStart ? nextStart : defaultEnd;

  return {
    accountId,
    userId: defaultUser.id,
    groupId: defaultUser.groupId,
    projectName: '',
    startTime: toLocalInputValue(start),
    endTime: toLocalInputValue(end),
    error: '',
  };
}

function createBookingForm(accountId: string, now: Date, defaultUser: User): BookingFormState {
  const start = roundToNextFiveMinutes(addHours(now, 1));
  const end = addHours(start, 2);

  return {
    accountId,
    userId: defaultUser.id,
    groupId: defaultUser.groupId,
    projectName: '',
    startTime: toLocalInputValue(start),
    endTime: toLocalInputValue(end),
    error: '',
  };
}
