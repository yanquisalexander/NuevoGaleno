import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, DollarSign, Calendar } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

interface AnalyticsData {
    totalPatients: number;
    totalTreatments: number;
    totalRevenue: number;
    pendingAppointments: number;
    monthlyGrowth: number;
}

export function AnalyticsDashboard({ data }: { data?: any }) {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const [patients, treatments, payments] = await Promise.all([
                invoke('get_patients', { limit: 10000, offset: 0 }),
                invoke('get_all_treatments', { limit: 10000, offset: 0 }),
                invoke('get_all_payments', { limit: 10000, offset: 0 }),
            ]);

            const patientsArray = patients as any[];
            const treatmentsArray = treatments as any[];
            const paymentsArray = payments as any[];

            const totalRevenue = paymentsArray.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

            setAnalytics({
                totalPatients: patientsArray.length,
                totalTreatments: treatmentsArray.length,
                totalRevenue,
                pendingAppointments: 0, // Mock
                monthlyGrowth: 12.5, // Mock
            });
        } catch (error) {
            console.error('Error loading analytics:', error);
            toast.error('Error al cargar estadísticas');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Cargando estadísticas...</div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/50">No hay datos disponibles</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <BarChart3 size={32} className="text-blue-400" />
                <div>
                    <h1 className="text-2xl text-white font-bold">Analytics Dashboard</h1>
                    <p className="text-white/50">Estadísticas y métricas de tu clínica</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Users className="text-blue-400" />}
                    label="Total Pacientes"
                    value={analytics.totalPatients.toString()}
                    trend="+12%"
                />
                <StatCard
                    icon={<BarChart3 className="text-green-400" />}
                    label="Tratamientos"
                    value={analytics.totalTreatments.toString()}
                    trend="+8%"
                />
                <StatCard
                    icon={<DollarSign className="text-yellow-400" />}
                    label="Ingresos Totales"
                    value={`$${analytics.totalRevenue.toLocaleString()}`}
                    trend="+15%"
                />
                <StatCard
                    icon={<Calendar className="text-purple-400" />}
                    label="Citas Pendientes"
                    value={analytics.pendingAppointments.toString()}
                    trend="-5%"
                />
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-6">
                    <h3 className="text-white font-medium mb-4">Ingresos Mensuales</h3>
                    <div className="h-64 flex items-center justify-center text-white/30">
                        <TrendingUp size={48} />
                    </div>
                </div>
                <div className="bg-white/5 rounded-lg p-6">
                    <h3 className="text-white font-medium mb-4">Tratamientos por Tipo</h3>
                    <div className="h-64 flex items-center justify-center text-white/30">
                        <BarChart3 size={48} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, trend }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    trend: string;
}) {
    const isPositive = trend.startsWith('+');

    return (
        <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
                {icon}
                <span className={`text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                    {trend}
                </span>
            </div>
            <div className="text-2xl text-white font-bold mb-1">{value}</div>
            <div className="text-sm text-white/50">{label}</div>
        </div>
    );
}
