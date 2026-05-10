import { Search, Wand2 } from 'lucide-react';
import { type AccountFiltersState, type Group } from '../../lib/runway-board';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input, Select } from '../ui/field';

type AccountFiltersProps = {
  filters: AccountFiltersState;
  groups: Group[];
  onChange: (next: Partial<AccountFiltersState>) => void;
  onFindAvailable: () => void;
};

export function AccountFilters({ filters, groups, onChange, onFindAvailable }: AccountFiltersProps) {
  const statusItems: Array<{ value: AccountFiltersState['status']; label: string }> = [
    { value: 'all', label: '全部' },
    { value: 'idle', label: '空闲' },
    { value: 'in_use', label: '使用中' },
    { value: 'reserved', label: '有预约' },
  ];

  return (
    <section className="shrink-0 rounded-[16px] border border-[#DDE3EA] bg-[#FCFDFE]/95 p-2 shadow-[0_12px_34px_rgba(52,64,84,0.05)]" aria-label="筛选账号">
      <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-wrap xl:items-center">
        <label className="relative block sm:col-span-2 xl:flex-1 xl:min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A93A3]" size={16} />
          <Input
            className="border-transparent bg-[#F3F6F9] pl-9 shadow-none"
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="搜索账号邮箱"
            value={filters.query}
          />
        </label>
        <div className="grid grid-cols-4 rounded-lg bg-[#EEF2F6] p-1 sm:col-span-2 xl:w-auto">
          {statusItems.map((item) => (
            <button
              className={cn(
                'h-8 rounded-md px-2 text-sm font-medium text-[#667085] transition sm:px-3',
                filters.status === item.value && 'bg-white text-[#1E232B] shadow-[0_1px_3px_rgba(52,64,84,0.12)]',
              )}
              key={item.value}
              onClick={() => onChange({ status: item.value })}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <Select className="border-transparent bg-[#F3F6F9] xl:w-[150px] xl:flex-none" onChange={(event) => onChange({ groupId: event.target.value })} value={filters.groupId}>
          <option value="all">全部小组</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </Select>
        <Select
          className="border-transparent bg-[#F3F6F9] xl:w-[150px] xl:flex-none"
          onChange={(event) => onChange({ renewal: event.target.value as AccountFiltersState['renewal'] })}
          value={filters.renewal}
        >
          <option value="all">全部续费</option>
          <option value="7d">7天内</option>
          <option value="30d">30天内</option>
        </Select>
        <Button className="justify-center rounded-lg px-4 sm:col-span-2 xl:w-auto" onClick={onFindAvailable} type="button" variant="primary">
          <Wand2 size={15} />
          找可用
        </Button>
      </div>
    </section>
  );
}
