import { useState, useEffect } from 'react';
import { getSettings, updateSetting, type AdminSettings } from '../../adminApi';
import { useAdmin } from '../../AdminApp';

export function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { showToast } = useAdmin();

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      const data = await getSettings();
      setSettings(data);
    } catch (err: any) {
      showToast('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }

  async function save(key: string, value: string) {
    setSaving(key);
    try {
      await updateSetting(key, value);
      showToast('success', `Setting "${key}" updated`);
      // Update local state
      setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setSaving(null);
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!settings) return <div className="loading-center">Failed to load settings</div>;

  return (
    <div className="settings-grid">
      {/* Pricing Settings */}
      <div className="settings-card">
        <h3 className="settings-card__title">💱 Pricing Configuration</h3>

        <SettingRow
          label="Rate Multiplier (USD → ETB)"
          description="Service prices from GodOfPanel are in USD. This multiplier converts them to ETB. E.g. 55 means $1 = 55 ETB."
          type="number"
          value={settings.rate_multiplier}
          saving={saving === 'rate_multiplier'}
          onSave={(val) => save('rate_multiplier', val)}
        />

        <SettingRow
          label="Discount Percent"
          description="Global discount percentage applied to all orders. Set to 0 to disable."
          type="number"
          value={settings.discount_percent}
          saving={saving === 'discount_percent'}
          onSave={(val) => save('discount_percent', val)}
        />

        <SettingRow
          label="Holiday / Promo Name"
          description="Display name for the current discount event. Shown in the app marquee."
          type="text"
          value={settings.holiday_name}
          saving={saving === 'holiday_name'}
          onSave={(val) => save('holiday_name', val)}
        />
      </div>

      {/* App Control */}
      <div className="settings-card">
        <h3 className="settings-card__title">🎛️ App Control</h3>

        <SettingToggle
          label="Maintenance Mode"
          description="When enabled, users will see a maintenance message and cannot access the app."
          checked={settings.maintenance_mode === '1' || settings.maintenance_mode === 'true'}
          saving={saving === 'maintenance_mode'}
          onToggle={(val) => save('maintenance_mode', val ? '1' : '0')}
        />

        <SettingToggle
          label="Users Can Order"
          description="When disabled, all order placement is blocked."
          checked={settings.user_can_order === '1' || settings.user_can_order === 'true'}
          saving={saving === 'user_can_order'}
          onToggle={(val) => save('user_can_order', val ? '1' : '0')}
        />

        <SettingRow
          label="Marquee Text"
          description="Scrolling text shown at the top of the app. Use this for announcements."
          type="text"
          value={settings.marquee_text}
          saving={saving === 'marquee_text'}
          onSave={(val) => save('marquee_text', val)}
        />
      </div>
    </div>
  );
}

// ─── Setting Row with inline edit ───────────────────────────────
function SettingRow({ label, description, type, value, saving, onSave }: {
  label: string;
  description: string;
  type: 'text' | 'number';
  value: string;
  saving: boolean;
  onSave: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 300 }}>{description}</div>
        </div>
        {!editing ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent)' }}>{value || '—'}</span>
            <button className="btn btn--secondary btn--sm" onClick={() => setEditing(true)}>Edit</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              className="form-input"
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              style={{ width: 150, padding: '6px 10px', fontSize: 13 }}
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') { onSave(draft); setEditing(false); } if (e.key === 'Escape') setEditing(false); }}
            />
            <button className="btn btn--primary btn--sm" disabled={saving} onClick={() => { onSave(draft); setEditing(false); }}>
              {saving ? '...' : 'Save'}
            </button>
            <button className="btn btn--secondary btn--sm" onClick={() => { setEditing(false); setDraft(value); }}>✕</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Toggle Setting ─────────────────────────────────────────────
function SettingToggle({ label, description, checked, saving, onToggle }: {
  label: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onToggle: (val: boolean) => void;
}) {
  return (
    <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 300 }}>{description}</div>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={e => onToggle(e.target.checked)} disabled={saving} />
        <span className="toggle__slider" />
      </label>
    </div>
  );
}
