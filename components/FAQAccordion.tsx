'use client'

import { useState } from 'react'
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
  return (
    <div className={`border-b border-gray-700 last:border-b-0 transition-colors duration-300 ${
      isOpen ? 'bg-gray-700' : 'bg-gray-800'
    }`}>
      <button
        onClick={onToggle}
        className={`w-full px-4 py-4 flex items-center justify-between text-left transition-colors duration-300 ${
          isOpen ? 'hover:bg-gray-600/50' : 'hover:bg-gray-700/50'
        }`}
      >
        <span className="text-white font-medium pr-4">
          <span className="text-gray-400 mr-3">{index + 1}.</span>
          {item.question}
        </span>
        <span
          className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${
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
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pl-10 prose prose-invert prose-sm max-w-none [&>*]:text-gray-400 [&_p]:text-gray-400 [&_li]:text-gray-400 [&_strong]:text-gray-300 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
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
