import { useState, useEffect } from 'react';
import { getDashboardStats, type DashboardStats } from '../../adminApi';
import { useAdmin } from '../../AdminApp';

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast, navigate } = useAdmin();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (err: any) {
      showToast('error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!stats) return <div className="loading-center">No data</div>;

  return (
    <>
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card" onClick={() => navigate('users')} style={{ cursor: 'pointer' }}>
          <div className="stat-card__header">
            <span className="stat-card__label">Total Users</span>
            <div className="stat-card__icon stat-card__icon--purple">👥</div>
          </div>
          <div className="stat-card__value">{stats.totalUsers.toLocaleString()}</div>
          <div className="stat-card__change">Registered accounts</div>
        </div>

        <div className="stat-card" onClick={() => navigate('orders')} style={{ cursor: 'pointer' }}>
          <div className="stat-card__header">
            <span className="stat-card__label">Total Orders</span>
            <div className="stat-card__icon stat-card__icon--blue">📦</div>
          </div>
          <div className="stat-card__value">{stats.totalOrders.toLocaleString()}</div>
          <div className="stat-card__change">All time orders</div>
        </div>

        <div className="stat-card" onClick={() => navigate('deposits')} style={{ cursor: 'pointer' }}>
          <div className="stat-card__header">
            <span className="stat-card__label">Total Deposits</span>
            <div className="stat-card__icon stat-card__icon--green">💰</div>
          </div>
          <div className="stat-card__value">{stats.totalDeposits.toLocaleString()}</div>
          <div className="stat-card__change">Completed deposits</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__header">
            <span className="stat-card__label">Revenue (ETB)</span>
            <div className="stat-card__icon stat-card__icon--orange">📈</div>
          </div>
          <div className="stat-card__value">{stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="stat-card__change">Total deposited amount</div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="data-table-wrapper" style={{ marginBottom: 20 }}>
        <div className="data-table-header">
          <h3 className="data-table-header__title">Recent Orders</h3>
          <button className="btn btn--secondary btn--sm" onClick={() => navigate('orders')}>View All</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Service</th>
              <th>Quantity</th>
              <th>Cost (ETB)</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentOrders.length === 0 ? (
              <tr><td colSpan={7} className="data-table-empty">No orders yet</td></tr>
            ) : stats.recentOrders.map(o => (
              <tr key={o.id}>
                <td>#{o.id}</td>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">{(o.first_name || o.user_id)?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <div className="user-info__name">{o.first_name || o.user_id}</div>
                      {o.username && <div className="user-info__sub">@{o.username}</div>}
                    </div>
                  </div>
                </td>
                <td>{o.service_id}</td>
                <td>{o.quantity.toLocaleString()}</td>
                <td>{Number(o.cost).toFixed(2)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Deposits */}
      <div className="data-table-wrapper">
        <div className="data-table-header">
          <h3 className="data-table-header__title">Recent Deposits</h3>
          <button className="btn btn--secondary btn--sm" onClick={() => navigate('deposits')}>View All</button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Amount (ETB)</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentDeposits.length === 0 ? (
              <tr><td colSpan={6} className="data-table-empty">No deposits yet</td></tr>
            ) : stats.recentDeposits.map(d => (
              <tr key={d.id}>
                <td>#{d.id}</td>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">{(d.first_name || d.user_id)?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <div className="user-info__name">{d.first_name || d.user_id}</div>
                      {d.username && <div className="user-info__sub">@{d.username}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 600 }}>{Number(d.amount).toFixed(2)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.tx_ref}</td>
                <td><StatusBadge status={d.status} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(d.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = 
    ['completed', 'success'].includes(status) ? 'badge--success' :
    ['pending', 'processing'].includes(status) ? 'badge--warning' :
    ['cancelled', 'failed', 'expired'].includes(status) ? 'badge--error' :
    status === 'in_progress' ? 'badge--info' :
    'badge--default';
  return <span className={`badge ${cls}`}>{status}</span>;
}

export { StatusBadge };
