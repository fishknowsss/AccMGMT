export type User = {
  id: string;
  name: string;
  email: string | null;
  groupId: string;
  isActive: boolean;
};

export type Group = {
  id: string;
  name: string;
  isActive: boolean;
};

export type Account = {
  id: string;
  email: string;
  label: string;
  renewalDate: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
};

export type Booking = {
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

export type AccountStatus =
  | {
      kind: 'idle';
      label: '空闲';
      current: null;
      next: Booking | null;
    }
  | {
      kind: 'in_use';
      label: '使用中';
      current: Booking;
      next: Booking | null;
    }
  | {
      kind: 'reserved';
      label: '已预约';
      current: null;
      next: Booking;
    };

export type BookingDraft = {
  accountId: string;
  userName: string;
  groupName: string;
  projectName: string;
  startAt: string;
  endAt: string;
};

type Slot = {
  accountId: string;
  startAt: string;
  endAt: string;
};

type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export function getAccountStatus(accountId: string, bookings: Booking[], now = new Date()): AccountStatus {
  const activeBookings = bookings
    .filter((booking) => booking.accountId === accountId && !booking.releasedAt)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  const current = activeBookings.find((booking) => containsTime(booking.startAt, booking.endAt, now));
  const next = activeBookings.find((booking) => new Date(booking.startAt).getTime() > now.getTime()) ?? null;

  if (current) {
    return {
      kind: 'in_use',
      label: '使用中',
      current,
      next: next?.id === current.id ? null : next,
    };
  }

  if (next) {
    return {
      kind: 'reserved',
      label: '已预约',
      current: null,
      next,
    };
  }

  return {
    kind: 'idle',
    label: '空闲',
    current: null,
    next: null,
  };
}

export function canCreateBooking(slot: Slot, existingBookings: Booking[]): { ok: true } | { ok: false; reason: string } {
  const start = new Date(slot.startAt).getTime();
  const end = new Date(slot.endAt).getTime();

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { ok: false, reason: '时间格式不正确' };
  }

  if (end <= start) {
    return { ok: false, reason: '结束时间要晚于开始时间' };
  }

  const conflict = existingBookings.some((booking) => {
    if (booking.accountId !== slot.accountId || booking.releasedAt) {
      return false;
    }

    return rangesOverlap(slot.startAt, slot.endAt, booking.startAt, booking.endAt);
  });

  return conflict ? { ok: false, reason: '该时段已被占用' } : { ok: true };
}

export function normalizeBookingInput(input: BookingDraft): Result<BookingDraft> {
  const value = {
    accountId: input.accountId.trim(),
    userName: input.userName.trim(),
    groupName: input.groupName.trim(),
    projectName: input.projectName.trim(),
    startAt: input.startAt,
    endAt: input.endAt,
  };

  if (!value.accountId) {
    return { ok: false, reason: '请选择账号' };
  }

  if (!value.userName) {
    return { ok: false, reason: '请填写使用人' };
  }

  if (!value.groupName) {
    return { ok: false, reason: '请填写小组' };
  }

  if (!value.projectName) {
    return { ok: false, reason: '请填写项目' };
  }

  const availability = canCreateBooking(
    {
      accountId: value.accountId,
      startAt: value.startAt,
      endAt: value.endAt,
    },
    [],
  );

  if (!availability.ok) {
    return availability;
  }

  return { ok: true, value };
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return new Date(startA).getTime() < new Date(endB).getTime() && new Date(startB).getTime() < new Date(endA).getTime();
}

function containsTime(startAt: string, endAt: string, time: Date): boolean {
  const timestamp = time.getTime();
  return new Date(startAt).getTime() <= timestamp && timestamp < new Date(endAt).getTime();
}
