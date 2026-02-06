import {
    AlertCircle,
    Activity,
    StickyNote,
    CreditCard,
    FileText,
    Calendar,
    Smile,
    X,
    GripVertical
} from 'lucide-react';
import { MedicalWidget } from '@/types/medical-view';
import { Patient } from '@/hooks/usePatients';
import { cn } from '@/lib/utils';

interface MedicalWidgetCardProps {
    widget: MedicalWidget;
    patient: Patient;
    isEditMode?: boolean;
    onRemove?: (widgetId: string) => void;
    onUpdate?: (widgetId: string, updates: Partial<MedicalWidget>) => void;
}

export function MedicalWidgetCard({
    widget,
    patient,
    isEditMode = false,
    onRemove,
}: MedicalWidgetCardProps) {
    const renderContent = () => {
        switch (widget.type) {
            case 'allergies-alert':
                return <AllergiesWidget patient={patient} />;
            case 'vital-signs':
                return <VitalSignsWidget />;
            case 'quick-notes':
                return <QuickNotesWidget patient={patient} />;
            case 'recent-treatments':
                return <RecentTreatmentsWidget />;
            case 'pending-payments':
                return <PendingPaymentsWidget />;
            case 'next-appointment':
                return <NextAppointmentWidget />;
            case 'medical-history':
                return <MedicalHistoryWidget />;
            case 'odontogram-preview':
                return <OdontogramPreviewWidget />;
            default:
                return <div className="p-4 text-white/50">Widget desconocido</div>;
        }
    };

    return (
        <div
            className={cn(
                "bg-[#272727] border border-white/5 rounded-xl overflow-hidden h-full flex flex-col relative group transition-all",
                isEditMode && "ring-2 ring-blue-500/30 shadow-lg shadow-blue-500/10"
            )}
        >
            {isEditMode && (
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <button
                        onClick={() => onRemove?.(widget.id)}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-md border border-red-500/30 transition-colors"
                        title="Eliminar widget"
                    >
                        <X className="w-4 h-4 text-red-400" />
                    </button>
                    <div
                        className="p-1.5 bg-white/5 rounded-md border border-white/10 cursor-move"
                        title="Arrastrar widget"
                    >
                        <GripVertical className="w-4 h-4 text-white/50" />
                    </div>
                </div>
            )}
            {renderContent()}
        </div>
    );
}

// Widget: Alertas de Alergias
function AllergiesWidget({ patient }: { patient: Patient }) {
    if (!patient.allergies) {
        return (
            <div className="p-4 flex items-center gap-3 text-white/40">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">Sin alergias registradas</p>
            </div>
        );
    }

    return (
        <div className="p-4 bg-red-500/10 border-l-4 border-red-500 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-200">Alergias Registradas</h4>
                <p className="text-sm text-red-200/80 mt-1">{patient.allergies}</p>
            </div>
        </div>
    );
}

// Widget: Signos Vitales
function VitalSignsWidget() {
    // Datos de ejemplo - en producción se cargarían de la BD
    const vitals = [
        { label: 'Presión', value: '120/80', unit: 'mmHg', status: 'normal' },
        { label: 'Pulso', value: '72', unit: 'bpm', status: 'normal' },
        { label: 'Temp.', value: '36.5', unit: '°C', status: 'normal' },
    ];

    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white/90">Signos Vitales</h3>
            </div>
            <div className="space-y-3">
                {vitals.map((vital, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                        <span className="text-xs text-white/60">{vital.label}</span>
                        <span className="text-sm font-medium text-white/90">
                            {vital.value} <span className="text-white/50">{vital.unit}</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Widget: Notas Rápidas
function QuickNotesWidget({ patient }: { patient: Patient }) {
    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <StickyNote className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white/90">Notas Clínicas</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                    {patient.medical_notes || "No hay notas clínicas registradas."}
                </p>
            </div>
        </div>
    );
}

// Widget: Tratamientos Recientes
function RecentTreatmentsWidget() {
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white/90">Tratamientos Recientes</h3>
            </div>
            <div className="space-y-2 text-sm text-white/60">
                <p>Cargando tratamientos...</p>
            </div>
        </div>
    );
}

// Widget: Pagos Pendientes
function PendingPaymentsWidget() {
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-white/90">Pagos Pendientes</h3>
            </div>
            <div className="text-center py-4">
                <div className="text-2xl font-bold text-orange-400">$0.00</div>
                <p className="text-xs text-white/50 mt-1">Sin pagos pendientes</p>
            </div>
        </div>
    );
}

// Widget: Próxima Cita
function NextAppointmentWidget() {
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white/90">Próxima Cita</h3>
            </div>
            <div className="text-center py-2 text-white/50">
                <p className="text-sm">No hay citas programadas</p>
            </div>
        </div>
    );
}

// Widget: Historial Médico
function MedicalHistoryWidget() {
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white/90">Historial Médico</h3>
            </div>
            <div className="space-y-2">
                <p className="text-sm text-white/60">Resumen del historial médico</p>
            </div>
        </div>
    );
}

// Widget: Vista Previa Odontograma
function OdontogramPreviewWidget() {
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <Smile className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white/90">Odontograma</h3>
            </div>
            <div className="text-center py-4 text-white/50">
                <p className="text-sm">Vista previa del odontograma</p>
            </div>
        </div>
    );
}
