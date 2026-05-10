import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B6F8C]/20 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-[#1C2430] text-white shadow-[0_8px_18px_rgba(28,36,48,0.18)] hover:bg-[#2A3544]',
        secondary: 'border border-[#D7DEE7] bg-white text-[#242A33] hover:bg-[#F5F7FA]',
        ghost: 'text-[#4D5968] hover:bg-[#EEF2F6] hover:text-[#242A33]',
        subtle: 'bg-[#EEF2F6] text-[#303946] hover:bg-[#E3E9F0]',
      },
      size: {
        sm: 'h-8 px-2.5',
        md: 'h-9 px-3',
        icon: 'h-8 w-8',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, ...props }, ref) => (
  <button className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
));

Button.displayName = 'Button';
