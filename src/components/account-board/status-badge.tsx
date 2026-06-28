import { Badge } from '../ui/badge';
import { formatBookingRange, minutesUntil, type AccountRow } from '../../lib/runway-board';

type StatusBadgeProps = {
  row: AccountRow;
  now: Date;
};

export function StatusBadge({ row, now }: StatusBadgeProps) {
  if (row.runtime.kind === 'in_use' && row.current) {
    return (
      <div className="grid w-full gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Badge className="shrink-0" tone="blue">
            使用中
          </Badge>
          <span className="whitespace-nowrap font-mono text-[13px] leading-5 tabular-nums text-[#4F5F77]">
            {formatBookingRange(row.current.startTime, row.current.endTime, now)}
          </span>
        </div>
        <span className="font-mono text-[13px] leading-5 tabular-nums text-[#667085]">余 {formatRemain(row.current.endTime, now)}</span>
      </div>
    );
  }

  if (row.next) {
    return (
      <div className="grid w-full gap-1.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Badge className="shrink-0" tone="green">
            空闲
          </Badge>
          <span className="whitespace-nowrap font-mono text-[13px] leading-5 tabular-nums text-[#4F5F77]">现在可用</span>
        </div>
        <span className="font-mono text-[13px] leading-5 tabular-nums text-[#667085]">
          下次 {formatBookingRange(row.next.startTime, row.next.endTime, now)}
        </span>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
      <Badge className="shrink-0" tone="green">
        空闲
      </Badge>
      <span className="font-mono text-[13px] leading-5 tabular-nums text-[#667085]">现在可用</span>
    </div>
  );
}

function formatRemain(endTime: string, now: Date): string {
  const minutes = minutesUntil(endTime, now);
  if (minutes < 60) {
    return `${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
}
