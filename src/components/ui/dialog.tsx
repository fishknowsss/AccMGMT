import { X } from 'lucide-react';
import { type MouseEvent, type ReactNode, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Button } from './button';

type DialogProps = {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  className?: string;
  bodyClassName?: string;
};

export function Dialog({ title, children, footer, onClose, className, bodyClassName }: DialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function handleOverlayClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div className="dialog-overlay fixed inset-0 z-50 flex items-end bg-[#121417]/28 sm:items-stretch sm:justify-end sm:p-3" onMouseDown={handleOverlayClick} role="presentation">
      <section
        aria-modal="true"
        className={cn(
          'dialog-panel flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[20px] border border-[#DDE3EA] bg-white shadow-[0_28px_90px_rgba(25,27,31,0.22)] sm:max-h-none sm:h-full sm:max-w-[520px] sm:rounded-[18px]',
          className,
        )}
        role="dialog"
      >
        <header className="shrink-0 flex items-center justify-between border-b border-[#E7EAF0] px-5 py-4">
          <h2 className="text-base font-semibold text-[#202329]">{title}</h2>
          <Button aria-label="关闭" onClick={onClose} size="icon" type="button" variant="ghost">
            <X size={17} />
          </Button>
        </header>
        <div className={cn('grid gap-4 overflow-y-auto px-5 py-5', bodyClassName)}>{children}</div>
        <footer className="shrink-0 mt-auto flex justify-end gap-2 border-t border-[#E7EAF0] px-5 py-4">{footer}</footer>
      </section>
    </div>
  );
}
