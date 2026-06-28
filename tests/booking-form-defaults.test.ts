import { describe, expect, it } from 'vitest';
import { fromLocalInputValue, type Booking, type User } from '../src/lib/runway-board';
import * as viewModel from '../src/hooks/useAccountsViewModel';

const defaultUser: User = {
  id: 'user-1',
  name: '小王',
  groupId: 'group-a',
};

const booking = (partial: Partial<Booking>): Booking => ({
  id: 'booking-1',
  accountId: 'account-1',
  userId: 'user-1',
  groupId: 'group-a',
  projectName: '广告片',
  startTime: '2026-05-09T10:00:00.000Z',
  endTime: '2026-05-09T10:52:00.000Z',
  status: 'confirmed',
  ...partial,
});

type BookingFormFactory = typeof viewModel & {
  createBookingForm?: (accountId: string, bookings: Booking[], now: Date, defaultUser: User) => {
    startTime: string;
    endTime: string;
  };
};

describe('booking form defaults', () => {
  it('starts a reservation for an in-use account after the current booking ends on a 10-minute boundary', () => {
    const createBookingForm = (viewModel as BookingFormFactory).createBookingForm;
    expect(createBookingForm).toBeTypeOf('function');

    const form = createBookingForm!(
      'account-1',
      [booking({})],
      new Date('2026-05-09T10:10:00.000Z'),
      defaultUser,
    );

    expect(fromLocalInputValue(form.startTime)).toBe('2026-05-09T11:00:00.000Z');
    expect(fromLocalInputValue(form.endTime)).toBe('2026-05-09T15:00:00.000Z');
  });

  it('keeps the current booking end time when it already lands on a 10-minute boundary', () => {
    const createBookingForm = (viewModel as BookingFormFactory).createBookingForm;
    expect(createBookingForm).toBeTypeOf('function');

    const form = createBookingForm!(
      'account-1',
      [booking({ endTime: '2026-05-09T11:20:00.000Z' })],
      new Date('2026-05-09T10:10:00.000Z'),
      defaultUser,
    );

    expect(fromLocalInputValue(form.startTime)).toBe('2026-05-09T11:20:00.000Z');
    expect(fromLocalInputValue(form.endTime)).toBe('2026-05-09T15:20:00.000Z');
  });
});
