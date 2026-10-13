import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import { UI_LABELS } from '../shared/content/ui'

export type ButtonVariant = 'primary' | 'quiet' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg' | 'tv'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Full width. */
  block?: boolean
  /** Shows a spinner and disables the button. */
  loading?: boolean
}

// Flat label-like buttons. The filled ones carry a pale hairline just inside the edge.
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-koenig text-white shadow-[inset_0_0_0_3px_var(--color-koenig),inset_0_0_0_4px_rgb(255_255_255/0.5)] active:bg-koenig-deep',
  quiet: 'bg-card text-koenig ring-2 ring-koenig ring-inset active:bg-paper-deep',
  danger: 'bg-strafe text-white shadow-[inset_0_0_0_3px_var(--color-strafe),inset_0_0_0_4px_rgb(255_255_255/0.5)] active:bg-strafe-deep',
  ghost: 'text-koenig ring-1 ring-koenig/40 ring-inset active:bg-paper-deep',
}

const SIZE: Record<ButtonSize, string> = {
  md: 'min-h-12 rounded-md px-5 text-2xl',
  lg: 'min-h-16 rounded-md px-7 text-3xl',
  tv: 'min-h-24 rounded-lg px-10 text-tv-md',
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-[0.4em] font-display leading-none font-semibold select-none',
        'transition-[transform,background-color] duration-75 active:translate-y-px',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading && (
        <span
          role="img"
          aria-label={UI_LABELS.loading}
          className="size-[0.8em] shrink-0 animate-spin rounded-full border-[0.12em] border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
}
