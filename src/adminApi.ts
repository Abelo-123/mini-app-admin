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
  created_at: string;
  last_deposit: string | null;
  last_order: string | null;
  total_spent: number | null;
}

export type SortBy = 'recent_registration' | 'big_balance' | 'total_spent' | 'recent_active' | 'last_deposit' | 'last_order';
export type SortOrder = 'asc' | 'desc';

export async function getUsers(page = 1, search = '', sortBy: SortBy = 'last_order', sortOrder: SortOrder = 'desc'): Promise<{ users: AdminUser[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: '20' });
  if (search) params.append('search', search);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);
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

export async function sendAlert(target: string, title: string, message: string, type: string = 'info'): Promise<{ success: boolean }> {
  return adminFetch('/admin/alerts', {
    method: 'POST',
    body: JSON.stringify({ target, title, message, type }),
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
  top_services_ids: string;
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
  is_enabled?: boolean;
  profit_margin?: number;
  has_custom?: boolean;
}

export async function getAdminServices(): Promise<AdminService[]> {
  return adminFetch<AdminService[]>('/services?include_disabled=1');
}

export interface ServiceCustomPricing {
  service_id: number;
  custom_rate: number | null;
  profit_margin: number;
  is_enabled: boolean;
}

export async function getCustomPricing(): Promise<ServiceCustomPricing[]> {
  return adminFetch<ServiceCustomPricing[]>('/admin/services/custom');
}

export async function setCustomPricing(
  serviceId: number,
  customRate: number | null,
  profitMargin: number | null,
  isEnabled: boolean | null
): Promise<{ success: boolean }> {
  return adminFetch('/admin/services/custom', {
    method: 'POST',
    body: JSON.stringify({
      service_id: serviceId,
      custom_rate: customRate,
      profit_margin: profitMargin,
      is_enabled: isEnabled
    }),
  });
}

export async function deleteCustomPricing(serviceId: number): Promise<{ success: boolean }> {
  return adminFetch(`/admin/services/custom/${serviceId}`, {
    method: 'DELETE',
  });
}

export interface ServiceActivity {
  service_id: number;
  custom_rate: number | null;
  profit_margin: number;
  is_enabled: boolean;
  updated_at: string;
}

export async function getServiceActivity(): Promise<ServiceActivity[]> {
  return adminFetch<ServiceActivity[]>('/admin/services/activity');
}

export async function getDisabledServices(): Promise<ServiceActivity[]> {
  return adminFetch<ServiceActivity[]>('/admin/services/disabled');
}
// ─── Chat ─────────────────────────────────────────────────────────

export interface ChatSession {
  user_id: string;
  username: string;
  first_name: string;
  last_message_at: string;
  unread_count?: number;
}

export interface AdminChatMessage {
  id: number;
  user_id: string;
  message: string;
  is_admin: boolean;
  created_at: string;
}

export async function getChatSessions(): Promise<ChatSession[]> {
  return adminFetch<ChatSession[]>('/admin/chat/sessions');
}

export async function getChatMessages(userId: string): Promise<AdminChatMessage[]> {
  return adminFetch<AdminChatMessage[]>(`/admin/chat/${userId}`);
}

export async function sendChatMessage(userId: string, message: string): Promise<{ success: boolean }> {
  return adminFetch<{ success: boolean }>(`/admin/chat/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}
