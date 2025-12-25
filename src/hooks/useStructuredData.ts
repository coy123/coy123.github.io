import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../i18n';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface DatasetItem {
  location: string;
  amount: number;
  deadline: string;
  url: string;
  image?: string;
}

interface UseStructuredDataProps {
  type?: 'webpage' | 'faqpage' | 'dataset';
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
  dataset?: {
    name: string;
    description: string;
    items: DatasetItem[];
  };
}

export const useStructuredData = ({ type = 'webpage', breadcrumbs, faqs, dataset }: UseStructuredDataProps) => {
  const { language } = useLanguage();

  useEffect(() => {
    const baseUrl = window.location.origin;
    const siteTitle = translations[language].nav.title;

    // Remove existing structured data scripts (except the one in index.html)
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-dynamic="true"]');
    existingScripts.forEach(script => script.remove());

    // Add BreadcrumbList schema if breadcrumbs are provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbs.map((item, index) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'name': item.name,
          'item': `${baseUrl}${item.url}`
        }))
      };

      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.setAttribute('data-dynamic', 'true');
      breadcrumbScript.textContent = JSON.stringify(breadcrumbSchema);
      document.head.appendChild(breadcrumbScript);
    }

    // Add FAQPage schema if FAQs are provided
    if (type === 'faqpage' && faqs && faqs.length > 0) {
      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqs.map(faq => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      };

      const faqScript = document.createElement('script');
      faqScript.type = 'application/ld+json';
      faqScript.setAttribute('data-dynamic', 'true');
      faqScript.textContent = JSON.stringify(faqSchema);
      document.head.appendChild(faqScript);
    }

    // Add Dataset schema if dataset is provided
    if (type === 'dataset' && dataset && dataset.items.length > 0) {
      const datasetSchema = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        'name': dataset.name,
        'description': dataset.description,
        'url': window.location.href,
        'keywords': ['NCC licenses', 'Italy', 'tenders', 'municipal licenses', 'transportation'],
        'license': 'https://creativecommons.org/publicdomain/zero/1.0/',
        'isAccessibleForFree': true,
        'creator': {
          '@type': 'Organization',
          'name': siteTitle,
          'url': baseUrl
        },
        'distribution': [
          {
            '@type': 'DataDownload',
            'encodingFormat': 'text/html',
            'contentUrl': window.location.href
          }
        ],
        'temporalCoverage': `${new Date().getFullYear()}`,
        'spatialCoverage': {
          '@type': 'Place',
          'geo': {
            '@type': 'GeoCoordinates',
            'latitude': 41.8719,
            'longitude': 12.5674
          },
          'name': 'Italy'
        }
      };

      const datasetScript = document.createElement('script');
      datasetScript.type = 'application/ld+json';
      datasetScript.setAttribute('data-dynamic', 'true');
      datasetScript.textContent = JSON.stringify(datasetSchema);
      document.head.appendChild(datasetScript);

      // Add ItemList schema for the licenses
      const itemListSchema = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        'name': dataset.name,
        'description': dataset.description,
        'numberOfItems': dataset.items.length,
        'itemListElement': dataset.items.map((item, index) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'item': {
            '@type': 'GovernmentService',
            'name': `NCC License - ${item.location}`,
            'provider': {
              '@type': 'GovernmentOrganization',
              'name': item.location
            },
            'serviceType': 'NCC License Application',
            'areaServed': {
              '@type': 'City',
              'name': item.location
            },
            'availableChannel': {
              '@type': 'ServiceChannel',
              'serviceUrl': item.url
            },
            'termsOfService': item.url,
            'availabilityStarts': new Date().toISOString().split('T')[0],
            'availabilityEnds': item.deadline,
            'additionalProperty': [
              {
                '@type': 'PropertyValue',
                'name': 'Number of Licenses',
                'value': item.amount
              },
              {
                '@type': 'PropertyValue',
                'name': 'Deadline',
                'value': item.deadline
              }
            ]
          }
        }))
      };

      const itemListScript = document.createElement('script');
      itemListScript.type = 'application/ld+json';
      itemListScript.setAttribute('data-dynamic', 'true');
      itemListScript.textContent = JSON.stringify(itemListSchema);
      document.head.appendChild(itemListScript);

      // Add Table schema
      const tableSchema = {
        '@context': 'https://schema.org',
        '@type': 'Table',
        'about': {
          '@type': 'Dataset',
          'name': dataset.name,
          'description': dataset.description
        }
      };

      const tableScript = document.createElement('script');
      tableScript.type = 'application/ld+json';
      tableScript.setAttribute('data-dynamic', 'true');
      tableScript.textContent = JSON.stringify(tableSchema);
      document.head.appendChild(tableScript);
    }

    // Add WebPage schema
    const webPageSchema = {
      '@context': 'https://schema.org',
      '@type': type === 'faqpage' ? 'FAQPage' : (type === 'dataset' ? 'CollectionPage' : 'WebPage'),
      'name': document.title,
      'description': document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      'url': window.location.href,
      'inLanguage': language,
      'isPartOf': {
        '@type': 'WebSite',
        'name': siteTitle,
        'url': baseUrl
      }
    };

    const webPageScript = document.createElement('script');
    webPageScript.type = 'application/ld+json';
    webPageScript.setAttribute('data-dynamic', 'true');
    webPageScript.textContent = JSON.stringify(webPageSchema);
    document.head.appendChild(webPageScript);

  }, [type, breadcrumbs, faqs, dataset, language]);
};
