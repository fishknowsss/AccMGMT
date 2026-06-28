import { describe, expect, it } from 'vitest';
import { createMockSnapshot, pixverseAccountEmails } from '../src/lib/runway-mock';

describe('pixverse mock accounts', () => {
  it('uses the Pixverse fallback account pool with sequential Pixverse labels', () => {
    const snapshot = createMockSnapshot(new Date('2026-05-10T06:00:00.000Z'));

    expect(snapshot.accounts.map((account) => account.email)).toEqual([...pixverseAccountEmails]);
    expect(snapshot.accounts).toHaveLength(24);
    expect(snapshot.accounts.every((account) => account.renewalDate === '2026-06-01')).toBe(true);
    expect(snapshot.accounts[0]).toMatchObject({ id: 'account-1', label: 'P-01', sortOrder: 1 });
    expect(snapshot.accounts[23]).toMatchObject({ id: 'account-24', label: 'P-24', sortOrder: 24 });
  });
});
