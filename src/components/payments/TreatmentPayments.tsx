import { useState, useEffect } from 'react';
import { Treatment, getTreatmentsByPatient } from '../../hooks/useTreatments';
import { PaymentHistory } from './PaymentHistory';
import { ChevronRight, ChevronDown, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TreatmentStatusBadge } from '../treatments/TreatmentStatusBadge';

interface TreatmentPaymentsProps {
    patientId: number;
}

export function TreatmentPayments({ patientId }: TreatmentPaymentsProps) {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        loadTreatments();
    }, [patientId]);

    const loadTreatments = async () => {
        setIsLoading(true);
        try {
            const data = await getTreatmentsByPatient(patientId);
            setTreatments(data);
        } catch (error) {
            console.error('Error cargando tratamientos:', error);
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (treatments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-white/60">
                <DollarSign className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm">No hay tratamientos para registrar pagos</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {treatments.map((treatment) => {
                const isExpanded = expandedId === treatment.id;
                const hasBalance = treatment.balance > 0;

                return (
                    <div
                        key={treatment.id}
                        className="bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm"
                    >
                        {/* Header */}
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : treatment.id)}
                            className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                <ChevronRight className="w-5 h-5 text-white/60" />
                            </div>

                            <div className="flex-1 text-left">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-semibold text-white">{treatment.name}</h3>
                                    <TreatmentStatusBadge status={treatment.status} size="sm" />
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-white/60">
                                    <span>Total: {formatCurrency(treatment.total_cost)}</span>
                                    <span>Pagado: {formatCurrency(treatment.paid_amount)}</span>
                                    <span className={hasBalance ? 'text-red-400 font-medium' : 'text-green-400'}>
                                        Saldo: {formatCurrency(treatment.balance)}
                                    </span>
                                </div>
                            </div>
                        </button>

                        {/* Detalles expandibles */}
                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-white/10"
                                >
                                    <div className="p-4">
                                        <h4 className="text-sm font-medium text-white/70 mb-3">Historial de Pagos</h4>
                                        <PaymentHistory
                                            patientId={patientId}
                                            treatmentId={treatment.id}
                                            remainingBalance={treatment.balance}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                );
            })}
        </div>
    );
}
