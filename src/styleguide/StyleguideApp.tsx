import { useEffect, useState, type ReactNode } from 'react'
import { useServerNow } from '../lib/hooks'
import { BRAND } from '../shared/content/ui'
import { measureCue, play, unlockAudio } from '../tv/audio'
import { AchievementPopup } from '../tv/AchievementPopup'
import { StageFrame } from '../tv/EventStage'
import { Finale } from '../tv/Finale'
import { MUSIC, musicState, playProsit, setStageBusy, startMusic, stopProsit } from '../tv/music'
import { CUE_NAMES, CUES, cueLength, type CueName } from '../tv/score'
import { Chip } from '../tv/stages/Chip'
import { Button, ConnectionBadge, Crest, cx, Modal, Shield, toast, Toaster, type ModalTone } from '../ui'
import {
  ACHIEVEMENT_FIXTURE,
  FINALE_SCENE_NAMES,
  finaleFixture,
  MEMBERS,
  SCENE_NAMES,
  sceneEvent,
  type FinaleSceneName,
  type SceneName,
} from './fixtures'

// Dev only (see src/main.tsx): the design system on one page, every sound on a button and every
// TV stage from a fixture. The labels are for whoever works on the app, not for the members, so
// they live here and not in src/shared/content.
//
// `/styleguide?stage=prosit-live` shows one stage alone at full size, as the TV would.

const COLOURS = [
  ['paper', 'bg-paper'],
  ['paper-deep', 'bg-paper-deep'],
  ['card', 'bg-card'],
  ['himmel', 'bg-himmel'],
  ['koenig', 'bg-koenig'],
  ['koenig-deep', 'bg-koenig-deep'],
  ['weste', 'bg-weste'],
  ['weste-dim', 'bg-weste-dim'],
  ['messing', 'bg-messing'],
  ['messing-deep', 'bg-messing-deep'],
  ['strafe', 'bg-strafe'],
  ['strafe-deep', 'bg-strafe-deep'],
  ['gut', 'bg-gut'],
] as const

const TYPE = [
  ['font-display text-6xl', 'font-display text-6xl leading-none font-bold text-koenig'],
  ['font-display text-4xl', 'font-display text-4xl leading-none font-bold text-koenig'],
  ['font-body text-xl', 'text-xl font-bold'],
  ['font-body text-base', 'text-base'],
  ['text-tv-sm', 'text-tv-sm'],
  ['text-tv-md', 'text-tv-md font-bold'],
  ['text-tv-lg', 'text-tv-lg font-black'],
  ['text-tv-xl', 'font-display text-tv-xl font-bold text-koenig'],
] as const

const MOTION = [
  'animate-pop-in',
  'animate-sign-drop',
  'animate-flip-in',
  'animate-prosit',
  'animate-slam',
  'animate-stamp',
  'animate-thud',
  'animate-urgent',
  'animate-breathe',
  'animate-from-left',
  'animate-from-right',
] as const

const TONES: readonly ModalTone[] = ['default', 'accent', 'danger']

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="label-rule font-display text-3xl">{title}</h2>
      {children}
    </section>
  )
}

/** One stage, on a TV-sized frame. `nonce` restarts it. */
function Preview({ scene, at, nonce }: { scene: SceneName; at: number; nonce: number }) {
  const now = useServerNow(250)
  return <StageFrame key={nonce} event={sceneEvent(scene, at)} members={MEMBERS} now={now} />
}

/** The ceremony on the TV, entered at the moment the scene names. */
function FinalePreview({ scene, at }: { scene: FinaleSceneName; at: number }) {
  const now = useServerNow(250)
  const [fixture] = useState(() => finaleFixture(scene, at))
  return <Finale {...fixture} members={MEMBERS} now={now} />
}

/** The achievement pop-up: the TV announces only what arrives after it loaded, so they arrive late. */
function AchievementPreview() {
  const [list, setList] = useState<typeof ACHIEVEMENT_FIXTURE>([])
  useEffect(() => {
    const timer = setTimeout(() => setList(ACHIEVEMENT_FIXTURE), 100)
    return () => clearTimeout(timer)
  }, [])
  return <AchievementPopup achievements={list} members={MEMBERS} held={false} />
}

const EXTRA_SCENES = [...FINALE_SCENE_NAMES, 'achievement'] as const
type ExtraScene = (typeof EXTRA_SCENES)[number]

function ExtraPreview({ scene, at }: { scene: ExtraScene; at: number }) {
  return scene === 'achievement' ? <AchievementPreview /> : <FinalePreview scene={scene} at={at} />
}

function FinaleScenes() {
  const now = useServerNow(1000)
  const [shown, setShown] = useState<{ scene: ExtraScene; at: number; nonce: number } | null>(null)
  return (
    <Section title="Finalen och utmärkelser">
      <div className="flex flex-wrap gap-2">
        {EXTRA_SCENES.map((scene) => (
          <Button
            key={scene}
            variant={shown?.scene === scene ? 'primary' : 'quiet'}
            onClick={() => setShown({ scene, at: now, nonce: (shown?.nonce ?? 0) + 1 })}
          >
            {scene}
          </Button>
        ))}
      </div>
      <p className="text-weste-dim">Finalen spelar vidare härifrån, med ljud om ljudet är upplåst.</p>
      <div className="h-[540px] w-[960px] overflow-hidden border-2 border-koenig">
        <div className="relative h-[1080px] w-[1920px] origin-top-left scale-50 bg-paper">
          {shown && <ExtraPreview key={shown.nonce} scene={shown.scene} at={shown.at} />}
        </div>
      </div>
    </Section>
  )
}

function Stages() {
  const now = useServerNow(1000)
  const [shown, setShown] = useState<{ scene: SceneName; at: number; nonce: number } | null>(null)
  return (
    <Section title="Scener på TV:n">
      <div className="flex flex-wrap gap-2">
        {SCENE_NAMES.map((scene) => (
          <Button
            key={scene}
            variant={shown?.scene === scene ? 'primary' : 'quiet'}
            onClick={() => setShown({ scene, at: now, nonce: (shown?.nonce ?? 0) + 1 })}
          >
            {scene}
          </Button>
        ))}
      </div>
      <p className="text-weste-dim">Tryck igen för att spela om. Halv skala: ramen är 1920 x 1080.</p>
      <div className="h-[540px] w-[960px] overflow-hidden border-2 border-koenig">
        <div className="relative h-[1080px] w-[1920px] origin-top-left scale-50 bg-paper">
          {shown && <Preview scene={shown.scene} at={shown.at} nonce={shown.nonce} />}
        </div>
      </div>
    </Section>
  )
}

function Sounds() {
  const [levels, setLevels] = useState<Partial<Record<CueName, { peak: number; rms: number }>>>({})
  const measure = async () => {
    const entries = await Promise.all(CUE_NAMES.map(async (name) => [name, await measureCue(name)] as const))
    setLevels(Object.fromEntries(entries))
  }
  return (
    <Section title="Ljud (endast TV:n)">
      <div className="flex flex-wrap gap-2">
        {CUE_NAMES.map((name) => (
          <Button key={name} variant="quiet" onClick={() => void unlockAudio().then(() => play(name))}>
            {name}
          </Button>
        ))}
      </div>
      <div>
        <Button variant="ghost" onClick={() => void measure()}>
          Mät nivåerna
        </Button>
      </div>
      <table className="w-fit text-left tabular-nums">
        <thead>
          <tr className="text-weste-dim">
            <th className="pr-8">Ljud</th>
            <th className="pr-8">Längd</th>
            <th className="pr-8">Topp</th>
            <th>RMS</th>
          </tr>
        </thead>
        <tbody>
          {CUE_NAMES.map((name) => {
            const level = levels[name]
            return (
              <tr key={name} data-cue={name} data-peak={level?.peak} data-rms={level?.rms}>
                <td className="pr-8 font-bold">{name}</td>
                <td className="pr-8">{cueLength(CUES[name]).toFixed(2)} s</td>
                <td className={cx('pr-8', level && level.peak >= 1 && 'font-black text-strafe')}>{level ? level.peak.toFixed(2) : ''}</td>
                <td>{level ? level.rms.toFixed(3) : ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Section>
  )
}

function Music() {
  const [state, setState] = useState(musicState)
  const run = (action: () => unknown) => () => {
    action()
    setState(musicState())
  }
  return (
    <Section title="Musik (YouTube, endast TV:n)">
      <div className="flex flex-wrap gap-2">
        <Button variant="quiet" onClick={run(startMusic)}>
          Starta spellistan
        </Button>
        <Button variant="quiet" onClick={run(playProsit)}>
          Ein Prosit!
        </Button>
        <Button variant="quiet" onClick={run(stopProsit)}>
          Tillbaka till spellistan
        </Button>
        <Button variant="ghost" onClick={run(() => setStageBusy(true))}>
          Dämpa
        </Button>
        <Button variant="ghost" onClick={run(() => setStageBusy(false))}>
          Full volym
        </Button>
        <Button variant="ghost" onClick={run(() => {})}>
          Läs av
        </Button>
      </div>
      <p className="text-weste-dim" data-music={JSON.stringify(state)}>
        Spellista {MUSIC.playlist} ({state.bandReady ? 'redo' : state.started ? 'laddar' : 'ej startad'}), Prosit-video {state.video} (
        {state.singerReady ? 'redo' : 'ej redo'}){state.singing ? ', sjunger' : ''}
      </p>
    </Section>
  )
}

function Motion() {
  const [nonce, setNonce] = useState(0)
  return (
    <Section title="Rörelse">
      <div>
        <Button variant="ghost" onClick={() => setNonce(nonce + 1)}>
          Spela om
        </Button>
      </div>
      <div key={nonce} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {MOTION.map((name) => (
          <div key={name} className="sign flex h-32 flex-col items-center justify-center gap-2 overflow-hidden p-3">
            <p className={cx('font-display text-4xl leading-none font-bold text-koenig', name)}>{BRAND.name}</p>
            <p className="text-sm text-weste-dim">{name}</p>
          </div>
        ))}
        <div className="sign stagger flex h-32 flex-col items-center justify-center p-3">
          <p className="font-bold">Eins</p>
          <p className="font-bold">Zwei</p>
          <p className="font-bold">Drei</p>
          <p className="text-sm text-weste-dim">stagger</p>
        </div>
        <div className="sign flex h-32 flex-col items-center justify-center p-3">
          <p className="flourish text-xl font-black text-gut">Ingen Strafe</p>
          <p className="text-sm text-weste-dim">flourish</p>
        </div>
        <div className="sign relative flex h-32 items-center justify-center overflow-hidden p-3">
          <div className="absolute inset-0 animate-flash bg-himmel" />
          <p className="text-sm text-weste-dim">animate-flash</p>
        </div>
      </div>
    </Section>
  )
}

function Modals() {
  const [open, setOpen] = useState<{ tone: ModalTone; band: boolean } | null>(null)
  return (
    <Section title="Modal och toast">
      <div className="flex flex-wrap gap-2">
        {TONES.map((tone) => (
          <Button key={tone} variant="quiet" onClick={() => setOpen({ tone, band: false })}>
            {tone}
          </Button>
        ))}
        {TONES.map((tone) => (
          <Button key={tone} variant="quiet" onClick={() => setOpen({ tone, band: true })}>
            {tone} + band
          </Button>
        ))}
        <Button variant="ghost" onClick={() => toast({ text: 'Protokollet är fört.', tone: 'info' })}>
          toast info
        </Button>
        <Button variant="ghost" onClick={() => toast({ text: 'Ordnung råder.', tone: 'win' })}>
          toast win
        </Button>
        <Button variant="ghost" onClick={() => toast({ text: 'Strafe till Palm: sen ankomst', tone: 'error' })}>
          toast error
        </Button>
      </div>
      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title="Skålen är avgjord"
        tone={open?.tone}
        band={open?.band}
        actions={<Button onClick={() => setOpen(null)}>Vidare</Button>}
      >
        <p className={cx('text-xl font-bold', open?.tone === 'danger' && open.band && 'animate-stamp text-strafe')}>
          Zu langsam! Du får en Strafe.
        </p>
      </Modal>
    </Section>
  )
}

export default function StyleguideApp() {
  const [stage] = useState(() => new URLSearchParams(window.location.search).get('stage'))
  const [at] = useState(() => Date.now())
  if (stage && (SCENE_NAMES as string[]).includes(stage)) {
    return (
      <div className="relative h-dvh overflow-hidden bg-paper">
        <Preview scene={stage as SceneName} at={at} nonce={0} />
      </div>
    )
  }
  if (stage && (EXTRA_SCENES as readonly string[]).includes(stage)) {
    return (
      <div className="relative h-dvh overflow-hidden bg-paper">
        <ExtraPreview scene={stage as ExtraScene} at={at} />
      </div>
    )
  }

  return (
    <main className="mx-auto flex max-w-[1000px] flex-col gap-12 px-4 py-8">
      <header className="flex items-center gap-6">
        <Shield className="h-24 w-auto" />
        <div>
          <h1 className="font-display text-6xl leading-none font-bold text-koenig">{BRAND.name} Styleguide</h1>
          <p className="text-weste-dim">Endast i utvecklingsläge. Tokens och regler står i CLAUDE.md.</p>
        </div>
      </header>

      <Section title="Färger">
        <div className="grid grid-cols-3 gap-3 md:grid-cols-5">
          {COLOURS.map(([name, bg]) => (
            <div key={name} className="flex flex-col gap-1">
              <div className={cx('h-16 rounded-md border border-koenig/30', bg)} />
              <p className="text-sm font-bold">{name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typografi">
        <div className="flex flex-col gap-3 overflow-hidden">
          {TYPE.map(([name, classes]) => (
            <div key={name} className="flex items-baseline gap-4">
              <p className="w-48 shrink-0 text-sm text-weste-dim">{name}</p>
              <p className={classes}>Prosit, Herr Präsident 1 234</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Knappar">
        <div className="flex flex-wrap items-center gap-3">
          <Button>primary</Button>
          <Button variant="quiet">quiet</Button>
          <Button variant="ghost">ghost</Button>
          <Button variant="danger">danger</Button>
          <Button disabled>disabled</Button>
          <Button loading>loading</Button>
          <Button size="lg">lg</Button>
          <Button size="tv">tv</Button>
        </div>
      </Section>

      <Section title="Ytor och vapen">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-rauten p-6">
            <div className="sign p-4">
              <p className="font-bold">sign på bg-rauten</p>
              <p className="label-rule mt-2">label-rule</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rauten-band text-3xl" />
            <div className="flex items-center gap-6">
              <Crest />
              <ConnectionBadge status="online" />
              <ConnectionBadge status="offline" />
            </div>
          </div>
        </div>
        <ul className="flex origin-top-left scale-50 flex-wrap gap-4">
          {MEMBERS.map((m, i) => (
            <Chip key={m.id} member={m} on={i % 2 === 0} order={i % 2 === 0 ? i / 2 + 1 : undefined} />
          ))}
        </ul>
      </Section>

      <Motion />
      <Modals />
      <Sounds />
      <Music />
      <Stages />
      <FinaleScenes />
      <Toaster />
    </main>
  )
}
