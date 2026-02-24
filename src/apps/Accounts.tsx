import { useState, useEffect } from 'react';
import { Activity, Wallet, ChevronRight, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { getPatientsWithDebt } from '../hooks/usePayments';
import { useAppRuntime } from '../hooks/useAppRuntime';
import type { WindowId } from '../types/window-manager';

// ── Fluent UI v9 Dark tokens ─────────────────────────────────────────────────
const F = {
    bg: '#141414',
    surface: '#1c1c1c',
    surfaceRaised: '#222222',
    hover: 'rgba(255,255,255,0.055)',
    pressed: 'rgba(255,255,255,0.03)',
    border: 'rgba(255,255,255,0.07)',
    borderMed: 'rgba(255,255,255,0.12)',
    brand: '#479ef5',
    brandMuted: 'rgba(71,158,245,0.1)',
    brandBorder: 'rgba(71,158,245,0.22)',
    success: '#6ccb5f',
    successMuted: 'rgba(108,203,95,0.1)',
    successBorder: 'rgba(108,203,95,0.22)',
    warning: '#fce100',
    warningMuted: 'rgba(252,225,0,0.08)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.58)',
    textDisabled: 'rgba(255,255,255,0.3)',
    font: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    fontMono: "'Cascadia Code', 'Consolas', monospace",
};

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

function EmptyState() {
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
                Todo al día
            </span>
            <span style={{
                fontSize: '12px', color: F.textSecondary,
                maxWidth: '220px', lineHeight: '1.5',
            }}>
                No hay pacientes con saldos pendientes en este momento.
            </span>
        </div>
    );
}

function DebtorRow({ debtor, index, onClick }: {
    debtor: any; index: number; onClick: () => void;
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
                    background: hov ? F.hover : 'transparent',
                    border: `1px solid ${hov ? F.borderMed : F.border}`,
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

// ── Main ─────────────────────────────────────────────────────────────────────

export function AccountsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    useAppRuntime('accounts', 'Cuentas Corrientes');
    const [debtors, setDebtors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { openWindow } = useWindowManager();

    useEffect(() => { loadDebtors(); }, []);

    const loadDebtors = async () => {
        setIsLoading(true);
        try { setDebtors(await getPatientsWithDebt()); }
        catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };

    const totalDebt = debtors.reduce((acc, d) => acc + (d.total_balance ?? 0), 0);

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

                {/* Summary chips */}
                {debtors.length > 0 && (
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
                            {debtors.length} pacientes
                        </div>
                    </div>
                )}
            </div>

            {/* ── Lista ── */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '12px 16px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.1) transparent',
            }}>
                <AnimatePresence>
                    {debtors.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {debtors.map((debtor, i) => (
                                <DebtorRow
                                    key={debtor.patient_id}
                                    debtor={debtor}
                                    index={i}
                                    onClick={() => openWindow('patient-record', { patientId: debtor.patient_id })}
                                />
                            ))}
                        </div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    );
}