import { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { isLoggedIn, adminLogin, adminLogout } from './adminApi';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/admin/UsersPage';
import { OrdersPage } from './pages/admin/OrdersPage';
import { DepositsPage } from './pages/admin/DepositsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { ServicesPage } from './pages/admin/ServicesPage';
import { ChatPage } from './pages/admin/ChatPage';

// ─── Toast System ──────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; message: string; }

interface AdminContextType {
  showToast: (type: ToastType, message: string) => void;
  navigate: (page: string) => void;
}

export const AdminContext = createContext<AdminContextType>({
  showToast: () => {},
  navigate: () => {},
});

export const useAdmin = () => useContext(AdminContext);

// ─── Page Type ─────────────────────────────────────────────────
type Page = 'dashboard' | 'users' | 'orders' | 'deposits' | 'settings' | 'services' | 'chat';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'users', label: 'Users', icon: '👥' },
  { id: 'chat', label: 'Support Chat', icon: '💬' },
  { id: 'orders', label: 'Orders', icon: '📦' },
  { id: 'deposits', label: 'Deposits', icon: '💰' },
  { id: 'services', label: 'Services', icon: '⚡' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  chat: 'Support Chat',
  orders: 'Order History',
  deposits: 'Deposit History',
  services: 'Service Rates',
  settings: 'App Settings',
};

// ─── Login Page ────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminLogin(username, password);
      if (res.success) onLogin();
      else setError('Invalid credentials');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" />
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-card__logo">P</div>
        <h1 className="login-card__title">Paxyo Admin</h1>
        <p className="login-card__subtitle">Sign in to your admin dashboard</p>

        {error && <div className="login-card__error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className="form-input"
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>

        <button className="btn btn--primary btn--full" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

// ─── Main Admin App ────────────────────────────────────────────
export function AdminApp() {
  const [authed, setAuthed] = useState(isLoggedIn());
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId.current;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const navigate = useCallback((page: string) => {
    setCurrentPage(page as Page);
    setSidebarOpen(false);
  }, []);

  if (!authed) {
    return <LoginPage onLogin={() => setAuthed(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'users': return <UsersPage />;
      case 'chat': return <ChatPage />;
      case 'orders': return <OrdersPage />;
      case 'deposits': return <DepositsPage />;
      case 'services': return <ServicesPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <AdminContext.Provider value={{ showToast, navigate }}>
      <div className="admin-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
          <div className="sidebar__brand">
            <div className="sidebar__logo">P</div>
            <div>
              <div className="sidebar__title">Paxyo</div>
              <div className="sidebar__subtitle">Admin Panel</div>
            </div>
          </div>

          <nav className="sidebar__nav">
            <div className="sidebar__section-label">Main</div>
            {NAV_ITEMS.slice(0, 4).map(item => (
              <div
                key={item.id}
                className={`sidebar__link ${currentPage === item.id ? 'sidebar__link--active' : ''}`}
                onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
              >
                <span className="sidebar__link-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
            <div className="sidebar__section-label">Configuration</div>
            {NAV_ITEMS.slice(4).map(item => (
              <div
                key={item.id}
                className={`sidebar__link ${currentPage === item.id ? 'sidebar__link--active' : ''}`}
                onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
              >
                <span className="sidebar__link-icon">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>

          <div className="sidebar__footer">
            <button className="btn btn--danger btn--full btn--sm" onClick={adminLogout}>
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="main-content">
          <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
              <h1 className="header__title">{PAGE_TITLES[currentPage]}</h1>
            </div>
            <div className="header__actions">
              <div className="user-info">
                <div>
                  <div className="user-info__name">Admin</div>
                  <div className="user-info__sub">Paxyo Panel</div>
                </div>
                <div className="user-avatar">A</div>
              </div>
            </div>
          </header>

          <div className="page-content">
            {renderPage()}
          </div>
        </main>

        {/* Toasts */}
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast--${t.type}`}>
              {t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'} {t.message}
            </div>
          ))}
        </div>
      </div>
    </AdminContext.Provider>
  );
}
