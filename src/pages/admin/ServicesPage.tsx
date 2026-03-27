import { useState, useEffect, useMemo } from 'react';
import { getAdminServices, type AdminService } from '../../adminApi';
import { useAdmin } from '../../AdminApp';

export function ServicesPage() {
  const [services, setServices] = useState<AdminService[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useAdmin();

  useEffect(() => { loadServices(); }, []);

  async function loadServices() {
    try {
      setLoading(true);
      const data = await getAdminServices();
      setServices(data);
    } catch (err: any) {
      showToast('error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats).sort();
  }, [services]);

  const filtered = useMemo(() => {
    return services.filter(s => {
      if (categoryFilter && s.category !== categoryFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || String(s.service).includes(q) || s.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [services, search, categoryFilter]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filtered.length} / {services.length} services</span>
          <select className="form-input" style={{ width: 'auto', padding: '6px 10px', fontSize: 12, maxWidth: 250 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button className="btn btn--secondary btn--sm" onClick={loadServices}>🔄 Refresh</button>
        </div>
        <div className="search-bar">
          <span className="search-bar__icon">🔍</span>
          <input className="search-bar__input" placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Rate (ETB/1k)</th>
              <th>Min</th>
              <th>Max</th>
              <th>Type</th>
              <th>Refill</th>
              <th>Cancel</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="loading-center"><div className="spinner" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="data-table-empty">No services found</td></tr>
            ) : filtered.map(s => (
              <tr key={s.service}>
                <td style={{ fontFamily: 'monospace' }}>{s.service}</td>
                <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>{s.name}</td>
                <td><span className="badge badge--default" style={{ fontSize: 10 }}>{s.category}</span></td>
                <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{Number(s.rate).toFixed(2)}</td>
                <td>{s.min.toLocaleString()}</td>
                <td>{s.max.toLocaleString()}</td>
                <td style={{ fontSize: 11 }}>{s.type}</td>
                <td>{s.refill ? <span className="badge badge--success">✓</span> : <span className="badge badge--default">✗</span>}</td>
                <td>{s.cancel ? <span className="badge badge--success">✓</span> : <span className="badge badge--default">✗</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💡 <strong>Note:</strong> Service rates are fetched from GodOfPanel and multiplied by the <strong>Rate Multiplier</strong> setting (configured in Settings → Pricing Configuration). To change all prices, adjust the rate multiplier.
        </p>
      </div>
    </>
  );
}
