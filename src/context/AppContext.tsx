import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
import type { UserProfile, Service, Order, Deposit, Alert, ChatMessage, TabId, ToastMessage, SocialPlatform } from '../types';
import { TOAST_DURATION } from '../constants';
import {
    isTelegramEnv,
    hapticSelection,
    cloudSet,
    cloudGet,
    getInitDataUser,
    getInitDataString,
} from '../helpers/telegram';
import * as api from '../api';

interface AppState {
    user: UserProfile | null;
    isTelegramApp: boolean;
    services: Service[];
    recommendedIds: number[];
    selectedPlatform: SocialPlatform | null;
    selectedCategory: string | null;
    selectedService: Service | null;
    orders: Order[];
    deposits: Deposit[];
    alerts: Alert[];
    chatMessages: ChatMessage[];
    rateMultiplier: number;
    discountPercent: number;
    holidayName: string;
    maintenanceMode: boolean;
    userCanOrder: boolean;
    marqueeText: string;
    activeTab: TabId;
    toasts: ToastMessage[];
    isLoading: boolean;
    unreadAlerts: number;
}

interface AppActions {
    setUser: (user: UserProfile | null) => void;
    setActiveTab: (tab: TabId) => void;
    setSelectedPlatform: (p: SocialPlatform | null) => void;
    setSelectedCategory: (c: string | null) => void;
    setSelectedService: (s: Service | null) => void;
    setOrders: (orders: Order[]) => void;
    setDeposits: (deposits: Deposit[]) => void;
    setAlerts: (alerts: Alert[]) => void;
    setChatMessages: (msgs: ChatMessage[]) => void;
    setBalance: (balance: number) => void;
    setIsLoading: (loading: boolean) => void;
    setUnreadAlerts: (count: number) => void;
    showToast: (type: ToastMessage['type'], message: string) => void;
    removeToast: (id: string) => void;
    refreshServices: () => Promise<void>;
    refreshOrders: () => Promise<void>;
    refreshDeposits: () => Promise<void>;
    refreshAlerts: () => Promise<void>;
}

type AppContextType = AppState & AppActions;

const AppContext = createContext<AppContextType | null>(null);

export function useApp(): AppContextType {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
    const isTelegramApp = isTelegramEnv();

    // Track whether we've logged the user's initData payload to the backend
    const initDataLoggedRef = useRef(false);

    const [user, setUser] = useState<UserProfile | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [recommendedIds, _setRecommendedIds] = useState<number[]>([]);
    const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [activeTab, setActiveTab] = useState<TabId>('order');
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [unreadAlerts, setUnreadAlerts] = useState(0);
    const [settings, _setSettings] = useState({
        rateMultiplier: 1,
        discountPercent: 0,
        holidayName: '',
        maintenanceMode: false,
        userCanOrder: true,
        marqueeText: 'Welcome to Paxyo SMM!',
    });

    const refreshServices = useCallback(async () => {
        try {
            const data = await api.getServices(false);
            const transformed: Service[] = data.map((s: any) => ({
                id: s.service || s.id,
                category: s.category,
                name: s.name,
                type: s.type as Service['type'],
                rate: parseFloat(s.rate),
                min: s.min,
                max: s.max,
                averageTime: s.average_time || s.averageTime || '',
                refill: s.refill,
                cancel: s.cancel,
            }));
            setServices(transformed);
        } catch (err) {
            console.error('Failed to fetch services:', err);
        }
    }, []);

    const refreshOrders = useCallback(async () => {
        // Temporarily disabled
    }, []);

    const refreshDeposits = useCallback(async () => {
        try {
            const initData = await getInitDataString();
            const data = await api.getDeposits(initData);
            setDeposits(data);
        } catch (err) {
            console.error('Failed to refresh deposits:', err);
        }
    }, []);

    const refreshAlerts = useCallback(async () => {
        // Temporarily disabled
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            // Load services (most important)
            try {
                const servicesData = await api.getServices(true);
                const transformed: Service[] = servicesData.map((s: any) => ({
                    id: s.service || s.id,
                    category: s.category,
                    name: s.name,
                    type: s.type as Service['type'],
                    rate: parseFloat(s.rate),
                    min: s.min,
                    max: s.max,
                    averageTime: s.average_time || s.averageTime || '',
                    refill: s.refill,
                    cancel: s.cancel,
                }));
                setServices(transformed);
            } catch (err) {
                console.error('Failed to load services:', err);
            }

            // Load settings (independent of services)
            try {
                const settingsData = await api.getSettings(true);
                _setSettings({
                    rateMultiplier: settingsData.rateMultiplier || 1,
                    discountPercent: settingsData.discountPercent || 0,
                    holidayName: settingsData.holidayName || '',
                    maintenanceMode: settingsData.maintenanceMode || false,
                    userCanOrder: settingsData.userCanOrder !== false,
                    marqueeText: settingsData.marqueeText || 'Welcome to Paxyo SMM!',
                });
            } catch (err) {
                console.error('Failed to load settings:', err);
            }

            // Load user/init data (independent)
            try {
                const initData = await getInitDataString();
                if (initData) {
                    refreshDeposits();
                    api.getBalance(initData).then(res => {
                        if (res.success) setBalance(res.balance);
                    }).catch(() => { });
                }
            } catch (err) {
                console.error('Failed to load user data:', err);
            }

            setIsLoading(false);
        };
        loadData();
    }, [refreshServices, refreshDeposits]);

    const setBalance = useCallback((balance: number) => {
        setUser(prev => prev ? { ...prev, balance } : prev);
    }, []);

    const showToast = useCallback((type: ToastMessage['type'], message: string) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2);
        setToasts(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, TOAST_DURATION);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => {
        setSelectedCategory(null);
        setSelectedService(null);
    }, [selectedPlatform]);

    useEffect(() => {
        setSelectedService(null);
    }, [selectedCategory]);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const tgUser = getInitDataUser();
                if (tgUser) {
                    const initData = await getInitDataString();

                    // Log init data once when we first see the user
                    if (initData && !initDataLoggedRef.current) {
                        // Best-effort logging; ignore errors to avoid breaking UI
                        api.logInitData(initData).catch(() => { /* no-op */ });
                        initDataLoggedRef.current = true;
                    }

                    api.authenticateTelegram(initData).then((authResponse) => {
                        if (authResponse.success && authResponse.user) {
                            setUser({
                                id: authResponse.user.id,
                                first_name: authResponse.user.first_name,
                                last_name: authResponse.user.last_name,
                                username: authResponse.user.username,
                                display_name: [authResponse.user.first_name, authResponse.user.last_name].filter(Boolean).join(' '),
                                photo_url: authResponse.user.photo_url || '',
                                balance: authResponse.user.balance,
                            });
                        }
                    }).catch(() => {
                        setUser({
                            id: tgUser.id,
                            first_name: tgUser.first_name,
                            last_name: tgUser.last_name,
                            username: tgUser.username,
                            display_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
                            photo_url: tgUser.photo_url ?? '',
                            balance: 0,
                        });
                    });
                }
            } catch (e) { }
        };
        loadUser();
    }, []);

    const handleSetActiveTab = useCallback((tab: TabId) => {
        setActiveTab(tab);
        if (isTelegramApp) {
            hapticSelection();
            void cloudSet('last_tab', tab);
        }
    }, [isTelegramApp]);

    const handleSetSelectedPlatform = useCallback((p: SocialPlatform | null) => {
        setSelectedPlatform(p);
        if (p && isTelegramApp) hapticSelection();
    }, [isTelegramApp]);

    const handleSetSelectedService = useCallback((s: Service | null) => {
        setSelectedService(s);
        if (s && isTelegramApp) hapticSelection();
    }, [isTelegramApp]);

    useEffect(() => {
        if (!isTelegramApp) return;
        void (async () => {
            const val = await cloudGet('last_tab');
            if (val && ['order', 'history', 'deposit', 'more'].includes(val)) {
                setActiveTab(val as TabId);
            }
        })();
    }, [isTelegramApp]);

    const value = useMemo<AppContextType>(() => ({
        user,
        isTelegramApp,
        services,
        recommendedIds,
        selectedPlatform,
        selectedCategory,
        selectedService,
        orders,
        deposits,
        alerts,
        chatMessages,
        rateMultiplier: settings.rateMultiplier,
        discountPercent: settings.discountPercent,
        holidayName: settings.holidayName,
        maintenanceMode: settings.maintenanceMode,
        userCanOrder: settings.userCanOrder,
        marqueeText: settings.marqueeText,
        activeTab,
        toasts,
        isLoading,
        unreadAlerts,
        setUser,
        setActiveTab: handleSetActiveTab,
        setSelectedPlatform: handleSetSelectedPlatform,
        setSelectedCategory,
        setSelectedService: handleSetSelectedService,
        setOrders,
        setDeposits,
        setAlerts,
        setChatMessages,
        setBalance,
        setIsLoading,
        setUnreadAlerts,
        showToast,
        removeToast,
        refreshServices,
        refreshOrders,
        refreshDeposits,
        refreshAlerts,
    }), [
        user, isTelegramApp, services, recommendedIds, selectedPlatform,
        selectedCategory, selectedService, orders, deposits, alerts, chatMessages,
        settings, activeTab, toasts, isLoading, unreadAlerts,
        handleSetActiveTab, handleSetSelectedPlatform, handleSetSelectedService,
        showToast, removeToast, refreshServices, refreshOrders, refreshDeposits, refreshAlerts, setBalance
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
