import { useMemo } from 'react'
import { encode } from 'uqr'
import { cx } from './cx'

/** Crisp SVG QR code. Modules use currentColor on a light ground; keep the contrast high. */
export function QrCode({ value, label, className }: { value: string; label: string; className?: string }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border: 2 })
    let d = ''
    qr.data.forEach((row, y) =>
      row.forEach((on, x) => {
        if (on) d += `M${x} ${y}h1v1h-1z`
      }),
    )
    return { size: qr.size, path: d }
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={cx('block bg-ink text-night', className)}
    >
      <path d={path} fill="currentColor" />
    </svg>
  )
}
