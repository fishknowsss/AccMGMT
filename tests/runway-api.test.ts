import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCloudAccount, createCloudBooking, mapCloudSnapshot, releaseCloudBooking } from '../src/lib/runway-api';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('mapCloudSnapshot', () => {
  it('converts Cloudflare API rows into board accounts and bookings', () => {
    const snapshot = mapCloudSnapshot({
      accounts: [
        {
          id: 'account-1',
          email: 'runway01@example.com',
          label: 'R-01',
          renewalDate: '2026-05-20',
          isActive: true,
          sortOrder: 1,
          createdAt: '2026-05-09T00:00:00.000Z',
        },
      ],
      bookings: [
        {
          id: 'booking-1',
          accountId: 'account-1',
          userName: '小王',
          groupName: 'A组',
          projectName: '广告片',
          startAt: '2026-05-09T06:00:00.000Z',
          endAt: '2026-05-09T08:00:00.000Z',
          releasedAt: null,
          createdAt: '2026-05-09T05:50:00.000Z',
        },
      ],
      users: [
        {
          id: 'user-wang',
          name: '小王',
          email: 'wang@studio.local',
          groupId: 'group-a',
        },
      ],
      groups: [{ id: 'group-a', name: 'A组' }],
      defaultUser: {
        id: 'user-wang',
        name: '小王',
        email: 'wang@studio.local',
        groupId: 'group-a',
      },
    });

    expect(snapshot.accounts[0]).toMatchObject({
      id: 'account-1',
      label: 'R-01',
      renewalDate: '2026-05-20',
      sortOrder: 1,
    });
    expect(snapshot.bookings[0]).toMatchObject({
      id: 'booking-1',
      accountId: 'account-1',
      userId: 'user-wang',
      groupId: 'group-a',
      startTime: '2026-05-09T06:00:00.000Z',
      endTime: '2026-05-09T08:00:00.000Z',
      status: 'confirmed',
    });
  });

  it('treats released cloud bookings as cancelled', () => {
    const snapshot = mapCloudSnapshot({
      accounts: [],
      bookings: [
        {
          id: 'booking-1',
          accountId: 'account-1',
          userName: '未登记成员',
          groupName: '未登记小组',
          projectName: '广告片',
          startAt: '2026-05-09T06:00:00.000Z',
          endAt: '2026-05-09T08:00:00.000Z',
          releasedAt: '2026-05-09T07:00:00.000Z',
          createdAt: '2026-05-09T05:50:00.000Z',
        },
      ],
      users: [],
      groups: [],
      defaultUser: {
        id: 'user-wang',
        name: '小王',
        email: 'wang@studio.local',
        groupId: 'group-a',
      },
    });

    expect(snapshot.bookings[0].status).toBe('cancelled');
  });
});

describe('cloud write headers', () => {
  it('keeps the operator pin on account edits', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          account: {
            id: 'account-1',
            email: 'runway01@example.com',
            label: 'R-01',
            renewalDate: '2026-05-20',
            isActive: true,
            sortOrder: 1,
            createdAt: '2026-05-09T00:00:00.000Z',
          },
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    );

    await createCloudAccount(
      {
        email: 'runway01@example.com',
        label: 'R-01',
        renewalDate: '2026-05-20',
        isActive: true,
        sortOrder: 1,
      },
      '123456',
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/accounts',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-operator-pin': '123456',
        }),
      }),
    );
  });

  it('does not send the operator pin for daily booking operations', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            booking: {
              id: 'booking-1',
              accountId: 'account-1',
              userName: '小王',
              groupName: 'A组',
              projectName: '广告片',
              startAt: '2026-05-09T06:00:00.000Z',
              endAt: '2026-05-09T08:00:00.000Z',
              releasedAt: null,
              createdAt: '2026-05-09T05:50:00.000Z',
            },
          }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            booking: {
              id: 'booking-1',
              accountId: 'account-1',
              userName: '小王',
              groupName: 'A组',
              projectName: '广告片',
              startAt: '2026-05-09T06:00:00.000Z',
              endAt: '2026-05-09T08:00:00.000Z',
              releasedAt: '2026-05-09T07:00:00.000Z',
              createdAt: '2026-05-09T05:50:00.000Z',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    await createCloudBooking({
      accountId: 'account-1',
      userName: '小王',
      groupName: 'A组',
      projectName: '广告片',
      startAt: '2026-05-09T06:00:00.000Z',
      endAt: '2026-05-09T08:00:00.000Z',
    });
    await releaseCloudBooking('booking-1');

    const createHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers as Record<string, string> | undefined;
    const releaseHeaders = (fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.headers as Record<string, string> | undefined;

    expect(createHeaders?.['x-operator-pin']).toBeUndefined();
    expect(releaseHeaders?.['x-operator-pin']).toBeUndefined();
  });
});
