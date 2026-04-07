import type {
    Service, Deposit, ChatMessage,
    AuthResponse, OrderResponse, OrdersListResponse,
    DepositResponse, AlertsResponse, StatusSyncResponse,
} from './types';
import { getInitDataRaw } from './helpers/telegram';

const NODE_API_URL = import.meta.env.VITE_NODE_API_URL || '/api';

const isDev = import.meta.env.DEV;

function debug(...args: any[]) {
    if (isDev) console.log(...args);
}

function debugError(...args: any[]) {
    if (isDev) console.error(...args);
}

async function nodeApiFetch<T>(
    endpoint: string,
    options?: RequestInit
): Promise<T> {
    let url = `${NODE_API_URL}${endpoint}`;
    
    // Prepare headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> || {}),
    };

    const initData = getInitDataRaw() || '';
    let body = options?.body;

    // Auto-inject initData
    if (options?.method === 'POST' || options?.method === 'PUT') {
        if (typeof body === 'string') {
            try {
                const parsed = JSON.parse(body);
                if (!parsed.initData) parsed.initData = initData;
                body = JSON.stringify(parsed);
            } catch(e) {}
        } else if (!body) {
            body = JSON.stringify({ initData });
        }
    } else {
        // GET requests: append initData to query params
        const sep = url.includes('?') ? '&' : '?';
        url += `${sep}initData=${encodeURIComponent(initData)}`;
    }

    debug('[API] Fetching:', url);

    // Safely create abort controller for older WebViews
    let controller: AbortController | undefined;
    let signal: AbortSignal | undefined;
    if (typeof AbortController !== 'undefined') {
        controller = new AbortController();
        signal = controller.signal;
    }
    
    const timeoutId = setTimeout(() => {
        if (controller) controller.abort();
    }, 15000);

    try {
        const res = await fetch(url, {
            ...options,
            headers,
            body,
            signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorText = await res.text();
            debugError('[API] Error:', res.status, errorText);
            throw new Error(errorText || `HTTP ${res.status}`);
        }

        const data = await res.json();
        debug('[API] Success:', endpoint);
        return data;
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            throw new Error('Request timeout - please check your connection');
        }
        throw err;
    }
}

// ---------------------------------------------------------------------------
// Endpoints directly via Node API
// ---------------------------------------------------------------------------

export async function authenticateTelegram(initData: string): Promise<AuthResponse> {
    return nodeApiFetch<AuthResponse>('/app/auth', {
        method: 'POST',
        body: JSON.stringify({ initData }),
    });
}

const SERVICES_CACHE_KEY = 'paxyo_services_cache';
const SERVICES_TIMESTAMP_KEY = 'paxyo_services_timestamp';
const SETTINGS_CACHE_KEY = 'paxyo_settings_cache';
const SETTINGS_TIMESTAMP_KEY = 'paxyo_settings_timestamp';
const CACHE_DURATION = 5 * 60 * 1000;
const SETTINGS_CACHE_DURATION = 15 * 60 * 1000;

export async function getServices(useCache = true): Promise<Service[]> {
    const filterDisabled = (arr: any[]) => arr.filter((s: any) => s.is_enabled !== false && s.is_enabled !== 0);
    
    if (useCache) {
        try {
            const cached = localStorage.getItem(SERVICES_CACHE_KEY);
            const timestamp = localStorage.getItem(SERVICES_TIMESTAMP_KEY);
            if (cached && timestamp) {
                const age = Date.now() - parseInt(timestamp);
                if (age < CACHE_DURATION) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (Array.isArray(parsed)) return filterDisabled(parsed);
                    } catch(e) {}
                }
            }
        } catch (e) {}
    }

    try {
        const data = await nodeApiFetch<any>('/services');
        const validData = Array.isArray(data) ? filterDisabled(data) : [];
        if (validData.length > 0) {
            localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(validData));
            localStorage.setItem(SERVICES_TIMESTAMP_KEY, Date.now().toString());
        }
        return validData;
    } catch (err) {
        const cached = localStorage.getItem(SERVICES_CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) return filterDisabled(parsed);
            } catch(e) {}
        }
        return [];
    }
}

export async function refreshServices(): Promise<Service[]> {
    try {
        const data = await nodeApiFetch<any>('/services?refresh=1');
        const validData = Array.isArray(data) ? data.filter((s: any) => s.is_enabled !== false && s.is_enabled !== 0) : [];
        if (validData.length > 0) {
            localStorage.setItem(SERVICES_CACHE_KEY, JSON.stringify(validData));
            localStorage.setItem(SERVICES_TIMESTAMP_KEY, Date.now().toString());
        }
        return validData;
    } catch (err) {
        return [];
    }
}

export async function getServicesByCategory(category?: string, ids?: number[]): Promise<Service[]> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (ids && ids.length > 0) params.append('ids', ids.join(','));
    
    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await nodeApiFetch<any>(`/services${qs}`);
    return Array.isArray(data) ? data.filter((s: any) => s.is_enabled !== false && s.is_enabled !== 0) : [];
}
export interface CategoriesResponse {
    success: boolean;
    categories: string[];
    total: number;
    cached?: boolean;
}

export async function getCategories(platform?: string): Promise<string[]> {
    const query = platform ? `?platform=${encodeURIComponent(platform)}` : '';
    const data = await nodeApiFetch<CategoriesResponse>(`/categories${query}`);
    return data.categories || [];
}

export async function getRecommended(): Promise<number[]> {
    return nodeApiFetch<number[]>('/app/recommended');
}

export interface PlaceOrderPayload {
    service: number;
    link: string;
    quantity: number;
    tg_id?: number;
    comments?: string;
    answer_number?: number;
}

export async function placeOrder(payload: PlaceOrderPayload): Promise<OrderResponse> {
    return nodeApiFetch<OrderResponse>('/orders/place', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export async function getOrders(): Promise<OrdersListResponse> {
    return nodeApiFetch<OrdersListResponse>('/orders/list', { method: 'POST' });
}

export async function checkOrderStatus(): Promise<StatusSyncResponse> {
    return nodeApiFetch<StatusSyncResponse>('/orders/status', { method: 'POST' });
}

export async function requestRefill(orderId: number): Promise<{ success: boolean; message: string }> {
    return nodeApiFetch('/orders/refill', {
        method: 'POST',
        body: JSON.stringify({ order_id: orderId }),
    });
}

export async function processDeposit(amount: number, referenceId: string): Promise<DepositResponse> {
    return nodeApiFetch<DepositResponse>('/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount, tx_ref: referenceId }),
    });
}

export async function getDeposits(initData: string): Promise<Deposit[]> {
    return nodeApiFetch<Deposit[]>('/deposits', {
        method: 'POST',
        body: JSON.stringify({ initData })
    });
}

export async function getBalance(initData: string): Promise<{ success: boolean; balance: number }> {
    return nodeApiFetch<{ success: boolean; balance: number }>('/balance', {
        method: 'POST',
        body: JSON.stringify({ initData })
    });
}

export async function getAlerts(): Promise<AlertsResponse> {
    return nodeApiFetch<AlertsResponse>('/app/alerts', { method: 'POST' });
}

export async function markAlertsRead(): Promise<{ success: boolean }> {
    return nodeApiFetch('/app/alerts/mark-read', { method: 'POST' });
}

export async function sendChat(message: string): Promise<{ success: boolean }> {
    return nodeApiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ action: 'send', message }),
    });
}

export async function fetchChat(): Promise<{ success: boolean; messages: ChatMessage[] }> {
    return nodeApiFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ action: 'fetch' }),
    });
}

export async function heartbeat(): Promise<{ ok: number }> {
    return nodeApiFetch('/app/heartbeat');
}

export async function logInitData(initData: string): Promise<{ success: boolean }> {
    return nodeApiFetch<{ success: boolean }>('/app/log-init-data', {
        method: 'POST',
        body: JSON.stringify({ initData }),
    });
}

export interface AppSettings {
    rateMultiplier: number;
    discountPercent: number;
    holidayName: string;
    maintenanceMode: boolean;
    userCanOrder: boolean;
    marqueeText: string;
    topServicesIds: number[];
}

export async function getSettings(useCache = true): Promise<AppSettings> {
    if (useCache) {
        const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
        const timestamp = localStorage.getItem(SETTINGS_TIMESTAMP_KEY);
        if (cached && timestamp) {
            const age = Date.now() - parseInt(timestamp);
            if (age < SETTINGS_CACHE_DURATION) {
                return JSON.parse(cached);
            }
        }
    }

    try {
        const data = await nodeApiFetch<AppSettings>('/app/settings');
        localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(SETTINGS_TIMESTAMP_KEY, Date.now().toString());
        return data;
    } catch (err) {
        const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
        if (cached) return JSON.parse(cached);
        return {
            rateMultiplier: 1,
            discountPercent: 0,
            holidayName: '',
            maintenanceMode: false,
            userCanOrder: true,
            marqueeText: 'Welcome to Paxyo SMM!',
            topServicesIds: [],
        };
    }
}
