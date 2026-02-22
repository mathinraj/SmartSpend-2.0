import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { useIsDesktop } from './hooks/useMediaQuery';
import BottomNav from './components/BottomNav';
import Sidebar from './components/Sidebar';
import Welcome from './pages/Welcome';
import CurrencySetup from './pages/CurrencySetup';
import Home from './pages/Home';
import Accounts from './pages/Accounts';
import AddTransaction from './pages/AddTransaction';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Categories from './pages/Categories';
import Preferences from './pages/Preferences';
import './App.css';

function AppContent() {
  const { state } = useApp();
  const isDesktop = useIsDesktop();

  if (state.settings.onboardStep === 0) {
    return <Welcome />;
  }

  if (state.settings.onboardStep === 1) {
    return <CurrencySetup />;
  }

  return (
    <BrowserRouter>
      <div className={`app-layout ${isDesktop ? 'desktop' : 'mobile'}`}>
        {isDesktop && <Sidebar />}
        <main className={`app-main ${isDesktop ? 'with-sidebar' : ''}`}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/add" element={<AddTransaction />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/preferences" element={<Preferences />} />
          </Routes>
        </main>
        {!isDesktop && <BottomNav />}
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
