import { useState, useEffect } from 'react';
import {
    Treatment, getTreatmentsByPatient, createTreatment,
    updateTreatment, updateTreatmentStatus
} from '../../hooks/useTreatments';
import { TreatmentForm } from './TreatmentForm';
import { AddGeneralTreatmentDialog } from './AddGeneralTreatmentDialog';
import {
    Stethoscope, DollarSign, Calendar, Plus, Edit,
    Clock, Loader2, CheckCircle2, XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

// ─── Fluent UI v9 tokens (shared with OdontogramAdvanced) ────────────────────
const tokens = {
    colorNeutralBackground1: '#1c1c1c',
    colorNeutralBackground2: '#242424',
    colorNeutralBackground3: '#2e2e2e',
    colorNeutralBackground4: '#383838',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: 'rgba(255,255,255,0.72)',
    colorNeutralForeground3: 'rgba(255,255,255,0.48)',
    colorNeutralForeground4: 'rgba(255,255,255,0.28)',
    colorNeutralStroke1: 'rgba(255,255,255,0.10)',
    colorNeutralStroke2: 'rgba(255,255,255,0.06)',
    colorBrandBackground: '#0078d4',
    colorBrandBackgroundHover: '#106ebe',
    colorBrandForeground: '#4da6ff',
    colorPaletteGreenForeground: '#73c765',
    colorPaletteGreenBackground: 'rgba(107,191,89,0.12)',
    colorPaletteRedForeground: '#f1707a',
    colorPaletteRedBackground: 'rgba(232,17,35,0.12)',
    colorPaletteYellowForeground: '#ffb900',
    colorPaletteYellowBackground: 'rgba(255,185,0,0.12)',
    borderRadiusMedium: '6px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',
    durationNormal: '150ms',
    curveEasyEase: 'cubic-bezier(0.33,0,0.67,1)',
} as const;

const STATUS_CONFIG = {
    Pending: {
        label: 'Pendiente',
        icon: Clock,
        color: tokens.colorPaletteYellowForeground,
        bg: tokens.colorPaletteYellowBackground,
        border: 'rgba(255,185,0,0.25)',
    },
    InProgress: {
        label: 'En Proceso',
        icon: Loader2,
        color: tokens.colorBrandForeground,
        bg: 'rgba(77,166,255,0.12)',
        border: 'rgba(77,166,255,0.25)',
    },
    Completed: {
        label: 'Completado',
        icon: CheckCircle2,
        color: tokens.colorPaletteGreenForeground,
        bg: tokens.colorPaletteGreenBackground,
        border: 'rgba(107,191,89,0.25)',
    },
    Cancelled: {
        label: 'Cancelado',
        icon: XCircle,
        color: tokens.colorPaletteRedForeground,
        bg: tokens.colorPaletteRedBackground,
        border: 'rgba(232,17,35,0.25)',
    },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

interface TreatmentListProps {
    patientId: number;
    onSelectTreatment?: (treatment: Treatment) => void;
}

// ─── Inline status selector (no Radix dependency) ────────────────────────────
function StatusBadge({ current, onChange }: { current: string; onChange: (s: string) => void }) {
    const [open, setOpen] = useState(false);
    const cfg = STATUS_CONFIG[current as StatusKey] ?? STATUS_CONFIG.Pending;
    const Icon = cfg.icon;

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', fontSize: 11, fontWeight: 600,
                    borderRadius: 20,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}`,
                    color: cfg.color, cursor: 'pointer',
                    transition: `all ${tokens.durationNormal}`,
                    whiteSpace: 'nowrap',
                }}
            >
                <Icon style={{ width: 11, height: 11 }} />
                {cfg.label}
                <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.6 }}>
                    <path d="M4 5.5L1 2.5h6z" fill="currentColor" />
                </svg>
            </button>

            <AnimatePresence>
                {open && (
                    <>
                        {/* backdrop */}
                        <div
                            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                            onClick={() => setOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -4, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.97 }}
                            transition={{ duration: 0.12 }}
                            style={{
                                position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                                zIndex: 50, minWidth: 150,
                                background: tokens.colorNeutralBackground1,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                borderRadius: tokens.borderRadiusLarge,
                                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                                overflow: 'hidden',
                                padding: 4,
                            }}
                        >
                            {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, c]) => {
                                const I = c.icon;
                                const isActive = current === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={e => { e.stopPropagation(); onChange(key); setOpen(false); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            width: '100%', padding: '7px 10px',
                                            fontSize: 12, fontWeight: isActive ? 600 : 400,
                                            borderRadius: tokens.borderRadiusMedium,
                                            border: 'none', cursor: 'pointer',
                                            background: isActive ? c.bg : 'transparent',
                                            color: isActive ? c.color : tokens.colorNeutralForeground2,
                                            transition: `background ${tokens.durationNormal}`,
                                            textAlign: 'left',
                                        }}
                                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = tokens.colorNeutralBackground3; }}
                                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                                    >
                                        <I style={{ width: 13, height: 13, color: c.color }} />
                                        {c.label}
                                    </button>
                                );
                            })}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function TreatmentList({ patientId, onSelectTreatment }: TreatmentListProps) {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showCatalogDialog, setShowCatalogDialog] = useState(false);
    const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);

    useEffect(() => { loadTreatments(); }, [patientId]);

    const loadTreatments = async () => {
        setIsLoading(true);
        try {
            const data = await getTreatmentsByPatient(patientId);
            setTreatments(data);
        } catch {
            /* noop */
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    const handleSave = async (data: any) => {
        try {
            if (selectedTreatment) {
                await updateTreatment(selectedTreatment.id, data);
                toast.success('Tratamiento actualizado');
            } else {
                await createTreatment(data);
                toast.success('Tratamiento creado');
            }
            setShowForm(false);
            setSelectedTreatment(null);
            loadTreatments();
        } catch (error) {
            throw error;
        }
    };

    const handleQuickStatusChange = async (treatment: Treatment, newStatus: string) => {
        setTreatments(prev =>
            prev.map(t => t.id === treatment.id ? { ...t, status: newStatus as any } : t)
        );
        try {
            await updateTreatmentStatus(treatment.id, newStatus);
            toast.success('Estado actualizado');
        } catch {
            toast.error('Error al actualizar estado');
            loadTreatments();
        }
    };

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
                <Loader2 className="animate-spin" style={{ width: 18, height: 18, color: tokens.colorBrandForeground }} />
                <span style={{ fontSize: 13, color: tokens.colorNeutralForeground3 }}>Cargando tratamientos...</span>
            </div>
        );
    }

    // ── Empty state ──────────────────────────────────────────────────────────
    if (treatments.length === 0) {
        return (
            <>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '64px 24px', gap: 12,
                    textAlign: 'center',
                }}>
                    <div style={{
                        width: 56, height: 56,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: tokens.colorNeutralBackground3,
                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                        borderRadius: '50%', marginBottom: 4,
                    }}>
                        <Stethoscope style={{ width: 22, height: 22, color: tokens.colorNeutralForeground4 }} />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: 0 }}>
                        Sin tratamientos registrados
                    </p>
                    <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, maxWidth: 320, margin: 0, lineHeight: 1.5 }}>
                        Registra el primer tratamiento de este paciente para comenzar el seguimiento.
                    </p>
                    <button
                        onClick={() => setShowCatalogDialog(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 18px', marginTop: 8,
                            fontSize: 13, fontWeight: 500,
                            borderRadius: tokens.borderRadiusLarge,
                            border: `1px solid rgba(255,255,255,0.12)`,
                            background: tokens.colorBrandBackground,
                            color: '#fff', cursor: 'pointer',
                        }}
                    >
                        <Plus style={{ width: 14, height: 14 }} />
                        Crear Primer Tratamiento
                    </button>
                </div>
                {showForm && (
                    <TreatmentForm patientId={patientId} onSave={handleSave} onCancel={() => setShowForm(false)} />
                )}
                <AddGeneralTreatmentDialog
                    isOpen={showCatalogDialog}
                    onClose={() => setShowCatalogDialog(false)}
                    patientId={patientId}
                    onSuccess={loadTreatments}
                />
            </>
        );
    }

    // ── Summary stats ────────────────────────────────────────────────────────
    const totalCost = treatments.reduce((s, t) => s + t.total_cost, 0);
    const totalBalance = treatments.reduce((s, t) => s + t.balance, 0);
    const countByStatus = treatments.reduce((acc, t) => {
        acc[t.status as StatusKey] = (acc[t.status as StatusKey] || 0) + 1;
        return acc;
    }, {} as Partial<Record<StatusKey, number>>);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 900, margin: '0 auto' }}>

            {/* ── Header ──────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                        Tratamientos
                    </span>
                    <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        background: tokens.colorNeutralBackground3,
                        color: tokens.colorNeutralForeground3,
                        borderRadius: 20, border: `1px solid ${tokens.colorNeutralStroke1}`,
                    }}>
                        {treatments.length}
                    </span>
                </div>
                <button
                    onClick={() => setShowCatalogDialog(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '6px 14px', fontSize: 12, fontWeight: 500,
                        borderRadius: tokens.borderRadiusLarge,
                        border: `1px solid rgba(255,255,255,0.12)`,
                        background: tokens.colorBrandBackground,
                        color: '#fff', cursor: 'pointer',
                        transition: `background ${tokens.durationNormal}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = tokens.colorBrandBackgroundHover}
                    onMouseLeave={e => e.currentTarget.style.background = tokens.colorBrandBackground}
                >
                    <Plus style={{ width: 13, height: 13 }} />
                    Nuevo Tratamiento
                </button>
            </div>

            {/* ── Summary bar ─────────────────────────────────────── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8,
                padding: '10px 14px',
                background: tokens.colorNeutralBackground2,
                border: `1px solid ${tokens.colorNeutralStroke1}`,
                borderRadius: tokens.borderRadiusLarge,
            }}>
                {/* Cost / Balance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <DollarSign style={{ width: 13, height: 13, color: tokens.colorNeutralForeground4 }} />
                    <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>Total:</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                        {formatCurrency(totalCost)}
                    </span>
                </div>
                <div style={{ width: 1, background: tokens.colorNeutralStroke1, alignSelf: 'stretch' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>Saldo:</span>
                    <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: totalBalance > 0 ? tokens.colorPaletteRedForeground : tokens.colorPaletteGreenForeground,
                    }}>
                        {formatCurrency(totalBalance)}
                    </span>
                </div>
                <div style={{ flex: 1 }} />
                {/* Status pills */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(Object.entries(countByStatus) as [StatusKey, number][]).map(([key, count]) => {
                        const cfg = STATUS_CONFIG[key];
                        const Icon = cfg.icon;
                        return (
                            <span key={key} style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '2px 9px', fontSize: 11, fontWeight: 500,
                                borderRadius: 20,
                                background: cfg.bg, color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                            }}>
                                <Icon style={{ width: 10, height: 10 }} />
                                {count} {cfg.label}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* ── Treatment cards ──────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AnimatePresence mode="popLayout">
                    {treatments.map((treatment, index) => {
                        const statusCfg = STATUS_CONFIG[treatment.status as StatusKey] ?? STATUS_CONFIG.Pending;

                        return (
                            <motion.div
                                key={treatment.id}
                                layout
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.97 }}
                                transition={{ duration: 0.18, delay: index * 0.04 }}
                                style={{
                                    background: tokens.colorNeutralBackground2,
                                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                                    borderRadius: tokens.borderRadiusXLarge,
                                    padding: '14px 16px',
                                    position: 'relative', overflow: 'hidden',
                                    transition: `border-color ${tokens.durationNormal}, background ${tokens.durationNormal}`,
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.16)';
                                    (e.currentTarget as HTMLElement).style.background = tokens.colorNeutralBackground3;
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = tokens.colorNeutralStroke1;
                                    (e.currentTarget as HTMLElement).style.background = tokens.colorNeutralBackground2;
                                }}
                            >
                                {/* Left accent bar based on status */}
                                <div style={{
                                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                                    background: statusCfg.color, opacity: 0.7,
                                    borderRadius: '12px 0 0 12px',
                                }} />

                                <div style={{ paddingLeft: 10 }}>
                                    {/* Row 1: name + tooth + edit button */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: 14, fontWeight: 600,
                                                    color: tokens.colorNeutralForeground1,
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                }}>
                                                    {treatment.name}
                                                </span>
                                                {treatment.tooth_number && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 600, padding: '2px 7px',
                                                        background: 'rgba(77,166,255,0.12)',
                                                        color: tokens.colorBrandForeground,
                                                        border: `1px solid rgba(77,166,255,0.22)`,
                                                        borderRadius: 10, letterSpacing: '0.04em',
                                                        textTransform: 'uppercase' as const,
                                                        whiteSpace: 'nowrap' as const,
                                                    }}>
                                                        Pieza {treatment.tooth_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={e => {
                                                e.stopPropagation();
                                                setSelectedTreatment(treatment);
                                                setShowForm(true);
                                            }}
                                            style={{
                                                flexShrink: 0, width: 30, height: 30,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                                background: tokens.colorNeutralBackground3,
                                                borderRadius: tokens.borderRadiusMedium,
                                                color: tokens.colorNeutralForeground3,
                                                cursor: 'pointer',
                                                transition: `all ${tokens.durationNormal}`,
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = tokens.colorNeutralBackground4;
                                                e.currentTarget.style.color = tokens.colorNeutralForeground1;
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = tokens.colorNeutralBackground3;
                                                e.currentTarget.style.color = tokens.colorNeutralForeground3;
                                            }}
                                            title="Editar"
                                        >
                                            <Edit style={{ width: 13, height: 13 }} />
                                        </button>
                                    </div>

                                    {/* Row 2: status + date */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                                        <div onClick={e => e.stopPropagation()}>
                                            <StatusBadge
                                                current={treatment.status}
                                                onChange={val => handleQuickStatusChange(treatment, val)}
                                            />
                                        </div>
                                        {(treatment.completion_date || treatment.start_date) && (
                                            <span style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                fontSize: 11, color: treatment.completion_date
                                                    ? tokens.colorPaletteGreenForeground
                                                    : tokens.colorNeutralForeground4,
                                            }}>
                                                <Calendar style={{ width: 11, height: 11 }} />
                                                {treatment.completion_date
                                                    ? `Finalizado ${new Date(treatment.completion_date).toLocaleDateString('es-AR')}`
                                                    : `Iniciado ${new Date(treatment.start_date!).toLocaleDateString('es-AR')}`}
                                            </span>
                                        )}
                                    </div>

                                    {/* Row 3: cost grid */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                                        gap: 1, marginTop: 12, maxWidth: 340,
                                        background: tokens.colorNeutralStroke2,
                                        borderRadius: tokens.borderRadiusMedium,
                                        overflow: 'hidden',
                                        border: `1px solid ${tokens.colorNeutralStroke2}`,
                                    }}>
                                        <div style={{ padding: '8px 12px', background: tokens.colorNeutralBackground1 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: tokens.colorNeutralForeground4, marginBottom: 3 }}>
                                                Costo Total
                                            </div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                                                {formatCurrency(treatment.total_cost)}
                                            </div>
                                        </div>
                                        <div style={{ padding: '8px 12px', background: tokens.colorNeutralBackground1 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: tokens.colorNeutralForeground4, marginBottom: 3 }}>
                                                Saldo
                                            </div>
                                            <div style={{
                                                fontSize: 14, fontWeight: 600,
                                                color: treatment.balance > 0
                                                    ? tokens.colorPaletteRedForeground
                                                    : tokens.colorPaletteGreenForeground,
                                            }}>
                                                {formatCurrency(treatment.balance)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Row 4: notes */}
                                    {treatment.notes && (
                                        <p style={{
                                            fontSize: 11, color: tokens.colorNeutralForeground3,
                                            marginTop: 10, paddingTop: 10,
                                            borderTop: `1px dashed ${tokens.colorNeutralStroke1}`,
                                            fontStyle: 'italic', lineHeight: 1.5,
                                            overflow: 'hidden',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical' as any,
                                        }}>
                                            "{treatment.notes}"
                                        </p>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* ── Modals ───────────────────────────────────────────── */}
            {showForm && (
                <TreatmentForm
                    treatment={selectedTreatment || undefined}
                    patientId={patientId}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setSelectedTreatment(null); }}
                />
            )}
            <AddGeneralTreatmentDialog
                isOpen={showCatalogDialog}
                onClose={() => setShowCatalogDialog(false)}
                patientId={patientId}
                onSuccess={loadTreatments}
            />
        </div>
    );
}