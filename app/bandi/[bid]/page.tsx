import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import data from '@/data/data.json'
import laws from '@/data/laws.json'
import { getTranslations } from '@/lib/translations'
import AuthorBox from '@/components/AuthorBox'
import { toSlug } from '@/lib/slug'
import BidStatus from './BidStatus'
import BidDetailMapWrapper from './BidDetailMapWrapper'

function findBid(slug: string) {
  return data.find((item) => toSlug(item.location) === slug)
}

function findLaw(location: string) {
  return laws.find((law) => location.toLowerCase().includes(law.location.toLowerCase()))
}

export async function generateStaticParams() {
  return data.map((item) => ({
    bid: toSlug(item.location),
  }))
}

export async function generateMetadata({ params }: { params: Promise<{ bid: string }> }): Promise<Metadata> {
  const { bid: slug } = await params
  const bid = findBid(slug)
  if (!bid) return { title: 'Bando non trovato' }

  const t = getTranslations()
  return {
    title: `Bando NCC ${bid.location}`,
    description: t.pages.bidDetail.metaDescription
      .replace('{location}', bid.location)
      .replace('{amount}', String(bid.amount))
      .replace('{deadline}', bid.deadline),
  }
}

export default async function BidDetailPage({ params }: { params: Promise<{ bid: string }> }) {
  const { bid: slug } = await params
  const bid = findBid(slug)
  if (!bid) notFound()

  const t = getTranslations()
  const law = findLaw(bid.location)
  const hasCoordinates = bid.latitude && bid.longitude

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const bidSchema = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name: `Bando NCC – ${bid.location}`,
    description: `Bando di concorso per ${bid.amount} licenze NCC nel comune di ${bid.location}. Scadenza: ${formatDate(bid.deadline)}.`,
    serviceType: 'Rilascio licenze NCC',
    provider: {
      '@type': 'GovernmentOrganization',
      name: `Comune di ${bid.location}`,
    },
    areaServed: {
      '@type': 'City',
      name: bid.location,
      ...(hasCoordinates && {
        geo: {
          '@type': 'GeoCoordinates',
          latitude: Number(bid.latitude),
          longitude: Number(bid.longitude),
        },
      }),
    },
    url: bid.url,
  }

  return (
      <div className="w-full mx-auto">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bidSchema) }}
      />
      {/* Hero Section */}
      <div
        className="mb-3 relative rounded-lg overflow-hidden p-4 sm:p-6"
        style={{
          backgroundImage: 'url(/images/driver.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <h1
          className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          Bando NCC – {bid.location}
        </h1>
        <br />
        <h2
          className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          {t.pages.bidDetail.subtitle}
        </h2>
      </div>

      {/* Bid Details Card */}
      <div className="bg-gray-700 rounded-lg p-4 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
          <div className="flex-shrink-0 flex justify-center sm:justify-start">
            <img
              src={bid.image}
              alt={`Stemma ${bid.location}`}
              className="w-20 h-20 rounded-full object-cover"
            />
          </div>
          <div className="flex-1 space-y-3">
            <h3 className="text-xl font-semibold text-white text-center sm:text-left">
              {bid.location}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-sm text-white">{t.pages.bidDetail.labels.licensesAvailable}</span>
                <p className="text-lg font-semibold text-green-400">
                  {new Intl.NumberFormat('de-DE').format(bid.amount)}
                </p>
              </div>
              <div>
                <span className="text-sm text-white">{t.pages.bidDetail.labels.deadline}</span>
                <p className="text-lg font-semibold text-white">{formatDate(bid.deadline)}</p>
              </div>
              <div>
                <span className="text-sm text-white">{t.pages.bidDetail.labels.status}</span>
                <BidStatus deadline={bid.deadline} activeLabel={t.pages.bidDetail.labels.active} expiredLabel={t.pages.bidDetail.labels.expired} />
              </div>
              <div>
                <span className="text-sm text-white">{t.pages.bidDetail.labels.officialSource}</span>
                <p className="mt-1">
                  <a
                    href={bid.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    {t.pages.bidDetail.labels.viewBid} ↗
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      {hasCoordinates && (
        <div className="mb-6">
          <BidDetailMapWrapper
            latitude={Number(bid.latitude)}
            longitude={Number(bid.longitude)}
            location={bid.location}
          />
        </div>
      )}

      {/* Regional Law */}
      {law && (
        <div className="bg-gray-700 rounded-lg p-4 sm:p-6 mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {t.pages.bidDetail.labels.localRegulation}
          </h3>
          <div className="flex items-center gap-3">
            <img
              src={law.image}
              alt={`Stemma ${law.location}`}
              className="w-8 h-8 rounded-full object-cover"
            />
            <a
              href={law.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Regolamento NCC – {law.location} ↗
            </a>
          </div>
        </div>
      )}

      {/* Informational Sections */}
      <div className="space-y-6 mb-6">
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {t.pages.bidDetail.whatIsNcc.heading}
          </h3>
          <p className="text-sm sm:text-base text-white">
            {t.pages.bidDetail.whatIsNcc.content}
          </p>
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
            {t.pages.bidDetail.howToParticipate.heading}
          </h3>
          <p className="text-sm sm:text-base text-white">
            {t.pages.bidDetail.howToParticipate.content}
          </p>
          <p className="mt-2 text-sm">
            <Link href="/how-to-become-driver" className="text-blue-400 hover:text-blue-300 transition-colors">
              Leggi la guida completa per diventare autista NCC →
            </Link>
          </p>
        </div>
      </div>

      <AuthorBox />

      {/* Internal links */}
      <div className="mb-6 bg-gray-700 rounded-lg p-4 sm:p-6 space-y-2">
        <h3 className="text-lg font-semibold text-white mb-3">Esplora</h3>
        <p className="text-sm">
          <Link href="/" className="text-blue-400 hover:text-blue-300 transition-colors">
            ← Torna alla lista dei bandi
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/regional-laws" className="text-blue-400 hover:text-blue-300 transition-colors">
            Leggi regionali e normative NCC →
          </Link>
        </p>
        <p className="text-sm">
          <Link href="/income-calculator" className="text-blue-400 hover:text-blue-300 transition-colors">
            Calcola i tuoi potenziali guadagni →
          </Link>
        </p>
      </div>
    </div>
  )
}
