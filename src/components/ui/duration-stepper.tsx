import { useEffect, useRef } from 'react';

const MIN_HOURS = 0.5;
const MAX_HOURS = 24;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef({ value, onChange });

  useEffect(() => {
    latestRef.current = { value, onChange };
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      const { value, onChange } = latestRef.current;
      const delta = event.deltaY < 0 ? STEP : -STEP;
      onChange(Math.min(MAX_HOURS, Math.max(MIN_HOURS, Math.round((value + delta) * 10) / 10)));
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-10 select-none items-center overflow-hidden rounded-lg border border-[#DDE3EA] bg-white"
    >
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
