import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import { LanguageProvider } from './contexts/LanguageContext';
import Home from './pages/Home';
import HowToBecomeDriver from './pages/HowToBecomeDriver';
import RegionalLaws from './pages/RegionalLaws';
import Utilities from './pages/Utilities';
import About from './pages/About';
import FAQ from './pages/FAQ';

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-800 flex flex-col">
      <Navigation />
      <div className="flex-1 py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/how-to-become-driver" element={<HowToBecomeDriver />} />
          <Route path="/regional-laws" element={<RegionalLaws />} />
          <Route path="/utilities" element={<Utilities />} />
          <Route path="/about" element={<About />} />
          <Route path="/faq" element={<FAQ />} />
        </Routes>
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