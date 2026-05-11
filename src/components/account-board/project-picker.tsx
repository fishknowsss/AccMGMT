import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { Input } from '../ui/field';

type ProjectPickerProps = {
  autoFocus?: boolean;
  projects: string[];
  value: string;
  onChange: (value: string) => void;
};

export function ProjectPicker({ autoFocus, projects, value, onChange }: ProjectPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [pickerStyle, setPickerStyle] = useState({ left: 0, top: 0, width: 0, maxHeight: 160 });

  useLayoutEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function updatePickerPosition() {
      const rect = pickerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const viewportGap = 20;
      const availableBelow = window.innerHeight - rect.bottom - 84;
      const availableAbove = rect.top - viewportGap;
      const openUpward = availableBelow < 160 && availableAbove > availableBelow;
      const maxHeight = Math.max(120, Math.min(320, openUpward ? availableAbove : availableBelow));

      setPickerStyle({
        left: rect.left,
        top: openUpward ? rect.top - maxHeight - 4 : rect.bottom + 4,
        width: rect.width,
        maxHeight,
      });
    }

    updatePickerPosition();
    window.addEventListener('resize', updatePickerPosition);
    window.addEventListener('scroll', updatePickerPosition, true);
    return () => {
      window.removeEventListener('resize', updatePickerPosition);
      window.removeEventListener('scroll', updatePickerPosition, true);
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest('[data-project-picker]')) {
        return;
      }
      setPickerOpen(false);
    }

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [pickerOpen]);

  return (
    <div className="relative" data-project-picker ref={pickerRef}>
      <div className="flex">
        <Input
          autoFocus={autoFocus}
          className={projects.length > 0 ? 'flex-1 rounded-r-none' : 'flex-1'}
          onChange={(event) => {
            onChange(event.target.value);
            setPickerOpen(false);
          }}
          value={value}
        />
        {projects.length > 0 ? (
          <button
            aria-label="选择项目"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-r-md border border-l-0 border-[#DDE1E7] bg-white text-[#667085] transition hover:bg-[#F5F7FA]"
            onClick={() => setPickerOpen((next) => !next)}
            type="button"
          >
            <ChevronDown size={13} className={pickerOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        ) : null}
      </div>
      {pickerOpen
        ? createPortal(
            <ul
              className="fixed z-[60] overflow-y-auto rounded-lg border border-[#DDE3EA] bg-white py-1 shadow-[0_14px_34px_rgba(25,27,31,0.16)]"
              data-project-picker
              style={{
                left: pickerStyle.left,
                maxHeight: pickerStyle.maxHeight,
                top: pickerStyle.top,
                width: pickerStyle.width,
              }}
            >
              {projects.map((project) => (
                <li key={project}>
                  <button
                    className="w-full px-3 py-2 text-left text-sm text-[#202329] hover:bg-[#F5F7FA]"
                    onClick={() => {
                      onChange(project);
                      setPickerOpen(false);
                    }}
                    type="button"
                  >
                    {project}
                  </button>
                </li>
              ))}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
