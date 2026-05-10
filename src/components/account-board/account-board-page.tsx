import { LayoutDashboard, Settings, Trash2, UsersRound, FolderOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccountsViewModel, type AccountDraftState } from '../../hooks/useAccountsViewModel';
import { boardSections, getBoardSectionMeta, type BoardSection } from '../../lib/board-navigation';
import { advanceDeveloperSequence, canUseDeveloperShortcut, normalizeDeveloperKey } from '../../lib/developer-mode';
import { type Account, type Group, type User } from '../../lib/runway-board';
import { cn } from '../../lib/utils';
import { AccountFilters } from './account-filters';
import { AccountTable } from './account-table';
import { BookingDialog } from './booking-dialog';
import { OperationsStrip } from './operations-strip';
import { Button } from '../ui/button';
import { Field, Input } from '../ui/field';
import { UseNowDialog } from './use-now-dialog';

const sectionIcons = {
  board: LayoutDashboard,
  accounts: Settings,
  groups: UsersRound,
  projects: FolderOpen,
} satisfies Record<BoardSection, React.FC<{ size?: number; className?: string }>>;

const primarySections = boardSections.filter((section) => section.id !== 'accounts');
const settingsSection = boardSections.find((section) => section.id === 'accounts') ?? boardSections[1];

export function AccountBoardPage() {
  const model = useAccountsViewModel();
  const [activeSection, setActiveSection] = useState<BoardSection>('board');
  const [developerIndex, setDeveloperIndex] = useState(0);
  const [developerMode, setDeveloperMode] = useState(false);
  const activeMeta = getBoardSectionMeta(activeSection);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!canUseDeveloperShortcut(activeSection)) {
        setDeveloperIndex(0);
        return;
      }

      const key = normalizeDeveloperKey(event.key);
      if (!key) {
        setDeveloperIndex(0);
        return;
      }

      const result = advanceDeveloperSequence(developerIndex, key);
      setDeveloperIndex(result.index);
      if (result.unlocked) {
        setDeveloperMode(true);
        setActiveSection('accounts');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSection, developerIndex]);

  return (
    <div className="min-h-dvh bg-[#F6F7F9] text-[#202329] lg:h-screen lg:min-h-0 lg:overflow-hidden">
      <div className="relative mx-auto flex w-full max-w-[1440px] gap-4 px-3 py-3 pb-6 sm:px-4 sm:py-4 lg:h-full lg:px-6 lg:pb-4">
        <aside className="hidden w-[76px] shrink-0 lg:block">
          <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col items-center rounded-2xl border border-[#DDE3EA] bg-[#FCFDFE] p-3 shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#1C2430] text-sm font-semibold text-white">AM</div>
            <nav className="mt-6 grid gap-2" aria-label="主导航">
              {primarySections.map((item) => (
                <RailButton active={item.id === activeSection} key={item.id} section={item.id} onClick={setActiveSection} />
              ))}
            </nav>
            <nav className="mt-auto grid gap-2" aria-label="设置导航">
              <RailButton active={settingsSection.id === activeSection} section={settingsSection.id} onClick={setActiveSection} />
            </nav>
          </div>
        </aside>

          <main className={cn('flex min-w-0 flex-1 flex-col gap-3 sm:gap-4', (activeSection === 'accounts' || activeSection === 'projects') ? 'lg:min-h-0 lg:overflow-y-auto lg:overflow-x-hidden' : 'lg:min-h-0 lg:overflow-hidden')}>
          <header className="shrink-0 rounded-2xl border border-[#DDE3EA] bg-[#FCFDFE] shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
            {/* Mobile: compact single row */}
            <div className="flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="text-[17px] font-semibold leading-tight text-[#15171B]">{activeMeta.label}</h1>
                {developerMode ? <span className="rounded-md bg-[#1C2430] px-1.5 py-0.5 text-xs font-medium text-white">编辑模式</span> : null}
              </div>
              <div className="shrink-0 rounded-lg bg-[#F2F5F8] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#344154]">
                <time dateTime={model.now.toISOString()}>{formatDateTime(model.now)}</time>
              </div>
            </div>
            {/* Desktop: full layout */}
            <div className="hidden px-5 py-4 lg:block">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-[#E8EDF3] px-2 py-1 text-sm font-medium text-[#344154]">{activeMeta.shortLabel}</span>
                    <span className="font-mono text-sm tabular-nums text-[#667085]">Runway Unlimited / $95</span>
                    {developerMode ? <span className="rounded-md bg-[#1C2430] px-2 py-1 text-sm font-medium text-white">编辑模式</span> : null}
                  </div>
                  <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-[#15171B]">{activeMeta.label}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="rounded-lg bg-[#F2F5F8] px-3 py-2 font-mono text-sm tabular-nums text-[#344154]">
                    <time dateTime={model.now.toISOString()}>{formatDateTime(model.now)}</time>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="grid shrink-0 gap-4 lg:hidden">
            <nav className="-mx-3 flex gap-2 overflow-x-auto px-3" aria-label="主导航">
              {boardSections.map((item) => (
                <button
                  className={cn(
                    'h-9 shrink-0 rounded-lg border border-[#DDE3EA] bg-white px-3 text-sm font-medium text-[#667085]',
                    item.id === activeSection && 'bg-[#1C2430] text-white',
                  )}
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          {activeSection === 'board' ? (
            model.isLoading ? (
              <BoardLoadingState />
            ) : (
              <>
                <OperationsStrip stats={model.view.stats} />
                <AccountFilters filters={model.filters} groups={model.groups} onChange={model.updateFilters} onFindAvailable={model.findAvailableAccount} />
              </>
            )
          ) : null}

          {activeSection === 'board' && !model.isLoading ? (
            <AccountTable
              now={model.now}
              onRelease={(row) => row.current && model.releaseBooking(row.current)}
              onReserve={model.openBooking}
              onCopyEmail={model.copyAccountEmail}
              onUseNow={model.openUseNow}
              rows={model.view.rows}
            />
          ) : null}
          {activeSection === 'accounts' ? <SiteSettingsPanel developerMode={developerMode} model={model} /> : null}
          {activeSection === 'groups' ? <MemberGroupsPanel developerMode={developerMode} model={model} /> : null}
          {activeSection === 'projects' ? <ProjectsPanel developerMode={developerMode} model={model} /> : null}
        </main>
      </div>

      {model.useNowForm ? (
        <UseNowDialog
          account={model.accountById.get(model.useNowForm.accountId)}
          form={model.useNowForm}
          groups={model.activeGroups}
          onChange={model.updateUseNowForm}
          onClose={model.closeUseNow}
          onSubmit={model.submitUseNow}
          projects={model.projects}
          users={model.activeUsers}
        />
      ) : null}

      {model.bookingForm ? (
        <BookingDialog
          account={model.accountById.get(model.bookingForm.accountId)}
          form={model.bookingForm}
          groups={model.activeGroups}
          onChange={model.updateBookingForm}
          onClose={model.closeBooking}
          onSubmit={model.submitBooking}
          projects={model.projects}
          users={model.activeUsers}
        />
      ) : null}

      {model.toast ? <FloatingToast message={model.toast} /> : null}
    </div>
  );
}

type BoardModel = ReturnType<typeof useAccountsViewModel>;

function BoardLoadingState() {
  return (
    <section className="rounded-2xl border border-[#DDE3EA] bg-white px-5 py-10 text-center shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
      <div className="text-base font-medium text-[#344154]">正在加载账号池。</div>
    </section>
  );
}

function FloatingToast({ message }: { message: string }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2">
      <div className="toast-pop rounded-xl border border-[#D7E3F6] bg-[#F7FBFF] px-4 py-2 text-sm font-medium text-[#315D92] shadow-[0_16px_42px_rgba(49,93,146,0.18)]">
        {message}
      </div>
    </div>
  );
}

function RailButton({ active, section, onClick }: { active: boolean; section: BoardSection; onClick: (section: BoardSection) => void }) {
  const meta = getBoardSectionMeta(section);
  const Icon = sectionIcons[section] as React.FC<{ size?: number }>;

  return (
    <button
      aria-current={active ? 'page' : undefined}
      aria-label={meta.label}
      className={cn(
        'grid h-11 w-11 place-items-center rounded-2xl text-[#667085] transition hover:bg-[#EEF2F6] hover:text-[#263241]',
        active && 'bg-[#E8EDF3] text-[#1C2430] shadow-[inset_0_0_0_1px_rgba(81,94,115,0.08)]',
      )}
      onClick={() => onClick(section)}
      type="button"
    >
      <Icon size={18} />
    </button>
  );
}

function SiteSettingsPanel({ developerMode, model }: { developerMode: boolean; model: BoardModel }) {
  return (
    <div className="grid gap-4">
      <AccountPoolSummary model={model} />

      {developerMode ? <AccountEditorSection model={model} /> : null}
    </div>
  );
}

function ProjectsPanel({ developerMode, model }: { developerMode: boolean; model: BoardModel }) {
  const { projects } = model;
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  function startEdit(name: string) {
    setEditing(name);
    setEditName(name);
    setError('');
  }

  async function handleSave(oldName: string) {
    const result = await model.renameProject(oldName, editName);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setEditing(null);
    setError('');
  }

  async function handleDelete(name: string) {
    const result = await model.deleteProject(name);
    if (!result.ok) {
      setError(result.reason);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
      {projects.length ? (
        <ul className="divide-y divide-[#EEF2F6]">
          {projects.map((p) => (
            <li className="flex items-center gap-2 px-5 py-3" key={p}>
              {developerMode && editing === p ? (
                <>
                  <input
                    autoFocus
                    className="flex-1 rounded-lg border border-[#DDE3EA] bg-[#FCFDFE] px-3 py-1.5 text-sm text-[#171A1F] outline-none focus:border-[#1C2430]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSave(p);
                      if (e.key === 'Escape') { setEditing(null); setError(''); }
                    }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <Button onClick={() => void handleSave(p)} size="sm" type="button" variant="ghost">保存</Button>
                  <Button onClick={() => { setEditing(null); setError(''); }} size="sm" type="button" variant="ghost">取消</Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-[#344154]">{p}</span>
                  {developerMode ? (
                    <>
                      <Button aria-label="编辑项目" onClick={() => startEdit(p)} size="icon" type="button" variant="ghost">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path d="M15.232 5.232l3.536 3.536M9 13l6.768-6.768a2.5 2.5 0 113.536 3.536L12.536 16.5H9v-3.5z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Button>
                      <Button aria-label="删除项目" className="text-[#8D3F36] hover:bg-[#FCEDEA]" onClick={() => void handleDelete(p)} size="icon" type="button" variant="ghost">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0h8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Button>
                    </>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-[#98A7B7]">暂无项目。在使用或预约账号时填写项目名即可添加。</div>
      )}
      {error ? <p className="border-t border-[#EEF2F6] px-5 py-3 text-xs text-[#8D3F36]">{error}</p> : null}
    </div>
  );
}

function AccountPoolSummary({ model }: { model: BoardModel }) {
  const activeAccounts = model.accounts.filter((account) => account.isActive).length;

  return (
    <section className="rounded-2xl border border-[#DDE3EA] bg-white p-5 shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#171A1F]">账号池</h2>
        </div>
        <div className="font-mono text-sm tabular-nums text-[#667085]">Runway Unlimited / $95</div>
      </div>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
        <ReadonlySetting label="账号总数" value={`${model.accounts.length} 个`} />
        <ReadonlySetting label="启用账号" value={`${activeAccounts} 个`} />
        <ReadonlySetting label="使用中" value={`${model.view.stats.inUse} 个`} />
        <ReadonlySetting label="7天内续费" value={`${model.view.stats.renewalSoon} 个`} />
      </div>
    </section>
  );
}

function AccountEditorSection({ model }: { model: BoardModel }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
      <div className="flex items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-5 py-4">
        <h2 className="text-base font-semibold text-[#171A1F]">账号编辑</h2>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{model.accounts.length} 个账号</span>
      </div>
      <AccountCreator getDefaultDraft={model.getEmptyAccountDraft} onCreate={model.createAccount} />
      <div className="hidden grid-cols-[110px_minmax(260px,1fr)_160px_120px] border-b border-[#EEF2F6] bg-[#FAFBFC] px-5 py-3 text-sm font-medium text-[#667085] xl:grid">
        <div>编号</div>
        <div>账号邮箱</div>
        <div>续费日期</div>
        <div>状态</div>
      </div>
      <div className="grid divide-y divide-[#EEF2F6]">
        {model.accounts.map((account) => (
          <AccountEditor account={account} key={account.id} onSave={model.updateAccount} />
        ))}
      </div>
    </section>
  );
}

function AccountCreator({ getDefaultDraft, onCreate }: { getDefaultDraft: BoardModel['getEmptyAccountDraft']; onCreate: BoardModel['createAccount'] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => getDefaultDraft());
  const [error, setError] = useState('');

  function resetDraft() {
    setDraft(getDefaultDraft());
    setError('');
  }

  async function handleCreate() {
    const result = onCreate(draft);
    const resolved = result instanceof Promise ? await result : result;
    if (!resolved.ok) {
      setError(resolved.reason);
      return;
    }

    setOpen(false);
    resetDraft();
  }

  if (!open) {
    return (
      <div className="border-b border-[#EEF2F6] px-5 py-4">
        <Button
          onClick={() => {
            resetDraft();
            setOpen(true);
          }}
          type="button"
          variant="primary"
        >
          新增账号
        </Button>
      </div>
    );
  }

  return (
    <section className="grid gap-4 border-b border-[#EEF2F6] bg-[#FAFBFC] px-5 py-4">
      <div className="grid gap-3 xl:grid-cols-[110px_minmax(260px,1fr)_170px_150px]">
        <Field label="编号">
          <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
        </Field>
        <Field label="账号邮箱">
          <Input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
        </Field>
        <Field label="续费日期">
          <Input type="date" value={draft.renewalDate} onChange={(event) => setDraft({ ...draft, renewalDate: event.target.value })} />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-sm font-medium text-[#344154]">
          <input
            checked={draft.isActive}
            className="h-4 w-4 accent-[#1C2430]"
            onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
            type="checkbox"
          />
          启用账号
        </label>
      </div>
      {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{error}</div> : null}
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            setOpen(false);
            resetDraft();
          }}
          type="button"
          variant="ghost"
        >
          取消
        </Button>
        <Button onClick={handleCreate} type="button" variant="primary">
          新增
        </Button>
      </div>
    </section>
  );
}

function ReadonlySetting({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F7F9FB] p-4">
      <div className="text-sm text-[#667085]">{label}</div>
      <div className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#1E232B]">{value}</div>
    </div>
  );
}

function AccountEditor({ account, onSave }: { account: Account; onSave: BoardModel['updateAccount'] }) {
  const [draft, setDraft] = useState({
    email: account.email,
    label: account.label,
    renewalDate: account.renewalDate,
    isActive: account.isActive,
  });

  useEffect(() => {
    setDraft({
      email: account.email,
      label: account.label,
      renewalDate: account.renewalDate,
      isActive: account.isActive,
    });
  }, [account]);

  return (
    <article className="grid gap-3 px-5 py-4 xl:grid-cols-[110px_minmax(260px,1fr)_160px_120px] xl:items-center">
      <Input value={draft.label} onBlur={() => saveAccountDraft(account, draft, onSave)} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
      <Input value={draft.email} onBlur={() => saveAccountDraft(account, draft, onSave)} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
      <Input type="date" value={draft.renewalDate} onBlur={() => saveAccountDraft(account, draft, onSave)} onChange={(event) => setDraft({ ...draft, renewalDate: event.target.value })} />
      <label className="flex items-center gap-2 text-sm font-medium text-[#344154]">
        <input
          checked={draft.isActive}
          className="h-4 w-4 accent-[#1C2430]"
          onChange={(event) => {
            const next = { ...draft, isActive: event.target.checked };
            setDraft(next);
            void onSave(account.id, next);
          }}
          type="checkbox"
        />
        启用账号
      </label>
    </article>
  );
}

function saveAccountDraft(account: Account, draft: AccountDraftState, onSave: BoardModel['updateAccount']) {
  if (account.label === draft.label && account.email === draft.email && account.renewalDate === draft.renewalDate && account.isActive === draft.isActive) {
    return;
  }

  void onSave(account.id, draft);
}

function MemberGroupsPanel({ developerMode, model }: { developerMode: boolean; model: BoardModel }) {
  return (
    <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <section className="shrink-0 overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
        <div className="flex items-center justify-between border-b border-[#EEF2F6] px-5 py-3">
          <h2 className="text-sm font-semibold text-[#171A1F]">小组概览</h2>
          <span className="font-mono text-xs tabular-nums text-[#667085]">{model.groups.length} 个小组</span>
        </div>
        <div className="divide-y divide-[#EEF2F6]">
          {model.groups.map((group) => (
            <GroupSummaryRow group={group} key={group.id} model={model} />
          ))}
        </div>
      </section>

      {developerMode ? (
        <section className="grid gap-4 lg:min-h-0 lg:flex-1 xl:grid-cols-[minmax(320px,0.8fr)_minmax(520px,1.2fr)]">
          <GroupEditorSection model={model} />
          <MemberEditorSection model={model} />
        </section>
      ) : null}
    </div>
  );
}

function GroupSummaryRow({ group, model }: { group: Group; model: BoardModel }) {
  const members = model.users.filter((user) => user.groupId === group.id && user.isActive !== false);
  const activeBookings = model.view.allRows.filter((row) => row.current?.groupId === group.id);
  const nextBookings = model.view.allRows.filter((row) => row.next?.groupId === group.id);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_60px_60px_70px] items-center gap-4 px-5 py-3">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-medium text-[#171A1F]">{group.name}</span>
        {members.length ? (
          <span className="truncate text-sm text-[#98A7B7]">{members.map((m) => m.name).join('、')}</span>
        ) : (
          <span className="text-sm text-[#C4CAD4]">添加成员</span>
        )}
      </div>
      <span className="text-right font-mono text-sm tabular-nums text-[#667085]">{members.length} 人</span>
      <span className="text-right font-mono text-sm tabular-nums text-[#667085]">占用 {activeBookings.length}</span>
      <span className="text-right font-mono text-sm tabular-nums text-[#667085]">预约 {nextBookings.length}</span>
    </div>
  );
}

function GroupEditorSection({ model }: { model: BoardModel }) {
  const [draft, setDraft] = useState({ name: '', isActive: true });
  const [error, setError] = useState('');

  async function handleCreate() {
    const result = await model.createGroup(draft);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setDraft({ name: '', isActive: true });
    setError('');
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)] lg:min-h-0">
      <div className="flex items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-5 py-4">
        <h2 className="text-base font-semibold text-[#171A1F]">小组编辑</h2>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{model.groups.length} 个小组</span>
      </div>
      <div className="grid shrink-0 gap-3 border-b border-[#EEF2F6] bg-[#FAFBFC] px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <Field label="小组名称">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Button className="self-end" onClick={handleCreate} type="button" variant="primary">
            新增
          </Button>
        </div>
        {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{error}</div> : null}
      </div>
      <div className="grid divide-y divide-[#EEF2F6] lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
        {model.groups.map((group) => (
          <GroupEditor group={group} key={group.id} onDelete={model.deleteGroup} onSave={model.updateGroup} />
        ))}
      </div>
    </section>
  );
}

function GroupEditor({ group, onDelete, onSave }: { group: Group; onDelete: BoardModel['deleteGroup']; onSave: BoardModel['updateGroup'] }) {
  const [draft, setDraft] = useState({ name: group.name, isActive: group.isActive !== false });
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft({ name: group.name, isActive: group.isActive !== false });
    setError('');
  }, [group]);

  async function handleSave() {
    const result = await onSave(group.id, draft);
    setError(result.ok ? '' : result.reason);
  }

  async function handleDelete() {
    const result = await onDelete(group.id);
    setError(result.ok ? '' : result.reason);
  }

  return (
    <article className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_110px_40px] sm:items-center">
      <Input value={draft.name} onBlur={handleSave} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <label className="flex items-center gap-2 text-sm font-medium text-[#344154]">
        <input
          checked={draft.isActive}
          className="h-4 w-4 accent-[#1C2430]"
          onChange={async (event) => {
            const next = { ...draft, isActive: event.target.checked };
            setDraft(next);
            const result = await onSave(group.id, next);
            setError(result.ok ? '' : result.reason);
          }}
          type="checkbox"
        />
        启用
      </label>
      <Button aria-label="删除小组" className="text-[#8D3F36] hover:bg-[#FCEDEA]" onClick={handleDelete} size="icon" type="button" variant="ghost">
        <Trash2 size={16} />
      </Button>
      {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36] sm:col-span-3">{error}</div> : null}
    </article>
  );
}

function MemberEditorSection({ model }: { model: BoardModel }) {
  const defaultGroupId = model.activeGroups[0]?.id ?? model.groups[0]?.id ?? '';
  const [draft, setDraft] = useState({ name: '', groupId: defaultGroupId, isActive: true });
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft((current) => (current.groupId ? current : { ...current, groupId: defaultGroupId }));
  }, [defaultGroupId]);

  async function handleCreate() {
    const result = await model.createUser(draft);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setDraft({ name: '', groupId: defaultGroupId, isActive: true });
    setError('');
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)] lg:min-h-0">
      <div className="flex items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-5 py-4">
        <h2 className="text-base font-semibold text-[#171A1F]">成员编辑</h2>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{model.activeUsers.length} 位成员</span>
      </div>
      <div className="grid shrink-0 gap-3 border-b border-[#EEF2F6] bg-[#FAFBFC] px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_80px]">
          <Field label="姓名">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="小组">
            <GroupSelect groups={model.activeGroups} value={draft.groupId} onChange={(groupId) => setDraft({ ...draft, groupId })} />
          </Field>
          <Button className="self-end" onClick={handleCreate} type="button" variant="primary">
            新增
          </Button>
        </div>
        {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{error}</div> : null}
      </div>
      <div className="grid divide-y divide-[#EEF2F6] lg:min-h-0 lg:flex-1 lg:overflow-y-scroll lg:[scrollbar-gutter:stable]">
        {model.users.map((user) => (
          <MemberEditor groups={model.activeGroups} key={user.id} onDelete={model.deleteUser} onSave={model.updateUser} user={user} />
        ))}
      </div>
    </section>
  );
}

function MemberEditor({ groups, onDelete, onSave, user }: { groups: Group[]; onDelete: BoardModel['deleteUser']; onSave: BoardModel['updateUser']; user: User }) {
  const [draft, setDraft] = useState({ name: user.name, email: user.email, groupId: user.groupId, isActive: user.isActive !== false });
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft({ name: user.name, email: user.email, groupId: user.groupId, isActive: user.isActive !== false });
    setError('');
  }, [user]);

  async function handleSave() {
    const result = await onSave(user.id, draft);
    setError(result.ok ? '' : result.reason);
  }

  async function handleDelete() {
    const result = await onDelete(user.id);
    setError(result.ok ? '' : result.reason);
  }

  return (
    <article className="grid items-center gap-x-3 gap-y-2 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_160px_80px_40px]">
      <Input value={draft.name} onBlur={handleSave} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <GroupSelect
        groups={groups}
        value={draft.groupId}
        onChange={async (groupId) => {
          const next = { ...draft, groupId };
          setDraft(next);
          const result = await onSave(user.id, next);
          setError(result.ok ? '' : result.reason);
        }}
      />
      <label className="flex items-center gap-2 text-sm font-medium text-[#344154]">
        <input
          checked={draft.isActive}
          className="h-4 w-4 accent-[#1C2430]"
          onChange={async (event) => {
            const next = { ...draft, isActive: event.target.checked };
            setDraft(next);
            const result = await onSave(user.id, next);
            setError(result.ok ? '' : result.reason);
          }}
          type="checkbox"
        />
        启用
      </label>
      <Button aria-label="删除成员" className="text-[#8D3F36] hover:bg-[#FCEDEA]" onClick={handleDelete} size="icon" type="button" variant="ghost">
        <Trash2 size={16} />
      </Button>
      {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36] sm:col-span-4">{error}</div> : null}
    </article>
  );
}

function GroupSelect({ groups, value, onChange }: { groups: Group[]; value: string; onChange: (groupId: string) => void }) {
  return (
    <select
      className="h-10 w-full rounded-lg border border-[#DDE3EA] bg-white px-3 text-sm text-[#202329] outline-none transition focus:border-[#98A7B7] focus:ring-2 focus:ring-[#D7E3F6]"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {groups.map((group) => (
        <option key={group.id} value={group.id}>
          {group.name}
        </option>
      ))}
    </select>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}
