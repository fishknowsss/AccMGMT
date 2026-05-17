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
  parseMemberImportNames,
  resolveCurrentUser,
  roundToNextFiveMinutes,
  selectAvailableAccounts,
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
  cancelCloudBooking,
  createCloudAccount,
  createCloudBooking,
  createCloudGroup,
  createCloudUser,
  deleteCloudGroup,
  deleteCloudProject,
  deleteCloudUser,
  getCloudSnapshot,
  releaseCloudBooking,
  renameCloudProject,
  updateCloudBooking,
  updateCloudAccount,
  updateCloudGroup,
  updateCloudUser,
  type AccountWritePayload,
  type BookingWritePayload,
  type BoardSnapshot,
} from '../lib/runway-api';

export type UseNowFormState = {
  accountId: string;
  accountOptions: string[];
  userId: string;
  groupId: string;
  projectName: string;
  startTime: string;
  endTime: string;
  error: string;
};

export type BookingFormState = {
  editingBookingId: string | null;
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
type SnapshotSource = 'loading' | 'cloud' | 'fallback';

export function useAccountsViewModel() {
  const [snapshot] = useState(() => createMockSnapshot());
  const [isLoading, setIsLoading] = useState(true);
  const [snapshotSource, setSnapshotSource] = useState<SnapshotSource>('loading');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; concurrentLimit?: number; isActive?: boolean }>>([]);
  const [filters, setFilters] = useState<AccountFiltersState>(emptyFilters);
  const [now, setNow] = useState(() => new Date());

  const [toast, setToast] = useState('');
  const [currentUserId, setCurrentUserIdState] = useState(() => readSavedCurrentUserId());
  const [useNowForm, setUseNowForm] = useState<UseNowFormState | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingFormState | null>(null);

  function applySnapshot(next: BoardSnapshot) {
    setAccounts(next.accounts);
    setBookings(next.bookings);
    setUsers(next.users);
    setGroups(next.groups);
  }

  async function loadLatestSnapshot(): Promise<BoardSnapshot | null> {
    try {
      return await getCloudSnapshot(snapshot);
    } catch {
      return null;
    }
  }

  async function refreshSnapshot(): Promise<BoardSnapshot | null> {
    const latest = await loadLatestSnapshot();
    if (latest) {
      applySnapshot(latest);
      setSnapshotSource('cloud');
    }
    return latest;
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadLatestSnapshot().then((cloudSnapshot) => {
      if (cancelled) {
        return;
      }

      if (cloudSnapshot) {
        applySnapshot(cloudSnapshot);
        setSnapshotSource('cloud');
      } else {
        applySnapshot(snapshot);
        setSnapshotSource('fallback');
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshSnapshot();
    }, 30_000);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void refreshSnapshot();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    const fallbackUser = activeUsers.find((user) => user.id === snapshot.defaultUser.id) ?? activeUsers[0] ?? users[0] ?? snapshot.defaultUser;
    return resolveCurrentUser(currentUserId, activeUsers, fallbackUser).user;
  }, [activeUsers, currentUserId, snapshot.defaultUser, users]);

  useEffect(() => {
    if (!defaultUser.id || currentUserId === defaultUser.id || isLoading || snapshotSource !== 'cloud' || activeUsers.length === 0) {
      return;
    }

    const resolved = resolveCurrentUser(currentUserId, activeUsers, defaultUser);
    if (resolved.shouldPersist) {
      setCurrentUserIdState(resolved.user.id);
      saveCurrentUserId(resolved.user.id);
    }
  }, [activeUsers, currentUserId, defaultUser, isLoading, snapshotSource]);

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

  function setCurrentUserId(userId: string) {
    const user = activeUsers.find((item) => item.id === userId);
    if (!user) {
      return;
    }

    setCurrentUserIdState(user.id);
    saveCurrentUserId(user.id);
  }

  function updateFilters(next: Partial<AccountFiltersState>) {
    setFilters((current) => ({ ...current, ...next }));
  }

  function openUseNow(accountId: string) {
    setUseNowForm(createUseNowForm(accountId, bookings, now, defaultUser));
  }

  function openBooking(accountId: string) {
    setBookingForm(createBookingForm(accountId, now, defaultUser));
  }

  function openEditBooking(booking: Booking) {
    setBookingForm(createEditBookingForm(booking));
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
    const latest = await refreshSnapshot();
    const latestBookings = latest?.bookings ?? bookings;
    const latestUsers = latest?.users ?? users;
    const latestGroups = latest?.groups ?? groups;
    const runtime = getAccountRuntime(useNowForm.accountId, latestBookings, now);
    const validation = validateBookingDraft(draft, {
      bookings: latestBookings,
      groups: latestGroups,
      mode: 'use_now',
      now,
      nextBooking: runtime.next,
    });

    if (!validation.ok) {
      setUseNowForm({
        ...useNowForm,
        error: validation.conflict ? describeConflict(validation.conflict, latestUsers, latestGroups) : validation.reason,
      });
      return;
    }

    try {
      const booking = await saveCloudBooking(validation.value, latestUsers, latestGroups);
      setBookings((current) => [...current, booking]);
      setUseNowForm(null);
      setToast('已开始使用账号。');
    } catch (error) {
      await refreshSnapshot();
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
    const latest = await refreshSnapshot();
    const latestBookings = latest?.bookings ?? bookings;
    const latestUsers = latest?.users ?? users;
    const latestGroups = latest?.groups ?? groups;
    const validation = validateBookingDraft(draft, {
      bookings: latestBookings,
      editingBookingId: bookingForm.editingBookingId ?? undefined,
      groups: latestGroups,
      mode: 'reserve',
      now,
    });

    if (!validation.ok) {
      setBookingForm({
        ...bookingForm,
        error: validation.conflict ? describeConflict(validation.conflict, latestUsers, latestGroups) : validation.reason,
      });
      return;
    }

    try {
      const booking = bookingForm.editingBookingId
        ? await updateSavedCloudBooking(bookingForm.editingBookingId, validation.value, latestUsers, latestGroups)
        : await saveCloudBooking(validation.value, latestUsers, latestGroups);
      setBookings((current) => {
        if (!bookingForm.editingBookingId) {
          return [...current, booking];
        }

        return current.map((item) => (item.id === booking.id ? booking : item));
      });
      setBookingForm(null);
      setToast(bookingForm.editingBookingId ? '预约已更新。' : '预约已保存。');
    } catch (error) {
      await refreshSnapshot();
      setBookingForm({ ...bookingForm, error: error instanceof Error ? error.message : '操作失败' });
    }
  }

  async function cancelBooking(booking: Booking) {
    try {
      const cloudBooking = await cancelCloudBooking(booking.id);
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id
            ? {
                ...item,
                endTime: cloudBooking.releasedAt ?? item.endTime,
                status: 'cancelled',
              }
            : item,
        ),
      );
      setToast('预约已取消。');
    } catch (error) {
      await refreshSnapshot();
      setToast(error instanceof Error ? error.message : '操作失败');
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
      setToast('已结束使用。');
    } catch (error) {
      await refreshSnapshot();
      setToast(error instanceof Error ? error.message : '操作失败');
    }
  }

  function findAvailableAccount() {
    const options = selectAvailableAccounts(accounts, bookings, now);
    const account = options[0];

    if (!account) {
      setToast('当前没有可用账号。');
      return;
    }

    setFilters({ ...emptyFilters, status: 'idle' });
    setUseNowForm(createUseNowForm(account.id, bookings, now, defaultUser, options.map((item) => item.id)));
    setToast(`已找到 ${options.length} 个可用账号。`);
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
      setToast('账号不存在。');
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
      setToast('账号信息已更新。');
    } catch (error) {
      setToast(error instanceof Error ? error.message : '操作失败');
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
      setToast('账号已新增。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function createGroup(draft: GroupDraftState): Promise<{ ok: true } | { ok: false; reason: string }> {
    const validation = validateGroupDraft(draft, groups);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      const cloudGroup = await createCloudGroup(validation.value);
      setGroups((current) => [...current, { id: cloudGroup.id, name: cloudGroup.name, concurrentLimit: cloudGroup.concurrentLimit, isActive: cloudGroup.isActive }]);
      setToast('小组已新增。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function updateGroup(groupId: string, draft: GroupDraftState): Promise<{ ok: true } | { ok: false; reason: string }> {
    const validation = validateGroupDraft(draft, groups, groupId);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      const cloudGroup = await updateCloudGroup(groupId, validation.value);
      setGroups((current) =>
        current.map((g) =>
          g.id === groupId ? { ...g, name: cloudGroup.name, concurrentLimit: cloudGroup.concurrentLimit, isActive: cloudGroup.isActive } : g,
        ),
      );
      setToast('小组已更新。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function deleteGroup(groupId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const nowIso = now.toISOString();
    // 只有当前正在使用中的 booking（已开始但未结束）才阻止删除，未来还未开始的预约不拦截
    const activeBookings = bookings.filter((b) => b.status === 'confirmed' && b.startTime <= nowIso && b.endTime > nowIso);
    const validation = validateGroupDeletion(groupId, users, activeBookings);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      await deleteCloudGroup(groupId);
      const fallbackGroupId = groups.find((group) => group.id !== groupId)?.id ?? '';
      setGroups((current) => current.filter((group) => group.id !== groupId));
      setUsers((current) => current.map((user) => (user.groupId === groupId ? { ...user, groupId: fallbackGroupId } : user)));
      setToast('小组已删除。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function createUser(draft: MemberDraftState): Promise<{ ok: true } | { ok: false; reason: string }> {
    const validation = validateUserDraft(draft, users, groups);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      const cloudUser = await createCloudUser({
        name: validation.value.name,
        email: validation.value.email || undefined,
        groupId: validation.value.groupId,
        isActive: validation.value.isActive !== false,
      });
      setUsers((current) => [
        ...current,
        {
          id: cloudUser.id,
          name: cloudUser.name,
          ...(cloudUser.email != null ? { email: cloudUser.email } : {}),
          groupId: cloudUser.groupId,
          isActive: cloudUser.isActive ?? true,
        },
      ]);
      setToast('成员已新增。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function createUsersFromText(text: string, groupId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const names = parseMemberImportNames(text, users);
    if (!names.ok) {
      return { ok: false, reason: names.reason };
    }

    if (!groups.some((group) => group.id === groupId)) {
      return { ok: false, reason: '请选择小组' };
    }

    try {
      const createdUsers = await Promise.all(
        names.value.map((name) =>
          createCloudUser({
            name,
            email: undefined,
            groupId,
            isActive: true,
          }),
        ),
      );
      setUsers((current) => [
        ...current,
        ...createdUsers.map((cloudUser) => ({
          id: cloudUser.id,
          name: cloudUser.name,
          ...(cloudUser.email != null ? { email: cloudUser.email } : {}),
          groupId: cloudUser.groupId,
          isActive: cloudUser.isActive ?? true,
        })),
      ]);
      setToast(createdUsers.length === 1 ? '成员已新增。' : `已导入 ${createdUsers.length} 位成员。`);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function updateUser(userId: string, draft: MemberDraftState): Promise<{ ok: true } | { ok: false; reason: string }> {
    const validation = validateUserDraft(draft, users, groups, userId);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      const cloudUser = await updateCloudUser(userId, {
        name: validation.value.name,
        email: validation.value.email || undefined,
        groupId: validation.value.groupId,
        isActive: validation.value.isActive !== false,
      });
      setUsers((current) =>
        current.map((u) =>
          u.id === userId
            ? {
                ...u,
                name: cloudUser.name,
                ...(cloudUser.email != null ? { email: cloudUser.email } : { email: undefined }),
                groupId: cloudUser.groupId,
                isActive: cloudUser.isActive ?? true,
              }
            : u,
        ),
      );
      setToast('成员已更新。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function deleteUser(userId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const validation = validateUserDeletion(userId, bookings);
    if (!validation.ok) {
      return { ok: false, reason: validation.reason };
    }

    try {
      await deleteCloudUser(userId);
      setUsers((current) => current.filter((user) => user.id !== userId));
      setToast('成员已删除。');
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

  const projects = useMemo(
    () => Array.from(new Set(bookings.map((b) => b.projectName).filter(Boolean))).sort(),
    [bookings],
  );

  async function renameProject(oldName: string, newName: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    const trimmed = newName.trim();
    if (!trimmed) return { ok: false, reason: '项目名不能为空' };
    if (projects.includes(trimmed) && trimmed !== oldName) return { ok: false, reason: '项目名已存在' };
    try {
      await renameCloudProject(oldName, trimmed);
      setBookings((current) => current.map((b) => (b.projectName === oldName ? { ...b, projectName: trimmed } : b)));
      setToast('项目已更名。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  async function deleteProject(name: string): Promise<{ ok: true } | { ok: false; reason: string }> {
    try {
      await deleteCloudProject(name);
      setBookings((current) => current.map((b) => (b.projectName === name ? { ...b, projectName: '' } : b)));
      setToast('项目已删除。');
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error instanceof Error ? error.message : '操作失败' };
    }
  }

  return {
    accounts,
    users,
    groups,
    activeUsers,
    activeGroups,
    currentUser: defaultUser,
    currentUserId: currentUserId || defaultUser.id,
    isLoading,
    now,
    filters,
    view,
    toast,
    useNowForm,
    bookingForm,
    accountById,
    projects,
    updateFilters,
    setCurrentUserId,
    openUseNow,
    openBooking,
    openEditBooking,
    updateUseNowForm,
    updateBookingForm,
    submitUseNow,
    submitBooking,
    cancelBooking,
    releaseBooking,
    findAvailableAccount,
    copyAccountEmail,
    updateAccount,
    createAccount,
    createGroup,
    updateGroup,
    deleteGroup,
    createUser,
    createUsersFromText,
    updateUser,
    deleteUser,
    renameProject,
    deleteProject,
    getEmptyAccountDraft,
    closeUseNow: () => setUseNowForm(null),
    closeBooking: () => setBookingForm(null),
  };
}

async function saveCloudBooking(draft: BookingDraft, users: User[], groups: Array<{ id: string; name: string }>): Promise<Booking> {
  const payload = bookingDraftToCloudPayload(draft, users, groups);
  const cloudBooking = await createCloudBooking(payload);
  return cloudBookingToBooking(cloudBooking, draft);
}

async function updateSavedCloudBooking(bookingId: string, draft: BookingDraft, users: User[], groups: Array<{ id: string; name: string }>): Promise<Booking> {
  const payload = bookingDraftToCloudPayload(draft, users, groups);
  const cloudBooking = await updateCloudBooking(bookingId, payload);
  return cloudBookingToBooking(cloudBooking, draft);
}

function cloudBookingToBooking(cloudBooking: { id: string; accountId: string; projectName: string; startAt: string; endAt: string; releasedAt: string | null }, draft: BookingDraft): Booking {
  return {
    id: cloudBooking.id,
    accountId: cloudBooking.accountId,
    userId: draft.userId,
    groupId: draft.groupId,
    projectName: cloudBooking.projectName,
    startTime: cloudBooking.startAt,
    endTime: cloudBooking.releasedAt ?? cloudBooking.endAt,
    status: cloudBooking.releasedAt ? 'cancelled' : 'confirmed',
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

function createUseNowForm(accountId: string, bookings: Booking[], now: Date, defaultUser: User, accountOptions: string[] = [accountId]): UseNowFormState {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const runtime = getAccountRuntime(accountId, bookings, now);
  const nextStart = runtime.next ? new Date(runtime.next.startTime) : null;
  const defaultEnd = addHours(start, 4);
  const end = nextStart && defaultEnd > nextStart ? nextStart : defaultEnd;

  return {
    accountId,
    accountOptions,
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
  const end = addHours(start, 4);

  return {
    editingBookingId: null,
    accountId,
    userId: defaultUser.id,
    groupId: defaultUser.groupId,
    projectName: '',
    startTime: toLocalInputValue(start),
    endTime: toLocalInputValue(end),
    error: '',
  };
}

function createEditBookingForm(booking: Booking): BookingFormState {
  return {
    editingBookingId: booking.id,
    accountId: booking.accountId,
    userId: booking.userId,
    groupId: booking.groupId,
    projectName: booking.projectName,
    startTime: toLocalInputValue(new Date(booking.startTime)),
    endTime: toLocalInputValue(new Date(booking.endTime)),
    error: '',
  };
}

function readSavedCurrentUserId(): string {
  try {
    return window.localStorage.getItem('accmgmt.currentUserId') ?? '';
  } catch {
    return '';
  }
}

function saveCurrentUserId(userId: string) {
  try {
    window.localStorage.setItem('accmgmt.currentUserId', userId);
  } catch {
    // Ignore storage failures; the current tab still keeps the selected identity.
  }
}
