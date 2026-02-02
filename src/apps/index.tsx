import { UserCircle, Activity, LogOut, AlertTriangle } from 'lucide-react';
import type { WindowId } from '../types/window-manager';
import { useState, useEffect } from 'react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { motion } from 'motion/react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getCurrentWindow } from '@tauri-apps/api/window';
import FirstRunWizard from '../components/FirstRunWizard';
import ImportReviewScreen from '../components/ImportReviewScreen';
import { ConfigurationApp } from '@/components/ConfigurationApp';
import { SystemPasswordDialog } from '../components/SystemPasswordDialog';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { PatientSearch } from '../components/patients/PatientSearch';
import { PatientList } from '../components/patients/PatientList';
import { PatientForm } from '../components/patients/PatientForm';
import { MedicalHistory } from '../components/patients/MedicalHistory';
import { TreatmentList } from '../components/treatments/TreatmentList';
import { TreatmentPayments } from '../components/payments/TreatmentPayments';
import { BalanceCard } from '../components/payments/BalanceCard';
import { Odontogram } from '../components/odontogram/Odontogram';
import { NotificationDemo } from '../components/NotificationDemo';
import { useSession } from '@/hooks/useSession';
import { Patient, getPatientById, createPatient, updatePatient, getPatientsCount } from '../hooks/usePatients';
import { getTreatmentStats } from '../hooks/useTreatments';
import { getTotalDebt, getPatientsWithDebt } from '../hooks/usePayments';

// App: Ficha de Paciente (Actualizada con BD)
export function PatientRecordApp({ windowId: _windowId, data }: { windowId: WindowId; data?: any }) {
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'treatments' | 'payments' | 'odontogram'>('info');
    const patientId = data?.patientId;

    useEffect(() => {
        if (patientId) {
            loadPatient();
        } else {
            setIsLoading(false);
        }
    }, [patientId]);

    const loadPatient = async () => {
        if (!patientId) return;
        setIsLoading(true);
        try {
            const data = await getPatientById(patientId);
            setPatient(data);
        } catch (error) {
            console.error('Error cargando paciente:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/60">
                <UserCircle className="w-24 h-24 mb-4 opacity-30" />
                <p>Paciente no encontrado</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white/5 border-b border-white/10 p-6">
                <h1 className="text-2xl font-bold text-white">
                    {patient.first_name} {patient.last_name}
                </h1>
                <p className="text-sm text-white/60 mt-1">
                    {patient.document_number && `DNI: ${patient.document_number}`}
                    {patient.phone && ` • Tel: ${patient.phone}`}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 border-b border-white/10">
                {[
                    { id: 'info', label: 'Información' },
                    { id: 'history', label: 'Historia Clínica' },
                    { id: 'treatments', label: 'Tratamientos' },
                    { id: 'payments', label: 'Pagos' },
                    { id: 'odontogram', label: 'Odontograma' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id
                            ? 'text-blue-400 border-b-2 border-blue-400'
                            : 'text-white/60 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'info' && (
                    <div className="max-w-2xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-white/60">Email</label>
                                <p className="text-white">{patient.email || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/60">Fecha de Nacimiento</label>
                                <p className="text-white">{patient.birth_date || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/60">Género</label>
                                <p className="text-white">{patient.gender || '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-white/60">Grupo Sanguíneo</label>
                                <p className="text-white">{patient.blood_type || '-'}</p>
                            </div>
                        </div>
                        {patient.allergies && (
                            <div>
                                <label className="text-xs text-white/60">Alergias</label>
                                <p className="text-white mt-1">{patient.allergies}</p>
                            </div>
                        )}
                        {patient.medical_notes && (
                            <div>
                                <label className="text-xs text-white/60">Notas Médicas</label>
                                <p className="text-white mt-1">{patient.medical_notes}</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <MedicalHistory patient={patient} onUpdate={loadPatient} />
                )}

                {activeTab === 'treatments' && (
                    <TreatmentList patientId={patient.id} />
                )}

                {activeTab === 'payments' && (
                    <div className="space-y-6">
                        <BalanceCard patientId={patient.id} />
                        <div>
                            <h3 className="text-lg font-medium text-white mb-4">Pagos por Tratamiento</h3>
                            <TreatmentPayments patientId={patient.id} />
                        </div>
                    </div>
                )}

                {activeTab === 'odontogram' && (
                    <Odontogram patientId={patient.id} />
                )}
            </div>
        </div>
    );
}

// App: Dashboard (Actualizado con estadísticas reales)
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

// App: Módulo de Pacientes
export function PatientsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    const [showForm, setShowForm] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { openWindow } = useWindowManager();

    const handleSelectPatient = (patient: Patient) => {
        openWindow('patient-record', { patientId: patient.id });
    };

    const handleSavePatient = async (data: any) => {
        try {
            if (selectedPatient) {
                await updatePatient(selectedPatient.id, data);
                toast.success('Paciente actualizado');
            } else {
                await createPatient(data);
                toast.success('Paciente creado');
            }
            setShowForm(false);
            setSelectedPatient(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error guardando paciente:', error);
            throw error;
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="bg-white/5 border-b border-white/10 p-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Gestión de Pacientes</h2>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Nuevo Paciente
                </button>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b border-white/10">
                <PatientSearch onSelectPatient={handleSelectPatient} />
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-hidden">
                <PatientList
                    onSelectPatient={handleSelectPatient}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* Form Modal */}
            {showForm && (
                <PatientForm
                    patient={selectedPatient || undefined}
                    onSave={handleSavePatient}
                    onCancel={() => {
                        setShowForm(false);
                        setSelectedPatient(null);
                    }}
                />
            )}
        </div>
    );
}

// App: Módulo de Tratamientos
export function TreatmentsApp({ windowId: _windowId, data }: { windowId: WindowId; data?: any }) {
    const patientId = data?.patientId;

    if (!patientId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/60">
                <Activity className="w-24 h-24 mb-4 opacity-30" />
                <p>Selecciona un paciente primero</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="bg-white/5 border-b border-white/10 p-4">
                <h2 className="text-xl font-bold text-white">Tratamientos del Paciente</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <TreatmentList patientId={patientId} />
            </div>
        </div>
    );
}

// App: Módulo de Cuentas Corrientes
export function AccountsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
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
            currency: 'ARS'
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
        <div className="h-full flex flex-col bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f]">
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-b border-white/10 p-6">
                <h2 className="text-2xl font-bold text-white">Cuentas Corrientes</h2>
                <p className="text-sm text-white/60 mt-1">Pacientes con saldo pendiente</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                {debtors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-white/60">
                        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                            <Activity className="w-10 h-10 opacity-30" />
                        </div>
                        <p className="text-lg font-medium">No hay deudas pendientes</p>
                        <p className="text-sm text-white/40 mt-1">¡Excelente! Todos los pagos están al día</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {debtors.map((debtor, index) => (
                            <motion.button
                                key={debtor.patient_id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                onClick={() => openWindow('patient-record', { patientId: debtor.patient_id })}
                                className="w-full bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-2xl p-5 hover:border-red-500/30 hover:shadow-xl hover:shadow-red-500/10 transition-all text-left backdrop-blur-sm group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border border-red-500/30">
                                                <span className="text-2xl">💸</span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white text-lg group-hover:text-red-400 transition-colors">{debtor.patient_name}</h3>
                                                <p className="text-xs text-white/60">
                                                    {debtor.treatments_count} tratamiento(s) pendiente(s)
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-red-400 mb-1">
                                            {formatCurrency(debtor.total_balance)}
                                        </div>
                                        <div className="text-xs text-white/50">
                                            de {formatCurrency(debtor.total_treatments_cost)}
                                        </div>
                                    </div>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Example App: Settings
export function SystemToolsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    const [showWipeDialog, setShowWipeDialog] = useState(false);
    const { currentUser } = useSession();
    const isAdmin = currentUser?.role === 'admin';

    const handleWipeSystem = async (passwordHash: string) => {
        try {
            await invoke('wipe_system', { systemPasswordHash: passwordHash });
            toast.success('Sistema reiniciado correctamente');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            toast.error(err.toString());
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto space-y-6">
            <div>
                <h2 className="text-2xl font-medium text-md3-on-surface mb-2">
                    Mantenimiento del sistema
                </h2>
                <p className="text-sm text-md3-on-surface-variant">
                    Acciones críticas y reset del sistema que sólo deberían ejecutar administradores.
                    La configuración general se encuentra en el panel Configuración.
                </p>
                {!isAdmin && (
                    <p className="text-xs text-amber-300 pt-2">
                        Necesitas permisos de administrador para ejecutar estas acciones.
                    </p>
                )}
            </div>

            <div className={`bg-red-50 border border-red-200 rounded-md3-lg p-6 shadow-md3-1 ${isAdmin ? '' : 'opacity-70'}`}>
                <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Reiniciar el sistema
                </h3>
                <p className="text-sm text-red-700 mb-4">
                    Elimina todos los usuarios, configuraciones y datos importados. El wizard se ejecutará nuevamente.
                </p>
                <div className="space-y-3">
                    <div className="bg-white rounded-xl p-4 border border-red-100">
                        <h4 className="font-medium text-slate-900 mb-1">Restaurar estado de fábrica</h4>
                        <p className="text-sm text-slate-600 mb-3">
                            Sólo los administradores pueden correr esta acción irreversible.
                        </p>
                        <Button
                            variant="destructive"
                            onClick={() => setShowWipeDialog(true)}
                            className="w-full sm:w-auto"
                            disabled={!isAdmin}
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Reiniciar Sistema
                        </Button>
                    </div>
                </div>
            </div>

            <SystemPasswordDialog
                open={showWipeDialog}
                onOpenChange={setShowWipeDialog}
                title="Reiniciar Sistema Completo"
                description="Esta acción eliminará TODOS los datos del sistema, incluyendo usuarios, configuraciones y datos importados. El sistema volverá al estado inicial y se ejecutará el wizard de configuración. Esta acción NO se puede deshacer."
                confirmLabel="Sí, Reiniciar Sistema"
                onConfirm={handleWipeSystem}
                dangerous
            />
        </div>
    );
}

// App: Volver a Windows
export function BackToWindowsApp({ windowId }: { windowId: WindowId; data?: any }) {
    const [showDialog, setShowDialog] = useState(true);
    const { closeWindow } = useWindowManager();

    const handleMinimize = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.minimize();
            closeWindow(windowId);
        } catch (error) {
            console.error('Error al minimizar la ventana:', error);
        }
    };

    const handleCancel = () => {
        setShowDialog(false);
        closeWindow(windowId);
    };

    return (
        <>
            {/* Invisible content for the window */}
            <div className="hidden" />

            {/* Dialog renders in portal outside window */}
            <AlertDialog open={showDialog} onOpenChange={(open) => {
                if (!open) {
                    closeWindow(windowId);
                }
                setShowDialog(open);
            }}>
                <AlertDialogContent className="bg-md3-surface border-md3-outline">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-md3-on-surface flex items-center gap-2">
                            <LogOut className="w-5 h-5" />
                            Volver a Windows
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-md3-on-surface-variant">
                            ¿Estás seguro que deseas minimizar Nuevo Galeno y volver al escritorio de Windows?
                            La aplicación seguirá ejecutándose en segundo plano.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            onClick={handleCancel}
                            className="bg-md3-surface-variant text-md3-on-surface-variant hover:bg-md3-surface-3"
                        >
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleMinimize}
                            className="bg-md3-primary text-md3-on-primary hover:shadow-md3-2"
                        >
                            Minimizar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

// App: Configuración Inicial
export function InitialSetupApp({ windowId: _windowId, data }: { windowId: WindowId; data?: any }) {
    const onFinish = data?.onFinish || (() => { });

    return (
        <div className="h-full w-full overflow-auto">
            <FirstRunWizard onFinish={onFinish} />
        </div>
    );
}

// App: Revisión e Importación de Datos
export function ImportReviewApp({ windowId: _windowId, data }: { windowId: WindowId; data?: any }) {
    const extractedDir = data?.extractedDir || '';
    const onComplete = data?.onComplete || (() => { });
    const onCancel = data?.onCancel || (() => { });

    return (
        <div className="h-full w-full overflow-auto">
            <ImportReviewScreen
                extractedDir={extractedDir}
                onComplete={onComplete}
                onCancel={onCancel}
            />
        </div>
    );
}

// Export app definitions
export const APP_DEFINITIONS = [
    {
        id: 'initial-setup',
        name: 'Configuración Inicial',
        icon: '🔧',
        allowMultipleInstances: false,
        defaultSize: { width: 900, height: 650 },
        component: InitialSetupApp,
    },
    {
        id: 'dashboard',
        name: 'Panel de Control',
        icon: '🏠',
        allowMultipleInstances: false,
        defaultSize: { width: 1100, height: 700 },
        component: DashboardApp,
    },
    {
        id: 'patients',
        name: 'Pacientes',
        icon: '👥',
        allowMultipleInstances: false,
        defaultSize: { width: 1000, height: 700 },
        component: PatientsApp,
    },
    {
        id: 'patient-record',
        name: 'Ficha de Paciente',
        icon: '👤',
        allowMultipleInstances: true,
        defaultSize: { width: 900, height: 750 },
        component: PatientRecordApp,
        showOnDesktop: false,
    },
    {
        id: 'treatments',
        name: 'Tratamientos',
        icon: '🦷',
        allowMultipleInstances: true,
        defaultSize: { width: 900, height: 700 },
        component: TreatmentsApp,
        showOnDesktop: false,
    },
    {
        id: 'accounts',
        name: 'Cuentas Corrientes',
        icon: '💰',
        allowMultipleInstances: false,
        defaultSize: { width: 900, height: 700 },
        component: AccountsApp,
    },
    {
        id: 'settings',
        name: 'Configuración',
        icon: '⚙️',
        allowMultipleInstances: false,
        defaultSize: { width: 900, height: 650 },
        component: ConfigurationApp,
    },
    {
        id: 'system-tools',
        name: 'Mantenimiento',
        icon: '🧰',
        allowMultipleInstances: false,
        defaultSize: { width: 700, height: 500 },
        component: SystemToolsApp,
        showOnDesktop: false,
    },
    {
        id: 'back-to-windows',
        name: 'Volver a Windows',
        icon: '🪟',
        allowMultipleInstances: false,
        defaultSize: { width: 1, height: 1 },
        component: BackToWindowsApp,
    },
    {
        id: 'import-review',
        name: 'Revisión de Importación',
        icon: '📊',
        allowMultipleInstances: false,
        defaultSize: { width: 1200, height: 800 },
        component: ImportReviewApp,
    },
];
