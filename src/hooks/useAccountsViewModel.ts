import { useEffect, useMemo, useState } from 'react';
import {
  addHours,
  buildAccountsView,
  describeConflict,
  emptyFilters,
  fromLocalInputValue,
  getAccountRuntime,
  getNextAccountLabel,
  roundToNextFiveMinutes,
  toLocalInputValue,
  validateBookingDraft,
  type Account,
  type AccountFiltersState,
  type Booking,
  type BookingDraft,
  type User,
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

const currentUserStorageKey = 'accmgmt.currentUserId';

export function useAccountsViewModel() {
  const [snapshot] = useState(() => createMockSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>(snapshot.users);
  const [groups, setGroups] = useState(snapshot.groups);
  const [currentUserId, setCurrentUserIdState] = useState(() => readStoredCurrentUserId() ?? snapshot.currentUser.id);
  const [filters, setFilters] = useState<AccountFiltersState>(emptyFilters);
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState('');
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
        setCurrentUserIdState((current) => {
          const next = cloudSnapshot.users.some((user) => user.id === current) ? current : cloudSnapshot.currentUser.id;
          persistCurrentUserId(next);
          return next;
        });
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAccounts(snapshot.accounts);
        setBookings(snapshot.bookings);
        setUsers(snapshot.users);
        setGroups(snapshot.groups);
        setCurrentUserIdState(snapshot.currentUser.id);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  const currentUser = useMemo(() => {
    return users.find((user) => user.id === currentUserId) ?? users[0] ?? snapshot.currentUser;
  }, [currentUserId, snapshot.currentUser, users]);

  const view = useMemo(
    () =>
      buildAccountsView({
        accounts,
        bookings,
        users,
        groups,
        currentUser,
        now,
        filters,
      }),
    [accounts, bookings, currentUser, filters, groups, now, users],
  );

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  function updateFilters(next: Partial<AccountFiltersState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function setCurrentUserId(userId: string) {
    const user = users.find((item) => item.id === userId);
    if (!user) {
      setNotice('成员不存在。');
      return;
    }

    persistCurrentUserId(user.id);
    setCurrentUserIdState(user.id);
    setNotice(`当前成员已切换为 ${user.name}。`);
  }

  function openUseNow(accountId: string) {
    setNotice('');
    setUseNowForm(createUseNowForm(accountId, bookings, now, currentUser));
  }

  function openBooking(accountId: string) {
    setNotice('');
    setBookingForm(createBookingForm(accountId, now, currentUser));
  }

  function updateUseNowForm(next: Partial<UseNowFormState>) {
    setUseNowForm((current) => (current ? { ...current, ...next, error: next.error ?? '' } : current));
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
      userId: currentUser.id,
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
    if (currentUser.role !== 'admin' && booking.userId !== currentUser.id) {
      setNotice('只能结束自己的使用。');
      return;
    }

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
    setUseNowForm(createUseNowForm(account.id, bookings, now, currentUser));
    setNotice(`已找到 ${account.label}。`);
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
      const pin = getOperatorPin();
      const cloudAccount = await updateCloudAccount(accountId, payload, pin);
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
        getOperatorPin(),
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
    currentUser,
    currentUserId: currentUser.id,
    isLoading,
    now,
    filters,
    view,
    notice,
    useNowForm,
    bookingForm,
    accountById,
    setCurrentUserId,
    updateFilters,
    openUseNow,
    openBooking,
    updateUseNowForm,
    updateBookingForm,
    submitUseNow,
    submitBooking,
    releaseBooking,
    findAvailableAccount,
    updateAccount,
    createAccount,
    getEmptyAccountDraft,
    closeUseNow: () => setUseNowForm(null),
    closeBooking: () => setBookingForm(null),
  };
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

function getOperatorPin(): string {
  const stored = window.sessionStorage.getItem('accmgmt.operatorPin');
  if (stored) {
    return stored;
  }

  const pin = window.prompt('请输入操作口令')?.trim() ?? '';
  if (pin) {
    window.sessionStorage.setItem('accmgmt.operatorPin', pin);
  }
  return pin;
}

function readStoredCurrentUserId(): string | null {
  try {
    return window.localStorage.getItem(currentUserStorageKey);
  } catch {
    return null;
  }
}

function persistCurrentUserId(userId: string) {
  try {
    window.localStorage.setItem(currentUserStorageKey, userId);
  } catch {
    // Some embedded previews can block localStorage.
  }
}

function todayDateInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function createUseNowForm(accountId: string, bookings: Booking[], now: Date, currentUser: User): UseNowFormState {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const runtime = getAccountRuntime(accountId, bookings, now);
  const nextStart = runtime.next ? new Date(runtime.next.startTime) : null;
  const defaultEnd = addHours(start, 2);
  const end = nextStart && defaultEnd > nextStart ? nextStart : defaultEnd;

  return {
    accountId,
    groupId: currentUser.groupId,
    projectName: '',
    startTime: toLocalInputValue(start),
    endTime: toLocalInputValue(end),
    error: '',
  };
}

function createBookingForm(accountId: string, now: Date, currentUser: User): BookingFormState {
  const start = roundToNextFiveMinutes(addHours(now, 1));
  const end = addHours(start, 2);

  return {
    accountId,
    userId: currentUser.id,
    groupId: currentUser.groupId,
    projectName: '',
    startTime: toLocalInputValue(start),
    endTime: toLocalInputValue(end),
    error: '',
  };
}
