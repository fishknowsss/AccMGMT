/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const statusBadgeSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/status-badge.tsx', import.meta.url)),
  'utf8',
);
const accountTableSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/account-table.tsx', import.meta.url)),
  'utf8',
);

describe('status badge layout', () => {
  it('shows status timing without truncating the range text', () => {
    expect(statusBadgeSource).not.toContain('max-w-[215px]');
    expect(statusBadgeSource).not.toContain('truncate');
    expect(statusBadgeSource).toContain('flex-wrap');
  });

  it('gives the status column more room by narrowing the account column', () => {
    expect(accountTableSource).toContain('<th className="w-[30%] px-3 py-3">账号</th>');
    expect(accountTableSource).toContain('<th className="w-[19%] px-2 py-3">状态</th>');
  });
});
