// The finished protocol as a PNG, for the group chat: drawn on a canvas in the club's colours and
// type, then handed to the share sheet (or downloaded where there is none).
import type { MemberRow } from '../lib/types'
import { AWARDS } from '../shared/content/awards'
import { PROTOCOL_SHARE } from '../shared/content/phone'
import { BRAND } from '../shared/content/ui'
import type { ProtocolRow } from '../shared/game/awards'
import { fmtLitres } from '../shared/game/format'

const W = 1080
const H = 1350
const PAD = 72

/** The design tokens from src/index.css, read where they are defined so the image matches the app. */
function tokens() {
  const css = getComputedStyle(document.documentElement)
  const get = (name: string) => css.getPropertyValue(`--color-${name}`).trim()
  return {
    paper: get('paper'),
    paperDeep: get('paper-deep'),
    card: get('card'),
    himmel: get('himmel'),
    koenig: get('koenig'),
    weste: get('weste'),
    westeDim: get('weste-dim'),
    messing: get('messing'),
    messingDeep: get('messing-deep'),
    strafe: get('strafe'),
    display: css.getPropertyValue('--font-display').trim(),
    body: css.getPropertyValue('--font-body').trim(),
  }
}

/** One row of white and blue lozenges, the tablecloth trim. */
function rauten(ctx: CanvasRenderingContext2D, y: number, size: number, blue: string, white: string) {
  ctx.fillStyle = white
  ctx.fillRect(0, y, W, size)
  ctx.fillStyle = blue
  for (let x = -size / 2; x < W + size; x += size) {
    ctx.beginPath()
    ctx.moveTo(x, y + size / 2)
    ctx.lineTo(x + size / 2, y)
    ctx.lineTo(x + size, y + size / 2)
    ctx.lineTo(x + size / 2, y + size)
    ctx.closePath()
    ctx.fill()
  }
}

/** Shrinks `text` with an ellipsis until it fits `max` pixels at the current font. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}...`).width > max) t = t.slice(0, -1)
  return `${t}...`
}

/** Draws the protocol and returns it as a PNG. */
export async function drawProtocol(rows: readonly ProtocolRow[], members: readonly MemberRow[], date: Date): Promise<Blob> {
  const t = tokens()
  // Canvas text does not wait for web fonts: load the two the club uses first.
  await Promise.all([document.fonts.load(`700 80px ${t.display}`), document.fonts.load(`700 40px ${t.body}`), document.fonts.load(`900 40px ${t.body}`)])

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas')

  ctx.fillStyle = t.paper
  ctx.fillRect(0, 0, W, H)
  rauten(ctx, 0, 56, t.himmel, t.card)
  rauten(ctx, H - 56, 56, t.himmel, t.card)

  // The card.
  const top = 104
  const bottom = H - 104
  ctx.fillStyle = t.card
  ctx.fillRect(PAD / 2, top, W - PAD, bottom - top)
  ctx.strokeStyle = t.koenig
  ctx.lineWidth = 4
  ctx.strokeRect(PAD / 2, top, W - PAD, bottom - top)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = t.koenig
  ctx.font = `700 112px ${t.display}`
  ctx.fillText(BRAND.name, W / 2, top + 130)
  ctx.font = `700 52px ${t.display}`
  ctx.fillStyle = t.weste
  ctx.fillText(`${BRAND.club} · ${PROTOCOL_SHARE.heading}`, W / 2, top + 200)
  ctx.font = `700 26px ${t.body}`
  ctx.fillStyle = t.messingDeep
  ctx.fillText(`${BRAND.motto.toUpperCase()} · ${date.toLocaleDateString('sv-SE')}`, W / 2, top + 244)

  // Column heads.
  const colLitres = W - PAD - 330
  const colPoints = W - PAD - 175
  const colStrafen = W - PAD - 20
  let y = top + 320
  ctx.font = `700 26px ${t.body}`
  ctx.fillStyle = t.westeDim
  ctx.textAlign = 'right'
  ctx.fillText(PROTOCOL_SHARE.columns.litres, colLitres, y)
  ctx.fillText(PROTOCOL_SHARE.columns.points, colPoints, y)
  ctx.fillText(PROTOCOL_SHARE.columns.strafen, colStrafen, y)
  ctx.fillStyle = t.koenig
  ctx.fillRect(PAD, y + 14, W - 2 * PAD, 4)

  // One line per member, and their honours under the name.
  const space = bottom - 110 - (y + 30)
  const step = Math.min(118, space / Math.max(1, rows.length))
  y += 30
  rows.forEach((row, i) => {
    const member = members.find((m) => m.id === row.memberId)
    if (!member) return
    const base = y + step * i + step * 0.55
    ctx.textAlign = 'left'
    ctx.font = `900 34px ${t.body}`
    ctx.fillStyle = t.westeDim
    ctx.fillText(`${i + 1}.`, PAD, base)
    ctx.fillStyle = member.colour
    ctx.beginPath()
    ctx.arc(PAD + 70, base - 12, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = `700 58px ${t.display}`
    ctx.fillText(fit(ctx, member.name, colLitres - PAD - 230), PAD + 100, base)
    if (row.awards.length > 0) {
      ctx.font = `700 22px ${t.body}`
      ctx.fillStyle = t.messingDeep
      ctx.fillText(fit(ctx, row.awards.map((k) => AWARDS[k].title).join(' · '), colStrafen - PAD - 100), PAD + 100, base + 32)
    }
    ctx.textAlign = 'right'
    ctx.font = `900 40px ${t.body}`
    ctx.fillStyle = t.koenig
    ctx.fillText(fmtLitres(row.cl, 2), colLitres, base)
    ctx.fillText(String(row.points), colPoints, base)
    ctx.fillStyle = row.strafen > 0 ? t.strafe : t.westeDim
    ctx.fillText(String(row.strafen), colStrafen, base)
  })

  ctx.textAlign = 'center'
  ctx.font = `700 26px ${t.body}`
  ctx.fillStyle = t.westeDim
  ctx.fillText(PROTOCOL_SHARE.footer, W / 2, bottom - 50)

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('png'))), 'image/png'))
}

/** Shares the PNG where the phone can, else downloads it. False if the member cancelled the sheet. */
export async function shareProtocol(png: Blob): Promise<boolean> {
  const file = new File([png], PROTOCOL_SHARE.fileName, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: PROTOCOL_SHARE.shareTitle })
      return true
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return false
      throw err
    }
  }
  const url = URL.createObjectURL(png)
  const a = document.createElement('a')
  a.href = url
  a.download = PROTOCOL_SHARE.fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
