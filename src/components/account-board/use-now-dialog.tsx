import { type FormEvent } from 'react';
import { addHours, toLocalInputValue } from '../../lib/runway-board';
import { type Account, type Group, type User } from '../../lib/runway-board';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Select } from '../ui/field';
import { type UseNowFormState } from '../../hooks/useAccountsViewModel';

const DURATION_OPTIONS = [
  { label: '30 分钟', value: 0.5 },
  { label: '1 小时', value: 1 },
  { label: '2 小时', value: 2 },
  { label: '3 小时', value: 3 },
  { label: '4 小时', value: 4 },
  { label: '6 小时', value: 6 },
  { label: '8 小时', value: 8 },
  { label: '12 小时', value: 12 },
  { label: '24 小时', value: 24 },
];

function getDurationHours(startTime: string, endTime: string): number {
  const diff = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3_600_000;
  const match = DURATION_OPTIONS.find((opt) => Math.abs(opt.value - diff) < 0.01);
  return match ? match.value : 2;
}

type UseNowDialogProps = {
  form: UseNowFormState;
  account: Account | undefined;
  users: User[];
  groups: Group[];
  onChange: (next: Partial<UseNowFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function UseNowDialog({ form, account, users, groups, onChange, onClose, onSubmit }: UseNowDialogProps) {
  const durationHours = getDurationHours(form.startTime, form.endTime);

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
        title="立即使用"
      >
        <Field label="账号邮箱">
          <Input readOnly value={account?.email ?? ''} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="使用人">
            <Select onChange={(event) => onChange({ userId: event.target.value })} value={form.userId}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="小组">
            <Select onChange={(event) => onChange({ groupId: event.target.value })} value={form.groupId}>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="项目">
            <Input autoFocus onChange={(event) => onChange({ projectName: event.target.value })} value={form.projectName} />
          </Field>
          <Field label="使用时长">
            <Select onChange={(event) => handleDurationChange(Number(event.target.value))} value={String(durationHours)}>
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {form.error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{form.error}</div> : null}
      </Dialog>
    </form>
  );
}
