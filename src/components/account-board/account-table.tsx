import { CalendarPlus, Play, Square } from 'lucide-react';
import { type AccountRow } from '../../lib/runway-board';
import { Button } from '../ui/button';
import { RenewalBadge } from './renewal-badge';
import { StatusBadge } from './status-badge';

type AccountTableProps = {
  rows: AccountRow[];
  now: Date;
  onUseNow: (accountId: string) => void;
  onReserve: (accountId: string) => void;
  onRelease: (row: AccountRow) => void;
};

export function AccountTable({ rows, now, onUseNow, onReserve, onRelease }: AccountTableProps) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[#DDE3EA] bg-white shadow-[0_18px_44px_rgba(52,64,84,0.07)]">
      <div className="flex items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#171A1F]">账号池名称</h2>
        </div>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{rows.length} 个账号</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[#E7EAF0] bg-[#F7F9FB] text-[13px] font-semibold text-[#667085]">
              <th className="w-[285px] px-4 py-3">账号</th>
              <th className="w-[210px] px-4 py-3">占用状态</th>
              <th className="w-[190px] px-4 py-3">使用信息</th>
              <th className="w-[150px] px-4 py-3">续费日期</th>
              <th className="w-[210px] px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="group h-[68px] border-b border-[#EEF2F6] last:border-0 hover:bg-[#FAFBFC]" key={row.account.id}>
                <td className="relative px-4 py-3">
                  <span
                    className={
                      row.runtime.kind === 'in_use'
                        ? 'absolute left-0 top-3 h-[42px] w-[3px] rounded-r-full bg-[#86A9D6]'
                        : row.next
                          ? 'absolute left-0 top-3 h-[42px] w-[3px] rounded-r-full bg-[#D8B45F]'
                          : 'absolute left-0 top-3 h-[42px] w-[3px] rounded-r-full bg-[#A7CBB5]'
                    }
                  />
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-12 place-items-center rounded-lg border border-[#DDE3EA] bg-[#F7F9FB] font-mono text-sm font-semibold tabular-nums text-[#344154]">
                      {row.account.label}
                    </span>
                    <span className="font-medium text-[#202329]">{row.account.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge now={now} row={row} />
                </td>
                <td className="px-4 py-3">
                  {row.current ? (
                    <div className="grid gap-1">
                      <span className="font-medium text-[#202329]">{row.current.user?.name ?? '未知成员'}</span>
                      <span className="text-sm text-[#667085]">
                        {row.current.group?.name ?? '未知小组'} · {row.current.projectName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[#8A93A3]">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RenewalBadge date={row.account.renewalDate} state={row.renewalState} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 opacity-90 transition group-hover:opacity-100">
                    {row.runtime.kind === 'in_use' ? (
                      <Button disabled={!row.canRelease || !row.current} onClick={() => onRelease(row)} size="sm" type="button" variant="subtle">
                        <Square size={14} />
                        结束
                      </Button>
                    ) : (
                      <Button onClick={() => onUseNow(row.account.id)} size="sm" type="button" variant="subtle">
                        <Play size={14} />
                        使用
                      </Button>
                    )}
                    <Button onClick={() => onReserve(row.account.id)} size="sm" type="button" variant="secondary">
                      <CalendarPlus size={14} />
                      预约
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="h-28 px-4 text-center text-sm text-[#667080]" colSpan={5}>
                  调整筛选条件。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
