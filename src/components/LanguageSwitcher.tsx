import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher: React.FC = () => {
  const isDevEnvironment =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]');

  if (!isDevEnvironment) {
    return null;
  }
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'it' : 'en');
  };

  return (
    <button
      onClick={toggleLanguage}
      className="fixed top-20 right-4 z-50 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-md border border-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      <span className="flex items-center gap-1">
        <span>{language === 'en' ? '🇬🇧' : '🇮🇹'}</span>
        <span>{language.toUpperCase()}</span>
      </span>
    </button>
  );
};

export default LanguageSwitcher;