import { useSyncExternalStore } from 'react'
import { cx } from './cx'
import { toastStore, type ToastTone } from './toast'

const TONE: Record<ToastTone, string> = {
  info: 'border-tote-hi text-ink',
  win: 'border-cash text-cash',
  error: 'border-drift text-ink',
}

export type ToasterSize = 'md' | 'tv'

// tv: the TV, read across the room.
const STACK: Record<ToasterSize, string> = {
  md: 'inset-x-3 bottom-3 pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:right-5 md:bottom-5 md:w-96 md:items-end',
  tv: 'left-8 bottom-8 w-[min(38rem,45vw)]',
}

const TOAST: Record<ToasterSize, string> = {
  md: 'rounded-lg border-l-4 px-4 py-2.5 text-sm',
  tv: 'rounded-xl border-l-8 px-7 py-4 text-tv-sm',
}

const EMPTY: readonly never[] = []

/**
 * Renders toasts pushed with toast(). Tap a toast to dismiss it, except at size "tv": the
 * TV is pure output, so there its toasts are plain text that only times out.
 *
 * Mount once per app. Every Toaster reads the same module-level store, so two mounted at once would
 * show every toast twice.
 */
export function Toaster({ size = 'md', className }: { size?: ToasterSize; className?: string }) {
  const toasts = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, () => EMPTY)
  const tv = size === 'tv'
  return (
    <div
      aria-live="polite"
      className={cx('pointer-events-none fixed z-40 flex flex-col items-start gap-2', STACK[size], className)}
    >
      {toasts.map((t) => {
        const look = cx(
          'max-w-full animate-toast-in bg-night-deep/95 text-left font-semibold shadow-[0_0.5rem_1.5rem_rgb(0_0_0/0.5)] ring-1 ring-white/10',
          TOAST[size],
          TONE[t.tone],
        )
        return tv ? (
          <div key={t.id} className={look}>
            {t.text}
          </div>
        ) : (
          <button key={t.id} type="button" onClick={() => toastStore.dismiss(t.id)} className={cx('pointer-events-auto', look)}>
            {t.text}
          </button>
        )
      })}
    </div>
  )
}
