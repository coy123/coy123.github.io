import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../i18n';
import { useDocumentMeta } from '../hooks/useDocumentMeta';
import { useStructuredData } from '../hooks/useStructuredData';
import driverImage from '../images/driver.png';

const RegionalLaws: React.FC = () => {
  const { language } = useLanguage();
  const t = (key: string) => getTranslation(language, key);

  useDocumentMeta({
    title: t('pages.regionalLaws.metaTitle'),
    description: t('pages.regionalLaws.metaDescription'),
  });

  useStructuredData({
    type: 'webpage',
    breadcrumbs: [
      { name: t('nav.home'), url: '/' },
      { name: t('nav.regionalLaws'), url: '/regional-laws' }
    ]
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          {t('pages.regionalLaws.title')}
        </h1>
        <p className="text-sm sm:text-base text-gray-300 mb-3 block px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          {t('pages.regionalLaws.subtitle')}
        </p>
      </div>
      <div className="mb-6 sm:mb-8">
        <p className="text-sm sm:text-base text-gray-400">
          {t('pages.regionalLaws.description')}
        </p>
      </div>
    </div>
  );
};

export default RegionalLaws;

