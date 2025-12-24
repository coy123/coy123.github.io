import enTranslations from './locales/en.json';
import itTranslations from './locales/it.json';

export type Language = 'en' | 'it';

export interface Translations {
  nav: {
    home: string;
    howToBecomeDriver: string;
    regionalLaws: string;
    utilities: string;
    about: string;
    faq: string;
    openMenu: string;
    title: string;
  };
  dashboard: {
    title: string;
    subtitle: string;
    description?: string;
    tabs?: {
      table: string;
      map: string;
      mapComingSoon?: string;
    };
  };
  pages: {
    home: {
      title: string;
      subtitle: string;
      description: string;
    };
    howToBecomeDriver: {
      title: string;
      subtitle: string;
      description: string;
    };
    regionalLaws: {
      title: string;
      subtitle: string;
      description: string;
    };
    utilities: {
      title: string;
      subtitle: string;
      description: string;
    };
    about: {
      title: string;
      subtitle: string;
      description: string;
    };
    faq: {
      title: string;
      subtitle: string;
      description: string;
    };
  };
  table: {
    title: string;
    headers: {
      crest: string;
      location: string;
      amount: string;
      deadline: string;
      view: string;
    };
    loading: string;
    lastUpdated: string;
  };
  language: {
    switch: string;
  };
  footer: {
    copyright: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: enTranslations,
  it: itTranslations,
};

export const defaultLanguage: Language = 'it';

export const getTranslation = (language: Language, key: string): string => {
  const keys = key.split('.');
  let value: any = translations[language];

  for (const k of keys) {
    value = value?.[k];
  }

  return value || key;
};