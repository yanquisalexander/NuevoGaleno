import { useState } from 'react';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { toast } from 'sonner';
import { PatientSearch } from '../components/patients/PatientSearch';
import { PatientList } from '../components/patients/PatientList';
import { PatientForm } from '../components/patients/PatientForm';
import { Patient, usePatients } from '../hooks/usePatients';
import { useAppRuntime } from '../hooks/useAppRuntime';
import type { WindowId } from '../types/window-manager';
import { UserPlus } from 'lucide-react';

const tokens = {
    colorNeutralBackground2: '#1f1f1f',
    colorNeutralBackground3: '#141414',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground3: '#adadad',
    colorNeutralStroke2: '#404040',
    colorBrandBackground: '#0078D4',
    colorBrandBackgroundHover: '#106EBE',
    colorBrandBackgroundPressed: '#00529E',
    fontFamilyBase: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    fontSizeBase300: '12px',
    fontSizeBase400: '14px',
    fontSizeBase700: '24px',
    fontWeightRegular: 400,
    fontWeightSemibold: 600,
    borderRadiusMedium: '4px',
};

export function PatientsApp({ windowId: _windowId }: { windowId: WindowId; data?: any }) {
    useAppRuntime('patients', 'Pacientes');
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
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: tokens.colorNeutralBackground2,
            fontFamily: tokens.fontFamilyBase,
            position: 'relative',
        }}>
            {/* ── Header ── */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '20px 20px 0',
            }}>
                <div>
                    <h2 style={{
                        margin: 0,
                        fontSize: tokens.fontSizeBase700,
                        fontWeight: tokens.fontWeightSemibold,
                        color: tokens.colorNeutralForeground1,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.2,
                    }}>
                        Pacientes
                    </h2>
                    <p style={{
                        margin: '3px 0 0',
                        fontSize: tokens.fontSizeBase300,
                        color: tokens.colorNeutralForeground3,
                    }}>
                        Gestiona el padrón de pacientes
                    </p>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '5px 14px',
                        background: tokens.colorBrandBackground,
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: tokens.borderRadiusMedium,
                        color: '#ffffff',
                        fontSize: tokens.fontSizeBase400,
                        fontWeight: tokens.fontWeightSemibold,
                        fontFamily: tokens.fontFamilyBase,
                        cursor: 'pointer',
                        transition: 'background 0.08s',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = tokens.colorBrandBackgroundHover)}
                    onMouseOut={e => (e.currentTarget.style.background = tokens.colorBrandBackground)}
                    onMouseDown={e => (e.currentTarget.style.background = tokens.colorBrandBackgroundPressed)}
                    onMouseUp={e => (e.currentTarget.style.background = tokens.colorBrandBackgroundHover)}
                >
                    <UserPlus size={15} />
                    Nuevo paciente
                </button>
            </div>

            {/* ── Search ── */}
            <div style={{ padding: '16px 20px 10px' }}>
                <PatientSearch onSelectPatient={handleSelectPatient} />
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: tokens.colorNeutralStroke2, margin: '0 20px' }} />

            {/* ── List ── */}
            <div style={{ flex: 1, overflow: 'hidden', padding: '4px 12px' }}>
                <PatientList
                    onSelectPatient={handleSelectPatient}
                    refreshTrigger={refreshTrigger}
                />
            </div>

            {/* ── Modal ── */}
            {showForm && (
                <PatientForm
                    patient={selectedPatient || undefined}
                    onSave={handleSavePatient}
                    onCancel={() => { setShowForm(false); setSelectedPatient(null); }}
                />
            )}
        </div>
    );
}