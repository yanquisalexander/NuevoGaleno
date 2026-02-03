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
        <div className="space-y-2">
            {treatments.map((treatment) => {
                const isExpanded = expandedId === treatment.id;
                const hasBalance = treatment.balance > 0;

                return (
                    <div
                        key={treatment.id}
                        className={`border rounded-[8px] overflow-hidden transition-all duration-200 ${isExpanded ? 'bg-[#2d2d2d] border-white/10' : 'bg-[#272727] border-white/5 hover:bg-[#2d2d2d]'
                            }`}
                    >
                        {/* Header */}
                        <button
                            onClick={() => setExpandedId(isExpanded ? null : treatment.id)}
                            className="w-full p-4 flex items-center gap-4 text-left outline-none"
                        >
                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-transform duration-200 ${isExpanded ? 'rotate-90' : 'text-white/40'}`}>
                                <ChevronRight className="w-4 h-4" />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-white/90">{treatment.name}</h3>
                                    <TreatmentStatusBadge status={treatment.status} size="sm" />
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 text-xs text-white/60">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                        Total: <span className="text-white/90">{formatCurrency(treatment.total_cost)}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                        Pagado: <span className="text-white/90">{formatCurrency(treatment.paid_amount)}</span>
                                    </span>
                                    <span className={`font-medium ml-2 ${hasBalance ? 'text-red-400' : 'text-green-500'}`}>
                                        {hasBalance ? `Debe: ${formatCurrency(treatment.balance)}` : 'Pagado'}
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
                                    transition={{ duration: 0.2, ease: "easeOut" }}
                                    className="border-t border-white/5 bg-[#202020]"
                                >
                                    <div className="p-4 pl-14">
                                        <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Historial de Pagos</h4>
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
