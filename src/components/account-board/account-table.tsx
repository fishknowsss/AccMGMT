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
  onCopyEmail: (email: string) => void;
  onRelease: (row: AccountRow) => void;
};

export function AccountTable({ rows, now, onUseNow, onReserve, onCopyEmail, onRelease }: AccountTableProps) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)] lg:min-h-0 lg:flex-1">
      <div className="flex shrink-0 items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#171A1F]">账号池</h2>
        </div>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{rows.length} 个账号</span>
      </div>

      {/* 移动端：卡片列表 */}
      <div className="lg:hidden overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#667080]">调整筛选条件。</div>
        ) : (
          <div className="divide-y divide-[#EEF2F6]">
            {rows.map((row) => (
              <AccountCard
                key={row.account.id}
                now={now}
                onCopyEmail={onCopyEmail}
                onRelease={onRelease}
                onReserve={onReserve}
                onUseNow={onUseNow}
                row={row}
              />
            ))}
          </div>
        )}
      </div>

      {/* 桌面端：表格 */}
      <div className="hidden min-h-0 flex-1 overflow-auto lg:block">
        <table className="w-full min-w-[1180px] border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#E7EAF0] bg-[#F7F9FB] text-[13px] font-semibold text-[#667085]">
              <th className="w-[340px] px-4 py-3">账号</th>
              <th className="w-[245px] px-4 py-3">状态</th>
              <th className="w-[180px] px-4 py-3">当前使用</th>
              <th className="w-[190px] px-4 py-3">下一预约</th>
              <th className="w-[135px] px-4 py-3">续费日期</th>
              <th className="w-[170px] px-4 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="group h-[68px] border-b border-[#EEF2F6] last:border-0 hover:bg-[#FAFBFC]" key={row.account.id}>
                <td className="relative h-[68px] px-4 py-0">
                  <span className={`absolute left-0 top-[13px] h-[42px] w-[3px] rounded-r-full ${getAccountAccentClass(row)}`} />
                  <button
                    className="flex h-full min-w-0 items-center gap-3 rounded-lg px-1 text-left transition hover:bg-[#EEF4FA]"
                    onClick={() => onCopyEmail(row.account.email)}
                    type="button"
                  >
                    <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg border border-[#DDE3EA] bg-[#F7F9FB] font-mono text-sm font-semibold tabular-nums text-[#344154]">
                      {row.account.label}
                    </span>
                    <span className="min-w-0 truncate font-medium text-[#202329]">{row.account.email}</span>
                  </button>
                </td>
                <td className="h-[68px] px-4 py-0 align-middle">
                  <StatusBadge now={now} row={row} />
                </td>
                <td className="h-[68px] px-4 py-0 align-middle">
                  {row.current ? (
                    <div className="grid min-w-0 gap-1">
                      <span className="truncate font-medium text-[#202329]">{row.current.user?.name ?? '未知成员'}</span>
                      <span className="truncate text-sm text-[#667085]">
                        {row.current.group?.name ?? '未知小组'} · {row.current.projectName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[#8A93A3]">暂无占用</span>
                  )}
                </td>
                <td className="h-[68px] px-4 py-0 align-middle">
                  {row.next ? (
                    <div className="grid min-w-0 gap-1">
                      <span className="truncate font-mono text-sm tabular-nums text-[#344154]">{formatBookingRange(row.next.startTime, row.next.endTime, now)}</span>
                      <span className="truncate text-sm text-[#667085]">
                        {row.next.user?.name ?? '未知成员'} · {row.next.projectName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-[#8A93A3]">暂无预约</span>
                  )}
                </td>
                <td className="h-[68px] px-4 py-0 align-middle">
                  <RenewalBadge date={row.account.renewalDate} state={row.renewalState} />
                </td>
                <td className="h-[68px] px-4 py-0 align-middle">
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

function AccountCard({ row, now, onUseNow, onReserve, onCopyEmail, onRelease }: {
  row: AccountRow;
  now: Date;
  onUseNow: (accountId: string) => void;
  onReserve: (accountId: string) => void;
  onCopyEmail: (email: string) => void;
  onRelease: (row: AccountRow) => void;
}) {
  const isInUse = row.runtime.kind === 'in_use';
  return (
    <div className="relative px-4 py-4">
      <span className={`absolute left-0 top-4 h-10 w-[3px] rounded-r-full ${getAccountAccentClass(row)}`} />
      {/* 顶部行：编号 + 邮箱 + 状态 */}
      <div className="mb-3 flex min-w-0 items-center gap-3">
        <span className="grid h-8 w-11 shrink-0 place-items-center rounded-lg border border-[#DDE3EA] bg-[#F7F9FB] font-mono text-xs font-semibold tabular-nums text-[#344154]">
          {row.account.label}
        </span>
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => onCopyEmail(row.account.email)}
          type="button"
        >
          <span className="block truncate text-[15px] font-medium text-[#202329]">{row.account.email}</span>
        </button>
        <StatusBadge now={now} row={row} />
      </div>

      {/* 当前使用信息 */}
      {row.current ? (
        <div className="mb-3 rounded-lg bg-[#EEF4FF] px-3 py-2 text-sm">
          <span className="font-medium text-[#202329]">{row.current.user?.name ?? '未知成员'}</span>
          <span className="text-[#667085]"> · {row.current.group?.name ?? '未知小组'}</span>
          {row.current.projectName ? <span className="text-[#667085]"> · {row.current.projectName}</span> : null}
        </div>
      ) : row.next ? (
        <div className="mb-3 rounded-lg bg-[#F5F7FA] px-3 py-2 text-sm text-[#667085]">
          <span className="font-mono tabular-nums">{formatBookingRange(row.next.startTime, row.next.endTime, now)}</span>
          <span> · {row.next.user?.name ?? '未知成员'}{row.next.projectName ? ` · ${row.next.projectName}` : ''}</span>
        </div>
      ) : null}

      {/* 操作按钮行 */}
      <div className="flex items-center gap-2">
        {isInUse ? (
          <Button disabled={!row.canRelease || !row.current} onClick={() => onRelease(row)} size="sm" type="button" variant="subtle">
            <Square size={13} />
            结束
          </Button>
        ) : (
          <Button onClick={() => onUseNow(row.account.id)} size="sm" type="button" variant="subtle">
            <Play size={13} />
            使用
          </Button>
        )}
        <Button onClick={() => onReserve(row.account.id)} size="sm" type="button" variant="secondary">
          <CalendarPlus size={13} />
          预约
        </Button>
        <div className="ml-auto">
          <RenewalBadge date={row.account.renewalDate} state={row.renewalState} />
        </div>
      </div>
    </div>
  );
}

function getAccountAccentClass(row: AccountRow): string {
  if (row.runtime.kind === 'in_use') {
    return 'bg-[#86A9D6]';
  }

  return 'bg-[#A7CBB5]';
}
