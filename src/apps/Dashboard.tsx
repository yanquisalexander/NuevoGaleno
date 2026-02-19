import { useState, useEffect } from 'react';
import { UserCircle, Activity, AlertTriangle, ArrowRight, Clock, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { usePatients } from '../hooks/usePatients';
import { getTreatmentStats } from '../hooks/useTreatments';
import { getTotalDebt } from '../hooks/usePayments';
import { useAppRuntime } from '../hooks/useAppRuntime';
import type { WindowId } from '../types/window-manager';

// ─── Mica Background ──────────────────────────────────────────────────────────
// Simulates Windows 11 Mica: blurred system wallpaper + tinted overlay + noise
function MicaBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
            {/* Base: very subtle colored tint */}
            <div
                style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(135deg, rgba(30,34,54,0.92) 0%, rgba(18,20,32,0.96) 60%, rgba(24,28,44,0.94) 100%)',
                }}
            />
            {/* Mica tinted color blobs */}
            <div style={{
                position: 'absolute', top: -120, left: -80,
                width: 420, height: 420, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0,90,255,0.07) 0%, transparent 70%)',
                filter: 'blur(60px)',
            }} />
            <div style={{
                position: 'absolute', bottom: -80, right: -60,
                width: 380, height: 380, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(80,40,200,0.06) 0%, transparent 70%)',
                filter: 'blur(60px)',
            }} />
            {/* Noise grain overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                opacity: 0.03,
                mixBlendMode: 'overlay',
            }} />
        </div>
    );
}

// ─── Acrylic Card (Fluent "card" surface) ─────────────────────────────────────
function AcrylicCard({ children, className = '', style = {} }: {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div
            className={className}
            style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 8,
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                position: 'relative',
                overflow: 'hidden',
                ...style,
            }}
        >
            {/* top highlight — classic Fluent card detail */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'rgba(255,255,255,0.06)',
                pointerEvents: 'none',
            }} />
            {children}
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
const colorMap: Record<string, { accent: string; glow: string; bg: string; icon: string }> = {
    blue: { accent: '#0078d4', glow: 'rgba(0,120,212,0.25)', bg: 'rgba(0,120,212,0.08)', icon: 'rgba(0,120,212,0.9)' },
    amber: { accent: '#fcb900', glow: 'rgba(252,185,0,0.2)', bg: 'rgba(252,185,0,0.07)', icon: 'rgba(252,185,0,0.9)' },
    indigo: { accent: '#6264a7', glow: 'rgba(98,100,167,0.25)', bg: 'rgba(98,100,167,0.08)', icon: 'rgba(140,142,200,0.9)' },
    rose: { accent: '#d13438', glow: 'rgba(209,52,56,0.25)', bg: 'rgba(209,52,56,0.08)', icon: 'rgba(252,100,100,0.9)' },
};

function StatCard({
    title, value, icon, subtitle, isCritical, color = 'blue', index = 0,
}: {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    subtitle?: string;
    isCritical?: boolean;
    color?: string;
    index?: number;
}) {
    const [hovered, setHovered] = useState(false);
    const c = colorMap[color] ?? colorMap.blue;

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                position: 'relative', overflow: 'hidden',
                background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 8,
                padding: '18px 20px',
                transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
                boxShadow: hovered
                    ? `0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)`
                    : '0 2px 8px rgba(0,0,0,0.15)',
                cursor: 'default',
            }}
        >
            {/* Accent glow on hover */}
            <div style={{
                position: 'absolute', bottom: -30, right: -30,
                width: 100, height: 100, borderRadius: '50%',
                background: c.glow,
                filter: 'blur(24px)',
                opacity: hovered ? 1 : 0,
                transition: 'opacity 0.2s',
                pointerEvents: 'none',
            }} />

            {/* Top highlight */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                background: 'rgba(255,255,255,0.06)',
                pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{
                    width: 34, height: 34, borderRadius: 6,
                    background: c.bg,
                    border: `1px solid ${c.accent}22`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: c.icon, fontSize: 16,
                }}>
                    {icon}
                </div>
                {isCritical && (
                    <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#d13438',
                        boxShadow: '0 0 6px rgba(209,52,56,0.8)',
                        animation: 'pulse 2s infinite',
                    }} />
                )}
            </div>

            <p style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 4,
                fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
            }}>
                {title}
            </p>
            <p style={{
                fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.92)',
                lineHeight: 1.15, letterSpacing: '-0.02em',
                fontFamily: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
            }}>
                {value}
            </p>
            {subtitle && (
                <p style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.28)',
                    marginTop: 4,
                    fontFamily: '"Cascadia Code", "Consolas", monospace',
                    letterSpacing: '0.01em',
                }}>
                    {subtitle}
                </p>
            )}

            {/* Bottom accent bar */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0,
                height: 2, borderRadius: '0 0 0 8px',
                background: c.accent,
                width: hovered ? '100%' : '0%',
                transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
                opacity: 0.7,
            }} />
        </motion.div>
    );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ onClick, title, desc, icon, accentColor, index = 0 }: {
    onClick: () => void;
    title: string;
    desc: string;
    icon: string;
    accentColor: string;
    index?: number;
}) {
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    return (
        <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.25 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px',
                borderRadius: 8, textAlign: 'left',
                background: pressed
                    ? 'rgba(255,255,255,0.05)'
                    : hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${hovered ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                boxShadow: hovered
                    ? '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
                    : '0 2px 4px rgba(0,0,0,0.1)',
                transform: pressed ? 'scale(0.985)' : 'scale(1)',
                transition: 'all 0.1s ease',
                cursor: 'default',
                width: '100%',
                position: 'relative', overflow: 'hidden',
            }}
        >
            {/* Accent glow */}
            <div style={{
                position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
                width: 4, height: '50%', borderRadius: 2,
                background: accentColor,
                opacity: hovered ? 0.7 : 0,
                transition: 'opacity 0.15s',
                boxShadow: `0 0 8px ${accentColor}`,
            }} />

            <div style={{
                width: 40, height: 40, borderRadius: 8,
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
                transition: 'transform 0.15s',
                transform: hovered ? 'scale(1.06)' : 'scale(1)',
            }}>
                {icon}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    fontSize: 13, fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
                    marginBottom: 2,
                }}>
                    {title}
                </p>
                <p style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.35)',
                    fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {desc}
                </p>
            </div>

            <ArrowRight
                size={14}
                style={{
                    color: 'rgba(255,255,255,0.3)',
                    flexShrink: 0,
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'translateX(0)' : 'translateX(-6px)',
                    transition: 'all 0.15s',
                }}
            />
        </motion.button>
    );
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <p style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            marginBottom: 10,
            fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
        }}>
            {children}
        </p>
    );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export function DashboardApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    useAppRuntime('dashboard', 'Panel de Control');

    const [stats, setStats] = useState({
        patientsCount: 0,
        treatmentStats: {
            pending_count: 0, in_progress_count: 0, completed_count: 0,
            total_pending_cost: 0, total_in_progress_cost: 0, total_completed_cost: 0,
        },
        totalDebt: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const { openWindow } = useWindowManager();
    const { getPatientsCount } = usePatients();

    useEffect(() => { loadStats(); }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [count, treatmentStats, debt] = await Promise.all([
                getPatientsCount(),
                getTreatmentStats(),
                getTotalDebt(),
            ]);
            setStats({ patientsCount: count, treatmentStats, totalDebt: debt });
            setLastUpdated(new Date());
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);

    return (
        <div
            className="h-full overflow-y-auto"
            style={{
                position: 'relative',
                fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
                color: 'rgba(255,255,255,0.9)',
            }}
        >
            <MicaBackground />

            <div style={{ position: 'relative', zIndex: 1 }}>
                {/* ── Header ── */}
                <header style={{
                    padding: '28px 28px 20px',
                    position: 'sticky', top: 0, zIndex: 10,
                    background: 'rgba(18,20,32,0.6)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                        <div>
                            <motion.h1
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em',
                                    color: 'rgba(255,255,255,0.95)', lineHeight: 1.1,
                                    fontFamily: '"Segoe UI Variable Display", "Segoe UI", system-ui, sans-serif',
                                }}
                            >
                                Panel de Control
                            </motion.h1>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.1 }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}
                            >
                                <Clock size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.01em' }}>
                                    Actualizado: {lastUpdated.toLocaleTimeString('es-AR')}
                                </span>
                            </motion.div>
                        </div>

                        {/* Refresh button — Fluent style */}
                        <button
                            onClick={loadStats}
                            disabled={isLoading}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                padding: '7px 14px', borderRadius: 6,
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.09)',
                                color: 'rgba(255,255,255,0.75)',
                                fontSize: 12, fontWeight: 500,
                                cursor: isLoading ? 'default' : 'default',
                                opacity: isLoading ? 0.5 : 1,
                                transition: 'all 0.1s',
                                fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => !isLoading && ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)')}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)')}
                        >
                            <RefreshCw
                                size={13}
                                style={{
                                    animation: isLoading ? 'spin 1s linear infinite' : 'none',
                                }}
                            />
                            Actualizar
                        </button>
                    </div>
                </header>

                {/* ── Content ── */}
                <main style={{ padding: '24px 28px 32px' }}>

                    {isLoading ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', justifyContent: 'center',
                            height: 200, gap: 14,
                        }}>
                            <div style={{
                                width: 28, height: 28,
                                border: '2px solid rgba(0,120,212,0.3)',
                                borderTopColor: '#0078d4',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
                                Cargando estadísticas…
                            </span>
                        </div>
                    ) : (
                        <>
                            {/* Stats grid */}
                            <SectionLabel>Resumen</SectionLabel>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                gap: 10, marginBottom: 28,
                            }}>
                                <StatCard title="Pacientes" value={stats.patientsCount}
                                    icon={<UserCircle size={16} />} color="blue" index={0} />
                                <StatCard title="Por Hacer" value={stats.treatmentStats.pending_count}
                                    subtitle={formatCurrency(stats.treatmentStats.total_pending_cost)}
                                    icon={<Activity size={16} />} color="amber" index={1} />
                                <StatCard title="En Curso" value={stats.treatmentStats.in_progress_count}
                                    subtitle={formatCurrency(stats.treatmentStats.total_in_progress_cost)}
                                    icon={<Activity size={16} />} color="indigo" index={2} />
                                <StatCard title="Deuda Total" value={formatCurrency(stats.totalDebt)}
                                    icon={<AlertTriangle size={16} />} color="rose" isCritical index={3} />
                            </div>

                            {/* Quick actions */}
                            <SectionLabel>Acceso directo</SectionLabel>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: 8,
                            }}>
                                <QuickAction onClick={() => openWindow('patients')}
                                    title="Pacientes" desc="Gestión de historias clínicas"
                                    icon="👥" accentColor="#0078d4" index={0} />
                                <QuickAction onClick={() => openWindow('treatments')}
                                    title="Tratamientos" desc="Seguimiento de planes"
                                    icon="🦷" accentColor="#6264a7" index={1} />
                                <QuickAction onClick={() => openWindow('accounts')}
                                    title="Cuentas" desc="Balances y pagos"
                                    icon="💰" accentColor="#107c10" index={2} />
                            </div>
                        </>
                    )}
                </main>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}