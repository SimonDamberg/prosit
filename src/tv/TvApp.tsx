import { BRAND, PLACEHOLDER } from '../shared/content/ui'
import { QrCode, Toaster } from '../ui'
import { useWakeLock } from './useWakeLock'

/** TV app. Stage 1 placeholder: Stage 2 builds the dashboard here. */
export default function TvApp() {
  useWakeLock()
  return (
    <main className="flex h-dvh items-center justify-center gap-16 px-16">
      <div className="flex flex-col gap-4">
        <p className="text-tv-sm font-bold tracking-[0.2em] text-ink-dim uppercase">
          {BRAND.club} · {BRAND.tagline}
        </p>
        <h1 className="font-display text-[10rem] leading-none font-black text-plate uppercase">{BRAND.name}</h1>
        <p className="text-tv-sm text-ink-dim">{PLACEHOLDER.tv}</p>
      </div>
      <QrCode value={window.location.origin} label={PLACEHOLDER.joinQr} className="size-80 shrink-0 rounded-2xl" />
      <Toaster size="tv" />
    </main>
  )
}
