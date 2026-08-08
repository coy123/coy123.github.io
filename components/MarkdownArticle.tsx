import { Children, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * The renderer for the two long-form pages (/how-to-become-driver,
 * /utilities), which read a .md file at build time.
 *
 * Nearly all of the styling is plain CSS on `.rich-text` + `.article-body` in
 * globals.css — `@tailwindcss/typography` is not installed, so there is no
 * `prose` to lean on. What lives here is the two things that need extra DOM
 * rather than extra rules.
 */

/**
 * Glyphs the markdown uses in place of a bullet. They stay in the source so
 * the .md still reads as a checklist on GitHub; here they are lifted out of
 * the text into the list marker's slot, and `.article-glyph` tells the CSS to
 * drop the bullet it would otherwise draw right next to them.
 *
 * The value is the colour class, which only bites on the monochrome glyphs —
 * ✅ and ❌ are colour emoji and paint themselves.
 */
const GLYPHS: Record<string, string> = {
  '✅': '',
  '❌': '',
  '✔': 'text-green-400',
  '✓': 'text-green-400',
  '✗': 'text-red-400',
}

/** Unicode-aware, and tolerant of a trailing variation selector (`✔️`). */
const GLYPH_PATTERN = /^\s*([✅❌✔✓✗])️?\s+/u

function extractGlyph(children: ReactNode): { glyph: string | null; rest: ReactNode } {
  const nodes = Children.toArray(children)
  const [first] = nodes

  // A glyph only counts when it opens the item; anything else is body text.
  if (typeof first !== 'string') return { glyph: null, rest: children }

  const match = GLYPH_PATTERN.exec(first)
  if (!match) return { glyph: null, rest: children }

  return { glyph: match[1], rest: [first.slice(match[0].length), ...nodes.slice(1)] }
}

/* None of these spread their props: react-markdown passes the hast `node`
   along with them, and forwarding that to a DOM element makes React complain
   about an unknown attribute. Markdown-generated tables and list items carry
   nothing else worth keeping. */
const components: Components = {
  li({ children }) {
    const { glyph, rest } = extractGlyph(children)
    if (!glyph) return <li>{children}</li>

    return (
      <li className="article-glyph">
        <span
          aria-hidden="true"
          className={['article-glyph-mark', GLYPHS[glyph]].filter(Boolean).join(' ')}
        >
          {glyph}
        </span>
        {rest}
      </li>
    )
  },

  table({ children }) {
    return (
      <div className="article-table">
        <table>{children}</table>
      </div>
    )
  },
}

export default function MarkdownArticle({
  children,
  className,
}: {
  /** Raw markdown. */
  children: string
  className?: string
}) {
  return (
    <div className={['rich-text', 'article-body', className].filter(Boolean).join(' ')}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  )
}
