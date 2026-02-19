import { useState, useEffect } from 'react';
import { Activity, Wallet, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { getPatientsWithDebt } from '../hooks/usePayments';
import { useAppRuntime } from '../hooks/useAppRuntime';
import type { WindowId } from '../types/window-manager';

export function AccountsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    useAppRuntime('accounts', 'Cuentas Corrientes');
    const [debtors, setDebtors] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { openWindow } = useWindowManager();

    useEffect(() => {
        loadDebtors();
    }, []);

    const loadDebtors = async () => {
        setIsLoading(true);
        try {
            const data = await getPatientsWithDebt();
            setDebtors(data);
        } catch (error) {
            console.error('Error cargando deudores:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Spinner estilo Windows (puntos girando o círculo fino)
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#202020] text-white/80 gap-3">
                <div className="w-8 h-8 border-[3px] border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <span className="text-sm font-medium animate-pulse">Cargando cuentas...</span>
            </div>
        );
    }

    return (
        // Fondo base estilo "Mica" oscuro
        <div className="h-full flex flex-col bg-[#202020] text-[#ffffff] font-sans selection:bg-emerald-500/30">

            {/* Header estilo Glass/Acrílico */}
            <div className="sticky top-0 z-10 px-6 py-5 bg-[#202020]/80 backdrop-blur-md border-b border-white/5 flex justify-between items-end">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Cuentas Corrientes</h2>
                    <p className="text-xs text-white/50 mt-1 font-medium">Estado de saldos pendientes</p>
                </div>
                <div className="bg-white/5 px-3 py-1 rounded-md border border-white/5">
                    <span className="text-xs text-emerald-400 font-medium">Total: {debtors.length}</span>
                </div>
            </div>

            {/* Lista con scrollbar estilizado */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {debtors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60%] text-center p-8">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl shadow-emerald-900/10">
                            <Activity className="w-10 h-10 text-emerald-400/80" strokeWidth={1.5} />
                        </div>
                        <h3 className="text-lg font-semibold text-white/90">Todo al día</h3>
                        <p className="text-sm text-white/50 mt-2 max-w-[250px]">
                            No hay pacientes con saldos pendientes en este momento.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {debtors.map((debtor, index) => (
                            <motion.button
                                key={debtor.patient_id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03, duration: 0.3 }}
                                onClick={() => openWindow('patient-record', { patientId: debtor.patient_id })}
                                // Estilos de tarjeta Windows 11:
                                // - bg-white/5 (Surface layer)
                                // - hover:bg-white/10 (Hover state)
                                // - border-white/5 (Subtle stroke)
                                // - active:scale (Feedback táctil)
                                className="group relative flex items-center w-full p-4 rounded-lg bg-[#2d2d2d] border border-white/5 hover:bg-[#353535] hover:border-white/10 transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-[#202020]"
                            >
                                {/* Indicador lateral de estado (acento) */}
                                <div className="absolute left-0 top-3 bottom-3 w-[3px] bg-emerald-500 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Icono / Avatar */}
                                <div className="mr-4 relative">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500/20 transition-colors">
                                        <Wallet className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                                    </div>
                                </div>

                                {/* Contenido Central */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm font-semibold text-white/90 truncate group-hover:text-white transition-colors">
                                        {debtor.patient_name}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-white/50 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                            {debtor.treatments_count} ítems
                                        </span>
                                    </div>
                                </div>

                                {/* Columna de Precio */}
                                <div className="text-right pl-4">
                                    <div className="text-base font-bold text-emerald-400 font-mono tracking-tight">
                                        {formatCurrency(debtor.total_balance)}
                                    </div>
                                    <div className="text-[11px] text-white/40 mt-0.5">
                                        Total: {formatCurrency(debtor.total_treatments_cost)}
                                    </div>
                                </div>

                                {/* Flecha sutil (reveal on hover) */}
                                <div className="ml-4 text-white/20 group-hover:text-white/60 transition-colors group-hover:translate-x-1 duration-200">
                                    <ArrowRight className="w-4 h-4" />
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
}