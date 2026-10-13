import { useState, type FormEvent } from 'react'
import { identityStore } from '../lib/identity'
import { getApi } from '../lib/supabase'
import type { MemberRow } from '../lib/types'
import { ERROR_MESSAGES } from '../shared/content/errors'
import { JOIN } from '../shared/content/phone'
import { BRAND } from '../shared/content/ui'
import { cleanName, firstFreeColour, MAX_NAME_LENGTH, MEMBER_COLOURS, nameProblem } from '../shared/game/members'
import { Button, Crest, cx, toast } from '../ui'
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
    <main className="flex min-h-dvh items-center justify-center bg-rauten p-4">
      <div className="sign flex w-full max-w-md flex-col gap-6 px-5 py-7">
      <header className="flex flex-col items-center text-center">
        <Crest />
        <h1 className="mt-4 font-display text-7xl leading-none font-bold text-koenig">{BRAND.name}</h1>
        <p className="mt-3 text-lg font-bold">{JOIN.kicker}</p>
        <p className="mt-1 text-base text-weste-dim">{JOIN.intro}</p>
      </header>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="label-rule text-base">{JOIN.nameLabel}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_NAME_LENGTH}
            placeholder={JOIN.namePlaceholder}
            autoComplete="given-name"
            autoCapitalize="words"
            enterKeyHint="done"
            className="min-h-14 rounded-md bg-card px-4 text-2xl font-bold text-weste ring-2 ring-koenig/40 outline-none ring-inset placeholder:text-weste-dim/50 focus:ring-koenig"
          />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="label-rule mb-2 w-full text-base">{JOIN.colourLabel}</legend>
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
                    'h-14 rounded-md transition-transform',
                    c === colour && 'scale-105 ring-4 ring-weste ring-offset-2 ring-offset-card',
                    isTaken && 'opacity-15',
                  )}
                />
              )
            })}
          </div>
          {!colour && <p className="text-sm font-semibold text-strafe">{JOIN.full}</p>}
        </fieldset>

        <Button type="submit" size="lg" block loading={busy} disabled={!colour}>
          {JOIN.submit}
        </Button>
      </form>
      </div>
    </main>
  )
}
