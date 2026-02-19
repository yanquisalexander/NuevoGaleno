import { useState, useEffect } from 'react';
import { Payment, getPaymentsByPatient, createPayment } from '../../hooks/usePayments';
import { PaymentForm } from './PaymentForm';
import { DollarSign, Calendar, CreditCard, Plus, Printer, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { PrintReceipt } from '@/components/templates';

// ─── Fluent UI v9 tokens (shared) ────────────────────────────────────────────
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
    colorPaletteGreenBorder: 'rgba(107,191,89,0.25)',
    colorPaletteRedForeground: '#f1707a',
    borderRadiusMedium: '6px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',
    durationNormal: '150ms',
} as const;

const PAYMENT_METHOD_LABELS: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    check: 'Cheque',
};

interface PaymentHistoryProps {
    patientId: number;
    patientName: string;
    treatmentId?: number;
    remainingBalance?: number;
}

export function PaymentHistory({
    patientId, patientName, treatmentId, remainingBalance = 0
}: PaymentHistoryProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [printingPayment, setPrintingPayment] = useState<Payment | null>(null);

    useEffect(() => { loadPayments(); }, [patientId]);

    const loadPayments = async () => {
        setIsLoading(true);
        try {
            const data = await getPaymentsByPatient(patientId);
            setPayments(data);
        } catch { /* noop */ } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);

    const handleSave = async (data: any) => {
        try {
            await createPayment(data);
            toast.success('Pago registrado');
            setShowForm(false);
            loadPayments();
        } catch (error) {
            throw error;
        }
    };

    const canAddPayment = !!treatmentId && remainingBalance > 0;
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
                <Loader2 className="animate-spin" style={{ width: 18, height: 18, color: tokens.colorBrandForeground }} />
                <span style={{ fontSize: 13, color: tokens.colorNeutralForeground3 }}>Cargando pagos...</span>
            </div>
        );
    }

    // ── Empty state ──────────────────────────────────────────────────────────
    if (payments.length === 0) {
        return (
            <>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '52px 24px', gap: 12, textAlign: 'center',
                }}>
                    <div style={{
                        width: 56, height: 56,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: tokens.colorNeutralBackground3,
                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                        borderRadius: '50%', marginBottom: 4,
                    }}>
                        <DollarSign style={{ width: 22, height: 22, color: tokens.colorNeutralForeground4 }} />
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1, margin: 0 }}>
                        Sin pagos registrados
                    </p>
                    <p style={{ fontSize: 13, color: tokens.colorNeutralForeground3, margin: 0 }}>
                        No hay movimientos registrados para este paciente.
                    </p>
                    {canAddPayment && (
                        <button
                            onClick={() => setShowForm(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 18px', marginTop: 8,
                                fontSize: 13, fontWeight: 500,
                                borderRadius: tokens.borderRadiusLarge,
                                border: `1px solid ${tokens.colorPaletteGreenBorder}`,
                                background: tokens.colorPaletteGreenBackground,
                                color: tokens.colorPaletteGreenForeground,
                                cursor: 'pointer',
                            }}
                        >
                            <Plus style={{ width: 14, height: 14 }} />
                            Registrar Primer Pago
                        </button>
                    )}
                </div>
                {showForm && treatmentId && (
                    <PaymentForm
                        treatmentId={treatmentId}
                        remainingBalance={remainingBalance}
                        onSave={handleSave}
                        onCancel={() => setShowForm(false)}
                    />
                )}
            </>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── Header ──────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 0', borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                        Pagos
                    </span>
                    <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px',
                        background: tokens.colorNeutralBackground3,
                        color: tokens.colorNeutralForeground3,
                        borderRadius: 20, border: `1px solid ${tokens.colorNeutralStroke1}`,
                    }}>
                        {payments.length}
                    </span>
                </div>
                {canAddPayment && (
                    <button
                        onClick={() => setShowForm(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', fontSize: 12, fontWeight: 500,
                            borderRadius: tokens.borderRadiusLarge,
                            border: `1px solid ${tokens.colorPaletteGreenBorder}`,
                            background: tokens.colorPaletteGreenBackground,
                            color: tokens.colorPaletteGreenForeground,
                            cursor: 'pointer',
                            transition: `all ${tokens.durationNormal}`,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,191,89,0.18)'}
                        onMouseLeave={e => e.currentTarget.style.background = tokens.colorPaletteGreenBackground}
                    >
                        <Plus style={{ width: 13, height: 13 }} />
                        Registrar Pago
                    </button>
                )}
            </div>

            {/* ── Summary bar ─────────────────────────────────────── */}
            <div style={{
                display: 'flex', gap: 1,
                background: tokens.colorNeutralStroke2,
                border: `1px solid ${tokens.colorNeutralStroke2}`,
                borderRadius: tokens.borderRadiusLarge,
                overflow: 'hidden',
            }}>
                <div style={{ flex: 1, padding: '10px 14px', background: tokens.colorNeutralBackground2 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.colorNeutralForeground4, marginBottom: 3 }}>
                        Total Pagado
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: tokens.colorPaletteGreenForeground }}>
                        {formatCurrency(totalPaid)}
                    </div>
                </div>
                {remainingBalance > 0 && (
                    <div style={{ flex: 1, padding: '10px 14px', background: tokens.colorNeutralBackground2 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: tokens.colorNeutralForeground4, marginBottom: 3 }}>
                            Saldo Pendiente
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: tokens.colorPaletteRedForeground }}>
                            {formatCurrency(remainingBalance)}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Payment list ─────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {payments.map((payment, index) => {
                    const methodLabel = payment.payment_method
                        ? (PAYMENT_METHOD_LABELS[payment.payment_method] ?? payment.payment_method)
                        : null;

                    return (
                        <motion.div
                            key={payment.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04, duration: 0.16 }}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                gap: 12, padding: '12px 14px',
                                background: tokens.colorNeutralBackground2,
                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                borderRadius: tokens.borderRadiusXLarge,
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
                            {/* Icon */}
                            <div style={{
                                width: 38, height: 38, flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: tokens.colorPaletteGreenBackground,
                                border: `1px solid ${tokens.colorPaletteGreenBorder}`,
                                borderRadius: tokens.borderRadiusLarge,
                            }}>
                                <DollarSign style={{ width: 16, height: 16, color: tokens.colorPaletteGreenForeground }} />
                            </div>

                            {/* Main info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 15, fontWeight: 600, color: tokens.colorNeutralForeground1 }}>
                                    {formatCurrency(payment.amount)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                                    <span style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        fontSize: 11, color: tokens.colorNeutralForeground3,
                                    }}>
                                        <Calendar style={{ width: 11, height: 11 }} />
                                        {new Date(payment.payment_date).toLocaleDateString('es-AR')}
                                    </span>
                                    {methodLabel && (
                                        <span style={{
                                            display: 'flex', alignItems: 'center', gap: 4,
                                            fontSize: 11, padding: '1px 7px',
                                            background: tokens.colorNeutralBackground3,
                                            border: `1px solid ${tokens.colorNeutralStroke1}`,
                                            borderRadius: 10,
                                            color: tokens.colorNeutralForeground3,
                                        }}>
                                            <CreditCard style={{ width: 10, height: 10 }} />
                                            {methodLabel}
                                        </span>
                                    )}
                                </div>
                                {payment.notes && (
                                    <p style={{
                                        fontSize: 11, color: tokens.colorNeutralForeground4,
                                        marginTop: 4, fontStyle: 'italic', lineHeight: 1.4,
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {payment.notes}
                                    </p>
                                )}
                            </div>

                            {/* Print button */}
                            <button
                                onClick={() => setPrintingPayment(payment)}
                                style={{
                                    flexShrink: 0,
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 12px', fontSize: 12, fontWeight: 500,
                                    borderRadius: tokens.borderRadiusMedium,
                                    border: `1px solid ${tokens.colorNeutralStroke1}`,
                                    background: tokens.colorNeutralBackground3,
                                    color: tokens.colorNeutralForeground2,
                                    cursor: 'pointer',
                                    transition: `all ${tokens.durationNormal}`,
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = tokens.colorBrandBackground;
                                    e.currentTarget.style.borderColor = 'transparent';
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = tokens.colorNeutralBackground3;
                                    e.currentTarget.style.borderColor = tokens.colorNeutralStroke1;
                                    e.currentTarget.style.color = tokens.colorNeutralForeground2;
                                }}
                                title="Imprimir recibo"
                            >
                                <Printer style={{ width: 13, height: 13 }} />
                                Recibo
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* ── Modals ───────────────────────────────────────────── */}
            {showForm && treatmentId && (
                <PaymentForm
                    treatmentId={treatmentId}
                    remainingBalance={remainingBalance}
                    onSave={handleSave}
                    onCancel={() => setShowForm(false)}
                />
            )}
            {printingPayment && (
                <PrintReceipt
                    payment={printingPayment}
                    patientName={patientName}
                    onClose={() => setPrintingPayment(null)}
                />
            )}
        </div>
    );
}