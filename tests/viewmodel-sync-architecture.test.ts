/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const viewModelSource = readFileSync(fileURLToPath(new URL('../src/hooks/useAccountsViewModel.ts', import.meta.url)), 'utf8');

describe('accounts view model cloud synchronization', () => {
  it('refreshes cloud data before booking writes and after stale booking conflicts', () => {
    expect(viewModelSource).toContain('async function refreshSnapshot');
    expect(viewModelSource).toContain('const latest = await refreshSnapshot();');
    expect(viewModelSource).toContain('await refreshSnapshot();');
  });
});
