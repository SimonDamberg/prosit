import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import { UI_LABELS } from '../shared/content/ui'
import { cx } from './cx'

export type ModalTone = 'default' | 'sleaze' | 'danger'

export interface ModalProps {
  open: boolean
  /** Called on Esc, backdrop tap and the close button (when dismissible). */
  onClose: () => void
  title?: ReactNode
  tone?: ModalTone
  /** Backdrop tap, Esc and the close button dismiss. Turn off for flows that need an answer. */
  dismissible?: boolean
  /** Buttons row at the bottom. */
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

const TONE: Record<ModalTone, { box: string; title: string }> = {
  default: { box: 'ring-tote-hi', title: 'text-plate' },
  // The glow reads --color-sleaze.
  sleaze: { box: 'ring-sleaze shadow-[0_0_3rem] shadow-sleaze/45', title: 'text-sleaze' },
  danger: { box: 'ring-drift', title: 'text-drift' },
}

/**
 * Pop-up on a native <dialog>. showModal() puts it in the browser top layer, so modals stack in
 * the order they open, Esc closes the topmost one and focus stays inside.
 */
export function Modal({ open, onClose, title, tone = 'default', dismissible = true, actions, children, className }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const openRef = useRef(open)

  useEffect(() => {
    openRef.current = open
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    // The inner panel covers the whole dialog box, so only backdrop taps target the dialog itself.
    if (dismissible && e.target === e.currentTarget) onClose()
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        if (dismissible) onClose()
      }}
      // The browser may still close it (repeated Esc); keep React state in sync.
      onClose={() => {
        if (openRef.current) onClose()
      }}
      onClick={onBackdrop}
      className={cx(
        'm-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100vw-2rem))] overflow-visible bg-transparent p-0 text-ink open:animate-pop-in',
        className,
      )}
    >
      {open && (
        <div className={cx('flex max-h-[calc(100dvh-2rem)] flex-col rounded-2xl bg-night ring-2 ring-inset', TONE[tone].box)}>
          {(title || dismissible) && (
            <div className="flex items-start gap-3 px-5 pt-5">
              <h2 className={cx('min-w-0 flex-1 font-display text-3xl leading-none font-black uppercase', TONE[tone].title)}>
                {title}
              </h2>
              {dismissible && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={UI_LABELS.close}
                  className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-full text-2xl text-ink-dim active:bg-white/10"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="min-h-0 overflow-y-auto px-5 pt-3 pb-5 text-base leading-relaxed">{children}</div>
          {actions && <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 px-5 py-4">{actions}</div>}
        </div>
      )}
    </dialog>
  )
}
