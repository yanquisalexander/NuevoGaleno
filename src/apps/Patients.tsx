import { useState } from 'react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { toast } from 'sonner';
import { PatientSearch } from '../components/patients/PatientSearch';
import { PatientList } from '../components/patients/PatientList';
import { PatientForm } from '../components/patients/PatientForm';
import { Patient, usePatients } from '../hooks/usePatients';
import type { WindowId } from '../types/window-manager';

export function PatientsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    const [showForm, setShowForm] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const { openWindow } = useWindowManager();
    const { createPatient, updatePatient } = usePatients();

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
        <div className="h-full flex flex-col bg-[#202020] font-sans selection:bg-blue-500/30 relative">
            {/* Header */}
            <div className="pt-6 px-6 pb-2 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-white/90 tracking-tight">Pacientes</h2>
                    <p className="text-sm text-white/50 mt-1">Gestiona el padrón de pacientes</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-[#005FB8] hover:bg-[#1874D0] active:bg-[#00529E] text-white rounded-[4px] text-sm font-medium transition-colors border-t border-white/10 shadow-sm flex items-center gap-2"
                >
                    <span>Nuevo Paciente</span>
                </button>
            </div>

            {/* Buscador */}
            <div className="px-6 py-4">
                <PatientSearch onSelectPatient={handleSelectPatient} />
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-hidden px-6">
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
