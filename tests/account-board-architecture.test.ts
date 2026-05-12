/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const accountBoardSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/account-board-page.tsx', import.meta.url)),
  'utf8',
);

describe('account board architecture', () => {
  it('keeps edit mode scoped to account information only', () => {
    expect(accountBoardSource).not.toContain('function GroupEditorSection');
    expect(accountBoardSource).not.toContain('function MemberEditorSection');
    expect(accountBoardSource).not.toContain('function GroupEditor(');
    expect(accountBoardSource).not.toContain('function MemberEditor(');
    expect(accountBoardSource).not.toContain('编辑项目');
    expect(accountBoardSource).not.toContain('删除项目');
  });
});
