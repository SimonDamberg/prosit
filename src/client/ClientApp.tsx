import { BRAND, PLACEHOLDER } from '../shared/content/ui'
import { Toaster } from '../ui'

/** Phone app. Stage 1 placeholder: Stage 2 builds the join flow and the drink log here. */
export default function ClientApp() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-sm font-bold tracking-[0.2em] text-ink-dim uppercase">{BRAND.club}</p>
      <h1 className="font-display text-7xl leading-none font-black text-plate uppercase">{BRAND.name}</h1>
      <p className="text-lg text-ink-dim">{PLACEHOLDER.phone}</p>
      <Toaster />
    </main>
  )
}
