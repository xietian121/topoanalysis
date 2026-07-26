import { useMemo } from 'react'

interface DimensionScore {
  name: string
  score: number   // actual score achieved
  maxScore: number // max possible score (weight)
}

interface RadarChartProps {
  dimensions: DimensionScore[]
  size?: number
}

/**
 * SVG radar (spider) chart for multi-dimensional score visualization.
 * Pure SVG — no external chart library needed.
 */
export function RadarChart({ dimensions, size = 180 }: RadarChartProps) {
  const n = dimensions.length
  if (n < 3) return null

  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.38
  const levels = 4 // concentric grid rings

  // Precompute angles (12 o'clock start, clockwise)
  const angles = useMemo(() => {
    return dimensions.map((_, i) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2
      return { cos: Math.cos(a), sin: Math.sin(a) }
    })
  }, [dimensions, n])

  // Point on the chart for a given value (0-1 ratio) and angle
  const point = (ratio: number, angle: { cos: number; sin: number }) => ({
    x: cx + radius * ratio * angle.cos,
    y: cy + radius * ratio * angle.sin,
  })

  // Grid polygons
  const gridPolygons = useMemo(() => {
    return Array.from({ length: levels }, (_, level) => {
      const r = (level + 1) / levels
      return angles
        .map((a) => {
          const p = point(r, a)
          return `${p.x},${p.y}`
        })
        .join(' ')
    })
  }, [angles, levels, cx, cy, radius])

  // Data polygon
  const dataPolygon = useMemo(() => {
    return dimensions
      .map((dim, i) => {
        const ratio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0
        const p = point(ratio, angles[i])
        return `${p.x},${p.y}`
      })
      .join(' ')
  }, [dimensions, angles])

  // Label positions (slightly outside the chart)
  const labelPositions = useMemo(() => {
    const labelR = radius * 1.22
    return dimensions.map((dim, i) => {
      const raw = point(1, angles[i])
      const x = cx + (raw.x - cx) * (labelR / radius)
      const y = cy + (raw.y - cy) * (labelR / radius)
      // Anchor adjustment for left/right sides
      const anchor: 'start' | 'middle' | 'end' = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
      return { x, y, anchor, name: dim.name }
    })
  }, [dimensions, angles, cx, cy, radius])

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-auto max-w-[200px] mx-auto"
      role="img"
      aria-label="评测雷达图"
    >
      {/* Grid rings */}
      {gridPolygons.map((pts, i) => (
        <polygon
          key={`grid-${i}`}
          points={pts}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="0.5"
        />
      ))}

      {/* Axis lines */}
      {angles.map((a, i) => {
        const p = point(1, a)
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="0.5"
          />
        )
      })}

      {/* Data area */}
      <polygon
        points={dataPolygon}
        fill="rgba(0,113,227,0.12)"
        stroke="rgba(0,113,227,0.5)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dimensions.map((dim, i) => {
        const ratio = dim.maxScore > 0 ? dim.score / dim.maxScore : 0
        const p = point(ratio, angles[i])
        return (
          <circle
            key={`dot-${i}`}
            cx={p.x}
            cy={p.y}
            r="2.5"
            fill="#0071e3"
            stroke="white"
            strokeWidth="1"
          />
        )
      })}

      {/* Labels */}
      {labelPositions.map((lp, i) => (
        <text
          key={`label-${i}`}
          x={lp.x}
          y={lp.y}
          textAnchor={lp.anchor}
          dominantBaseline="middle"
          className="fill-text-secondary"
          style={{ fontSize: '9px', fontWeight: 500 }}
        >
          {lp.name}
        </text>
      ))}
    </svg>
  )
}
