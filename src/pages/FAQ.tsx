import React from 'react';
import {useLanguage} from '../contexts/LanguageContext';
import {getTranslation} from '../i18n';
import {useDocumentMeta} from '../hooks/useDocumentMeta';
import {useStructuredData} from '../hooks/useStructuredData';
import driverImage from '../images/driver.png';

const FAQ: React.FC = () => {
    const {language} = useLanguage();
    const t = (key: string) => getTranslation(language, key);

    // Define FAQs for structured data
    const faqs = language === 'it' ? [
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
    ] : [
        {
            question: 'What is an NCC license?',
            answer: 'NCC stands for "Noleggio Con Conducente" (Rental with Driver). It is a license that allows you to transport people with a vehicle and driver, but unlike taxis, NCC services must be booked in advance and cannot accept street hails.'
        },
        {
            question: 'What are the requirements to obtain an NCC license?',
            answer: 'Main requirements include: minimum age of 21 years, possession of a category B driving license for at least 3 years, registration in the REN (National Electronic Register), possession of NCC authorization issued by the municipality, and passing professional exams required by the region.'
        },
        {
            question: 'How can I participate in an NCC tender?',
            answer: 'To participate in an NCC tender, you must monitor tender publications on your municipality\'s website or on this platform. When a tender is published, you must submit your application within the established deadlines, attaching all required documentation.'
        },
        {
            question: 'How much does an NCC license cost?',
            answer: 'The cost varies significantly depending on the municipality. Some licenses may be free (only administrative fees), while in other cases there may be issuance costs. Additionally, on the secondary market, NCC licenses can be purchased at prices ranging from tens of thousands to hundreds of thousands of euros, depending on the city.'
        },
        {
            question: 'Can I use my NCC license throughout Italy?',
            answer: 'The NCC license allows you to operate primarily in the municipality that issued it. However, you can provide services in other cities if the service starts or ends in your reference municipality. There are specific regulations that vary by region.'
        }
    ];

    useDocumentMeta({
        title: t('pages.faq.metaTitle'),
        description: t('pages.faq.metaDescription'),
    });

    useStructuredData({
        type: 'faqpage',
        breadcrumbs: [
            {name: t('nav.home'), url: '/'},
            {name: t('nav.faq'), url: '/faq'}
        ],
        faqs: faqs
    });

    return (
        <div className="w-full max-w-4xl mx-auto lg:w-4/5 xl:w-3/4">
            <div
                className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
                style={{
                    backgroundImage: `url(${driverImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                }}
            >
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
                    style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
                    {t('pages.faq.title')}
                </h1>
                <br/>
                <h2 className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
                    style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
                    {t('pages.faq.subtitle')}
                </h2>
            </div>
            <div className="mb-6 sm:mb-8">
                <p className="text-sm sm:text-base text-gray-400 mb-6">
                    {t('pages.faq.description')}
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
    );
};

export default FAQ;

