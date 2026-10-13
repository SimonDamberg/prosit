import { BRAND } from '../shared/content/ui'
import { Crest } from './Crest'

/** Full-screen splash while a lazily loaded app chunk arrives. */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex h-dvh items-center justify-center bg-rauten p-6">
      <div className="sign flex flex-col items-center gap-5 px-8 py-8 text-center">
        <Crest />
        <p className="font-display text-6xl leading-none font-bold text-koenig">{BRAND.name}</p>
        <p className="animate-pulse text-lg font-bold text-weste-dim">{label}</p>
      </div>
    </div>
  )
}
