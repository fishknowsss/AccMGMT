import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { addHours, toLocalInputValue } from '../../lib/runway-board';
import { type Account, type Group, type User } from '../../lib/runway-board';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Select } from '../ui/field';
import { DurationStepper } from '../ui/duration-stepper';
import { type UseNowFormState } from '../../hooks/useAccountsViewModel';

function computeDuration(startTime: string, endTime: string): number {
  const diff = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3_600_000;
  return Math.max(0.5, Math.min(8, Math.round(diff * 2) / 2));
}

type UseNowDialogProps = {
  form: UseNowFormState;
  account: Account | undefined;
  users: User[];
  groups: Group[];
  projects: string[];
  onChange: (next: Partial<UseNowFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function UseNowDialog({ form, account, users, groups, projects, onChange, onClose, onSubmit }: UseNowDialogProps) {
  const durationHours = computeDuration(form.startTime, form.endTime);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState({ left: 0, top: 0, width: 0, maxHeight: 160 });

  useLayoutEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function updatePickerPosition() {
      const rect = pickerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportGap = 20;
      const availableBelow = window.innerHeight - rect.bottom - 84;
      const availableAbove = rect.top - viewportGap;
      const openUpward = availableBelow < 160 && availableAbove > availableBelow;
      const maxHeight = Math.max(120, Math.min(320, openUpward ? availableAbove : availableBelow));

      setPickerStyle({
        left: rect.left,
        top: openUpward ? rect.top - maxHeight - 4 : rect.bottom + 4,
        width: rect.width,
        maxHeight,
      });
    }

    updatePickerPosition();
    window.addEventListener('resize', updatePickerPosition);
    window.addEventListener('scroll', updatePickerPosition, true);
    return () => {
      window.removeEventListener('resize', updatePickerPosition);
      window.removeEventListener('scroll', updatePickerPosition, true);
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if ((event.target as Element).closest('[data-use-now-project-picker]')) {
        return;
      }
      setPickerOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [pickerOpen]);

  function handleDurationChange(hours: number) {
    const newEnd = toLocalInputValue(addHours(new Date(form.startTime), hours));
    onChange({ endTime: newEnd });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Dialog
        footer={
          <>
            <Button onClick={onClose} type="button" variant="ghost">
              取消
            </Button>
            <Button type="submit" variant="primary">
              开始使用
            </Button>
          </>
        }
        onClose={onClose}
        bodyClassName="sm:overflow-visible"
        title="立即使用"
      >
        <Field label="账号邮箱">
          <Input readOnly value={account?.email ?? ''} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="小组">
            <Select
              onChange={(event) => {
                const groupId = event.target.value;
                const firstUser = users.find((u) => u.groupId === groupId);
                onChange({ groupId, ...(firstUser ? { userId: firstUser.id } : {}) });
              }}
              value={form.groupId}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="使用人">
            <Select onChange={(event) => onChange({ userId: event.target.value })} value={form.userId}>
              {users
                .filter((u) => u.groupId === form.groupId)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="项目">
            <div className="relative" data-use-now-project-picker ref={pickerRef}>
              <div className="flex">
                <Input
                  autoFocus
                  className={projects.length > 0 ? 'flex-1 rounded-r-none' : 'flex-1'}
                  onChange={(event) => {
                    onChange({ projectName: event.target.value });
                    setPickerOpen(false);
                  }}
                  value={form.projectName}
                />
                {projects.length > 0 ? (
                  <button
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-[#DDE1E7] bg-white text-[#667085] transition hover:bg-[#F5F7FA]"
                    onClick={() => setPickerOpen((v) => !v)}
                    aria-label="选择项目"
                    type="button"
                  >
                    <ChevronDown size={13} className={pickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                ) : null}
              </div>
              {pickerOpen
                ? createPortal(
                    <ul
                      className="fixed z-[60] overflow-y-auto rounded-lg border border-[#DDE3EA] bg-white py-1 shadow-[0_14px_34px_rgba(25,27,31,0.16)]"
                      data-use-now-project-picker
                      style={{
                        left: pickerStyle.left,
                        maxHeight: pickerStyle.maxHeight,
                        top: pickerStyle.top,
                        width: pickerStyle.width,
                      }}
                    >
                  {projects.map((p) => (
                    <li key={p}>
                      <button
                        className="w-full px-3 py-2 text-left text-sm text-[#202329] hover:bg-[#F5F7FA]"
                        onClick={() => {
                          onChange({ projectName: p });
                          setPickerOpen(false);
                        }}
                        type="button"
                      >
                        {p}
                      </button>
                    </li>
                  ))}
                    </ul>,
                    document.body,
                  )
                : null}
            </div>
          </Field>
          <Field label="使用时长">
            <DurationStepper onChange={handleDurationChange} value={durationHours} />
          </Field>
        </div>
        {form.error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{form.error}</div> : null}
      </Dialog>
    </form>
  );
}
