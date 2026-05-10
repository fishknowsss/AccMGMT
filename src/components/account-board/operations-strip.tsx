import { Activity, CalendarCheck, CircleCheck, Clock3, RefreshCcw } from 'lucide-react';
import { getOccupancyPercent } from '../../lib/board-navigation';
import { type AccountsView } from '../../lib/runway-board';

type OperationsStripProps = {
  stats: AccountsView['stats'];
};

export function OperationsStrip({ stats }: OperationsStripProps) {
  const occupancy = getOccupancyPercent(stats);
  const idlePercent = 100 - occupancy;

  return (
    <section className="shrink-0 overflow-hidden rounded-2xl border border-[#DDE3EA] bg-[#FCFDFE] shadow-[0_10px_26px_rgba(52,64,84,0.05)]" aria-label="账号概览">
      <div className="grid gap-0 lg:grid-cols-[minmax(360px,1fr)_minmax(520px,1.2fr)]">
        <div className="border-b border-[#E6EAF0] px-4 py-3 lg:border-b-0 lg:border-r">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#E8EDF3] text-[#344154]">
                <Activity size={16} />
              </span>
              <h2 className="text-base font-semibold text-[#171A1F]">当前占用</h2>
            </div>
            <strong className="font-mono text-[26px] font-semibold leading-none tabular-nums text-[#171A1F]">{occupancy}%</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E8EDF3]">
            <div className="flex h-full w-full">
              <span className="h-full bg-[#86A9D6]" style={{ width: `${occupancy}%` }} />
              <span className="h-full bg-[#A7CBB5]" style={{ width: `${idlePercent}%` }} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-[#4F5968]">
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full bg-[#86A9D6]" />
              使用中 {stats.inUse}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full bg-[#A7CBB5]" />
              空闲 {stats.idle}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-[#E6EAF0] sm:grid-cols-4 sm:divide-y-0">
          <Metric icon={CircleCheck} label="空闲账号" value={stats.idle} />
          <Metric icon={Clock3} label="使用中" value={stats.inUse} />
          <Metric icon={CalendarCheck} label="今日预约" value={stats.todayBookings} />
          <Metric icon={RefreshCcw} label="7天内续费" value={stats.renewalSoon} />
        </div>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CircleCheck; label: string; value: number }) {
  return (
    <article className="min-h-[82px] bg-white/60 px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-[#667085]">{label}</span>
        <Icon className="text-[#7A8595]" size={15} />
      </div>
      <strong className="font-mono text-[26px] font-semibold leading-none tabular-nums text-[#1E232B]">{value}</strong>
    </article>
  );
}
