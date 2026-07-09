import { afterEach, describe, expect, it, vi } from 'vitest';
import { cancelCloudBooking, createCloudAccount, createCloudBooking, createCloudProject, deleteCloudAccount, mapCloudSnapshot, releaseCloudBooking, reorderCloudGroups, reorderCloudProjects, updateCloudAccount, updateCloudBooking } from '../src/lib/runway-api';

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
          password: 'secret-value',
          notes: '主力账号',
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
      password: 'secret-value',
      notes: '主力账号',
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

  it('keeps projects that do not have bookings yet', () => {
    const snapshot = mapCloudSnapshot({
      accounts: [],
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
      users: [],
      groups: [],
      projects: ['新项目'],
      defaultUser: {
        id: 'user-wang',
        name: '小王',
        email: 'wang@studio.local',
        groupId: 'group-a',
      },
    });

    expect(snapshot.projects).toEqual(['新项目', '广告片']);
  });

  it('preserves cloud project order in the board snapshot', () => {
    const snapshot = mapCloudSnapshot({
      accounts: [],
      bookings: [],
      users: [],
      groups: [],
      projects: ['直播片头', '品牌短片', '素材补帧'],
      defaultUser: {
        id: 'user-wang',
        name: '小王',
        groupId: 'group-a',
      },
    });

    expect(snapshot.projects).toEqual(['直播片头', '品牌短片', '素材补帧']);
  });

  it('keeps cloud group sort order in the board snapshot', () => {
    const snapshot = mapCloudSnapshot({
      accounts: [],
      bookings: [],
      users: [],
      groups: [
        { id: 'group-b', name: 'B组', sortOrder: 2 },
        { id: 'group-a', name: 'A组', sortOrder: 1 },
      ],
      defaultUser: {
        id: 'user-wang',
        name: '小王',
        groupId: 'group-a',
      },
    });

    expect(snapshot.groups).toEqual([
      expect.objectContaining({ id: 'group-b', sortOrder: 2 }),
      expect.objectContaining({ id: 'group-a', sortOrder: 1 }),
    ]);
  });
});

describe('cloud write headers', () => {
  it('does not send an operator pin on account edits', async () => {
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

    await createCloudAccount({
      email: 'runway01@example.com',
      label: 'R-01',
      renewalDate: '2026-05-20',
      isActive: true,
      sortOrder: 1,
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/accounts',
      expect.objectContaining({
        headers: expect.objectContaining({
          'content-type': 'application/json',
        }),
      }),
    );
    const headers = (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit | undefined)?.headers as Record<string, string> | undefined;
    expect(headers?.['x-operator-pin']).toBeUndefined();
  });

  it('deletes an account through the account endpoint', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));

    await deleteCloudAccount('account-1');

    expect(fetch).toHaveBeenCalledWith('/api/accounts/account-1', { method: 'DELETE' });
  });

  it('writes account password and notes through the account endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          account: {
            id: 'account-1',
            email: 'runway01@example.com',
            password: 'secret-value',
            notes: '主力账号',
            label: 'R-01',
            renewalDate: '2026-05-20',
            isActive: true,
            sortOrder: 1,
            createdAt: '2026-05-09T00:00:00.000Z',
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await updateCloudAccount('account-1', {
      email: 'runway01@example.com',
      password: 'secret-value',
      notes: '主力账号',
      label: 'R-01',
      renewalDate: '2026-05-20',
      isActive: true,
      sortOrder: 1,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/accounts/account-1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          email: 'runway01@example.com',
          password: 'secret-value',
          notes: '主力账号',
          label: 'R-01',
          renewalDate: '2026-05-20',
          isActive: true,
          sortOrder: 1,
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

  it('updates and cancels future bookings through the booking resource endpoint', async () => {
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
              startAt: '2026-05-09T09:00:00.000Z',
              endAt: '2026-05-09T11:00:00.000Z',
              releasedAt: null,
              createdAt: '2026-05-09T05:50:00.000Z',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
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
              startAt: '2026-05-09T09:00:00.000Z',
              endAt: '2026-05-09T11:00:00.000Z',
              releasedAt: '2026-05-09T08:00:00.000Z',
              createdAt: '2026-05-09T05:50:00.000Z',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    await updateCloudBooking('booking-1', {
      accountId: 'account-1',
      userName: '小王',
      groupName: 'A组',
      projectName: '广告片',
      startAt: '2026-05-09T09:00:00.000Z',
      endAt: '2026-05-09T11:00:00.000Z',
    });
    await cancelCloudBooking('booking-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/bookings/booking-1',
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/bookings/booking-1',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
  });

  it('creates projects without an operator pin', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ project: '新项目' }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(createCloudProject('新项目')).resolves.toBe('新项目');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
      }),
    );
    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.headers as Record<string, string> | undefined;
    expect(headers?.['x-operator-pin']).toBeUndefined();
  });

  it('reorders groups through a dedicated endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          groups: [
            { id: 'group-b', name: 'B组', sortOrder: 1 },
            { id: 'group-a', name: 'A组', sortOrder: 2 },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    await expect(reorderCloudGroups(['group-b', 'group-a'])).resolves.toEqual([
      expect.objectContaining({ id: 'group-b', sortOrder: 1 }),
      expect.objectContaining({ id: 'group-a', sortOrder: 2 }),
    ]);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/groups/reorder',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
        body: JSON.stringify({ groupIds: ['group-b', 'group-a'] }),
      }),
    );
  });

  it('reorders projects through a dedicated endpoint', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ projects: ['素材补帧', '品牌短片'] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(reorderCloudProjects(['素材补帧', '品牌短片'])).resolves.toEqual(['素材补帧', '品牌短片']);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/projects/reorder',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'content-type': 'application/json' }),
        body: JSON.stringify({ projects: ['素材补帧', '品牌短片'] }),
      }),
    );
  });
});
