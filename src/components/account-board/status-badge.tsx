import { Badge } from '../ui/badge';
import { formatBookingRange, minutesUntil, type AccountRow } from '../../lib/runway-board';

type StatusBadgeProps = {
  row: AccountRow;
  now: Date;
};

export function StatusBadge({ row, now }: StatusBadgeProps) {
  if (row.runtime.kind === 'in_use' && row.current) {
    return (
      <div className="grid gap-1">
        <Badge tone="blue">使用中</Badge>
        <span className="font-mono text-[13px] tabular-nums text-[#667085]">
          {formatBookingRange(row.current.startTime, row.current.endTime, now)} · 余 {formatRemain(row.current.endTime, now)}
        </span>
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <Badge tone="green">空闲</Badge>
      <span className="font-mono text-[13px] tabular-nums text-[#667085]">{row.next ? `下一预约 ${formatClock(row.next.startTime)}` : '现在可用'}</span>
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

function formatClock(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
