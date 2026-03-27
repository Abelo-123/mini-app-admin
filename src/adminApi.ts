// ─── Admin API Client ──────────────────────────────────────────

const API_URL = import.meta.env.VITE_NODE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

async function adminFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.reload();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Auth ───────────────────────────────────────────────────────

export async function adminLogin(username: string, password: string): Promise<{ success: boolean; token: string }> {
  const data = await adminFetch<{ success: boolean; token: string }>('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (data.token) {
    localStorage.setItem('admin_token', data.token);
  }
  return data;
}

export function adminLogout() {
  localStorage.removeItem('admin_token');
  window.location.reload();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// ─── Dashboard Stats ────────────────────────────────────────────

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalDeposits: number;
  totalRevenue: number;
  recentOrders: AdminOrder[];
  recentDeposits: AdminDeposit[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return adminFetch<DashboardStats>('/admin/dashboard');
}

// ─── Users ──────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  tg_id: string;
  username: string;
  first_name: string;
  last_name: string;
  photo_url: string;
  balance: number;
  role: string;
  last_login: string;
}

export async function getUsers(page = 1, search = ''): Promise<{ users: AdminUser[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.append('search', search);
  return adminFetch(`/admin/users?${params}`);
}

export async function updateUserBalance(tgId: string, amount: number): Promise<{ success: boolean; newBalance: number }> {
  return adminFetch('/admin/users/balance', {
    method: 'POST',
    body: JSON.stringify({ tg_id: tgId, amount }),
  });
}

export async function updateUserRole(tgId: string, role: string): Promise<{ success: boolean }> {
  return adminFetch('/admin/users/role', {
    method: 'POST',
    body: JSON.stringify({ tg_id: tgId, role }),
  });
}

// ─── Orders ─────────────────────────────────────────────────────

export interface AdminOrder {
  id: number;
  user_id: string;
  service_id: number;
  target_link: string;
  quantity: number;
  provider_order_id: string;
  cost: number;
  status: string;
  start_count: number;
  remains: number;
  created_at: string;
  username?: string;
  first_name?: string;
}

export async function getOrders(page = 1, search = '', status = ''): Promise<{ orders: AdminOrder[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  return adminFetch(`/admin/orders?${params}`);
}

// ─── Deposits ───────────────────────────────────────────────────

export interface AdminDeposit {
  id: number;
  user_id: string;
  amount: number;
  tx_ref: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  username?: string;
  first_name?: string;
}

export async function getDeposits(page = 1, search = '', status = ''): Promise<{ deposits: AdminDeposit[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.append('search', search);
  if (status) params.append('status', status);
  return adminFetch(`/admin/deposits?${params}`);
}

// ─── Settings ───────────────────────────────────────────────────

export interface AdminSettings {
  rate_multiplier: string;
  discount_percent: string;
  holiday_name: string;
  maintenance_mode: string;
  user_can_order: string;
  marquee_text: string;
}

export async function getSettings(): Promise<AdminSettings> {
  return adminFetch<AdminSettings>('/admin/settings');
}

export async function updateSetting(key: string, value: string): Promise<{ success: boolean }> {
  return adminFetch('/admin/settings', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}

// ─── Services ───────────────────────────────────────────────────

export interface AdminService {
  service: number;
  name: string;
  category: string;
  type: string;
  rate: string;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
}

export async function getAdminServices(): Promise<AdminService[]> {
  return adminFetch<AdminService[]>('/services');
}
