import { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUserBalance, updateUserRole, sendAlert, type AdminUser, type SortBy, type SortOrder } from '../../adminApi';
import { useAdmin } from '../../AdminApp';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('last_order');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [modalAction, setModalAction] = useState<'balance' | 'role' | 'message' | null>(null);
  const [newRole, setNewRole] = useState('user');
  const [messageBody, setMessageBody] = useState('');
  const { showToast } = useAdmin();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers(page, search, sortBy, sortOrder);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err: any) {
      showToast('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, sortOrder]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / 20);

  const handleSort = (field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const getSortIcon = (field: SortBy) => {
    if (sortBy !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  async function handleBalance() {
    if (!selectedUser || !balanceAmount) return;
    try {
      const res = await updateUserBalance(selectedUser.tg_id, parseFloat(balanceAmount));
      showToast('success', `Balance updated to ${res.newBalance.toFixed(2)} ETB`);
      setModalAction(null);
      load();
    } catch (err: any) {
      showToast('error', err.message);
    }
  }

  async function handleRole() {
    if (!selectedUser) return;
    try {
      await updateUserRole(selectedUser.tg_id, newRole);
      showToast('success', `Role updated to ${newRole}`);
      setModalAction(null);
      load();
    } catch (err: any) {
      showToast('error', err.message);
    }
  }

  async function handleMessage() {
    if (!messageBody.trim()) return;
    try {
      const target = selectedUser ? selectedUser.tg_id : 'all';
      await sendAlert(target, 'Notification', messageBody.trim());
      showToast('success', selectedUser ? 'Message sent to user' : 'Broadcast message sent to all users');
      setModalAction(null);
    } catch (err: any) {
      showToast('error', err.message);
    }
  }

  return (
    <>
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{total} total users</div>
        <div className="search-bar">
          <span className="search-bar__icon">🔍</span>
          <input
            className="search-bar__input"
            placeholder="Search users..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <button className="btn btn--primary" onClick={() => { setSelectedUser(null); setMessageBody(''); setModalAction('message'); }}>
          📢 Broadcast Message
        </button>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Telegram ID</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('big_balance')}>
                Balance {getSortIcon('big_balance')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('total_spent')}>
                Total Spent {getSortIcon('total_spent')}
              </th>
              <th>Role</th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('recent_registration')}>
                Registered {getSortIcon('recent_registration')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('recent_active')}>
                Last Active {getSortIcon('recent_active')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('last_deposit')}>
                Last Deposit {getSortIcon('last_deposit')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => handleSort('last_order')}>
                Last Order {getSortIcon('last_order')}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="loading-center"><div className="spinner" /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={10} className="data-table-empty">No users found</td></tr>
            ) : users.map(u => (
              <tr key={u.tg_id}>
                <td>
                  <div className="user-info">
                    <div className="user-avatar">{(u.first_name || u.username || '?')[0].toUpperCase()}</div>
                    <div>
                      <div className="user-info__name">{u.first_name} {u.last_name || ''}</div>
                      {u.username && <div className="user-info__sub">@{u.username}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.tg_id}</td>
                <td style={{ fontWeight: 600 }}>{Number(u.balance).toFixed(2)}</td>
                <td>{u.total_spent != null ? Number(u.total_spent).toFixed(2) : '—'}</td>
                <td><span className={`badge ${u.role === 'admin' ? 'badge--info' : 'badge--default'}`}>{u.role}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.last_deposit ? new Date(u.last_deposit).toLocaleString() : '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{u.last_order ? new Date(u.last_order).toLocaleString() : '—'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn--secondary btn--sm" onClick={() => { setSelectedUser(u); setBalanceAmount(''); setModalAction('balance'); }}>💰 Balance</button>
                    <button className="btn btn--secondary btn--sm" onClick={() => { setSelectedUser(u); setNewRole(u.role); setModalAction('role'); }}>👤 Role</button>
                    <button className="btn btn--secondary btn--sm" onClick={() => { setSelectedUser(u); setMessageBody(''); setModalAction('message'); }}>✉️ Msg</button>
                  </div>
                </td>
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
              return (
                <button key={p} className={`pagination__btn ${page === p ? 'pagination__btn--active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="pagination__btn" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
          </div>
        )}
      </div>

      {/* Balance Modal */}
      {modalAction === 'balance' && selectedUser && (
        <div className="modal-overlay" onClick={() => setModalAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Adjust Balance — {selectedUser.first_name}</h2>
              <button className="modal__close" onClick={() => setModalAction(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Current balance: <strong>{Number(selectedUser.balance).toFixed(2)} ETB</strong>. Enter the amount to add (positive) or deduct (negative).
            </p>
            <div className="form-group">
              <label className="form-label">Amount (ETB)</label>
              <input className="form-input" type="number" step="0.01" placeholder="e.g. 100 or -50" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} autoFocus />
            </div>
            <div className="modal__footer">
              <button className="btn btn--secondary" onClick={() => setModalAction(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleBalance}>Update Balance</button>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {modalAction === 'role' && selectedUser && (
        <div className="modal-overlay" onClick={() => setModalAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Change Role — {selectedUser.first_name}</h2>
              <button className="modal__close" onClick={() => setModalAction(null)}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="modal__footer">
              <button className="btn btn--secondary" onClick={() => setModalAction(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleRole}>Update Role</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {modalAction === 'message' && (
        <div className="modal-overlay" onClick={() => setModalAction(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{selectedUser ? `Send Message to ${selectedUser.first_name}` : 'Broadcast Message (All Users)'}</h2>
              <button className="modal__close" onClick={() => setModalAction(null)}>✕</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              {selectedUser ? "This message will appear in the user's notification page." : "This message will be sent to ALL users."}
            </p>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea 
                className="form-input" 
                rows={4} 
                placeholder="Enter notification message..." 
                value={messageBody} 
                onChange={e => setMessageBody(e.target.value)} 
                autoFocus 
              />
            </div>
            <div className="modal__footer">
              <button className="btn btn--secondary" onClick={() => setModalAction(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={handleMessage}>Send Message</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
