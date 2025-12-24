import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../i18n';

const Footer: React.FC = () => {
  const { language } = useLanguage();
  const currentYear = new Date().getFullYear();
  const t = (key: string) => getTranslation(language, key);
  const copyrightText = t('footer.copyright').replace('{year}', currentYear.toString());

  return (
    <footer className="bg-gray-900 border-t border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p className="text-center text-sm text-gray-400">
          {copyrightText}
        </p>
      </div>
    </footer>
  );
};

export default Footer;

