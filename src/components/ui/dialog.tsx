import { X } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

type DialogProps = {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Dialog({ title, children, footer, onClose, className }: DialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#121417]/28 p-3" role="presentation">
      <section
        aria-modal="true"
        className={cn(
          'flex h-full w-full max-w-[520px] flex-col overflow-hidden rounded-[18px] border border-[#DDE3EA] bg-white shadow-[0_28px_90px_rgba(25,27,31,0.22)]',
          className,
        )}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-[#E7EAF0] px-5 py-4">
          <h2 className="text-base font-semibold text-[#202329]">{title}</h2>
          <Button aria-label="关闭" onClick={onClose} size="icon" type="button" variant="ghost">
            <X size={17} />
          </Button>
        </header>
        <div className="grid gap-4 px-5 py-5">{children}</div>
        <footer className="mt-auto flex justify-end gap-2 border-t border-[#E7EAF0] px-5 py-4">{footer}</footer>
      </section>
    </div>
  );
}
