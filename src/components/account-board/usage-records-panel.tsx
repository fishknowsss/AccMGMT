import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatUsageDuration, type UsageRecord, type UsageRecordStatus, type UsageRecordsView } from '../../lib/runway-board';
import { Badge } from '../ui/badge';
import { Input } from '../ui/field';

type UsageRecordsPanelProps = {
  view: UsageRecordsView;
  now: Date;
};

export function UsageRecordsPanel({ view, now }: UsageRecordsPanelProps) {
  const [query, setQuery] = useState('');
  const records = useMemo(() => filterRecords(view.records, query), [query, view.records]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 sm:gap-4">
      <UsageRecordsSummary stats={view.stats} />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[#DDE3EA] bg-white shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
        <div className="flex shrink-0 flex-col gap-3 border-b border-[#E6EAF0] bg-[#FCFDFE] px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-[#171A1F]">使用记录</h2>
            <span className="font-mono text-sm tabular-nums text-[#667085]">{records.length} 条</span>
          </div>
          <label className="relative w-full xl:w-[320px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8191A6]" size={16} />
            <Input
              aria-label="搜索记录"
              className="h-10 pl-9"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索记录"
              value={query}
            />
          </label>
        </div>

        <div className="xl:hidden">
          {records.length ? (
            <div className="divide-y divide-[#EEF2F6]">
              {records.map((record) => (
                <UsageRecordCard key={record.id} now={now} record={record} />
              ))}
            </div>
          ) : (
            <EmptyRecords query={query} />
          )}
        </div>

        <div className="hidden min-h-0 flex-1 overflow-auto xl:block">
          <table className="w-full min-w-[1120px] border-collapse text-left">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-[#E7EAF0] bg-[#F7F9FB] text-[13px] font-semibold text-[#667085]">
                <th className="w-[210px] px-4 py-3">时间</th>
                <th className="w-[180px] px-4 py-3">账号</th>
                <th className="w-[150px] px-4 py-3">使用人</th>
                <th className="w-[140px] px-4 py-3">小组</th>
                <th className="px-4 py-3">项目</th>
                <th className="w-[140px] px-4 py-3">时长</th>
                <th className="w-[120px] px-4 py-3">结果</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr className="h-[64px] border-b border-[#EEF2F6] last:border-0 hover:bg-[#FAFBFC]" key={record.id}>
                  <td className="h-[64px] px-4 py-0 align-middle">
                    <span className="font-mono text-sm tabular-nums text-[#344154]">{formatRecordRange(record, now)}</span>
                  </td>
                  <td className="h-[64px] px-4 py-0 align-middle">
                    <AccountCell record={record} />
                  </td>
                  <td className="h-[64px] px-4 py-0 align-middle text-sm font-medium text-[#202329]">{record.user?.name ?? '未知成员'}</td>
                  <td className="h-[64px] px-4 py-0 align-middle text-sm text-[#667085]">{record.group?.name ?? '未知小组'}</td>
                  <td className="h-[64px] px-4 py-0 align-middle">
                    <span className="block truncate text-sm text-[#344154]">{record.booking.projectName || '未填写'}</span>
                  </td>
                  <td className="h-[64px] px-4 py-0 align-middle font-mono text-sm tabular-nums text-[#667085]">{formatUsageDuration(record.durationMinutes)}</td>
                  <td className="h-[64px] px-4 py-0 align-middle">
                    <RecordStatusBadge status={record.status} />
                  </td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td className="h-28 px-4 text-center text-sm text-[#667085]" colSpan={7}>
                    {query.trim() ? '调整搜索条件。' : '结束使用后会显示记录。'}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function UsageRecordsSummary({ stats }: { stats: UsageRecordsView['stats'] }) {
  return (
    <section className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric label="总记录" value={stats.total} />
      <SummaryMetric label="正常完成" value={stats.completed} />
      <SummaryMetric label="手动结束" value={stats.ended} />
      <SummaryMetric label="已取消" value={stats.cancelled} />
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#DDE3EA] bg-white px-5 py-4 shadow-[0_14px_34px_rgba(52,64,84,0.06)]">
      <div className="text-sm font-medium text-[#667085]">{label}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#171A1F]">{value}</div>
    </div>
  );
}

function UsageRecordCard({ record, now }: { record: UsageRecord; now: Date }) {
  return (
    <article className="grid gap-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <AccountCell record={record} />
        <RecordStatusBadge status={record.status} />
      </div>
      <div className="grid gap-1.5 text-sm">
        <div className="font-medium text-[#202329]">
          {record.user?.name ?? '未知成员'}
          <span className="font-normal text-[#667085]"> · {record.group?.name ?? '未知小组'}</span>
        </div>
        <div className="text-[#344154]">{record.booking.projectName || '未填写'}</div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm tabular-nums text-[#667085]">
        <span>{formatRecordRange(record, now)}</span>
        <span>{formatUsageDuration(record.durationMinutes)}</span>
      </div>
    </article>
  );
}

function AccountCell({ record }: { record: UsageRecord }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-9 w-12 shrink-0 place-items-center rounded-lg border border-[#DDE3EA] bg-[#F7F9FB] font-mono text-sm font-semibold tabular-nums text-[#344154]">
        {record.account?.label ?? '未知'}
      </span>
      <span className="min-w-0 truncate text-sm font-medium text-[#202329]">{record.account?.email ?? '账号已删除'}</span>
    </div>
  );
}

function RecordStatusBadge({ status }: { status: UsageRecordStatus }) {
  const meta = recordStatusMeta[status];
  return (
    <Badge className="whitespace-nowrap" tone={meta.tone}>
      {meta.label}
    </Badge>
  );
}

function EmptyRecords({ query }: { query: string }) {
  return <div className="px-4 py-10 text-center text-sm text-[#667085]">{query.trim() ? '调整搜索条件。' : '结束使用后会显示记录。'}</div>;
}

function filterRecords(records: UsageRecord[], query: string): UsageRecord[] {
  const value = query.trim().toLowerCase();
  if (!value) {
    return records;
  }

  return records.filter((record) => getRecordSearchText(record).toLowerCase().includes(value));
}

function getRecordSearchText(record: UsageRecord): string {
  return [
    record.account?.label,
    record.account?.email,
    record.user?.name,
    record.group?.name,
    record.booking.projectName,
    recordStatusMeta[record.status].label,
  ]
    .filter(Boolean)
    .join(' ');
}

function formatRecordRange(record: UsageRecord, now: Date): string {
  const start = new Date(record.startTime);
  const end = new Date(record.endTime);
  const day = formatRecordDay(start, now);
  const startClock = formatClock(start);
  const endClock = formatClock(end);

  if (isSameDay(start, end)) {
    return `${day} ${startClock}-${endClock}`;
  }

  return `${day} ${startClock}-${formatRecordDay(end, now)} ${endClock}`;
}

function formatRecordDay(date: Date, now: Date): string {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (diff === 0) {
    return '今天';
  }

  if (diff === -1) {
    return '昨天';
  }

  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit' }).format(date);
}

function formatClock(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const recordStatusMeta: Record<UsageRecordStatus, { label: string; tone: 'green' | 'blue' | 'red' }> = {
  completed: { label: '已完成', tone: 'green' },
  ended: { label: '已结束', tone: 'blue' },
  cancelled: { label: '已取消', tone: 'red' },
};
