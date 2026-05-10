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
    <section className="overflow-hidden rounded-[18px] border border-[#DDE3EA] bg-[#FCFDFE] shadow-[0_18px_44px_rgba(52,64,84,0.07)]" aria-label="账号概览">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="border-b border-[#E6EAF0] p-5 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#E8EDF3] text-[#344154]">
                <Activity size={17} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#171A1F]">当前占用</h2>
                <p className="mt-0.5 text-sm text-[#667085]">Unlimited 账号池</p>
              </div>
            </div>
            <strong className="font-mono text-3xl font-semibold tabular-nums text-[#171A1F]">{occupancy}%</strong>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#E8EDF3]">
            <div className="flex h-full w-full">
              <span className="h-full bg-[#86A9D6]" style={{ width: `${occupancy}%` }} />
              <span className="h-full bg-[#A7CBB5]" style={{ width: `${idlePercent}%` }} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-sm text-[#4F5968]">
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

        <div className="grid grid-cols-2 divide-x divide-y divide-[#E6EAF0] lg:divide-y-0">
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
    <article className="min-h-[110px] bg-white/60 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-[#667085]">{label}</span>
        <Icon className="text-[#7A8595]" size={16} />
      </div>
      <strong className="font-mono text-3xl font-semibold tabular-nums text-[#1E232B]">{value}</strong>
    </article>
  );
}
