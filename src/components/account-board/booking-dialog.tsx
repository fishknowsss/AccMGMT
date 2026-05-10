import { type FormEvent } from 'react';
import { addHours, toLocalInputValue } from '../../lib/runway-board';
import { type Account, type Group, type User } from '../../lib/runway-board';
import { type BookingFormState } from '../../hooks/useAccountsViewModel';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Select } from '../ui/field';
import { DurationStepper } from '../ui/duration-stepper';

function computeDuration(startTime: string, endTime: string): number {
  const diff = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3_600_000;
  return Math.max(0.5, Math.min(24, Math.round(diff * 2) / 2));
}

type BookingDialogProps = {
  form: BookingFormState;
  account: Account | undefined;
  users: User[];
  groups: Group[];
  onChange: (next: Partial<BookingFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function BookingDialog({ form, account, users, groups, onChange, onClose, onSubmit }: BookingDialogProps) {
  const durationHours = computeDuration(form.startTime, form.endTime);

  function handleStartTimeChange(startTime: string) {
    const newEnd = toLocalInputValue(addHours(new Date(startTime), durationHours));
    onChange({ startTime, endTime: newEnd });
  }

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
              保存
            </Button>
          </>
        }
        onClose={onClose}
        title="预约账号"
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
        <Field label="项目">
          <Input autoFocus onChange={(event) => onChange({ projectName: event.target.value })} value={form.projectName} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="开始时间">
            <Input onChange={(event) => handleStartTimeChange(event.target.value)} required type="datetime-local" value={form.startTime} />
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
