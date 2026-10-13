// Toast queue as an external store (same pattern as src/lib/connection.ts). Push from anywhere
// with toast({ text }); <Toaster /> renders the stack.

export type ToastTone = 'info' | 'win' | 'error'

export interface Toast {
  id: number
  text: string
  tone: ToastTone
}

export interface ToastInput {
  text: string
  tone?: ToastTone
  /** Auto-dismiss delay. */
  ms?: number
}

export const TOAST_MAX = 3
export const TOAST_MS = 4500

export function createToastStore() {
  let toasts: readonly Toast[] = []
  let nextId = 1
  const timers = new Map<number, ReturnType<typeof setTimeout>>()
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  const drop = (id: number) => {
    clearTimeout(timers.get(id))
    timers.delete(id)
    toasts = toasts.filter((t) => t.id !== id)
  }

  return {
    getSnapshot: (): readonly Toast[] => toasts,
    subscribe(listener: () => void): () => void {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    push({ text, tone = 'info', ms = TOAST_MS }: ToastInput): number {
      const id = nextId++
      toasts = [...toasts, { id, text, tone }]
      while (toasts.length > TOAST_MAX) drop(toasts[0].id)
      timers.set(
        id,
        setTimeout(() => {
          drop(id)
          emit()
        }, ms),
      )
      emit()
      return id
    },
    dismiss(id: number): void {
      if (!toasts.some((t) => t.id === id)) return
      drop(id)
      emit()
    },
    clear(): void {
      for (const t of toasts) drop(t.id)
      emit()
    },
  }
}

export type ToastStore = ReturnType<typeof createToastStore>

export const toastStore = createToastStore()

export function toast(input: ToastInput): number {
  return toastStore.push(input)
}
