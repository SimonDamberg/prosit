import { useEffect, useState } from 'react'

/**
 * Keeps showing a value for `ms` after it is gone, so what it drew can leave with an animation
 * instead of a cut. `leaving` is true during that time.
 */
export function useLinger<T>(value: T | undefined, ms: number): { shown: T | undefined; leaving: boolean } {
  const [last, setLast] = useState(value)
  // Follow the value while there is one (state derived from a prop, set during render).
  if (value !== undefined && value !== last) setLast(value)

  const gone = value === undefined
  useEffect(() => {
    if (!gone) return
    const timer = setTimeout(() => setLast(undefined), ms)
    return () => clearTimeout(timer)
  }, [gone, ms])

  return { shown: value ?? last, leaving: gone && last !== undefined }
}
