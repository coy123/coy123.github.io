import React, { useState, useEffect } from 'react';
import Table from '../components/Table';
import MapView from '../components/MapView';
import { TableData } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslation } from '../i18n';
import data from '../data/data.json';
import driverImage from '../images/driver.png';

const Home: React.FC = () => {
  const { language } = useLanguage();
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');

  const t = (key: string) => getTranslation(language, key);

  useEffect(() => {
    const loadData = async () => {
      try {
        const transformedData: TableData[] = data.map((item: any) => ({
          ...item,
          latitude: item.latitude ? Number(item.latitude) : undefined,
          longitude: item.longitude ? Number(item.longitude) : undefined,
        }));
        setTableData(transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"/>
          <p className="mt-4 text-gray-300">{t('table.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">
            {t('table.title')} - {t('table.loading')}
          </div>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

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
          {t('pages.home.title')}
        </h1>
        <p className="text-sm sm:text-base text-gray-300 mb-3 inline-block px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          {t('pages.home.subtitle')}
        </p>
        <p className="text-sm sm:text-base text-gray-200 block px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
          {t('pages.home.description')}
        </p>
      </div>
      <div className="bg-gray-700 rounded-lg shadow-sm p-4 sm:p-6">
        <div className="mb-4">
          <div className="w-full rounded-lg bg-gray-800 p-1 flex">
            {(['table', 'map'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {t(`dashboard.tabs.${tab}`)}
                </button>
              );
            })}
          </div>
        </div>
        {activeTab === 'table' ? <Table data={tableData}/> : <MapView data={tableData}/>}
      </div>
    </div>
  );
};

export default Home;

