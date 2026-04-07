import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAdminServices, setCustomPricing, deleteCustomPricing, getServiceActivity, getDisabledServices, type AdminService, type ServiceActivity } from '../../adminApi';
import { useAdmin } from '../../AdminApp';

export function ServicesPage() {
  const [allServices, setAllServices] = useState<AdminService[]>([]);
  const [activity, setActivity] = useState<ServiceActivity[]>([]);
  const [disabledServices, setDisabledServices] = useState<ServiceActivity[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<AdminService | null>(null);
  const [customRate, setCustomRate] = useState('');
  const [profitMargin, setProfitMargin] = useState('');
  const [isEnabled, setIsEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useAdmin();

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const [servicesData, activityData, disabledData] = await Promise.all([
        getAdminServices(),
        getServiceActivity(),
        getDisabledServices()
      ]);
      setAllServices(servicesData);
      setActivity(activityData);
      setDisabledServices(disabledData);
    } catch (err: any) {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadServices(); }, [loadServices]);

  const filteredServices = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return allServices.filter(s => 
      s.name.toLowerCase().includes(q) || 
      String(s.service).includes(q) ||
      s.category.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allServices, search]);

  function selectService(s: AdminService) {
    setSelectedService(s);
    setCustomRate('');
    setProfitMargin(s.profit_margin?.toString() || '');
    setIsEnabled(s.is_enabled !== false);
    setSearch('');
  }

  async function handleSavePricing() {
    if (!selectedService) return;
    setSaving(true);
    try {
      const rate = customRate ? parseFloat(customRate) : null;
      const margin = profitMargin ? parseFloat(profitMargin) : null;
      await setCustomPricing(selectedService.service, rate, margin, isEnabled);
      showToast('success', 'Pricing updated');
      // Force refresh from server to get latest data
      const servicesData = await getAdminServices();
      setAllServices(servicesData);
      // Also refresh activity and disabled list
      const [activityData, disabledData] = await Promise.all([
        getServiceActivity(),
        getDisabledServices()
      ]);
      setActivity(activityData);
      setDisabledServices(disabledData);
      setSelectedService(null);
    } catch (err: any) {
      showToast('error', 'Failed to save pricing');
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPricing(serviceId: number) {
    try {
      await deleteCustomPricing(serviceId);
      showToast('success', 'Reset to default');
      loadServices();
    } catch (err: any) {
      showToast('error', 'Failed to reset');
    }
  }

  async function handleEnableService(s: ServiceActivity) {
    try {
      await setCustomPricing(s.service_id, s.custom_rate, s.profit_margin, true);
      showToast('success', 'Service enabled');
      loadServices();
    } catch (err: any) {
      showToast('error', 'Failed to enable');
    }
  }

  function getServiceName(serviceId: number): string {
    const service = allServices.find(s => s.service === serviceId);
    return service ? service.name : `Service #${serviceId}`;
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 12 }}>Search Service</h2>
        <div className="search-bar" style={{ maxWidth: 500 }}>
          <span className="search-bar__icon">🔍</span>
          <input
            className="search-bar__input"
            placeholder="Search by name or service ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        {search && filteredServices.length > 0 && (
          <div style={{ 
            marginTop: 8, 
            maxHeight: 300, 
            overflow: 'auto',
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}>
            {filteredServices.map(s => (
              <div
                key={s.service}
                onClick={() => selectService(s)}
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.service} - {s.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.category}</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{Number(s.rate).toFixed(2)} ETB</div>
              </div>
            ))}
          </div>
        )}
        {search && filteredServices.length === 0 && !loading && (
          <div style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: 13 }}>No services found</div>
        )}
      </div>

      {/* Disabled Services Section */}
      {disabledServices.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12, color: '#e74c3c' }}>🚫 Disabled Services ({disabledServices.length})</h3>
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid #e74c3c',
            borderRadius: 'var(--radius-md)',
            maxHeight: 200,
            overflow: 'auto'
          }}>
            {disabledServices.map(s => (
              <div
                key={s.service_id}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.service_id} - {getServiceName(s.service_id)}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Price: {s.custom_rate ? s.custom_rate.toFixed(2) : 'Default'} ETB | 
                    Margin: {s.profit_margin || 0}%
                  </div>
                </div>
                <button 
                  className="btn btn--secondary btn--sm" 
                  onClick={() => handleEnableService(s)}
                >
                  Enable
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Section */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 12 }}>📋 Recent Activity</h3>
        <div style={{ 
          background: 'var(--bg-card)', 
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          maxHeight: 200,
          overflow: 'auto'
        }}>
          {activity.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
              No recent activity
            </div>
          ) : (
            activity.map((s, i) => (
              <div
                key={`${s.service_id}-${i}`}
                style={{
                  padding: '10px 12px',
                  borderBottom: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.service_id}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> - {getServiceName(s.service_id)}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {s.updated_at ? new Date(s.updated_at).toLocaleString() : 'Recently'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.custom_rate ? `Custom Price: ${s.custom_rate.toFixed(2)} ETB` : s.profit_margin ? `Margin: ${s.profit_margin}%` : ''} 
                  {s.is_enabled === false ? ' | DISABLED' : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {selectedService && (
        <div className="modal-overlay" onClick={() => setSelectedService(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Edit Service</h2>
              <button className="modal__close" onClick={() => setSelectedService(null)}>✕</button>
            </div>
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Service ID: {selectedService.service}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selectedService.name}</div>
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>Current Rate: {Number(selectedService.rate).toFixed(2)} ETB/1k</div>
              {selectedService.is_enabled === false && (
                <div style={{ marginTop: 8, color: '#e74c3c', fontWeight: 600 }}>⚠️ This service is currently DISABLED</div>
              )}
            </div>
            
            <div className="form-group">
              <label className="form-label">Custom Price (ETB/1k)</label>
              <input
                className="form-input"
                type="number"
                step="0.01"
                placeholder="Leave empty for calculated rate"
                value={customRate}
                onChange={e => setCustomRate(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Profit Margin (%)</label>
              <input
                className="form-input"
                type="number"
                step="0.1"
                placeholder="e.g. 10 for 10% markup"
                value={profitMargin}
                onChange={e => setProfitMargin(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 0' }}>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={e => setIsEnabled(e.target.checked)}
                  style={{ width: 18, height: 18 }}
                />
                <span style={{ fontWeight: 600 }}>Enable Service</span>
              </label>
            </div>
            
            <div className="modal__footer">
              {selectedService.has_custom && (
                <button className="btn btn--secondary" onClick={() => handleResetPricing(selectedService.service)} disabled={saving}>
                  Reset to Default
                </button>
              )}
              <button className="btn btn--secondary" onClick={() => setSelectedService(null)} disabled={saving}>Cancel</button>
              <button className="btn btn--primary" onClick={handleSavePricing} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          💡 <strong>Tip:</strong> Search for a service by name or ID, then click to edit its price, profit margin, or enable/disable it.
        </p>
      </div>
    </>
  );
}
