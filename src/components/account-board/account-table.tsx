import { CalendarPlus, Play, Square } from 'lucide-react';
import { formatBookingRange, type AccountRow } from '../../lib/runway-board';
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
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
      <div className="flex shrink-0 items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#171A1F]">Runway 账号</h2>
        </div>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{rows.length} 个账号</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#E7EAF0] bg-[#F7F9FB] text-[13px] font-semibold text-[#667085]">
              <th className="w-[340px] px-4 py-3">账号</th>
              <th className="w-[175px] px-4 py-3">状态</th>
              <th className="w-[180px] px-4 py-3">当前使用</th>
              <th className="w-[190px] px-4 py-3">下一预约</th>
              <th className="w-[135px] px-4 py-3">续费日期</th>
              <th className="w-[170px] px-4 py-3 text-right">操作</th>
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
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg border border-[#DDE3EA] bg-[#F7F9FB] font-mono text-sm font-semibold tabular-nums text-[#344154]">
                      {row.account.label}
                    </span>
                    <span className="min-w-0 truncate font-medium text-[#202329]">{row.account.email}</span>
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
                    <span className="text-sm text-[#8A93A3]">暂无占用</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.next ? (
                    <div className="grid gap-1">
                      <span className="font-mono text-sm tabular-nums text-[#344154]">{formatBookingRange(row.next.startTime, row.next.endTime, now)}</span>
                      <span className="text-sm text-[#667085]">
                        {row.next.user?.name ?? '未知成员'} · {row.next.projectName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[#8A93A3]">暂无预约</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <RenewalBadge date={row.account.renewalDate} state={row.renewalState} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2 whitespace-nowrap opacity-90 transition group-hover:opacity-100">
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
                <td className="h-28 px-4 text-center text-sm text-[#667080]" colSpan={6}>
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
