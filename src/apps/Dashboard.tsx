import { useState, useEffect } from 'react';
import { UserCircle, Activity, AlertTriangle } from 'lucide-react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { NotificationDemo } from '../components/NotificationDemo';
import { getPatientsCount } from '../hooks/usePatients';
import { getTreatmentStats } from '../hooks/useTreatments';
import { getTotalDebt } from '../hooks/usePayments';
import type { WindowId } from '../types/window-manager';

export function DashboardApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    const [stats, setStats] = useState({
        patientsCount: 0,
        treatmentStats: {
            pending_count: 0,
            in_progress_count: 0,
            completed_count: 0,
            total_pending_cost: 0,
            total_in_progress_cost: 0,
            total_completed_cost: 0,
        },
        totalDebt: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const { openWindow } = useWindowManager();

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const [count, treatmentStats, debt] = await Promise.all([
                getPatientsCount(),
                getTreatmentStats(),
                getTotalDebt(),
            ]);
            setStats({ patientsCount: count, treatmentStats, totalDebt: debt });
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
            <h2 className="text-3xl font-bold text-white mb-2">
                Panel de Control
            </h2>
            <p className="text-sm text-white/60 mb-8">Última actualización: {new Date().toLocaleString('es-AR')}</p>

            {/* Estadísticas Principales */}
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500/15 to-blue-600/10 border border-blue-500/30 rounded-2xl p-5 shadow-lg shadow-blue-500/10 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <UserCircle className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-white/70 uppercase tracking-wide">Total Pacientes</span>
                    </div>
                    <div className="text-4xl font-bold text-blue-400">
                        {stats.patientsCount}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-500/15 to-yellow-600/10 border border-yellow-500/30 rounded-2xl p-5 shadow-lg shadow-yellow-500/10 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-yellow-400" />
                        </div>
                        <span className="text-sm font-medium text-white/70 uppercase tracking-wide">Por Hacer</span>
                    </div>
                    <div className="text-4xl font-bold text-yellow-400">
                        {stats.treatmentStats.pending_count}
                    </div>
                    <div className="text-xs text-white/50 mt-2">
                        {formatCurrency(stats.treatmentStats.total_pending_cost)}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/15 to-indigo-600/10 border border-blue-500/30 rounded-2xl p-5 shadow-lg shadow-blue-500/10 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-blue-400" />
                        </div>
                        <span className="text-sm font-medium text-white/70 uppercase tracking-wide">En Tratamiento</span>
                    </div>
                    <div className="text-4xl font-bold text-blue-400">
                        {stats.treatmentStats.in_progress_count}
                    </div>
                    <div className="text-xs text-white/50 mt-2">
                        {formatCurrency(stats.treatmentStats.total_in_progress_cost)}
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500/15 to-red-600/10 border border-red-500/30 rounded-2xl p-5 shadow-lg shadow-red-500/10 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-400" />
                        </div>
                        <span className="text-sm font-medium text-white/70 uppercase tracking-wide">Deuda Total</span>
                    </div>
                    <div className="text-4xl font-bold text-red-400">
                        {formatCurrency(stats.totalDebt)}
                    </div>
                </div>
            </div>

            {/* Accesos Rápidos */}
            <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Accesos Rápidos</h3>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { id: 'patients', name: 'Pacientes', icon: '👥', color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/30' },
                        { id: 'treatments', name: 'Tratamientos', icon: '🦷', color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/30' },
                        { id: 'accounts', name: 'Cuentas Corrientes', icon: '💰', color: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/30' },
                    ].map((app) => (
                        <button
                            key={app.id}
                            onClick={() => openWindow(app.id)}
                            className="flex items-center gap-4 p-5 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10 border border-white/10 hover:border-white/20 rounded-2xl transition-all backdrop-blur-sm group shadow-lg hover:shadow-xl"
                        >
                            <div className={`w-14 h-14 bg-gradient-to-br ${app.color} rounded-xl flex items-center justify-center text-3xl shadow-lg ${app.shadow} group-hover:scale-110 transition-transform`}>
                                {app.icon}
                            </div>
                            <span className="font-semibold text-white text-lg">{app.name}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Demo de Notificaciones */}
            <NotificationDemo />
        </div>
    );
}
