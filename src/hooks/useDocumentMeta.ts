import { useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../i18n';

interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

interface UseDocumentMetaProps {
  title: string;
  description: string;
  additionalMeta?: MetaTag[];
}

export const useDocumentMeta = ({ title, description, additionalMeta = [] }: UseDocumentMetaProps) => {
  const { language } = useLanguage();

  useEffect(() => {
    // Update document title
    const siteTitle = translations[language].nav.title;
    document.title = `${title} | ${siteTitle}`;

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Update Open Graph tags
    const updateMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateMetaTag('og:title', `${title} | ${siteTitle}`);
    updateMetaTag('og:description', description);
    updateMetaTag('og:type', 'website');
    updateMetaTag('og:url', window.location.href);

    // Twitter Card tags
    const updateTwitterTag = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    updateTwitterTag('twitter:card', 'summary_large_image');
    updateTwitterTag('twitter:title', `${title} | ${siteTitle}`);
    updateTwitterTag('twitter:description', description);

    // Handle additional meta tags
    additionalMeta.forEach(({ name, property, content }) => {
      if (name) {
        updateTwitterTag(name, content);
      } else if (property) {
        updateMetaTag(property, content);
      }
    });

    // Update html lang attribute
    document.documentElement.lang = language;
  }, [title, description, language, additionalMeta]);
};
