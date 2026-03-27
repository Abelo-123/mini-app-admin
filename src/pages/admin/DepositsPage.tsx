import { useState, useEffect, useCallback } from 'react';
import { getDeposits, type AdminDeposit } from '../../adminApi';
import { StatusBadge } from './DashboardPage';
import { useAdmin } from '../../AdminApp';

export function DepositsPage() {
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useAdmin();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDeposits(page, search, statusFilter);
      setDeposits(data.deposits);
      setTotal(data.total);
    } catch (err: any) {
      showToast('error', 'Failed to load deposits');
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
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{total} deposits</span>
          <select className="form-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className="search-bar">
          <span className="search-bar__icon">🔍</span>
          <input className="search-bar__input" placeholder="Search deposits..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Amount (ETB)</th>
              <th>Reference</th>
              <th>Status</th>
              <th>Created</th>
              <th>Completed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="loading-center"><div className="spinner" /></td></tr>
            ) : deposits.length === 0 ? (
              <tr><td colSpan={7} className="data-table-empty">No deposits found</td></tr>
            ) : deposits.map(d => (
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
                <td style={{ fontWeight: 600, color: 'var(--success)' }}>{Number(d.amount).toFixed(2)}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{d.tx_ref}</td>
                <td><StatusBadge status={d.status} /></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(d.created_at).toLocaleString()}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.completed_at ? new Date(d.completed_at).toLocaleString() : '—'}</td>
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
