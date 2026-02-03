import { useState, useEffect } from 'react';
import { PatientBalance, getPatientBalance } from '../../hooks/usePayments';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface BalanceCardProps {
    patientId: number;
}

export function BalanceCard({ patientId }: BalanceCardProps) {
    const [balance, setBalance] = useState<PatientBalance | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadBalance();
    }, [patientId]);

    const loadBalance = async () => {
        setIsLoading(true);
        try {
            const data = await getPatientBalance(patientId);
            setBalance(data);
        } catch (error) {
            console.error('Error cargando balance:', error);
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
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!balance) return null;

    const hasDebt = balance.total_balance > 0;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#272727] border border-white/5 rounded-[8px] p-6 shadow-sm"
        >
            <div className="flex items-center gap-5 mb-8">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 ${hasDebt
                    ? 'border-red-500/10 bg-red-500/5 text-red-500'
                    : 'border-green-500/10 bg-green-500/5 text-green-500'
                    }`}>
                    <DollarSign className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-1">Deuda Total</h3>
                    <p className={`text-3xl font-bold tracking-tight ${hasDebt ? 'text-white' : 'text-green-400'}`}>
                        {formatCurrency(balance.total_balance)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#323232] rounded-[6px] p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-wider mb-2">
                        <Activity className="w-3.5 h-3.5" />
                        Tratamientos
                    </div>
                    <div className="text-xl font-semibold text-white/90">
                        {balance.treatments_count}
                    </div>
                </div>

                <div className="bg-[#323232] rounded-[6px] p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-wider mb-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Total
                    </div>
                    <div className="text-lg font-semibold text-white/90">
                        {formatCurrency(balance.total_treatments_cost)}
                    </div>
                </div>

                <div className="bg-[#323232] rounded-[6px] p-4 border border-white/5">
                    <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-bold tracking-wider mb-2">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Pagado
                    </div>
                    <div className="text-lg font-semibold text-green-400">
                        {formatCurrency(balance.total_paid)}
                    </div>
                </div>
            </div>

            {hasDebt && (
                <div className="mt-5 flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/10 p-3 rounded-[6px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    El paciente posee un saldo pendiente de regularización.
                </div>
            )}
        </motion.div>
    );
}
