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

interface UseStructuredDataProps {
  type?: 'webpage' | 'faqpage';
  breadcrumbs?: BreadcrumbItem[];
  faqs?: FAQItem[];
}

export const useStructuredData = ({ type = 'webpage', breadcrumbs, faqs }: UseStructuredDataProps) => {
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

    // Add WebPage schema
    const webPageSchema = {
      '@context': 'https://schema.org',
      '@type': type === 'faqpage' ? 'FAQPage' : 'WebPage',
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

  }, [type, breadcrumbs, faqs, language]);
};
