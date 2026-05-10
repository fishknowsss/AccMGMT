const MIN_HOURS = 0.5;
const MAX_HOURS = 8;
const STEP = 0.5;

export function formatDuration(hours: number): string {
  if (hours < 1) return '30 分钟';
  const h = Math.floor(hours);
  const hasHalf = hours - h >= 0.4;
  if (hasHalf) return `${h} 小时 30 分钟`;
  return `${h} 小时`;
}

type DurationStepperProps = {
  value: number;
  onChange: (hours: number) => void;
};

export function DurationStepper({ value, onChange }: DurationStepperProps) {
  return (
    <div className="flex h-10 select-none items-center overflow-hidden rounded-lg border border-[#DDE3EA] bg-white">
      <button
        className="flex h-full w-10 shrink-0 items-center justify-center text-lg text-[#4D5968] transition hover:bg-[#F5F7FA] disabled:cursor-not-allowed disabled:opacity-30"
        disabled={value <= MIN_HOURS}
        onClick={() => onChange(Math.max(MIN_HOURS, Math.round((value - STEP) * 10) / 10))}
        type="button"
      >
        −
      </button>
      <span className="flex-1 text-center text-sm font-medium tabular-nums text-[#202329]">
        {formatDuration(value)}
      </span>
      <button
        className="flex h-full w-10 shrink-0 items-center justify-center text-lg text-[#4D5968] transition hover:bg-[#F5F7FA] disabled:cursor-not-allowed disabled:opacity-30"
        disabled={value >= MAX_HOURS}
        onClick={() => onChange(Math.min(MAX_HOURS, Math.round((value + STEP) * 10) / 10))}
        type="button"
      >
        +
      </button>
    </div>
  );
}
