'use client'

import { useId, useState } from 'react'
import ReactMarkdown from 'react-markdown'

interface FAQItem {
  question: string
  answer: string
}

interface FAQItemProps {
  item: FAQItem
  index: number
  isOpen: boolean
  onToggle: () => void
}

function FAQItemComponent({ item, index, isOpen, onToggle }: FAQItemProps) {
  // `useId` rather than the array index: these ids cross the SSR/hydration
  // boundary, and both accordions on /faq (18 FAQ entries, then 15 glossary
  // terms) would otherwise emit the same set of ids on one page.
  const id = useId()
  const buttonId = `${id}-toggle`
  const panelId = `${id}-panel`

  return (
    <div className={`border-b border-gray-700 last:border-b-0 transition-colors duration-300 ${
      isOpen ? 'bg-gray-700' : 'bg-gray-800'
    }`}>
      <button
        id={buttonId}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className={`w-full px-4 py-4 flex items-center justify-between text-left transition-colors duration-300 ${
          isOpen ? 'hover:bg-gray-600/50' : 'hover:bg-gray-700/50'
        }`}
      >
        <span className="text-white font-medium pr-4">
          <span className="text-white mr-3">{index + 1}.</span>
          {item.question}
        </span>
        <span
          className={`text-white transition-transform duration-300 flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </button>
      {/* `invisible` when closed, and it is load-bearing rather than cosmetic.
          `grid-rows-[0fr]` + `opacity-0` collapse the panel to nothing visible,
          but the answer stays in the DOM, in the tab order and in the
          accessibility tree — so a keyboard user tabbing through /faq was
          dragged through the links buried in every closed answer, and a screen
          reader read all 33 answers as continuous page content with nothing to
          say which were collapsed.

          `visibility: hidden` is what actually removes both. It is used here
          instead of `hidden`/`inert` because it keeps the animation: CSS gives
          `visibility` a special transition rule — when either endpoint is
          `visible`, `visible` holds for the whole duration and the flip happens
          at the very end. So the answer stays on screen while it collapses and
          only leaves the tab order once it is gone, and on opening it is
          available immediately. (`inert` would be the modern spelling, but as a
          boolean prop it needs React 19; this project is on 18.3.1.)

          No `role="region"` on the panel: the WAI-ARIA accordion pattern
          recommends it but explicitly warns against landmark proliferation past
          roughly six panels, and this page renders 33. */}
      <div
        id={panelId}
        aria-labelledby={buttonId}
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 visible' : 'grid-rows-[0fr] opacity-0 invisible'
        }`}
      >
        <div className="overflow-hidden">
          {/* `rich-text` carries the whole answer's typography (globals.css).
              Most answers run to several paragraphs, which preflight would
              otherwise jam into one block. */}
          <div className="px-4 pb-4 pl-10 rich-text text-sm">
            <ReactMarkdown>{item.answer}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

interface FAQAccordionProps {
  items: FAQItem[]
}

export default function FAQAccordion({ items }: FAQAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden border-solid border-white border-2">
      {items.map((item, index) => (
        <FAQItemComponent
          key={index}
          item={item}
          index={index}
          isOpen={openIndex === index}
          onToggle={() => handleToggle(index)}
        />
      ))}
    </div>
  )
}
