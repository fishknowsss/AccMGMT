/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const accountTableSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/account-table.tsx', import.meta.url)),
  'utf8',
);
const statusBadgeSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/status-badge.tsx', import.meta.url)),
  'utf8',
);

describe('account table password actions', () => {
  it('uses an icon-only desktop password action without rendering password text', () => {
    expect(accountTableSource).toContain('onCopyPassword');
    expect(accountTableSource).toContain('aria-label="复制密码"');
    expect(accountTableSource).not.toContain('>复制密码<');
    expect(accountTableSource).toContain('row.account.password');
    expect(accountTableSource).not.toContain('{row.account.password}');
  });

  it('labels the narrow single-column password action', () => {
    expect(accountTableSource).toContain('<span>密码</span>');
  });

  it('fits the desktop account table without a forced horizontal min-width', () => {
    expect(accountTableSource).toContain('table-fixed');
    expect(accountTableSource).not.toContain('min-w-[1400px]');
    expect(accountTableSource).not.toContain('续费日期');
    expect(accountTableSource).not.toContain('RenewalBadge');
  });

  it('truncates account email instead of letting it overlap nearby cells', () => {
    expect(accountTableSource).toContain('w-full max-w-full');
    expect(accountTableSource).toContain('truncate font-medium text-[#202329]');
    expect(accountTableSource).toContain('overflow-hidden');
  });

  it('gives the status column enough room and does not truncate status times', () => {
    expect(accountTableSource).toContain('<th className="w-[30%] px-3 py-3">账号</th>');
    expect(accountTableSource).toContain('<th className="w-[19%] px-2 py-3">状态</th>');
    expect(statusBadgeSource).toContain('whitespace-nowrap font-mono');
    expect(statusBadgeSource).not.toContain('truncate font-mono text-[13px] leading-5 tabular-nums text-[#4F5F77]');
  });
});
