import { BRAND } from '../shared/content/ui'

/** Full-screen splash while a lazily loaded app chunk arrives. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-display text-6xl leading-none font-black text-plate uppercase">{BRAND.name}</p>
      <p className="animate-pulse font-display text-2xl font-bold tracking-wide text-ink-dim uppercase">{label}</p>
    </div>
  )
}
