import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import { LanguageProvider } from './contexts/LanguageContext';

// Lazy load route components for code splitting
const Home = lazy(() => import('./pages/Home'));
const HowToBecomeDriver = lazy(() => import('./pages/HowToBecomeDriver'));
const RegionalLaws = lazy(() => import('./pages/RegionalLaws'));
const Utilities = lazy(() => import('./pages/Utilities'));
const About = lazy(() => import('./pages/About'));
const FAQ = lazy(() => import('./pages/FAQ'));

// Loading fallback component
const LoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      <p className="mt-4 text-gray-300">Loading...</p>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">
      <Navigation />
      <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/how-to-become-driver" element={<HowToBecomeDriver />} />
            <Route path="/regional-laws" element={<RegionalLaws />} />
            <Route path="/utilities" element={<Utilities />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<FAQ />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;