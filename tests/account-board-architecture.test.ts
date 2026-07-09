/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const accountBoardSource = readFileSync(
  fileURLToPath(new URL('../src/components/account-board/account-board-page.tsx', import.meta.url)),
  'utf8',
);
const boardNavigationSource = readFileSync(
  fileURLToPath(new URL('../src/lib/board-navigation.ts', import.meta.url)),
  'utf8',
);

describe('account board architecture', () => {
  it('keeps member and group editors available inside edit mode', () => {
    expect(accountBoardSource).toContain('<MemberGroupsPanel developerMode={developerMode} model={model} />');
    expect(accountBoardSource).toContain('function GroupEditorSection');
    expect(accountBoardSource).toContain('function MemberEditorSection');
    expect(accountBoardSource).toContain('function GroupEditor(');
    expect(accountBoardSource).toContain('function MemberEditor(');
    expect(accountBoardSource).not.toContain('编辑项目');
    expect(accountBoardSource).not.toContain('删除项目');
  });

  it('lets developers reorder groups by dragging group editor rows', () => {
    expect(accountBoardSource).toContain('function usePointerReorder');
    expect(accountBoardSource).toContain("document.addEventListener('pointermove'");
    expect(accountBoardSource).toContain("document.addEventListener('pointerup'");
    expect(accountBoardSource).toContain('onPointerDown');
    expect(accountBoardSource).toContain('onKeyDown');
    expect(accountBoardSource).toContain('model.reorderGroups');
    expect(accountBoardSource).toContain('GripVertical');
    expect(accountBoardSource).not.toContain('draggable');
  });

  it('lets developers reorder projects without adding project edit controls', () => {
    expect(accountBoardSource).toContain("projects: FolderOpen");
    expect(accountBoardSource).toContain("records: History");
    expect(accountBoardSource).toContain("activeSection === 'projects' ? <ProjectsPanel developerMode={developerMode} model={model} /> : null");
    expect(accountBoardSource).toContain("activeSection === 'records'");
    expect(accountBoardSource).toContain("import { UsageRecordsPanel } from './usage-records-panel';");
    expect(accountBoardSource).toContain('function ProjectsPanel');
    expect(accountBoardSource).toContain('model.reorderProjects');
    expect(accountBoardSource).not.toContain('function ProjectCreator');
    expect(accountBoardSource).not.toContain('renameProject');
    expect(accountBoardSource).not.toContain('deleteProject');
  });

  it('keeps group names on one line and lets member names wrap', () => {
    expect(accountBoardSource).toContain('whitespace-nowrap');
    expect(accountBoardSource).toContain('break-words');
    expect(accountBoardSource).not.toContain('truncate text-sm text-[#98A7B7]');
  });

  it('uses a self-serve identity entry instead of a long member select', () => {
    expect(accountBoardSource).toContain('function MemberIdentityEntry');
    expect(accountBoardSource).toContain('function MemberIdentityPopover');
    expect(accountBoardSource).toContain('我的身份');
    expect(accountBoardSource).toContain('function IdentityGroupSection');
    expect(accountBoardSource).toContain('function getMemberInitial');
    expect(accountBoardSource).toContain('BOSS');
    expect(accountBoardSource).toContain('border-[#E6B5B0]');
    expect(accountBoardSource).toContain('bg-[#FFF1EF]');
    expect(accountBoardSource).not.toContain('placeholder="搜索成员"');
    expect(accountBoardSource).not.toContain('function CurrentMemberSwitcher');
    expect(accountBoardSource).not.toContain('<Select');
  });

  it('keeps page chrome outside section scrolling on desktop', () => {
    expect(accountBoardSource).toContain('<main className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4 lg:min-h-0">');
    expect(accountBoardSource).toContain("['board', 'groups', 'records'].includes(activeSection) ? 'flex flex-col gap-3 overflow-hidden sm:gap-4' : 'overflow-y-auto overflow-x-hidden pr-1'");
    expect(accountBoardSource).not.toContain("activeSection === 'accounts' || activeSection === 'projects') ? 'lg:min-h-0 lg:overflow-y-auto");
  });

  it('keeps AccMGMT chrome and Pixverse app target copy', () => {
    expect(accountBoardSource).toContain('AM');
    expect(accountBoardSource).toContain('app.pixverse.ai');
    expect(boardNavigationSource).toContain('账号使用与管理面板');
    expect(accountBoardSource).not.toContain('PV');
    expect(accountBoardSource).not.toContain('Pixverse 账号');
    expect(accountBoardSource).not.toContain('Pixverse 看板');
    expect(accountBoardSource).not.toContain('Runway Unlimited / $95');
  });

  it('keeps account deletion inside account edit mode', () => {
    expect(accountBoardSource).toContain('<AccountEditor account={account} key={account.id} onDelete={model.deleteAccount} onSave={model.updateAccount} />');
    expect(accountBoardSource).toContain("function AccountEditor({ account, onDelete, onSave }");
    expect(accountBoardSource).toContain('删除账号');
  });

  it('lets edit mode maintain account password and notes', () => {
    expect(accountBoardSource).toContain('Field label="密码"');
    expect(accountBoardSource).toContain('Field label="备注"');
    expect(accountBoardSource).toContain('account.password ??');
    expect(accountBoardSource).toContain('account.notes ??');
  });

  it('does not show renewal management in the Pixverse UI', () => {
    expect(accountBoardSource).not.toContain('7天内续费');
    expect(accountBoardSource).not.toContain('续费日期');
    expect(accountBoardSource).not.toContain('Field label="续费日期"');
  });
});
