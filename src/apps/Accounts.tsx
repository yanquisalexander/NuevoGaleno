import { useState, useEffect, useRef } from 'react';
import { Activity, Wallet, ChevronRight, TrendingDown, X, Calendar, FileDown, CreditCard, ArrowUpRight, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import {
    getPatientsWithDebt,
    getPatientsWithDebtSummary,
    getPaymentsByPatient,
    type Payment,
} from '../hooks/usePayments';
import { getTreatmentsByPatient, type Treatment } from '../hooks/useTreatments';
import { useAppRuntime } from '../hooks/useAppRuntime';
import type { WindowId } from '../types/window-manager';

import { fluentDarkCompact as F } from '@/consts/fluent-tokens';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
    }).format(amount);

// ── Subcomponentes ───────────────────────────────────────────────────────────

function Spinner() {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: '12px',
            background: F.bg, fontFamily: F.font,
        }}>
            <div style={{
                width: '24px', height: '24px',
                border: `2px solid rgba(71,158,245,0.2)`,
                borderTopColor: F.brand,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <span style={{ fontSize: '12px', color: F.textDisabled }}>Cargando cuentas…</span>
        </div>
    );
}

function EmptyState({ searchTerm }: { searchTerm?: string }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: '12px', textAlign: 'center',
            padding: '40px',
        }}>
            <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: F.successMuted,
                border: `1px solid ${F.successBorder}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '4px',
            }}>
                <Activity style={{ width: '24px', height: '24px', color: F.success }} strokeWidth={1.5} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: F.textPrimary }}>
                {searchTerm ? 'Sin resultados' : 'Todo al día'}
            </span>
            <span style={{
                fontSize: '12px', color: F.textSecondary,
                maxWidth: '220px', lineHeight: '1.5',
            }}>
                {searchTerm
                    ? 'No se encontraron pacientes deudores para esa búsqueda.'
                    : 'No hay pacientes con saldos pendientes en este momento.'}
            </span>
        </div>
    );
}

function DebtorRow({ debtor, index, onClick, selected = false }: {
    debtor: any; index: number; onClick: () => void; selected?: boolean;
}) {
    const [hov, setHov] = useState(false);

    const initials = debtor.patient_name
        ?.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() ?? '??';

    return (
        <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.025, duration: 0.2, ease: [0.33, 1, 0.68, 1] }}
        >
            <button
                onClick={onClick}
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    width: '100%', padding: '11px 14px',
                    background: selected ? 'rgba(0,120,212,0.10)' : hov ? F.hover : 'transparent',
                    border: `1px solid ${selected ? 'rgba(0,120,212,0.30)' : hov ? F.borderMed : F.border}`,
                    borderRadius: '7px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.1s, border-color 0.12s',
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: F.font,
                }}
            >
                {/* Accent bar izquierdo */}
                <div style={{
                    position: 'absolute', left: 0, top: '20%', bottom: '20%',
                    width: '3px', borderRadius: '0 3px 3px 0',
                    background: F.success,
                    opacity: hov ? 1 : 0,
                    transition: 'opacity 0.12s',
                }} />

                {/* Avatar con iniciales */}
                <div style={{
                    flexShrink: 0,
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: F.successMuted,
                    border: `1px solid ${F.successBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: F.success,
                    transition: 'background 0.1s',
                    ...(hov ? { background: 'rgba(108,203,95,0.18)' } : {}),
                }}>
                    {initials}
                </div>

                {/* Nombre + badge */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        fontSize: '13px', fontWeight: 600,
                        color: hov ? F.textPrimary : 'rgba(255,255,255,0.88)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        transition: 'color 0.1s',
                    }}>
                        {debtor.patient_name}
                    </div>
                    <div style={{ marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            fontSize: '10px', fontWeight: 500,
                            color: F.textDisabled,
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${F.border}`,
                            borderRadius: '4px',
                            padding: '1px 6px',
                        }}>
                            {debtor.treatments_count} ítems
                        </span>
                    </div>
                </div>

                {/* Montos */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{
                        fontSize: '14px', fontWeight: 700,
                        color: F.success,
                        fontFamily: F.fontMono,
                        letterSpacing: '-0.3px',
                        lineHeight: 1.2,
                    }}>
                        {formatCurrency(debtor.total_balance)}
                    </div>
                    <div style={{
                        fontSize: '10px', color: F.textDisabled,
                        fontFamily: F.fontMono,
                        marginTop: '2px',
                    }}>
                        de {formatCurrency(debtor.total_treatments_cost)}
                    </div>
                </div>

                {/* Chevron */}
                <ChevronRight style={{
                    width: '14px', height: '14px', flexShrink: 0,
                    color: hov ? F.textSecondary : F.textDisabled,
                    transform: hov ? 'translateX(2px)' : 'none',
                    transition: 'color 0.1s, transform 0.15s',
                }} />
            </button>
        </motion.div>
    );
}
// ── Account Detail Panel ────────────────────────────────────────────────

const METHOD_LABEL: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
    check: 'Cheque', other: 'Otro',
};

function AccountDetailPanel({
    debtor,
    onClose,
    onOpenRecord,
}: {
    debtor: any;
    onClose: () => void;
    onOpenRecord: () => void;
}) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [treatmentMap, setTreatmentMap] = useState<Record<number, string>>({});
    const [loadingPay, setLoadingPay] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoadingPay(true);
            try {
                const [pays, treats] = await Promise.all([
                    getPaymentsByPatient(debtor.patient_id),
                    getTreatmentsByPatient(debtor.patient_id),
                ]);
                if (!cancelled) {
                    setPayments(pays);
                    const map: Record<number, string> = {};
                    (treats as Treatment[]).forEach(t => { map[t.id] = t.name; });
                    setTreatmentMap(map);
                }
            } catch (e) { console.error(e); }
            finally { if (!cancelled) setLoadingPay(false); }
        })();
        return () => { cancelled = true; };
    }, [debtor.patient_id]);

    const filtered = payments.filter(p => {
        const d = (p.payment_date || p.created_at || '').slice(0, 10);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        return true;
    }).sort((a, b) => {
        const da = (a.payment_date || a.created_at || '').slice(0, 10);
        const db = (b.payment_date || b.created_at || '').slice(0, 10);
        return db.localeCompare(da);
    });

    const filteredTotal = filtered.reduce((s, p) => s + p.amount, 0);

    const exportCSV = () => {
        const header = ['Fecha', 'Tratamiento', 'Método de Pago', 'Monto', 'Notas'];
        const rows = filtered.map(p => [
            (p.payment_date || p.created_at || '').slice(0, 10),
            treatmentMap[p.treatment_id] ?? `#${p.treatment_id}`,
            METHOD_LABEL[p.payment_method ?? ''] ?? (p.payment_method ?? ''),
            p.amount.toFixed(2),
            (p.notes ?? '').replace(/"/g, '""'),
        ]);
        const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cuenta_${debtor.patient_name.replace(/\s+/g, '_')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const initials = (debtor.patient_name as string)
        .split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

    return (
        <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
                width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
                background: F.surface,
                borderLeft: `1px solid ${F.border}`,
                fontFamily: F.font,
            }}
        >
            {/* Panel header */}
            <div style={{
                padding: '14px 16px 12px',
                borderBottom: `1px solid ${F.border}`,
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: F.successMuted,
                        border: `1px solid ${F.successBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: F.success, flexShrink: 0,
                    }}>{initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: F.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {debtor.patient_name}
                        </div>
                        <div style={{ fontSize: 11, color: F.textDisabled, marginTop: 2 }}>
                            Deuda: <span style={{ color: F.warning, fontFamily: F.fontMono, fontWeight: 600 }}>
                                {formatCurrency(debtor.total_balance)}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ padding: 4, borderRadius: 5, background: 'transparent', border: 'none', color: F.textDisabled, cursor: 'default', display: 'flex' }}
                        onMouseEnter={e => (e.currentTarget.style.background = F.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <X style={{ width: 14, height: 14 }} />
                    </button>
                </div>

                {/* Abrir ficha button */}
                <button
                    onClick={onOpenRecord}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        width: '100%', padding: '6px 12px', borderRadius: 6,
                        background: 'rgba(0,120,212,0.12)', border: '1px solid rgba(0,120,212,0.25)',
                        color: '#60b0ff', fontSize: 12, fontWeight: 500,
                        cursor: 'default', fontFamily: F.font,
                        transition: 'all 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,120,212,0.18)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,120,212,0.12)')}
                >
                    <ArrowUpRight style={{ width: 12, height: 12 }} />
                    Abrir ficha completa
                </button>
            </div>

            {/* Date filters */}
            <div style={{
                padding: '10px 14px',
                borderBottom: `1px solid ${F.border}`,
                display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
            }}>
                <Calendar style={{ width: 12, height: 12, color: F.textDisabled, flexShrink: 0 }} />
                <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    style={{
                        flex: 1, background: F.bg, border: `1px solid ${F.borderMed}`,
                        borderRadius: 5, color: F.textSecondary,
                        fontSize: 11, padding: '4px 6px',
                        fontFamily: F.font, outline: 'none',
                    }}
                />
                <span style={{ fontSize: 10, color: F.textDisabled }}>–</span>
                <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    style={{
                        flex: 1, background: F.bg, border: `1px solid ${F.borderMed}`,
                        borderRadius: 5, color: F.textSecondary,
                        fontSize: 11, padding: '4px 6px',
                        fontFamily: F.font, outline: 'none',
                    }}
                />
                {(dateFrom || dateTo) && (
                    <button
                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                        style={{ background: 'none', border: 'none', color: F.textDisabled, cursor: 'default', padding: 2, display: 'flex' }}
                    >
                        <X style={{ width: 11, height: 11 }} />
                    </button>
                )}
            </div>

            {/* Payments list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                {loadingPay ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                        <div style={{ width: 18, height: 18, border: `2px solid rgba(71,158,245,0.2)`, borderTopColor: F.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: F.textDisabled, fontSize: 12 }}>
                        {payments.length === 0 ? 'Sin pagos registrados' : 'Sin pagos en el período'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {filtered.map((p, i) => (
                            <motion.div
                                key={p.id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.015, duration: 0.15 }}
                                style={{
                                    padding: '8px 10px', borderRadius: 6,
                                    background: 'rgba(255,255,255,0.025)',
                                    border: `1px solid ${F.border}`,
                                    display: 'flex', flexDirection: 'column', gap: 3,
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: F.success, fontFamily: F.fontMono }}>
                                        {formatCurrency(p.amount)}
                                    </span>
                                    <span style={{ fontSize: 10, color: F.textDisabled, fontFamily: F.fontMono }}>
                                        {(p.payment_date || p.created_at || '').slice(0, 10)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CreditCard style={{ width: 10, height: 10, color: F.textDisabled, flexShrink: 0 }} />
                                    <span style={{ fontSize: 11, color: F.textSecondary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {treatmentMap[p.treatment_id] ?? `Tratamiento #${p.treatment_id}`}
                                    </span>
                                    {p.payment_method && (
                                        <span style={{
                                            fontSize: 9, fontWeight: 600,
                                            background: 'rgba(255,255,255,0.05)',
                                            border: `1px solid ${F.border}`,
                                            padding: '1px 5px', borderRadius: 3,
                                            color: F.textDisabled, textTransform: 'uppercase', letterSpacing: '0.04em',
                                        }}>
                                            {METHOD_LABEL[p.payment_method] ?? p.payment_method}
                                        </span>
                                    )}
                                </div>
                                {p.notes && (
                                    <p style={{ fontSize: 10, color: F.textDisabled, margin: 0, paddingLeft: 16, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {p.notes}
                                    </p>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer: total + export */}
            {filtered.length > 0 && (
                <div style={{
                    padding: '10px 14px',
                    borderTop: `1px solid ${F.border}`,
                    display: 'flex', alignItems: 'center', gap: 8,
                    flexShrink: 0,
                }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, color: F.textDisabled, marginBottom: 1 }}>
                            {filtered.length} pago{filtered.length !== 1 ? 's' : ''} · cobrado
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: F.success, fontFamily: F.fontMono }}>
                            {formatCurrency(filteredTotal)}
                        </div>
                    </div>
                    <button
                        onClick={exportCSV}
                        title="Exportar CSV"
                        style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '6px 10px', borderRadius: 6,
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${F.borderMed}`,
                            color: F.textSecondary, fontSize: 11, fontWeight: 500,
                            cursor: 'default', fontFamily: F.font,
                            transition: 'all 0.1s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = F.hover)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    >
                        <FileDown style={{ width: 12, height: 12 }} />
                        CSV
                    </button>
                </div>
            )}
        </motion.div>
    );
}
// ── Main ─────────────────────────────────────────────────────────────────────

export function AccountsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    useAppRuntime('accounts', 'Cuentas Corrientes');
    const [debtors, setDebtors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [totalDebt, setTotalDebt] = useState(0);
    const [totalDebtorsCount, setTotalDebtorsCount] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [selectedDebtor, setSelectedDebtor] = useState<any | null>(null);
    const loadingNextPageRef = useRef(false);
    const pageRef = useRef(0);
    const listRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const pageSize = 30;
    const { openWindow } = useWindowManager();

    useEffect(() => {
        loadDebtorsPage(0, true, '');
        loadSummary('');
    }, []);

    useEffect(() => {
        const id = window.setTimeout(() => {
            setDebouncedSearchQuery(searchQuery.trim());
        }, 260);

        return () => window.clearTimeout(id);
    }, [searchQuery]);

    useEffect(() => {
        loadingNextPageRef.current = false;
        pageRef.current = 0;
        setHasMore(true);
        setDebtors([]);
        setSelectedDebtor(null);
        loadDebtorsPage(0, true, debouncedSearchQuery);
        loadSummary(debouncedSearchQuery);
    }, [debouncedSearchQuery]);

    useEffect(() => {
        if (!hasMore || isLoading || isLoadingMore || !listRef.current || !sentinelRef.current) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                const first = entries[0];
                if (!first?.isIntersecting || loadingNextPageRef.current) return;
                loadDebtorsPage(pageRef.current + 1, false, debouncedSearchQuery);
            },
            {
                root: listRef.current,
                rootMargin: '180px 0px',
                threshold: 0,
            }
        );

        observer.observe(sentinelRef.current);

        return () => observer.disconnect();
    }, [hasMore, isLoading, isLoadingMore, debouncedSearchQuery]);

    const loadSummary = async (query = '') => {
        try {
            const summary = await getPatientsWithDebtSummary(query);
            setTotalDebt(summary.total_debt ?? 0);
            setTotalDebtorsCount(summary.debtors_count ?? 0);
        } catch (e) {
            console.error(e);
        }
    };

    const loadDebtorsPage = async (targetPage: number, reset = false, query = debouncedSearchQuery) => {
        if (loadingNextPageRef.current && !reset) return;

        if (reset) {
            setIsLoading(true);
        } else {
            loadingNextPageRef.current = true;
            setIsLoadingMore(true);
        }

        try {
            const data = await getPatientsWithDebt(pageSize, targetPage * pageSize, query);
            setDebtors(prev => (reset ? data : [...prev, ...data]));
            setHasMore(data.length === pageSize);
            pageRef.current = targetPage;
        } catch (e) {
            console.error(e);
        } finally {
            loadingNextPageRef.current = false;
            setIsLoadingMore(false);
            setIsLoading(false);
        }
    };

    if (isLoading) return <Spinner />;

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: F.bg, fontFamily: F.font, color: F.textPrimary,
        }}>

            {/* ── Header ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px',
                background: F.surface,
                borderBottom: `1px solid ${F.border}`,
                flexShrink: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px',
                        background: F.successMuted,
                        border: `1px solid ${F.successBorder}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Wallet style={{ width: '16px', height: '16px', color: F.success }} strokeWidth={1.5} />
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.2 }}>
                            Cuentas Corrientes
                        </div>
                        <div style={{ fontSize: '11px', color: F.textDisabled, marginTop: '1px' }}>
                            Estado de saldos pendientes
                        </div>
                    </div>
                </div>

                {totalDebtorsCount > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            padding: '4px 10px',
                            background: F.warningMuted,
                            border: `1px solid rgba(252,225,0,0.18)`,
                            borderRadius: '6px',
                        }}>
                            <TrendingDown style={{ width: '12px', height: '12px', color: F.warning }} />
                            <span style={{ fontSize: '11px', fontWeight: 600, color: F.warning, fontFamily: F.fontMono }}>
                                {formatCurrency(totalDebt)}
                            </span>
                        </div>
                        <div style={{
                            padding: '4px 10px',
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${F.border}`,
                            borderRadius: '6px',
                            fontSize: '11px', fontWeight: 500,
                            color: F.textSecondary,
                        }}>
                            {totalDebtorsCount} pacientes
                        </div>
                    </div>
                )}
            </div>

            <div style={{
                padding: '10px 20px',
                borderBottom: `1px solid ${F.border}`,
                background: F.surface,
                flexShrink: 0,
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: F.bg,
                    border: `1px solid ${F.borderMed}`,
                    borderRadius: '8px',
                    padding: '7px 10px',
                }}>
                    <Search style={{ width: 14, height: 14, color: F.textDisabled, flexShrink: 0 }} />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre, DNI o teléfono"
                        style={{
                            flex: 1,
                            background: 'transparent',
                            border: 'none',
                            color: F.textPrimary,
                            fontSize: 12,
                            outline: 'none',
                            fontFamily: F.font,
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{ background: 'none', border: 'none', color: F.textDisabled, cursor: 'pointer', padding: 2, display: 'flex' }}
                            title="Limpiar búsqueda"
                        >
                            <X style={{ width: 12, height: 12 }} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body: list + optional detail panel ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                {/* ── Lista ── */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '12px 16px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(255,255,255,0.1) transparent',
                }} ref={listRef}>
                    <AnimatePresence>
                        {debtors.length === 0 ? (
                            <EmptyState searchTerm={debouncedSearchQuery} />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {debtors.map((debtor, i) => (
                                    <DebtorRow
                                        key={debtor.patient_id}
                                        debtor={debtor}
                                        index={i}
                                        selected={selectedDebtor?.patient_id === debtor.patient_id}
                                        onClick={() => setSelectedDebtor(
                                            selectedDebtor?.patient_id === debtor.patient_id ? null : debtor
                                        )}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>

                    <div ref={sentinelRef} style={{ height: 1 }} />

                    {isLoadingMore && (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}>
                            <div style={{ width: 18, height: 18, border: `2px solid rgba(71,158,245,0.2)`, borderTopColor: F.brand, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                    )}

                    {!hasMore && debtors.length > 0 && (
                        <div style={{
                            textAlign: 'center', padding: '12px 0 4px',
                            color: F.textDisabled, fontSize: 11,
                        }}>
                            Fin de la lista
                        </div>
                    )}
                </div>

                {/* ── Detail panel ── */}
                <AnimatePresence>
                    {selectedDebtor && (
                        <AccountDetailPanel
                            debtor={selectedDebtor}
                            onClose={() => setSelectedDebtor(null)}
                            onOpenRecord={() => {
                                openWindow('patient-record', { patientId: selectedDebtor.patient_id });
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}