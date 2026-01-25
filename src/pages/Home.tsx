import React, {useState, useEffect, useMemo, lazy, Suspense} from 'react';
import Table from '../components/Table';
import {TableData} from '../types';
import {useLanguage} from '../contexts/LanguageContext';
import {getTranslation} from '../i18n';
import {useDocumentMeta} from '../hooks/useDocumentMeta';
import {useStructuredData} from '../hooks/useStructuredData';
import data from '../data/data.json';
import driverImage from '../images/driver.png';

// Lazy load MapView only when map tab is active
const MapView = lazy(() => import('../components/MapView'));

const Home: React.FC = () => {
    const {language} = useLanguage();
    const [tableData, setTableData] = useState<TableData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'table' | 'map'>('table');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const t = (key: string) => getTranslation(language, key);

    useDocumentMeta({
        title: t('pages.home.metaTitle'),
        description: t('pages.home.metaDescription'),
        isHomepage: true,
    });

    useStructuredData({
        type: 'dataset',
        breadcrumbs: [
            {name: t('nav.home'), url: '/'}
        ],
        dataset: {
            name: language === 'it'
                ? 'Database Bandi e Licenze NCC in Italia'
                : 'NCC Licenses and Tenders Database in Italy',
            description: language === 'it'
                ? 'Raccolta completa di tutti i bandi e le licenze NCC (Noleggio Con Conducente) pubblicati dai comuni italiani. Include informazioni su numero di licenze disponibili, scadenze, e link ai bandi ufficiali.'
                : 'Complete collection of all NCC (Rental with Driver) licenses and tenders published by Italian municipalities. Includes information on available licenses, deadlines, and links to official tenders.',
            items: tableData.map(item => ({
                location: item.location,
                amount: item.amount,
                deadline: item.deadline,
                url: item.url,
                image: item.image
            }))
        }
    });

    // Fuzzy search function for location field
    const searchLocations = (query: string, data: TableData[]): TableData[] => {
        const trimmedQuery = query.trim();
        if (trimmedQuery.length === 0) {
            return [];
        }

        const lowerQuery = trimmedQuery.toLowerCase();
        return data.filter((item) => {
            const location = item.location.toLowerCase();
            return location.includes(lowerQuery);
        });
    };

    const filteredSearchResults = useMemo(() => {
        return searchLocations(searchQuery, tableData);
    }, [searchQuery, tableData]);

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
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 inline-block px-2 py-1 rounded"
                    style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
                    {t('pages.home.title')}
                </h1>
                <br/>
                <h2 className="text-sm sm:text-base text-gray-300 mb-3 px-2 py-1 rounded inline-block"
                    style={{backgroundColor: 'rgba(0, 0, 0, 0.7)'}}>
                    {t('pages.home.subtitle')}
                </h2>
            </div>
            <div className="mb-6 sm:mb-8">
                <p className="text-sm sm:text-base text-gray-400">
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
                {activeTab === 'table' && (
                    <div className="w-full">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('dashboard.search.placeholder')}
                            className="w-full px-4 py-3 bg-gray-800 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                        />
                        {searchQuery.trim().length > 0 ? (
                            filteredSearchResults.length > 0 ? (
                                <Table data={filteredSearchResults}/>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    {t('dashboard.search.noResults')}
                                </div>
                            )
                        ) : (
                            <Table data={tableData}/>
                        )}
                    </div>
                )}
                {activeTab === 'map' && (
                    <Suspense fallback={
                        <div className="flex items-center justify-center min-h-[360px]">
                            <div className="text-center">
                                <div
                                    className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"/>
                                <p className="mt-4 text-gray-300">{t('table.loading')}</p>
                            </div>
                        </div>
                    }>
                        <MapView data={tableData}/>
                    </Suspense>
                )}
            </div>
        </div>
    );
};

export default Home;

