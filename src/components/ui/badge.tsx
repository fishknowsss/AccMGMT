import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva('inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[13px] font-medium', {
  variants: {
    tone: {
      neutral: 'border-[#DDE1E7] bg-[#F3F5F8] text-[#505866]',
      green: 'border-[#BFDCCB] bg-[#EAF6EF] text-[#2F6846]',
      blue: 'border-[#BFD1EA] bg-[#EAF2FE] text-[#315D92]',
      yellow: 'border-[#E5D4A3] bg-[#FCF4D8] text-[#7A5A16]',
      red: 'border-[#E5C1BD] bg-[#FCEDEA] text-[#8D3F36]',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
