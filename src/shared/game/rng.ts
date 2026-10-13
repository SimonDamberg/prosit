// Seeded RNG. All game randomness goes through an Rng so the event schedule is reproducible.

export interface Rng {
  /** Float in [0, 1). */
  next(): number
  /** Float in [a, b). */
  float(a: number, b: number): number
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number
  pick<T>(arr: readonly T[]): T
  /** Returns a shuffled copy (Fisher-Yates). The input is not mutated. */
  shuffle<T>(arr: readonly T[]): T[]
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed: number): Rng {
  const next = mulberry32(seed)
  const int = (maxExclusive: number) => Math.floor(next() * maxExclusive)
  return {
    next,
    float: (a, b) => a + next() * (b - a),
    int,
    pick: (arr) => arr[int(arr.length)],
    shuffle: (arr) => {
      const out = arr.slice()
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(i + 1)
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    },
  }
}

/** The only impure export: a fresh random 31-bit seed (fits Postgres int). */
export function randomSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] >>> 1
}
