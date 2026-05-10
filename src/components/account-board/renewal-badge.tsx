import { Badge } from '../ui/badge';
import { type RenewalState } from '../../lib/runway-board';

type RenewalBadgeProps = {
  date: string;
  state: RenewalState;
};

export function RenewalBadge({ date, state }: RenewalBadgeProps) {
  const text = formatDate(date);

  if (state === 'overdue') {
    return <Badge tone="red">需确认 {text}</Badge>;
  }

  if (state === 'soon') {
    return <Badge tone="yellow">即将续费 {text}</Badge>;
  }

  return <span className="text-sm text-[#667080]">{text}</span>;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00`));
}
