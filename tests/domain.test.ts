import { describe, expect, it } from 'vitest';
import {
  canCreateBooking,
  getAccountStatus,
  normalizeBookingInput,
  type Booking,
} from '../lib/domain';

const booking = (partial: Partial<Booking>): Booking => ({
  id: 'booking-1',
  accountId: 'account-1',
  userName: '林一',
  groupName: 'A组',
  projectName: '广告片',
  startAt: '2026-05-09T06:00:00.000Z',
  endAt: '2026-05-09T08:00:00.000Z',
  releasedAt: null,
  createdAt: '2026-05-09T05:50:00.000Z',
  ...partial,
});

describe('getAccountStatus', () => {
  it('marks an account as in use during the active booking window', () => {
    const status = getAccountStatus('account-1', [booking({})], new Date('2026-05-09T07:00:00.000Z'));

    expect(status.kind).toBe('in_use');
    expect(status.current?.userName).toBe('林一');
    expect(status.label).toBe('使用中');
  });

  it('marks an account as reserved when the next booking is in the future', () => {
    const status = getAccountStatus('account-1', [booking({})], new Date('2026-05-09T05:00:00.000Z'));

    expect(status.kind).toBe('reserved');
    expect(status.next?.startAt).toBe('2026-05-09T06:00:00.000Z');
    expect(status.label).toBe('已预约');
  });

  it('marks an account as idle after the booking end time has passed', () => {
    const status = getAccountStatus('account-1', [booking({})], new Date('2026-05-09T09:00:00.000Z'));

    expect(status.kind).toBe('idle');
    expect(status.label).toBe('空闲');
  });

  it('ignores bookings that were released early', () => {
    const status = getAccountStatus(
      'account-1',
      [booking({ releasedAt: '2026-05-09T06:30:00.000Z' })],
      new Date('2026-05-09T07:00:00.000Z'),
    );

    expect(status.kind).toBe('idle');
  });
});

describe('canCreateBooking', () => {
  it('blocks overlapping bookings on the same account', () => {
    const result = canCreateBooking(
      {
        accountId: 'account-1',
        startAt: '2026-05-09T07:30:00.000Z',
        endAt: '2026-05-09T09:00:00.000Z',
      },
      [booking({})],
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('expected booking conflict');
    }
    expect(result.reason).toBe('该时段已被占用');
  });

  it('allows overlapping bookings on different accounts', () => {
    const result = canCreateBooking(
      {
        accountId: 'account-2',
        startAt: '2026-05-09T07:30:00.000Z',
        endAt: '2026-05-09T09:00:00.000Z',
      },
      [booking({})],
    );

    expect(result.ok).toBe(true);
  });

  it('allows a booking that starts exactly when the previous one ends', () => {
    const result = canCreateBooking(
      {
        accountId: 'account-1',
        startAt: '2026-05-09T08:00:00.000Z',
        endAt: '2026-05-09T10:00:00.000Z',
      },
      [booking({})],
    );

    expect(result.ok).toBe(true);
  });
});

describe('normalizeBookingInput', () => {
  it('trims text fields and keeps ISO time values', () => {
    const normalized = normalizeBookingInput({
      accountId: ' account-1 ',
      userName: ' 林一 ',
      groupName: ' A组 ',
      projectName: ' 广告片 ',
      startAt: '2026-05-09T06:00:00.000Z',
      endAt: '2026-05-09T08:00:00.000Z',
    });

    expect(normalized.ok).toBe(true);
    if (normalized.ok) {
      expect(normalized.value.userName).toBe('林一');
      expect(normalized.value.accountId).toBe('account-1');
    }
  });

  it('rejects time ranges where the end is not after the start', () => {
    const normalized = normalizeBookingInput({
      accountId: 'account-1',
      userName: '林一',
      groupName: 'A组',
      projectName: '广告片',
      startAt: '2026-05-09T08:00:00.000Z',
      endAt: '2026-05-09T08:00:00.000Z',
    });

    expect(normalized.ok).toBe(false);
    if (normalized.ok) {
      throw new Error('expected invalid time range');
    }
    expect(normalized.reason).toBe('结束时间要晚于开始时间');
  });
});
