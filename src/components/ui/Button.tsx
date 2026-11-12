import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline';
type Size = 'md' | 'sm';

const variants: Record<Variant, string> = {
  primary:
    // The transparent border turns into a visible outline in forced-colors (high contrast) mode.
    'border border-transparent bg-primary text-white shadow-[0_8px_24px_-8px_rgb(37_99_235/0.7)] hover:bg-primary-hover active:translate-y-px',
  outline: 'border border-line bg-surface text-fg hover:border-link',
};
const sizes: Record<Size, string> = {
  md: 'min-h-11 px-5 py-2 text-sm',
  sm: 'min-h-9 px-3.5 py-1.5 text-sm',
};

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,border-color,transform,box-shadow] duration-300 ease-water select-none';

interface StyleProps {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & StyleProps) {
  return (
    <button type={type} className={cn(baseClass, variants[variant], sizes[size], className)} {...rest} />
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ComponentProps<'a'> & StyleProps) {
  return (
    <a className={cn(baseClass, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </a>
  );
}

/** Circular icon-only button (theme toggle, menu). An accessible name is required. */
export function IconButton({
  className,
  type = 'button',
  ...rest
}: ComponentProps<'button'> & { 'aria-label': string }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-fg transition-[border-color,transform] duration-300 ease-water hover:border-link active:scale-95',
        className,
      )}
      {...rest}
    />
  );
}
