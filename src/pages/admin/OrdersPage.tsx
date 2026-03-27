import { useState, useEffect, useCallback } from 'react';
import { getOrders, type AdminOrder } from '../../adminApi';
import { StatusBadge } from './DashboardPage';
import { useAdmin } from '../../AdminApp';

export function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useAdmin();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrders(page, search, statusFilter);
      setOrders(data.orders);
      setTotal(data.total);
    } catch (err: any) {
      showToast('error', 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{total} orders</span>
          <select className="form-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div className="search-bar">
          <span className="search-bar__icon">🔍</span>
          <input className="search-bar__input" placeholder="Search orders..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Service ID</th>
              <th>Link</th>
              <th>Qty</th>
              <th>Cost (ETB)</th>
              <th>Status</th>
              <th>Provider ID</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="loading-center"><div className="spinner" /></td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={9} className="data-table-empty">No orders found</td></tr>
            ) : orders.map(o => (
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
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <a href={o.target_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{o.target_link}</a>
                </td>
                <td>{o.quantity.toLocaleString()}</td>
                <td style={{ fontWeight: 600 }}>{Number(o.cost).toFixed(2)}</td>
                <td><StatusBadge status={o.status} /></td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{o.provider_order_id || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="pagination__btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return <button key={p} className={`pagination__btn ${page === p ? 'pagination__btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
            })}
            <button className="pagination__btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>
    </>
  );
}
