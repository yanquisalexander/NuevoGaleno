import { Activity } from 'lucide-react';
import { TreatmentList } from '../components/treatments/TreatmentList';
import type { WindowId } from '../types/window-manager';

export function TreatmentsApp({ windowId: _windowId, data }: { windowId: WindowId; data?: any }) {
    const patientId = data?.patientId;

    if (!patientId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-white/60 bg-[#1a1a1a]">
                <Activity className="w-24 h-24 mb-4 opacity-30" />
                <p>Selecciona un paciente primero</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#1a1a1a]">
            <div className="bg-white/5 border-b border-white/10 p-4">
                <h2 className="text-xl font-bold text-white">Tratamientos del Paciente</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <TreatmentList patientId={patientId} />
            </div>
        </div>
    );
}
