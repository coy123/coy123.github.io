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
  image?: string;
  additionalMeta?: MetaTag[];
}

export const useDocumentMeta = ({ title, description, image, additionalMeta = [] }: UseDocumentMetaProps) => {
  const { language } = useLanguage();

  useEffect(() => {
    // Update document title
    const siteTitle = translations[language].nav.title;
    document.title = `${title} | ${siteTitle}`;

    // Get base URL and image
    const baseUrl = window.location.origin;
    const ogImage = image || `${baseUrl}/og-image.svg`;
    const canonicalUrl = window.location.href;

    // Map language code to locale
    const localeMap: Record<string, string> = {
      it: 'it_IT',
      en: 'en_US',
    };
    const ogLocale = localeMap[language] || 'it_IT';

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
    updateMetaTag('og:url', canonicalUrl);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:image:width', '1200');
    updateMetaTag('og:image:height', '630');
    updateMetaTag('og:image:type', 'image/svg+xml');
    updateMetaTag('og:locale', ogLocale);
    updateMetaTag('og:site_name', siteTitle);

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
    updateTwitterTag('twitter:image', ogImage);

    // Handle additional meta tags
    additionalMeta.forEach(({ name, property, content }) => {
      if (name) {
        updateTwitterTag(name, content);
      } else if (property) {
        updateMetaTag(property, content);
      }
    });

    // Update or create canonical link tag
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    // Remove query parameters and hash from canonical URL
    const cleanUrl = `${baseUrl}${window.location.pathname}`;
    canonicalLink.setAttribute('href', cleanUrl);

    // Remove existing hreflang tags
    const existingHreflangTags = document.querySelectorAll('link[rel="alternate"][hreflang]');
    existingHreflangTags.forEach(tag => tag.remove());

    // Add hreflang tags for all supported languages
    const languages = ['it', 'en'];
    const currentPath = window.location.pathname;

    languages.forEach(lang => {
      const hreflangLink = document.createElement('link');
      hreflangLink.setAttribute('rel', 'alternate');
      hreflangLink.setAttribute('hreflang', lang);
      hreflangLink.setAttribute('href', `${baseUrl}${currentPath}`);
      document.head.appendChild(hreflangLink);
    });

    // Add x-default hreflang (points to Italian as default)
    const xDefaultLink = document.createElement('link');
    xDefaultLink.setAttribute('rel', 'alternate');
    xDefaultLink.setAttribute('hreflang', 'x-default');
    xDefaultLink.setAttribute('href', `${baseUrl}${currentPath}`);
    document.head.appendChild(xDefaultLink);

    // Add og:locale:alternate for other language
    const alternateLanguage = language === 'it' ? 'en' : 'it';
    const alternateLocale = localeMap[alternateLanguage];
    updateMetaTag('og:locale:alternate', alternateLocale);

    // Update html lang attribute
    document.documentElement.lang = language;
  }, [title, description, image, language, additionalMeta]);
};
