import { useState, useMemo, useEffect, useRef } from 'react';
import type { Service } from '../../types';
import { formatETB } from '../../constants';
import { getServices } from '../../api';

interface Props {
    onSelect: (service: Service) => void;
    onClose: () => void;
}

export function SearchModal({ onSelect, onClose }: Props) {
    const [search, setSearch] = useState('');
    const [rawServices, setRawServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [timedOut, setTimedOut] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    // Fetch services directly on mount — localStorage cache makes this near-instant
    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        // Force refresh to get latest data without cached disabled services
        getServices(false)
            .then(data => {
                if (!cancelled) {
                    setRawServices(Array.isArray(data) ? data : []);
                    setLoading(false);
                }
            })
            .catch(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, []);

    // Also wait up to 5s if rawServices is empty even after "loading" finishes.
    useEffect(() => {
        if (rawServices.length > 0) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setTimedOut(false);
            return;
        }
        if (!loading && rawServices.length === 0) {
            setTimedOut(false);
            timerRef.current = setTimeout(() => setTimedOut(true), 5000);
        }
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [rawServices.length, loading]);

    // Compute the relevant services
    const services = useMemo<Service[]>(() => {
        if (rawServices.length === 0) return [];
        return rawServices.map((s: any) => ({
            id: s.service,
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
    }, [rawServices]);

    const results = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return [];
        const terms = q.split(/\s+/);
        return services.filter(s => {
            const haystack = `${s.name} ${s.category} ${s.id}`.toLowerCase();
            return terms.every(t => haystack.includes(t));
        }).slice(0, 30);
    }, [services, search]);

    const grouped = useMemo(() => {
        const map = new Map<string, Service[]>();
        for (const s of results) {
            const arr = map.get(s.category) || [];
            arr.push(s);
            map.set(s.category, arr);
        }
        return map;
    }, [results]);

    const isWaitingForData = (loading || (rawServices.length === 0 && !timedOut));
    const isTrulyEmpty = !loading && rawServices.length === 0 && timedOut;

    const spinnerStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: 12,
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-sheet modal-sheet--large" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-title">🔍 Search All Services</span>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                
                <div className="modal-search">
                    <input
                        type="text"
                        className="modal-search-input"
                        placeholder="Search by name, ID, or category..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>

                <div className="modal-list">
                    {isWaitingForData ? (
                        <div style={spinnerStyle}>
                            <div style={{
                                width: 32,
                                height: 32,
                                border: '3px solid rgba(255,255,255,0.1)',
                                borderTopColor: 'var(--tg-theme-link-color, #6ab3f3)',
                                borderRadius: '50%',
                                animation: 'searchModalSpin 0.8s linear infinite',
                            }} />
                            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                                Loading services...
                            </span>
                            <style>{`@keyframes searchModalSpin { to { transform: rotate(360deg); } }`}</style>
                        </div>
                    ) : isTrulyEmpty ? (
                         <div className="modal-empty">Failed to load services. Please try again later.</div>
                    ) : search.trim() === '' ? (
                        <div className="modal-empty">Start typing to search across all services</div>
                    ) : results.length === 0 ? (
                        <div className="modal-empty">No services match your search</div>
                    ) : (
                        Array.from(grouped.entries()).map(([category, svcs]) => (
                            <div key={category}>
                                <div className="modal-group-header">{category}</div>
                                {svcs.map(svc => (
                                    <div
                                        key={svc.id}
                                        className="modal-item"
                                        onClick={() => onSelect(svc)}
                                    >
                                        <div className="modal-item-main">
                                            <div className="modal-item-name">{svc.name}</div>
                                            <div className="modal-item-desc">#{svc.id} • {formatETB(svc.rate)}/1K</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
