import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import { UI_LABELS } from '../shared/content/ui'

export type ButtonVariant = 'primary' | 'sleaze' | 'ghost' | 'danger'
export type ButtonSize = 'md' | 'lg' | 'tv'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Full width. */
  block?: boolean
  /** Shows a spinner and disables the button. */
  loading?: boolean
}

// Chunky buttons: a solid bottom edge that the button sinks into when pressed.
const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-plate text-night shadow-[0_0.3rem_0_var(--color-plate-shade)] active:shadow-[0_0.05rem_0_var(--color-plate-shade)]',
  sleaze: 'bg-sleaze text-sleaze-ink shadow-[0_0.3rem_0_var(--color-sleaze-shade)] active:shadow-[0_0.05rem_0_var(--color-sleaze-shade)]',
  danger: 'bg-drift text-white shadow-[0_0.3rem_0_var(--color-drift-shade)] active:shadow-[0_0.05rem_0_var(--color-drift-shade)]',
  ghost: 'bg-tote/50 text-ink ring-2 ring-tote-hi/70 ring-inset active:bg-tote',
}

const SIZE: Record<ButtonSize, string> = {
  md: 'min-h-12 rounded-xl px-5 text-xl',
  lg: 'min-h-16 rounded-2xl px-7 text-3xl',
  tv: 'min-h-24 rounded-3xl px-10 text-tv-md',
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
        'inline-flex items-center justify-center gap-[0.4em] font-display leading-none font-extrabold tracking-wide uppercase select-none',
        'transition-[transform,box-shadow,background-color] duration-75 active:translate-y-[0.25rem]',
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
