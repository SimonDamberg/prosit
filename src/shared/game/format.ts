// Swedish display formatting. Thousands are grouped with a no-break space so "1 000" never wraps.

const NBSP = '\u00a0'

/** 12345 -> "12 345" */
export function fmtInt(n: number): string {
  const r = Math.round(n)
  const sign = r < 0 ? '-' : ''
  return (
    sign +
    Math.abs(r)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP)
  )
}

/** 47 -> "0:47" */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Centilitres as litres with a Swedish decimal comma: 354 -> "3,5". */
export function fmtLitres(cl: number, decimals = 1): string {
  const [whole, frac] = (Math.max(0, cl) / 100).toFixed(decimals).split('.')
  return frac ? `${fmtInt(Number(whole))},${frac}` : fmtInt(Number(whole))
}
