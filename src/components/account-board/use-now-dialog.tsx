import { type FormEvent } from 'react';
import { type Account, type Group, type User } from '../../lib/runway-board';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { Field, Input, Select } from '../ui/field';
import { type UseNowFormState } from '../../hooks/useAccountsViewModel';

type UseNowDialogProps = {
  form: UseNowFormState;
  account: Account | undefined;
  currentUser: User;
  groups: Group[];
  onChange: (next: Partial<UseNowFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function UseNowDialog({ form, account, currentUser, groups, onChange, onClose, onSubmit }: UseNowDialogProps) {
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
            <Input readOnly value={currentUser.name} />
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
            <Input onChange={(event) => onChange({ startTime: event.target.value })} type="datetime-local" value={form.startTime} />
          </Field>
          <Field label="结束时间">
            <Input onChange={(event) => onChange({ endTime: event.target.value })} required type="datetime-local" value={form.endTime} />
          </Field>
        </div>
        {form.error ? <div className="rounded-lg border border-[#E5C1BD] bg-[#FCEDEA] px-3 py-2 text-sm text-[#8D3F36]">{form.error}</div> : null}
      </Dialog>
    </form>
  );
}
