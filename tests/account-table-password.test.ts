/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const accountTableSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/account-table.tsx', import.meta.url)),
  'utf8',
);

describe('account table password actions', () => {
  it('adds a password copy action without rendering the password text', () => {
    expect(accountTableSource).toContain('onCopyPassword');
    expect(accountTableSource).toContain('复制密码');
    expect(accountTableSource).toContain('row.account.password');
    expect(accountTableSource).not.toContain('{row.account.password}');
  });
});
