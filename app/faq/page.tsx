import { Metadata } from 'next'
import { getTranslations } from '@/lib/translations'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Domande frequenti sulle licenze NCC',
}

const faqs = [
  {
    question: 'Cos\'è una licenza NCC?',
    answer: 'NCC sta per Noleggio Con Conducente. È una licenza che permette di trasportare persone con un veicolo e autista, ma a differenza dei taxi, i servizi NCC devono essere prenotati in anticipo e non possono accettare corse per strada.'
  },
  {
    question: 'Quali sono i requisiti per ottenere una licenza NCC?',
    answer: 'I requisiti principali includono: età minima di 21 anni, possesso della patente di guida categoria B da almeno 3 anni, iscrizione al REN (Registro Elettronico Nazionale), possesso dell\'autorizzazione NCC rilasciata dal comune, e superamento degli esami professionali richiesti dalla regione.'
  },
  {
    question: 'Come posso partecipare a un bando NCC?',
    answer: 'Per partecipare a un bando NCC devi monitorare le pubblicazioni dei bandi sul sito del tuo comune di interesse o su questa piattaforma. Quando viene pubblicato un bando, dovrai presentare la domanda entro i termini stabiliti, allegando tutta la documentazione richiesta.'
  },
  {
    question: 'Quanto costa una licenza NCC?',
    answer: 'Il costo varia significativamente in base al comune. Alcune licenze possono essere gratuite (solo spese amministrative), mentre in altri casi possono esserci costi di rilascio. Inoltre, sul mercato secondario, le licenze NCC possono essere acquistate a prezzi che variano da decine di migliaia a centinaia di migliaia di euro, a seconda della città.'
  },
  {
    question: 'Posso usare la mia licenza NCC in tutta Italia?',
    answer: 'La licenza NCC ti permette di operare prevalentemente nel comune che l\'ha rilasciata. Tuttavia, puoi effettuare servizi in altre città se il servizio inizia o termina nel tuo comune di riferimento. Esistono regolamentazioni specifiche che variano per regione.'
  }
]

export default function FAQPage() {
  const t = getTranslations()

  return (
    <>
      {/* JSON-LD FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer,
              },
            })),
          }),
        }}
      />

      <div className="w-full max-w-4xl mx-auto lg:w-4/5 xl:w-3/4">
        <div
          className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
          style={{
            backgroundImage: 'url(/images/driver.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
            style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
            {t.pages.faq.title}
          </h1>
          <br/>
          <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
            style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
            {t.pages.faq.subtitle}
          </h2>
        </div>
        <div className="mb-6 sm:mb-8">
          <p className="text-sm sm:text-base text-gray-400 mb-6">
            {t.pages.faq.description}
          </p>

          {/* FAQ Items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-white mb-2">
                  {faq.question}
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
