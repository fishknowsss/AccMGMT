import { LayoutDashboard, Settings, UserRound, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAccountsViewModel } from '../../hooks/useAccountsViewModel';
import { boardSections, getBoardSectionMeta, type BoardSection } from '../../lib/board-navigation';
import { advanceDeveloperSequence, canUseDeveloperShortcut, normalizeDeveloperKey } from '../../lib/developer-mode';
import { type Account } from '../../lib/runway-board';
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
};

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
    <div className="min-h-screen bg-[#F7F8FA] text-[#202329]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(111,124,143,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(111,124,143,0.08)_1px,transparent_1px)] bg-[size:28px_28px] opacity-35" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] gap-4 px-4 py-4 lg:px-6">
        <aside className="hidden w-[76px] shrink-0 lg:block">
          <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col items-center rounded-[22px] border border-[#DDE3EA] bg-[#FCFDFE]/90 p-3 shadow-[0_20px_60px_rgba(52,64,84,0.08)] backdrop-blur">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#1C2430] text-sm font-semibold text-white">AM</div>
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

        <main className="grid min-w-0 flex-1 content-start gap-4">
          <header className="rounded-[22px] border border-[#DDE3EA] bg-[#FCFDFE]/92 px-5 py-4 shadow-[0_20px_60px_rgba(52,64,84,0.08)] backdrop-blur">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-md bg-[#E8EDF3] px-2 py-1 text-sm font-medium text-[#344154]">{activeMeta.shortLabel}</span>
                  <span className="font-mono text-sm tabular-nums text-[#667085]">Runway Unlimited / $95</span>
                  {developerMode ? <span className="rounded-md bg-[#1C2430] px-2 py-1 text-sm font-medium text-white">编辑模式</span> : null}
                </div>
                <h1 className="text-[28px] font-semibold leading-tight tracking-normal text-[#15171B]">{activeMeta.label}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <MemberSwitcher model={model} />
                <div className="rounded-xl bg-[#F2F5F8] px-3 py-2 font-mono text-sm tabular-nums text-[#344154]">
                  <time dateTime={model.now.toISOString()}>{formatDateTime(model.now)}</time>
                </div>
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:hidden">
            <nav className="flex gap-2 overflow-x-auto" aria-label="主导航">
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
            <>
              <OperationsStrip stats={model.view.stats} />
              <AccountFilters filters={model.filters} groups={model.groups} onChange={model.updateFilters} onFindAvailable={model.findAvailableAccount} />
            </>
          ) : null}

          {model.notice ? <div className="rounded-xl border border-[#D7E3F6] bg-[#EEF5FF] px-4 py-3 text-sm text-[#315D92]">{model.notice}</div> : null}

          {activeSection === 'board' ? (
            <AccountTable
              now={model.now}
              onRelease={(row) => row.current && model.releaseBooking(row.current)}
              onReserve={model.openBooking}
              onUseNow={model.openUseNow}
              rows={model.view.rows}
            />
          ) : null}
          {activeSection === 'accounts' ? <SiteSettingsPanel developerMode={developerMode} model={model} /> : null}
          {activeSection === 'groups' ? <MemberGroupsPanel model={model} /> : null}
        </main>
      </div>

      {model.useNowForm ? (
        <UseNowDialog
          account={model.accountById.get(model.useNowForm.accountId)}
          currentUser={model.currentUser}
          form={model.useNowForm}
          groups={model.groups}
          onChange={model.updateUseNowForm}
          onClose={model.closeUseNow}
          onSubmit={model.submitUseNow}
        />
      ) : null}

      {model.bookingForm ? (
        <BookingDialog
          account={model.accountById.get(model.bookingForm.accountId)}
          form={model.bookingForm}
          groups={model.groups}
          onChange={model.updateBookingForm}
          onClose={model.closeBooking}
          onSubmit={model.submitBooking}
          users={model.users}
        />
      ) : null}
    </div>
  );
}

type BoardModel = ReturnType<typeof useAccountsViewModel>;

function MemberSwitcher({ model }: { model: BoardModel }) {
  const currentGroup = model.groups.find((group) => group.id === model.currentUser.groupId);

  return (
    <div className="flex min-w-[260px] items-center gap-3 rounded-xl bg-[#F2F5F8] px-3 py-2">
      <UserRound className="shrink-0 text-[#526071]" size={17} />
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="current-member">
          当前成员
        </label>
        <select
          className="w-full bg-transparent text-sm font-semibold text-[#202329] outline-none"
          id="current-member"
          onChange={(event) => model.setCurrentUserId(event.target.value)}
          value={model.currentUserId}
        >
          {model.users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} · {user.role === 'admin' ? '管理员' : '成员'}
            </option>
          ))}
        </select>
        <div className="text-sm text-[#526071]">{currentGroup?.name ?? '未分组'}</div>
      </div>
    </div>
  );
}

function RailButton({ active, section, onClick }: { active: boolean; section: BoardSection; onClick: (section: BoardSection) => void }) {
  const meta = getBoardSectionMeta(section);
  const Icon = sectionIcons[section];

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

function AccountPoolSummary({ model }: { model: BoardModel }) {
  const activeAccounts = model.accounts.filter((account) => account.isActive).length;

  return (
    <section className="rounded-[18px] border border-[#DDE3EA] bg-white p-5 shadow-[0_18px_44px_rgba(52,64,84,0.07)]">
      <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#171A1F]">账号池</h2>
          <div className="mt-1 text-sm text-[#667085]">Runway 账号池</div>
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
    <section className="overflow-hidden rounded-[18px] border border-[#DDE3EA] bg-white shadow-[0_18px_44px_rgba(52,64,84,0.07)]">
      <div className="flex items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-5 py-4">
        <h2 className="text-base font-semibold text-[#171A1F]">账号编辑</h2>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{model.accounts.length} 个账号</span>
      </div>
      <AccountCreator getDefaultDraft={model.getEmptyAccountDraft} onCreate={model.createAccount} />
      <div className="hidden grid-cols-[110px_minmax(260px,1fr)_160px_120px_80px] border-b border-[#EEF2F6] bg-[#FAFBFC] px-5 py-3 text-sm font-medium text-[#667085] xl:grid">
        <div>编号</div>
        <div>账号邮箱</div>
        <div>续费日期</div>
        <div>状态</div>
        <div className="text-right">操作</div>
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
          保存
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
    <article className="grid gap-3 px-5 py-4 xl:grid-cols-[110px_minmax(260px,1fr)_160px_120px_80px] xl:items-center">
      <Input value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} />
      <Input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
      <Input type="date" value={draft.renewalDate} onChange={(event) => setDraft({ ...draft, renewalDate: event.target.value })} />
      <label className="flex items-center gap-2 text-sm font-medium text-[#344154]">
        <input
          checked={draft.isActive}
          className="h-4 w-4 accent-[#1C2430]"
          onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
          type="checkbox"
        />
        启用账号
      </label>
      <Button className="xl:justify-self-end" onClick={() => onSave(account.id, draft)} size="sm" type="button" variant="secondary">
        保存
      </Button>
    </article>
  );
}

function MemberGroupsPanel({ model }: { model: BoardModel }) {
  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {model.groups.map((group) => {
        const members = model.users.filter((user) => user.groupId === group.id);
        const activeBookings = model.view.allRows.filter((row) => row.current?.groupId === group.id);
        const nextBookings = model.view.allRows.filter((row) => row.next?.groupId === group.id);

        return (
          <article className="rounded-[18px] border border-[#DDE3EA] bg-white p-5 shadow-[0_18px_44px_rgba(52,64,84,0.07)]" key={group.id}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#171A1F]">{group.name}</h2>
              <span className="rounded-md bg-[#EEF2F6] px-2 py-1 font-mono text-sm tabular-nums text-[#344154]">{members.length} 人</span>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#F7F9FB] p-3">
                <div className="text-sm text-[#667085]">占用中</div>
                <strong className="font-mono text-2xl font-semibold tabular-nums text-[#1E232B]">{activeBookings.length}</strong>
              </div>
              <div className="rounded-xl bg-[#F7F9FB] p-3">
                <div className="text-sm text-[#667085]">待预约</div>
                <strong className="font-mono text-2xl font-semibold tabular-nums text-[#1E232B]">{nextBookings.length}</strong>
              </div>
            </div>
            <div className="grid gap-2">
              {members.map((member) => (
                <div className="flex items-center justify-between rounded-xl bg-[#FAFBFC] px-3 py-2" key={member.id}>
                  <span className="font-medium text-[#344154]">{member.name}</span>
                  <span className="text-sm text-[#667085]">{member.role === 'admin' ? '管理员' : '成员'}</span>
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </section>
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
