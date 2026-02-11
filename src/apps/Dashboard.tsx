import { useState, useEffect } from 'react';
import { UserCircle, Activity, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { NotificationDemo } from '../components/NotificationDemo';
import { usePatients } from '../hooks/usePatients';
import { getTreatmentStats } from '../hooks/useTreatments';
import { getTotalDebt } from '../hooks/usePayments';
import { useAppRuntime } from '../hooks/useAppRuntime';
import type { WindowId } from '../types/window-manager';

export function DashboardApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    useAppRuntime('dashboard', 'Panel de Control');
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
            <div className="flex flex-col items-center justify-center h-full bg-[#1c1c1c] text-white/70">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-sm font-medium tracking-wide">Cargando sistema...</span>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-[#1c1c1c] text-[#ffffff] font-sans selection:bg-blue-500/30">
            {/* Header Estilo Windows 11 */}
            <header className="px-8 pt-8 pb-6 sticky top-0 bg-[#1c1c1c]/80 backdrop-blur-md z-10">
                <h2 className="text-3xl font-semibold tracking-tight text-white/95">
                    Panel de Control
                </h2>
                <div className="flex items-center gap-2 mt-1 text-white/40">
                    <Clock size={14} />
                    <p className="text-xs font-medium">
                        Actualizado: {new Date().toLocaleTimeString('es-AR')}
                    </p>
                </div>
            </header>

            <main className="px-8 pb-8">
                {/* Grid de Estadísticas con Efecto de Elevación (Cards) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <StatCard
                        title="Pacientes"
                        value={stats.patientsCount}
                        icon={<UserCircle className="text-blue-400" />}
                        color="blue"
                    />
                    <StatCard
                        title="Por Hacer"
                        value={stats.treatmentStats.pending_count}
                        subtitle={formatCurrency(stats.treatmentStats.total_pending_cost)}
                        icon={<Activity className="text-amber-400" />}
                        color="amber"
                    />
                    <StatCard
                        title="En Curso"
                        value={stats.treatmentStats.in_progress_count}
                        subtitle={formatCurrency(stats.treatmentStats.total_in_progress_cost)}
                        icon={<Activity className="text-indigo-400" />}
                        color="indigo"
                    />
                    <StatCard
                        title="Deuda Total"
                        value={formatCurrency(stats.totalDebt)}
                        icon={<AlertTriangle className="text-rose-400" />}
                        color="rose"
                        isCritical
                    />
                </div>

                {/* Accesos Rápidos Estilo Windows Tiles */}
                <section className="mb-10">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-white/50 mb-4 px-1">
                        Acceso Directo
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <QuickAction
                            onClick={() => openWindow('patients')}
                            title="Pacientes"
                            desc="Gestión de historias clínicas"
                            icon="👥"
                            bg="bg-blue-600/10 border-blue-500/20"
                        />
                        <QuickAction
                            onClick={() => openWindow('treatments')}
                            title="Tratamientos"
                            desc="Seguimiento de planes"
                            icon="🦷"
                            bg="bg-purple-600/10 border-purple-500/20"
                        />
                        <QuickAction
                            onClick={() => openWindow('accounts')}
                            title="Cuentas"
                            desc="Balances y pagos"
                            icon="💰"
                            bg="bg-emerald-600/10 border-emerald-500/20"
                        />
                    </div>
                </section>


            </main>
        </div>
    );
}

// Sub-componente para las Cards de Estadísticas
function StatCard({ title, value, icon, subtitle, isCritical }: any) {
    return (
        <div className="group relative overflow-hidden bg-white/[0.03] border border-white/10 rounded-xl p-5 hover:bg-white/[0.06] transition-all duration-300">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                {isCritical && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
            </div>
            <div>
                <p className="text-xs font-medium text-white/50 uppercase tracking-wider">{title}</p>
                <h4 className="text-2xl font-bold mt-1 tracking-tight">{value}</h4>
                {subtitle && <p className="text-xs text-white/30 mt-1 font-mono">{subtitle}</p>}
            </div>
            {/* Sutil brillo inferior */}
            <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-blue-500 group-hover:w-full transition-all duration-500 opacity-50" />
        </div>
    );
}

// Sub-componente para botones de acción
function QuickAction({ onClick, title, desc, icon, bg }: any) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 group relative text-left active:scale-[0.98] ${bg} hover:bg-white/10`}
        >
            <div className="text-3xl filter drop-shadow-md group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <div className="flex-1">
                <p className="font-semibold text-white/90 text-sm">{title}</p>
                <p className="text-[11px] text-white/40 leading-tight">{desc}</p>
            </div>
            <ArrowRight size={16} className="text-white/0 group-hover:text-white/40 transition-all -translate-x-2 group-hover:translate-x-0" />
        </button>
    );
}