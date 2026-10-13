import { useState, type FormEvent } from 'react'
import { identityStore } from '../lib/identity'
import { getApi } from '../lib/supabase'
import type { MemberRow } from '../lib/types'
import { ERROR_MESSAGES } from '../shared/content/errors'
import { JOIN } from '../shared/content/phone'
import { BRAND } from '../shared/content/ui'
import { cleanName, firstFreeColour, MAX_NAME_LENGTH, MEMBER_COLOURS, nameProblem } from '../shared/game/members'
import { Button, cx, toast } from '../ui'
import { reportError } from './report'

export function JoinScreen({ members, onJoined }: { members: readonly MemberRow[]; onJoined: () => void }) {
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const taken = members.map((m) => m.colour)
  // A colour someone else took while this form was open falls back to the next free one.
  const colour = picked && !taken.includes(picked) ? picked : firstFreeColour(taken)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problem = nameProblem(name)
    if (problem) return toast({ text: ERROR_MESSAGES[problem], tone: 'error' })
    if (!colour) return toast({ text: ERROR_MESSAGES.club_full, tone: 'error' })
    setBusy(true)
    try {
      const clean = cleanName(name)
      const created = await getApi().join(clean, colour)
      identityStore.set({ memberId: created.id, token: created.token })
      onJoined()
      toast({ text: JOIN.welcome(clean), tone: 'win' })
    } catch (err) {
      reportError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-8">
      <header className="text-center">
        <p className="text-sm font-bold tracking-[0.2em] text-ink-dim uppercase">{BRAND.club}</p>
        <h1 className="font-display text-7xl leading-none font-black text-plate uppercase">{BRAND.name}</h1>
        <p className="mt-3 text-sm font-bold tracking-[0.2em] text-sleaze uppercase">{JOIN.kicker}</p>
        <p className="mt-2 text-base text-ink-dim">{JOIN.intro}</p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold tracking-[0.15em] text-ink-dim uppercase">{JOIN.nameLabel}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder={JOIN.namePlaceholder}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="done"
            className="min-h-14 rounded-xl bg-night-deep px-4 text-2xl font-bold text-ink ring-2 ring-tote-hi/60 outline-none ring-inset placeholder:text-void focus:ring-plate"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold tracking-[0.15em] text-ink-dim uppercase">{JOIN.colourLabel}</legend>
          <div className="grid grid-cols-4 gap-3">
            {MEMBER_COLOURS.map((c) => {
              const isTaken = taken.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  disabled={isTaken}
                  aria-pressed={c === colour}
                  aria-label={isTaken ? `${c} (${JOIN.colourTaken})` : c}
                  onClick={() => setPicked(c)}
                  style={{ backgroundColor: c }}
                  className={cx(
                    'h-14 rounded-xl transition-transform',
                    c === colour && 'scale-105 ring-4 ring-ink ring-offset-2 ring-offset-night',
                    isTaken && 'opacity-15',
                  )}
                />
              )
            })}
          </div>
          {!colour && <p className="text-sm font-semibold text-drift">{JOIN.full}</p>}
        </fieldset>

        <Button type="submit" size="lg" block loading={busy} disabled={!colour}>
          {JOIN.submit}
        </Button>
      </form>
    </main>
  )
}
