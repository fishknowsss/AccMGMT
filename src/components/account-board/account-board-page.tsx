import { Check, ChevronDown, FolderOpen, LayoutDashboard, Settings, Trash2, UserRound, UsersRound } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useAccountsViewModel, type AccountDraftState } from '../../hooks/useAccountsViewModel';
import { boardSections, getBoardSectionMeta, type BoardSection } from '../../lib/board-navigation';
import { advanceDeveloperSequence, advanceDeveloperTapCount, canUseDeveloperShortcut, normalizeDeveloperKey } from '../../lib/developer-mode';
import { defaultGroupConcurrentLimit, getGroupConcurrentLimit, type Account, type Group, type User } from '../../lib/runway-board';
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
export const groupEditorListClassName = 'grid max-h-[280px] divide-y divide-[#EEF2F6] overflow-y-auto';
export const groupEditorRowClassName = 'grid min-h-[68px] gap-3 px-5 py-3 sm:grid-cols-[1fr_104px_90px_40px] sm:items-center';
export const memberEditorListClassName = 'grid max-h-[360px] divide-y divide-[#EEF2F6] overflow-y-scroll [scrollbar-gutter:stable]';
export const memberEditorRowClassName = 'grid min-h-[68px] items-center gap-x-3 gap-y-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_160px_80px_40px]';

export function AccountBoardPage() {
  const model = useAccountsViewModel();
  const [activeSection, setActiveSection] = useState<BoardSection>('board');
  const [developerIndex, setDeveloperIndex] = useState(0);
  const developerTapCountRef = useRef(0);
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

  function handleDeveloperTap() {
    if (activeSection !== 'accounts' || developerMode) {
      return;
    }

    const result = advanceDeveloperTapCount(developerTapCountRef.current);
    developerTapCountRef.current = result.count;
    if (result.unlocked) {
      setDeveloperMode(true);
    }
  }

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
            <div className="border-t border-[#EEF2F6] px-4 py-3 lg:hidden">
              <MemberIdentityEntry currentUserId={model.currentUserId} groups={model.groups} users={model.activeUsers} onChange={model.setCurrentUserId} />
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
                  <MemberIdentityEntry currentUserId={model.currentUserId} groups={model.groups} users={model.activeUsers} onChange={model.setCurrentUserId} />
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
              onEditBooking={model.openEditBooking}
              onCancelBooking={model.cancelBooking}
              onCopyEmail={model.copyAccountEmail}
              onUseNow={model.openUseNow}
              currentUserId={model.currentUserId}
              rows={model.view.rows}
            />
          ) : null}
          {activeSection === 'accounts' ? <SiteSettingsPanel developerMode={developerMode} model={model} onDeveloperTap={handleDeveloperTap} /> : null}
          {activeSection === 'groups' ? <MemberGroupsPanel developerMode={developerMode} model={model} /> : null}
          {activeSection === 'projects' ? <ProjectsPanel developerMode={developerMode} model={model} /> : null}
        </main>
      </div>

      {model.useNowForm ? (
        <UseNowDialog
          account={model.accountById.get(model.useNowForm.accountId)}
          accountOptions={model.useNowForm.accountOptions.map((accountId) => model.accountById.get(accountId)).filter((account): account is Account => Boolean(account))}
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

function MemberIdentityEntry({ currentUserId, groups, users, onChange }: { currentUserId: string; groups: Group[]; users: User[]; onChange: (userId: string) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const currentUser = users.find((user) => user.id === currentUserId) ?? users[0] ?? null;
  const currentGroup = currentUser ? groups.find((group) => group.id === currentUser.groupId) : null;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        className="flex min-h-11 w-full min-w-[230px] items-center gap-3 rounded-xl border border-[#E6B5B0] bg-[#FFF1EF] px-3 py-2 text-left shadow-[0_10px_24px_rgba(160,55,45,0.10)] transition hover:border-[#D98D86] hover:bg-[#FFEAE7] lg:w-auto"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#A23A32] ring-1 ring-[#F0C9C4]">
          <UserRound size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-[#A23A32]">我的身份</span>
          <span className="block truncate text-sm font-semibold text-[#8D2F28]">{currentUser?.name ?? '选择成员'}</span>
        </span>
        {currentGroup ? <span className="hidden rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#A23A32] ring-1 ring-[#F0C9C4] sm:inline">{currentGroup.name}</span> : null}
        <ChevronDown className={cn('shrink-0 text-[#A23A32] transition', open && 'rotate-180')} size={16} />
      </button>

      {open ? (
        <MemberIdentityPopover
          currentUserId={currentUserId}
          groups={groups}
          onChange={(userId) => {
            onChange(userId);
            setOpen(false);
          }}
          users={users}
        />
      ) : null}
    </div>
  );
}

function MemberIdentityPopover({ currentUserId, groups, users, onChange }: { currentUserId: string; groups: Group[]; users: User[]; onChange: (userId: string) => void }) {
  const sections = useMemo(() => buildIdentitySections(groups, users), [groups, users]);

  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-full min-w-[300px] overflow-hidden rounded-xl border border-[#DDE3EA] bg-white shadow-[0_18px_46px_rgba(32,35,41,0.14)] sm:w-[520px]">
      <div className="max-h-[420px] overflow-y-auto p-3">
        {sections.length ? (
          <div className="grid gap-3">
            {sections.map((section) => (
              <IdentityGroupSection currentUserId={currentUserId} key={section.group.id} onChange={onChange} section={section} />
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-[#667085]">先在成员小组里添加成员。</div>
        )}
      </div>
    </div>
  );
}

type IdentitySection = {
  group: Group;
  users: Array<User & { initial: string }>;
  isBoss: boolean;
};

function IdentityGroupSection({ currentUserId, onChange, section }: { currentUserId: string; onChange: (userId: string) => void; section: IdentitySection }) {
  return (
    <section className={cn('rounded-xl p-2.5', section.isBoss ? 'bg-[#FFF7E8] ring-1 ring-[#E8C987]' : 'bg-[#F7F9FB]')}>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h3 className={cn('text-sm font-semibold', section.isBoss ? 'text-[#7A4D0B]' : 'text-[#344154]')}>{section.isBoss ? 'BOSS' : section.group.name}</h3>
        <span className={cn('font-mono text-xs tabular-nums', section.isBoss ? 'text-[#9A6B22]' : 'text-[#8191A6]')}>{section.users.length} 人</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {section.users.map((user) => {
          const selected = user.id === currentUserId;

          return (
            <button
              className={cn(
                'flex h-10 min-w-0 items-center gap-2 rounded-lg bg-white px-2.5 text-left text-sm font-medium text-[#202329] ring-1 ring-[#E4E9EF] transition hover:bg-[#EEF4FA]',
                section.isBoss && 'ring-[#E8D3A8] hover:bg-[#FFFDF7]',
                selected && (section.isBoss ? 'bg-[#FFECC2] ring-[#C88B20]' : 'bg-[#EAF5EF] ring-[#8FBAA4]'),
              )}
              key={user.id}
              onClick={() => onChange(user.id)}
              type="button"
            >
              <span className={cn('grid h-5 w-5 shrink-0 place-items-center rounded-md font-mono text-[11px] tabular-nums', section.isBoss ? 'bg-[#F3D69D] text-[#7A4D0B]' : 'bg-[#EEF2F6] text-[#667085]')}>
                {user.initial}
              </span>
              <span className="min-w-0 flex-1 truncate">{user.name}</span>
              {selected ? <Check className={cn('shrink-0', section.isBoss ? 'text-[#8A5A12]' : 'text-[#3F7A5F]')} size={15} /> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function buildIdentitySections(groups: Group[], users: User[]): IdentitySection[] {
  const collator = new Intl.Collator('zh-CN');
  const sortedGroups = [...groups].sort((a, b) => Number(isBossGroupName(b.name)) - Number(isBossGroupName(a.name)));

  return sortedGroups
    .map((group) => ({
      group,
      isBoss: isBossGroupName(group.name),
      users: users
        .filter((user) => user.groupId === group.id)
        .map((user) => ({ ...user, initial: getMemberInitial(user.name) }))
        .sort((a, b) => a.initial.localeCompare(b.initial) || collator.compare(a.name, b.name)),
    }))
    .filter((section) => section.users.length > 0);
}

function isBossGroupName(name: string): boolean {
  const normalized = name.replace(/\s/g, '').toLowerCase();
  return normalized === 'boss' || normalized === 'boss组' || normalized === 'boss小组';
}

function getMemberInitial(name: string): string {
  const first = name.trim().charAt(0);
  if (!first) {
    return '#';
  }

  if (/^[a-z]$/i.test(first)) {
    return first.toUpperCase();
  }

  if (chineseInitials[first]) {
    return chineseInitials[first];
  }

  for (let index = pinyinInitialRanges.length - 1; index >= 0; index -= 1) {
    const range = pinyinInitialRanges[index];
    if (first.localeCompare(range.start, 'zh-CN') >= 0) {
      return range.initial;
    }
  }

  return '#';
}

const pinyinInitialRanges = [
  { initial: 'A', start: '阿' },
  { initial: 'B', start: '八' },
  { initial: 'C', start: '嚓' },
  { initial: 'D', start: '咑' },
  { initial: 'E', start: '妸' },
  { initial: 'F', start: '发' },
  { initial: 'G', start: '旮' },
  { initial: 'H', start: '哈' },
  { initial: 'J', start: '丌' },
  { initial: 'K', start: '咔' },
  { initial: 'L', start: '垃' },
  { initial: 'M', start: '妈' },
  { initial: 'N', start: '拏' },
  { initial: 'O', start: '噢' },
  { initial: 'P', start: '妑' },
  { initial: 'Q', start: '七' },
  { initial: 'R', start: '呥' },
  { initial: 'S', start: '仨' },
  { initial: 'T', start: '他' },
  { initial: 'W', start: '哇' },
  { initial: 'X', start: '夕' },
  { initial: 'Y', start: '丫' },
  { initial: 'Z', start: '帀' },
];

const chineseInitials: Record<string, string> = {
  陈: 'C',
  林: 'L',
  李: 'L',
  刘: 'L',
  王: 'W',
  小: 'X',
  许: 'X',
  杨: 'Y',
  张: 'Z',
  周: 'Z',
  赵: 'Z',
};

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

function SiteSettingsPanel({ developerMode, model, onDeveloperTap }: { developerMode: boolean; model: BoardModel; onDeveloperTap: () => void }) {
  return (
    <div className="grid gap-4">
      <AccountPoolSummary model={model} onDeveloperTap={onDeveloperTap} />

      {developerMode ? <AccountEditorSection model={model} /> : null}
    </div>
  );
}

function ProjectsPanel({ developerMode, model }: { developerMode: boolean; model: BoardModel }) {
  const { projects } = model;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
      {developerMode ? <ProjectCreator onCreate={model.createProject} /> : null}
      {projects.length ? (
        <ul className="divide-y divide-[#EEF2F6]">
          {projects.map((p) => (
            <ProjectRow developerMode={developerMode} key={p} name={p} onDelete={model.deleteProject} onRename={model.renameProject} />
          ))}
        </ul>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-[#667085]">{developerMode ? '输入项目名后新增。' : '暂无项目。'}</div>
      )}
    </div>
  );
}

function ProjectRow({
  developerMode,
  name,
  onDelete,
  onRename,
}: {
  developerMode: boolean;
  name: string;
  onDelete: BoardModel['deleteProject'];
  onRename: BoardModel['renameProject'];
}) {
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setError('');
    setIsSaving(true);
    const result = await onRename(name, draft);
    setIsSaving(false);
    if (result.ok) {
      setIsEditing(false);
      return;
    }
    setError(result.reason);
  }

  async function handleDelete() {
    setError('');
    setIsSaving(true);
    const result = await onDelete(name);
    setIsSaving(false);
    if (!result.ok) {
      setError(result.reason);
    }
  }

  function handleCancel() {
    setDraft(name);
    setError('');
    setIsEditing(false);
  }

  if (!developerMode) {
    return (
      <li className="flex min-h-[52px] items-center gap-2 px-5 py-3">
        <span className="flex-1 text-sm text-[#344154]">{name}</span>
      </li>
    );
  }

  return (
    <li className="grid min-h-[60px] gap-2 px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
      <div className="grid gap-1.5">
        {isEditing ? (
          <Input aria-label="项目名" onChange={(event) => setDraft(event.target.value)} value={draft} />
        ) : (
          <span className="flex min-h-9 items-center text-sm text-[#344154]">{name}</span>
        )}
        {error ? <div className="text-sm text-[#B42318]">{error}</div> : null}
      </div>
      <div className="flex items-center gap-2">
        {isEditing ? (
          <>
            <Button disabled={isSaving} onClick={handleSave} size="sm" type="button" variant="primary">
              保存
            </Button>
            <Button disabled={isSaving} onClick={handleCancel} size="sm" type="button">
              取消
            </Button>
          </>
        ) : (
          <>
            <Button disabled={isSaving} onClick={() => setIsEditing(true)} size="sm" type="button">
              编辑
            </Button>
            <Button disabled={isSaving} onClick={handleDelete} size="sm" type="button" variant="ghost">
              删除
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function ProjectCreator({ onCreate }: { onCreate: BoardModel['createProject'] }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSaving(true);
    const result = await onCreate(name);
    setIsSaving(false);
    if (result.ok) {
      setName('');
      return;
    }
    setError(result.reason);
  }

  return (
    <form className="grid gap-2 border-b border-[#E6EAF0] bg-[#FCFDFE] px-5 py-4 sm:grid-cols-[minmax(0,1fr)_80px] sm:items-start" onSubmit={handleSubmit}>
      <div className="grid gap-1.5">
        <Input aria-label="项目名" onChange={(event) => setName(event.target.value)} placeholder="项目名" value={name} />
        {error ? <div className="text-sm text-[#B42318]">{error}</div> : null}
      </div>
      <Button disabled={isSaving} type="submit" variant="primary">
        新增
      </Button>
    </form>
  );
}

function AccountPoolSummary({ model, onDeveloperTap }: { model: BoardModel; onDeveloperTap: () => void }) {
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
        <ReadonlySetting label="账号总数" value={`${model.accounts.length} 个`} onClick={onDeveloperTap} />
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

function ReadonlySetting({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  const className = "rounded-xl bg-[#F7F9FB] p-4 text-left";

  if (onClick) {
    return (
      <button className={className} onClick={onClick} type="button">
        <span className="block text-sm text-[#667085]">{label}</span>
        <span className="mt-2 block font-mono text-xl font-semibold tabular-nums text-[#1E232B]">{value}</span>
      </button>
    );
  }

  return (
    <div className={className}>
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

  const concurrentLimit = getGroupConcurrentLimit(group.id, model.groups);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_64px_72px_72px_72px] items-center gap-4 px-5 py-3">
      <div className="grid min-w-0 grid-cols-[max-content_minmax(0,1fr)] items-start gap-x-3 gap-y-1">
        <span className="whitespace-nowrap font-medium leading-6 text-[#171A1F]">{group.name}</span>
        {members.length ? (
          <span className="min-w-0 whitespace-normal break-words text-sm leading-6 text-[#8191A6]">{members.map((m) => m.name).join('、')}</span>
        ) : (
          <span className="text-sm leading-6 text-[#C4CAD4]">添加成员</span>
        )}
      </div>
      <span className="text-right font-mono text-sm tabular-nums text-[#667085]">{members.length} 人</span>
      <span className="text-right font-mono text-sm tabular-nums text-[#667085]">{Number.isFinite(concurrentLimit) ? `${concurrentLimit} 个` : '不限'}</span>
      <span className="text-right font-mono text-sm tabular-nums text-[#667085]">占用 {activeBookings.length}</span>
      <span className="text-right font-mono text-sm tabular-nums text-[#667085]">预约 {nextBookings.length}</span>
    </div>
  );
}

function GroupEditorSection({ model }: { model: BoardModel }) {
  const [draft, setDraft] = useState({ name: '', concurrentLimit: defaultGroupConcurrentLimit, isActive: true });
  const [error, setError] = useState('');

  async function handleCreate() {
    const result = await model.createGroup(draft);
    if (!result.ok) {
      setError(result.reason);
      return;
    }
    setDraft({ name: '', concurrentLimit: defaultGroupConcurrentLimit, isActive: true });
    setError('');
  }

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)] lg:min-h-0">
      <div className="flex items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-5 py-4">
        <h2 className="text-base font-semibold text-[#171A1F]">小组编辑</h2>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{model.groups.length} 个小组</span>
      </div>
      <div className="grid shrink-0 gap-3 border-b border-[#EEF2F6] bg-[#FAFBFC] px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_100px]">
          <Field label="小组名称">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="同时使用">
            <Input
              min={1}
              onChange={(event) => setDraft({ ...draft, concurrentLimit: Number(event.target.value) })}
              type="number"
              value={draft.concurrentLimit}
            />
          </Field>
          <Button className="self-end" onClick={handleCreate} type="button" variant="primary">
            新增
          </Button>
        </div>
        {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{error}</div> : null}
      </div>
      <div className={groupEditorListClassName}>
        {model.groups.map((group) => (
          <GroupEditor group={group} key={group.id} onDelete={model.deleteGroup} onSave={model.updateGroup} />
        ))}
      </div>
    </section>
  );
}

function GroupEditor({ group, onDelete, onSave }: { group: Group; onDelete: BoardModel['deleteGroup']; onSave: BoardModel['updateGroup'] }) {
  const isBoss = !Number.isFinite(getGroupConcurrentLimit(group.id, [group]));
  const [draft, setDraft] = useState({ name: group.name, concurrentLimit: group.concurrentLimit ?? defaultGroupConcurrentLimit, isActive: group.isActive !== false });
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft({ name: group.name, concurrentLimit: group.concurrentLimit ?? defaultGroupConcurrentLimit, isActive: group.isActive !== false });
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
    <article className={groupEditorRowClassName}>
      <Input value={draft.name} onBlur={handleSave} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <Input
        disabled={isBoss}
        min={1}
        onBlur={handleSave}
        onChange={(event) => setDraft({ ...draft, concurrentLimit: Number(event.target.value) })}
        type="number"
        value={isBoss ? '' : draft.concurrentLimit}
      />
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
      {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36] sm:col-span-4">{error}</div> : null}
    </article>
  );
}

function MemberEditorSection({ model }: { model: BoardModel }) {
  const defaultGroupId = model.activeGroups[0]?.id ?? model.groups[0]?.id ?? '';
  const [draft, setDraft] = useState({ name: '', groupId: defaultGroupId, isActive: true });
  const [error, setError] = useState('');
  const nameCount = draft.name.split(/\r?\n/).map((name) => name.trim()).filter(Boolean).length;

  useEffect(() => {
    setDraft((current) => (current.groupId ? current : { ...current, groupId: defaultGroupId }));
  }, [defaultGroupId]);

  async function handleCreate() {
    const result = await model.createUsersFromText(draft.name, draft.groupId);
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
      <div className="grid shrink-0 gap-3 border-b border-[#EEF2F6] bg-[#FAFBFC] px-5 py-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_80px]">
          <Field label="姓名">
            <textarea
              className="min-h-10 max-h-[104px] w-full resize-y rounded-md border border-[#DDE1E7] bg-white px-3 py-2 text-sm leading-5 text-[#24272D] outline-none transition focus:border-[#AEB7C4] focus:ring-3 focus:ring-[#2F6BFF]/10"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="可粘贴多行姓名"
              rows={1}
              value={draft.name}
            />
          </Field>
          <Field label="小组">
            <GroupSelect groups={model.activeGroups} value={draft.groupId} onChange={(groupId) => setDraft({ ...draft, groupId })} />
          </Field>
          <Button className="self-end" onClick={handleCreate} type="button" variant="primary">
            {nameCount > 1 ? '导入' : '新增'}
          </Button>
        </div>
        {error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{error}</div> : null}
      </div>
      <div className={memberEditorListClassName}>
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
    <article className={memberEditorRowClassName}>
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
