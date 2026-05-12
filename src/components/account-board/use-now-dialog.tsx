import { type FormEvent } from 'react';
import { addHours, toLocalInputValue } from '../../lib/runway-board';
import { type Account, type Group, type User } from '../../lib/runway-board';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Select } from '../ui/field';
import { DurationStepper } from '../ui/duration-stepper';
import { ProjectPicker } from './project-picker';
import { type UseNowFormState } from '../../hooks/useAccountsViewModel';

function computeDuration(startTime: string, endTime: string): number {
  const diff = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 3_600_000;
  return Math.max(0.5, Math.min(8, Math.round(diff * 2) / 2));
}

type UseNowDialogProps = {
  form: UseNowFormState;
  account: Account | undefined;
  accountOptions: Account[];
  users: User[];
  groups: Group[];
  projects: string[];
  onChange: (next: Partial<UseNowFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function UseNowDialog({ form, account, accountOptions, users, groups, projects, onChange, onClose, onSubmit }: UseNowDialogProps) {
  const durationHours = computeDuration(form.startTime, form.endTime);
  const selectedUser = users.find((user) => user.id === form.userId);
  const selectedGroup = groups.find((group) => group.id === form.groupId);

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
          {accountOptions.length > 1 ? (
            <Select onChange={(event) => onChange({ accountId: event.target.value })} value={form.accountId}>
              {accountOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} / {item.email}
                </option>
              ))}
            </Select>
          ) : (
            <Input readOnly value={account?.email ?? ''} />
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="小组">
            <Input readOnly value={selectedGroup?.name ?? ''} />
          </Field>
          <Field label="使用人">
            <Input readOnly value={selectedUser?.name ?? ''} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="项目">
            <ProjectPicker autoFocus onChange={(projectName) => onChange({ projectName })} projects={projects} value={form.projectName} />
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
