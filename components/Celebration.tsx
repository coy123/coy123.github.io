/**
 * One-shot confetti burst plus a few balloons drifting up the sides, for the
 * post-payment page.
 *
 * Purely decorative, so it is `aria-hidden` and `pointer-events-none`: it must
 * never intercept a click meant for the content underneath, and a screen reader
 * should hear the confirmation copy and nothing else. `overflow-hidden` on the
 * fixed wrapper keeps a drifting piece from widening the document.
 *
 * No library and no client component. `canvas-confetti` is the usual answer and
 * it is ~5 KB, but it needs a `useEffect` on a page that is otherwise fully
 * static, and CSS transforms give the same effect on the compositor. Everything
 * here is prerendered at build time.
 *
 * Positions come from a hash of the piece index rather than `Math.random()`.
 * With `output: 'export'` the page is rendered once at build time, so random
 * values would be frozen into a single fixed pattern anyway — this way the
 * pattern is at least reproducible between builds.
 */
const CONFETTI_PIECES = 40
const BALLOONS_PER_SIDE = 3

/** Deterministic 0–1 from an integer. */
const scatter = (seed: number): number => {
  const value = Math.sin(seed * 12.9898) * 43758.5453
  return value - Math.floor(value)
}

const CONFETTI_COLORS = [
  '#fcd34d', // amber-300, the wordmark accent
  '#3b82f6', // blue-500, the CTA
  '#4ade80', // green-400, an active deadline
  '#f472b6', // pink-400
  '#f8fafc', // slate-50
]

export default function Celebration() {
  const confetti = Array.from({ length: CONFETTI_PIECES }, (_, index) => {
    const across = scatter(index + 1)
    const size = 6 + scatter(index + 2) * 8

    return {
      key: `confetti-${index}`,
      style: {
        left: `${across * 100}%`,
        width: `${size}px`,
        // Ribbons rather than squares: a taller-than-wide piece reads as
        // confetti while it tumbles.
        height: `${size * (1.4 + scatter(index + 3))}px`,
        backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        borderRadius: index % 3 === 0 ? '9999px' : '2px',
        '--drift': `${(scatter(index + 4) - 0.5) * 220}px`,
        '--spin': `${540 + scatter(index + 5) * 900}deg`,
        '--duration': `${3.4 + scatter(index + 6) * 2.6}s`,
        '--delay': `${scatter(index + 7) * 2.2}s`,
      } as React.CSSProperties,
    }
  })

  const balloons = (['left', 'right'] as const).flatMap((side, sideIndex) =>
    Array.from({ length: BALLOONS_PER_SIDE }, (_, index) => {
      const seed = sideIndex * 10 + index + 1

      return {
        key: `balloon-${side}-${index}`,
        style: {
          [side]: `${2 + scatter(seed) * 7}%`,
          bottom: 0,
          fontSize: `${2.5 + scatter(seed + 1) * 1.6}rem`,
          '--sway': `${(scatter(seed + 2) - 0.5) * 120}px`,
          '--duration': `${9 + scatter(seed + 3) * 5}s`,
          '--delay': `${scatter(seed + 4) * 3}s`,
        } as React.CSSProperties,
        emoji: index % 2 === 0 ? '🎈' : '🎊',
      }
    })
  )

  return (
    <div
      className="celebration fixed inset-0 overflow-hidden pointer-events-none z-30"
      aria-hidden="true"
    >
      {confetti.map((piece) => (
        <span key={piece.key} className="confetti-piece absolute top-0" style={piece.style} />
      ))}
      {/* Balloons are a desktop touch: on a phone the columns they rise
          through are the content itself, and they read as clutter. */}
      {balloons.map((balloon) => (
        <span
          key={balloon.key}
          className="balloon absolute hidden lg:block select-none"
          style={balloon.style}
        >
          {balloon.emoji}
        </span>
      ))}
    </div>
  )
}
