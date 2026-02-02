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
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-500/15 to-purple-500/15 border border-white/20 rounded-2xl p-6 shadow-xl backdrop-blur-sm"
        >
            <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${hasDebt
                    ? 'bg-gradient-to-br from-red-500/30 to-red-600/30 shadow-red-500/20'
                    : 'bg-gradient-to-br from-green-500/30 to-emerald-600/30 shadow-green-500/20'
                    }`}>
                    <DollarSign className={`w-7 h-7 ${hasDebt ? 'text-red-400' : 'text-green-400'}`} />
                </div>
                <div>
                    <h3 className="text-sm font-medium text-white/70 uppercase tracking-wide">Estado de Cuenta</h3>
                    <p className="text-3xl font-bold text-white mt-0.5">
                        {formatCurrency(balance.total_balance)}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-xs font-medium mb-2">
                        <Activity className="w-3.5 h-3.5" />
                        Tratamientos
                    </div>
                    <div className="text-2xl font-bold text-white">
                        {balance.treatments_count}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-xs font-medium mb-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Total
                    </div>
                    <div className="text-base font-semibold text-white">
                        {formatCurrency(balance.total_treatments_cost)}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center gap-2 text-white/60 text-xs font-medium mb-2">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Pagado
                    </div>
                    <div className="text-base font-semibold text-green-400">
                        {formatCurrency(balance.total_paid)}
                    </div>
                </div>
            </div>

            {hasDebt && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-400">
                        ⚠️ Saldo pendiente de pago
                    </p>
                </div>
            )}
        </motion.div>
    );
}
