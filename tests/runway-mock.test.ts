import { describe, expect, it } from 'vitest';
import { createMockSnapshot, runwayAccountEmails } from '../src/lib/runway-mock';

describe('runway mock accounts', () => {
  it('uses the provided Outlook account pool with sequential Runway labels', () => {
    const snapshot = createMockSnapshot(new Date('2026-05-10T06:00:00.000Z'));

    expect(snapshot.accounts.map((account) => account.email)).toEqual([...runwayAccountEmails]);
    expect(snapshot.accounts).toHaveLength(24);
    expect(snapshot.accounts[0]).toMatchObject({ id: 'account-1', label: 'R-01', sortOrder: 1 });
    expect(snapshot.accounts[23]).toMatchObject({ id: 'account-24', label: 'R-24', sortOrder: 24 });
  });
});
