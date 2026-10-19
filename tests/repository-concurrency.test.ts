import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare } from 'miniflare';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRepository } from '../functions/_lib/repository';

const runtime = new Miniflare({
  modules: true,
  script: 'export default {fetch() { return new Response("isolated test"); }}',
  compatibilityDate: '2026-05-09',
  d1Databases: { DB: 'booking-concurrency-test' },
  d1Persist: false,
});
let db: Awaited<ReturnType<typeof runtime.getD1Database>>;
const draft = (accountId: string, startAt = '2030-10-19T09:00:00.000Z', endAt = '2030-10-19T12:00:00.000Z') => ({
  accountId, groupName: 'A组', userName: '测试成员', projectName: '并发预约', startAt, endAt,
});

beforeAll(async () => {
  db = await runtime.getD1Database('DB');
  for (const file of readdirSync('migrations').filter((name) => name.endsWith('.sql')).sort()) {
    const statements = readFileSync(`migrations/${file}`, 'utf8').replace(/--[^\n]*/g, '').split(';').map((sql) => sql.trim()).filter(Boolean);
    await db.batch(statements.map((sql) => db.prepare(sql)));
  }
  await db.prepare("INSERT INTO accounts(id,email) VALUES('test-1','one@test.local'),('test-2','two@test.local'),('test-3','three@test.local')").run();
});
beforeEach(async () => { await db.prepare('DELETE FROM bookings').run(); });
afterAll(async () => { await runtime.dispose(); });

describe('atomic booking writes against isolated D1', () => {
  it.each(['create', 'update'] as const)('prevents two concurrent %s requests from taking the same account', async (operation) => {
    const repo = createRepository(db);
    const edits = operation === 'update' ? await Promise.all([
      repo.createBooking(draft('test-2', '2030-10-20T09:00:00.000Z', '2030-10-20T12:00:00.000Z')),
      repo.createBooking(draft('test-3', '2030-10-21T09:00:00.000Z', '2030-10-21T12:00:00.000Z')),
    ]) : [];
    const results = await Promise.allSettled([0, 1].map((index) => operation === 'create'
      ? repo.createBooking(draft('test-1'))
      : repo.updateFutureBooking(edits[index].id, draft('test-1'), '2030-10-18T00:00:00.000Z')));

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: new Error('BOOKING_CONFLICT') });
    expect(await db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE account_id = 'test-1'").first('count')).toBe(1);
  });

  it.each(['create', 'update'] as const)('prevents two concurrent %s requests from exceeding the group limit', async (operation) => {
    const repo = createRepository(db);
    await repo.createBooking(draft('test-1'));
    const edits = operation === 'update' ? await Promise.all([
      repo.createBooking(draft('test-2', '2030-10-20T09:00:00.000Z', '2030-10-20T12:00:00.000Z')),
      repo.createBooking(draft('test-3', '2030-10-21T09:00:00.000Z', '2030-10-21T12:00:00.000Z')),
    ]) : [];
    const results = await Promise.allSettled(['test-2', 'test-3'].map((accountId, index) => operation === 'create'
      ? repo.createBooking(draft(accountId))
      : repo.updateFutureBooking(edits[index].id, draft(accountId), '2030-10-18T00:00:00.000Z')));

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({ reason: new Error('GROUP_CONCURRENT_LIMIT') });
    expect(await db.prepare("SELECT COUNT(*) AS count FROM bookings WHERE start_at = '2030-10-19T09:00:00.000Z'").first('count')).toBe(2);
  });

  it.each(['create', 'update'] as const)('allows %s across touching intervals and excludes the edited booking', async (operation) => {
    const repo = createRepository(db);
    await repo.createBooking(draft('test-1', '2030-10-19T09:00:00.000Z', '2030-10-19T12:00:00.000Z'));
    await repo.createBooking(draft('test-2', '2030-10-19T12:00:00.000Z', '2030-10-19T15:00:00.000Z'));
    const input = draft('test-3', '2030-10-19T10:00:00.000Z', '2030-10-19T14:00:00.000Z');
    const created = await repo.createBooking(input);
    const result = operation === 'create' ? created : await repo.updateFutureBooking(created.id, input, '2030-10-18T00:00:00.000Z');

    expect(result?.accountId).toBe('test-3');
  });
});
