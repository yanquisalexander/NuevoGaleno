import { useState, useEffect } from 'react';
import { Payment, getPaymentsByPatient, createPayment } from '../../hooks/usePayments';
import { PaymentForm } from './PaymentForm';
import { DollarSign, Calendar, CreditCard, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface PaymentHistoryProps {
    patientId: number;
    treatmentId?: number;
    remainingBalance?: number;
}

export function PaymentHistory({ patientId, treatmentId, remainingBalance = 0 }: PaymentHistoryProps) {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadPayments();
    }, [patientId]);

    const loadPayments = async () => {
        setIsLoading(true);
        try {
            const data = await getPaymentsByPatient(patientId);
            setPayments(data);
        } catch (error) {
            console.error('Error cargando pagos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const handleSave = async (data: any) => {
        try {
            await createPayment(data);
            toast.success('Pago registrado');
            setShowForm(false);
            loadPayments();
        } catch (error) {
            console.error('Error registrando pago:', error);
            throw error;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (payments.length === 0) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-12 text-white/60">
                    <DollarSign className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-sm mb-4">No hay pagos registrados</p>
                    {treatmentId && remainingBalance > 0 && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium shadow-lg shadow-green-500/20 transition-all"
                        >
                            <Plus className="w-4 h-4" />
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
        <div className="space-y-4">
            {/* Header con botón */}
            {treatmentId && remainingBalance > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-white/60">{payments.length} pago(s) registrado(s)</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-green-500/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Registrar Pago
                    </button>
                </div>
            )}

            {/* Lista */}
            <div className="space-y-2">
                {payments.map((payment, index) => (
                    <motion.div
                        key={payment.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 hover:shadow-lg hover:shadow-black/20 transition-all backdrop-blur-sm"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/30">
                                    <DollarSign className="w-5 h-5 text-green-400" />
                                </div>
                                <div>
                                    <div className="font-semibold text-white text-lg">
                                        {formatCurrency(payment.amount)}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(payment.payment_date).toLocaleDateString('es-AR')}
                                        </span>
                                        {payment.payment_method && (
                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-white/10 rounded-full">
                                                <CreditCard className="w-3 h-3" />
                                                {payment.payment_method}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {payment.notes && (
                            <p className="text-xs text-white/50 mt-3 pl-14">{payment.notes}</p>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Formulario Modal */}
            {showForm && treatmentId && (
                <PaymentForm
                    treatmentId={treatmentId}
                    remainingBalance={remainingBalance}
                    onSave={handleSave}
                    onCancel={() => setShowForm(false)}
                />
            )}
        </div>
    );
}
