import { AppRoot } from '@telegram-apps/telegram-ui';
import { AppProvider, useApp } from '../context/AppContext';
import { BottomNav } from './BottomNav/BottomNav';
import { ToastContainer } from './Toast/Toast';
import { LoadingOverlay } from './LoadingOverlay/LoadingOverlay';
import { lazy, Suspense, useEffect, useRef, useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  showBackButton,
  hideBackButton,
  onBackButtonClick,
  onSettingsButtonClick,
  retrieveLaunchParams,
  isMiniAppDark,
} from '@telegram-apps/sdk-react';
import { hapticSelection } from '../helpers/telegram';

// ─── Lazy-loaded pages (code-split per tab) ─────────────────
const OrderPage = lazy(() => import('../pages/OrderPage/OrderPage').then(m => ({ default: m.OrderPage })));
const HistoryPage = lazy(() => import('../pages/HistoryPage/HistoryPage').then(m => ({ default: m.HistoryPage })));
const DepositPage = lazy(() => import('../pages/DepositPage/DepositPage').then(m => ({ default: m.DepositPage })));
const MorePage = lazy(() => import('../pages/MorePage/MorePage').then(m => ({ default: m.MorePage })));

// Minimal fallback to avoid layout shift while lazy chunk loads
const TabFallback = () => (
  <div className="loading-overlay">
    <div className="loading-overlay__spinner" />
  </div>
);

function AppContent() {
  const { activeTab, setActiveTab, isLoading, maintenanceMode, userCanOrder } = useApp();
  console.log('AppContent - maintenanceMode:', maintenanceMode, 'userCanOrder:', userCanOrder);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Show maintenance screen
  if (maintenanceMode === true) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 40, 
        textAlign: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔧</div>
        <h2 style={{ marginBottom: 8 }}>Maintenance Mode</h2>
        <p style={{ color: 'var(--text-secondary)' }}>We are currently performing maintenance. Please check back soon.</p>
      </div>
    );
  }

  // Telegram scroll fix: prevent swipe-to-close
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleTouchStart = () => {
      if (el.scrollTop === 0) {
        el.scrollTop = 1;
      }
    };
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    return () => el.removeEventListener('touchstart', handleTouchStart);
  }, []);

  // Back button via SDK
  useEffect(() => {
    if (activeTab !== 'order') {
      try { showBackButton(); } catch { /* not available */ }
      const off = onBackButtonClick(() => {
        setActiveTab('order');
      });
      return () => {
        off();
        try { hideBackButton(); } catch { /* ignore */ }
      };
    } else {
      try { hideBackButton(); } catch { /* ignore */ }
    }
  }, [activeTab, setActiveTab]);

  // Settings button via SDK
  useEffect(() => {
    try {
      const off = onSettingsButtonClick(() => {
        setActiveTab('more');
        hapticSelection();
      });
      return () => off();
    } catch { /* ignore */ }
  }, [setActiveTab]);

  return (
    <>
      <div className="scroll-wrapper" ref={scrollRef}>
        <Suspense fallback={<TabFallback />}>
          {activeTab === 'order' && <OrderPage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'deposit' && <DepositPage />}
          {activeTab === 'more' && <MorePage />}
        </Suspense>
      </div>
      <BottomNav />
      <ToastContainer />
      <LoadingOverlay visible={isLoading} />
    </>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes
      retry: 2,
    },
  },
});

export function App() {
  const lp = useMemo(() => retrieveLaunchParams(), []);
  const isDark = isMiniAppDark();

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppRoot
          appearance={isDark ? 'dark' : 'light'}
          platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
        >
          <AppContent />
        </AppRoot>
      </AppProvider>
    </QueryClientProvider>
  );
}
