import { CalendarPlus, Copy, Play, Square } from 'lucide-react';
import { canManageFutureBooking, formatBookingRange, type AccountRow, type Booking } from '../../lib/runway-board';
import { Button } from '../ui/button';
import { StatusBadge } from './status-badge';

type AccountTableProps = {
  rows: AccountRow[];
  now: Date;
  currentUserId: string;
  onUseNow: (accountId: string) => void;
  onReserve: (accountId: string) => void;
  onEditBooking: (booking: Booking) => void;
  onCancelBooking: (booking: Booking) => void;
  onCopyEmail: (email: string) => void;
  onCopyPassword: (password: string) => void;
  onRelease: (row: AccountRow) => void;
};

export function AccountTable({ rows, now, currentUserId, onUseNow, onReserve, onEditBooking, onCancelBooking, onCopyEmail, onCopyPassword, onRelease }: AccountTableProps) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)] lg:min-h-0 lg:flex-1">
      <div className="flex shrink-0 items-center justify-between border-b border-[#E6EAF0] bg-[#FCFDFE] px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-[#171A1F]">账号池</h2>
        </div>
        <span className="font-mono text-sm tabular-nums text-[#667085]">{rows.length} 个账号</span>
      </div>

      <div className="xl:hidden">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-[#667080]">调整筛选条件。</div>
        ) : (
          <div className="divide-y divide-[#EEF2F6]">
            {rows.map((row) => (
              <AccountCard
                key={row.account.id}
                now={now}
                onCopyEmail={onCopyEmail}
                onCopyPassword={onCopyPassword}
                onCancelBooking={onCancelBooking}
                onEditBooking={onEditBooking}
                onRelease={onRelease}
                onReserve={onReserve}
                onUseNow={onUseNow}
                currentUserId={currentUserId}
                row={row}
              />
            ))}
          </div>
        )}
      </div>

      <div className="hidden min-h-0 flex-1 overflow-y-auto overflow-x-hidden xl:block">
        <table className="w-full table-fixed border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[#E7EAF0] bg-[#F7F9FB] text-[13px] font-semibold text-[#667085]">
              <th className="w-[34%] px-3 py-3">账号</th>
              <th className="w-[72px] px-2 py-3 text-center">密码</th>
              <th className="w-[15%] px-2 py-3">状态</th>
              <th className="w-[17%] px-2 py-3">当前使用</th>
              <th className="w-[18%] px-2 py-3">下一预约</th>
              <th className="w-[128px] px-2 py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="group h-[72px] border-b border-[#EEF2F6] last:border-0 hover:bg-[#FAFBFC]" key={row.account.id}>
                <td className="relative h-[72px] overflow-hidden px-3 py-0">
                  <span className={`absolute left-0 top-[13px] h-[42px] w-[3px] rounded-r-full ${getAccountAccentClass(row)}`} />
                  <button
                    className="flex h-full w-full max-w-full min-w-0 items-center gap-3 rounded-lg px-1 text-left transition hover:bg-[#EEF4FA]"
                    onClick={() => onCopyEmail(row.account.email)}
                    type="button"
                  >
                    <span className="grid h-9 w-11 shrink-0 place-items-center rounded-lg border border-[#DDE3EA] bg-[#F7F9FB] font-mono text-sm font-semibold tabular-nums text-[#344154]">
                      {row.account.label}
                    </span>
                    <span className="min-w-0 truncate font-medium text-[#202329]">{row.account.email}</span>
                  </button>
                </td>
                <td className="h-[72px] px-2 py-0 text-center align-middle">
                  <Button
                    aria-label="复制密码"
                    disabled={!row.account.password}
                    onClick={() => row.account.password && onCopyPassword(row.account.password)}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <Copy size={14} />
                  </Button>
                </td>
                <td className="h-[72px] overflow-hidden px-2 py-0 align-middle">
                  <StatusBadge now={now} row={row} />
                </td>
                <td className="h-[72px] overflow-hidden px-2 py-0 align-middle">
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
                <td className="h-[72px] overflow-hidden px-2 py-0 align-middle">
                  {row.next ? (
                    <NextBookingSummary
                      booking={row.next}
                      currentUserId={currentUserId}
                      now={now}
                      onCancelBooking={onCancelBooking}
                      onEditBooking={onEditBooking}
                    />
                  ) : (
                    <span className="text-sm text-[#8A93A3]">暂无预约</span>
                  )}
                </td>
                <td className="h-[72px] px-2 py-0 align-middle">
                  <div className="flex justify-end gap-1.5 whitespace-nowrap opacity-90 transition group-hover:opacity-100">
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

function AccountCard({ row, now, currentUserId, onUseNow, onReserve, onEditBooking, onCancelBooking, onCopyEmail, onCopyPassword, onRelease }: {
  row: AccountRow;
  now: Date;
  currentUserId: string;
  onUseNow: (accountId: string) => void;
  onReserve: (accountId: string) => void;
  onEditBooking: (booking: Booking) => void;
  onCancelBooking: (booking: Booking) => void;
  onCopyEmail: (email: string) => void;
  onCopyPassword: (password: string) => void;
  onRelease: (row: AccountRow) => void;
}) {
  const isInUse = row.runtime.kind === 'in_use';
  return (
    <div className="relative px-4 py-4">
      <span className={`absolute left-0 top-4 h-10 w-[3px] rounded-r-full ${getAccountAccentClass(row)}`} />
      <div className="mb-3 grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
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
        <Button
          className="h-9 shrink-0 gap-1.5 px-2.5"
          aria-label="复制密码"
          disabled={!row.account.password}
          onClick={() => row.account.password && onCopyPassword(row.account.password)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Copy size={13} />
          <span>密码</span>
        </Button>
      </div>
      <div className="mb-3">
        <StatusBadge now={now} row={row} />
      </div>

      {row.current ? (
        <div className="mb-3 rounded-lg bg-[#EEF4FF] px-3 py-2 text-sm">
          <span className="font-medium text-[#202329]">{row.current.user?.name ?? '未知成员'}</span>
          <span className="text-[#667085]"> · {row.current.group?.name ?? '未知小组'}</span>
          {row.current.projectName ? <span className="text-[#667085]"> · {row.current.projectName}</span> : null}
        </div>
      ) : row.next ? (
        <div className="mb-3 rounded-lg bg-[#F5F7FA] px-3 py-2 text-sm text-[#667085]">
          <NextBookingSummary
            booking={row.next}
            currentUserId={currentUserId}
            now={now}
            onCancelBooking={onCancelBooking}
            onEditBooking={onEditBooking}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
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
      </div>
    </div>
  );
}

function NextBookingSummary({
  booking,
  currentUserId,
  now,
  onEditBooking,
  onCancelBooking,
}: {
  booking: NonNullable<AccountRow['next']>;
  currentUserId: string;
  now: Date;
  onEditBooking: (booking: Booking) => void;
  onCancelBooking: (booking: Booking) => void;
}) {
  const canManage = canManageFutureBooking(booking, currentUserId, now);

  return (
    <div className="grid min-w-0 gap-1">
      <span className="truncate font-mono text-sm tabular-nums text-[#344154]">{formatBookingRange(booking.startTime, booking.endTime, now)}</span>
      <span className="min-w-0 truncate text-sm text-[#667085]">
        {booking.user?.name ?? '未知成员'} · {booking.projectName}
      </span>
      {canManage ? (
        <span className="flex min-w-0 items-center gap-1">
          <Button className="h-6 px-1.5 text-xs" onClick={() => onEditBooking(booking)} size="sm" type="button" variant="ghost">
            改期
          </Button>
          <Button className="h-6 px-1.5 text-xs" onClick={() => onCancelBooking(booking)} size="sm" type="button" variant="ghost">
            取消
          </Button>
        </span>
      ) : null}
    </div>
  );
}

function getAccountAccentClass(row: AccountRow): string {
  if (row.runtime.kind === 'in_use') {
    return 'bg-[#86A9D6]';
  }

  return 'bg-[#A7CBB5]';
}
