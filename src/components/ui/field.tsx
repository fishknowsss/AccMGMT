import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/utils';

const controlClass =
  'h-9 w-full rounded-md border border-[#DDE1E7] bg-white px-3 text-sm text-[#24272D] outline-none transition focus:border-[#AEB7C4] focus:ring-3 focus:ring-[#2F6BFF]/10 disabled:bg-[#F4F5F7] disabled:text-[#7C8491]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input className={cn(controlClass, className)} ref={ref} {...props} />
));

Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select className={cn(controlClass, className)} ref={ref} {...props} />
));

Select.displayName = 'Select';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#3A404A]">
      <span>{label}</span>
      {children}
    </label>
  );
}
