import { useState, useEffect } from 'react';
import {
    User,
    FileText,
    Activity,
    CreditCard,
    Smile,
    Mail,
    Calendar,
    Droplet,
    AlertCircle,
    StickyNote,
    Phone,
    Fingerprint
} from 'lucide-react';
import { motion } from 'motion/react';
import { Patient, getPatientById } from '../hooks/usePatients';
import { MedicalHistory } from '../components/patients/MedicalHistory';
import { TreatmentList } from '../components/treatments/TreatmentList';
import { TreatmentPayments } from '../components/payments/TreatmentPayments';
import { BalanceCard } from '../components/payments/BalanceCard';
import { Odontogram } from '../components/odontogram/Odontogram';
import type { WindowId } from '../types/window-manager';
import { cn } from '@/lib/utils'; // Asumiendo que tienes esta utilidad, sino puedes usar strings

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

    // --- Loading State ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#202020] space-y-4">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-sm text-white/50 animate-pulse">Cargando expediente...</p>
            </div>
        );
    }

    // --- Empty State ---
    if (!patient) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#202020] text-white/40">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                    <User className="w-10 h-10 opacity-50" />
                </div>
                <p className="text-lg font-medium">Paciente no encontrado</p>
                <p className="text-sm mt-1">Verifique el ID o intente nuevamente.</p>
            </div>
        );
    }

    // --- Tabs Configuration ---
    const tabs = [
        { id: 'info', label: 'General', icon: User },
        { id: 'history', label: 'Historia', icon: FileText },
        { id: 'treatments', label: 'Tratamientos', icon: Activity },
        { id: 'payments', label: 'Pagos', icon: CreditCard },
        { id: 'odontogram', label: 'Odontograma', icon: Smile },
    ];

    return (
        <div className="h-full flex flex-col bg-[#202020] text-white font-sans selection:bg-blue-500/30">

            {/* Header: Estilo Acrylic/Glass */}
            <div className="relative z-10 bg-[#202020]/80 backdrop-blur-md border-b border-white/5 px-8 py-6">
                <div className="flex items-center gap-5">
                    {/* Avatar Placeholder */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xl font-bold border-2 border-[#333] shadow-lg">
                        {patient.first_name[0]}{patient.last_name[0]}
                    </div>

                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {patient.first_name} {patient.last_name}
                        </h1>
                        <div className="flex items-center gap-3 text-xs text-white/60">
                            {patient.document_number && (
                                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                    <Fingerprint className="w-3 h-3" />
                                    {patient.document_number}
                                </span>
                            )}
                            {patient.phone && (
                                <span className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer">
                                    <Phone className="w-3 h-3" />
                                    {patient.phone}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Tabs de Navegación (Pivot Style) */}
                <div className="flex items-center gap-1 mt-8 overflow-x-auto scrollbar-none pb-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "relative px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
                                    isActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-tab-pill"
                                        className="absolute inset-0 bg-white/10 rounded-md border border-white/5"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10 flex items-center gap-2">
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="h-full"
                >
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
                            {/* Tarjeta de Datos Personales */}
                            <div className="bg-[#272727] border border-white/5 rounded-xl p-6 space-y-6">
                                <h3 className="text-sm font-semibold text-white/90 border-b border-white/5 pb-3">
                                    Datos Personales
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
                                    <InfoItem icon={Mail} label="Email" value={patient.email} />
                                    <InfoItem icon={Calendar} label="Fecha de Nacimiento" value={patient.birth_date} />
                                    <InfoItem icon={User} label="Género" value={patient.gender} />
                                    <InfoItem icon={Droplet} label="Grupo Sanguíneo" value={patient.blood_type} />
                                </div>
                            </div>

                            {/* Tarjeta de Información Médica */}
                            <div className="space-y-4">
                                {/* Alertas Importantes (Estilo InfoBar) */}
                                {patient.allergies && (
                                    <div className="bg-red-500/10 border-l-4 border-red-500 rounded-r-lg p-4 flex gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-red-200">Alergias Registradas</h4>
                                            <p className="text-sm text-red-200/70 mt-1">{patient.allergies}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Notas Médicas */}
                                <div className="bg-[#272727] border border-white/5 rounded-xl p-6 h-full min-h-[200px]">
                                    <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
                                        <StickyNote className="w-4 h-4 text-yellow-400/70" />
                                        <h3 className="text-sm font-semibold text-white/90">Notas Clínicas</h3>
                                    </div>
                                    <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                                        {patient.medical_notes || "No hay notas adicionales registradas para este paciente."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <MedicalHistory patient={patient} onUpdate={loadPatient} />
                    )}

                    {activeTab === 'treatments' && (
                        <TreatmentList patientId={patient.id} />
                    )}

                    {activeTab === 'payments' && (
                        <div className="max-w-4xl space-y-6">
                            <BalanceCard patientId={patient.id} />
                            <div className="bg-[#272727] border border-white/5 rounded-xl overflow-hidden">
                                <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                                    <h3 className="font-medium text-white/90">Historial de Pagos</h3>
                                </div>
                                <div className="p-4">
                                    <TreatmentPayments patientId={patient.id} />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'odontogram' && (
                        <div className="bg-[#272727] border border-white/5 rounded-xl p-6 shadow-sm">
                            <Odontogram patientId={patient.id} />
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}

// Sub-componente para items de información
function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: any }) {
    return (
        <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
                <Icon className="w-4 h-4 text-white/50" />
            </div>
            <div>
                <p className="text-xs font-medium text-white/40 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-white/90 font-medium mt-0.5">{value || 'No registrado'}</p>
            </div>
        </div>
    );
}