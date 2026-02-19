import React from 'react';
import {
    AlertCircle,
    Activity,
    StickyNote,
    CreditCard,
    FileText,
    Calendar,
    Smile,
    Stethoscope,
    X,
    GripVertical,
    Plus,
    ChevronUp,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Minimize2,
    Settings2
} from 'lucide-react';
import { MedicalWidget } from '@/types/medical-view';
import { Patient, usePatients } from '@/hooks/usePatients';
import { cn } from '@/lib/utils';
import { getTreatmentsByPatient, updateTreatmentStatus } from '@/hooks/useTreatments';
import { getPatientBalance } from '@/hooks/usePayments';
import { useAppointments } from '@/hooks/useAppointments';
import { toast } from 'sonner';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { getOdontogramSurfacesByPatient } from '@/hooks/useOdontogram';

interface MedicalWidgetCardProps {
    widget: MedicalWidget;
    patient: Patient;
    isEditMode?: boolean;
    onRemove?: (widgetId: string) => void;
    onUpdate?: (widgetId: string, updates: Partial<MedicalWidget>) => void;
    onDragStart?: (widgetId: string, e: React.DragEvent) => void;
    onDragEnd?: (widgetId: string) => void;
    onHandlePointerDown?: (widgetId: string, e: React.PointerEvent) => void;
    layoutColumns?: number;
    layoutRows?: number;
}

export function MedicalWidgetCard({
    widget,
    patient,
    isEditMode = false,
    onRemove,
    onUpdate,
    onDragStart,
    onDragEnd,
    onHandlePointerDown,
    layoutColumns,
    layoutRows,
}: MedicalWidgetCardProps) {
    const changePos = (dx: number, dy: number) => {
        const x = (widget.position?.x ?? 0) + dx;
        const y = (widget.position?.y ?? 0) + dy;
        onUpdate?.(widget.id, { position: { x, y } });
    };

    const changeSize = (dw: number, dh: number) => {
        const w = Math.max(1, (widget.size?.width ?? 4) + dw);
        const h = Math.max(1, (widget.size?.height ?? 2) + dh);
        onUpdate?.(widget.id, { size: { width: w, height: h } });
    };

    const renderContent = () => {
        switch (widget.type) {
            case 'allergies-alert':
                return <AllergiesWidget patient={patient} />;

            case 'quick-notes':
                return <QuickNotesWidget patient={patient} onSave={(text) => onUpdate?.(widget.id, { config: { ...widget.config, notes: text } })} />;
            case 'recent-treatments':
                return <RecentTreatmentsWidget patientId={patient.id} />;
            case 'pending-payments':
                return <PendingPaymentsWidget patientId={patient.id} />;
            case 'next-appointment':
                return <NextAppointmentWidget patientId={patient.id} />;
            case 'medical-history':
                return <MedicalHistoryWidget patient={patient} />;
            case 'odontogram-preview':
                return <OdontogramPreviewWidget patientId={patient.id} />;
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
                        // Añadí onMouseDown stopPropagation aquí por seguridad para que el click no pase al grid
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-md border border-red-500/30 transition-colors cursor-pointer"
                        title="Eliminar widget"
                    >
                        <X className="w-4 h-4 text-red-400" />
                    </button>

                    {/* --- AQUÍ ESTÁ LA CORRECCIÓN --- */}
                    <div
                        className="widget-grip p-1.5 bg-white/5 rounded-md border border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                        title="Arrastrar widget"
                    // NO agregues onMouseDown, onPointerDown ni onDragStart aquí.
                    // La clase "widget-grip" es lo único que React-Grid-Layout necesita.
                    >
                        <GripVertical className="w-4 h-4 text-white/50" />
                    </div>
                    {/* ------------------------------- */}
                </div>
            )}

            {isEditMode && (
                <div className="absolute left-2 top-2 z-10 bg-black/40 rounded-md p-2 flex flex-col gap-1" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                        <button onClick={() => changePos(0, -1)} className="p-1 bg-white/5 rounded" title="Arriba"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={() => changePos(-1, 0)} className="p-1 bg-white/5 rounded" title="Izquierda"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={() => changePos(1, 0)} className="p-1 bg-white/5 rounded" title="Derecha"><ChevronRight className="w-4 h-4" /></button>
                        <button onClick={() => changePos(0, 1)} className="p-1 bg-white/5 rounded" title="Abajo"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => changeSize(1, 0)} className="p-1 bg-white/5 rounded" title="Aumentar ancho"><Maximize2 className="w-4 h-4" /></button>
                        <button onClick={() => changeSize(-1, 0)} className="p-1 bg-white/5 rounded" title="Reducir ancho"><Minimize2 className="w-4 h-4" /></button>
                        <button onClick={() => changeSize(0, 1)} className="p-1 bg-white/5 rounded" title="Aumentar alto"><Plus className="w-4 h-4" /></button>
                        <button onClick={() => changeSize(0, -1)} className="p-1 bg-white/5 rounded" title="Reducir alto"><MinusIcon className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            <div className="p-4 flex-1 overflow-hidden">
                {renderContent()}
            </div>
        </div>
    );
}

// Helper small Minus icon (lucide doesn't export a 'Minus' alias here)
function MinusIcon(props: any) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props} className="w-4 h-4">
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
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

// Widget: Notas Rápidas (ahora guarda en DB y en la configuración del widget)
function QuickNotesWidget({ patient, onSave }: { patient: Patient; onSave?: (text: string) => void }) {
    const [text, setText] = React.useState(patient.medical_notes || '');
    const [saving, setSaving] = React.useState(false);
    const { updatePatient } = usePatients();

    const handleSave = async () => {
        setSaving(true);
        try {
            // Persistir nota en el paciente
            await updatePatient(patient.id, { medical_notes: text });
            // Actualizar también el estado/ configuración del widget (si se proporcionó)
            onSave?.(text);
            toast.success('Nota clínica guardada');
        } catch (err) {
            console.error(err);
            toast.error('Error guardando nota');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
                <StickyNote className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white/90">Notas Clínicas</h3>
            </div>
            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-white/70"
                placeholder="Escribe una nota rápida..."
            />
            <div className="mt-3 flex justify-end gap-2">
                <button
                    onClick={() => setText(patient.medical_notes || '')}
                    className="px-3 py-1 bg-white/5 rounded"
                >Cancelar</button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1 bg-blue-500 rounded text-white disabled:opacity-60"
                >{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </div>
    );
}



// Widget: Tratamientos Recientes (acciones rápidas: ver, cambiar estado, pagar)
function RecentTreatmentsWidget({ patientId }: { patientId: number }) {
    const [treatments, setTreatments] = React.useState<any[]>([]);
    const [loadingId, setLoadingId] = React.useState<number | null>(null);
    const { openWindow } = useWindowManager();

    const load = async () => {
        try {
            const res: any = await getTreatmentsByPatient(patientId);
            setTreatments(res || []);
        } catch (err) {
            console.error('Error cargando tratamientos:', err);
        }
    };

    React.useEffect(() => { load(); }, [patientId]);

    const changeStatus = async (id: number, status: string) => {
        setLoadingId(id);
        try {
            await updateTreatmentStatus(id, status);
            toast.success('Estado actualizado');
            await load();
        } catch (err) {
            console.error(err);
            toast.error('No se pudo actualizar el estado');
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-semibold text-white/90">Tratamientos Recientes</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-sm text-white/60">
                {treatments.length === 0 && <p className="text-sm text-white/40">No hay tratamientos</p>}

                {treatments.slice(0, 6).map(t => (
                    <div key={t.id} className="p-2 bg-white/2 rounded flex justify-between items-center gap-4">
                        <div style={{ minWidth: 0 }}>
                            <div className="font-medium text-white/90 truncate">{t.name}</div>
                            <div className="text-xs text-white/50 truncate">{t.status} · {t.tooth_number || '—'}</div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-sm text-white/80 mr-2">${(t.balance ?? t.total_cost ?? 0).toFixed(2)}</div>

                            <div className="flex gap-2">
                                <button
                                    title="Ver tratamientos"
                                    onClick={() => openWindow('patient-record', { patientId, activeTab: 'treatments' })}
                                    className="px-2 py-1 bg-white/5 rounded text-xs"
                                >Ver</button>

                                {t.status !== 'Completed' && (
                                    <button
                                        onClick={() => changeStatus(t.id, 'Completed')}
                                        disabled={loadingId === t.id}
                                        className="px-2 py-1 bg-green-500 rounded text-xs text-white disabled:opacity-60"
                                    >{loadingId === t.id ? '...' : 'Marcar terminado'}</button>
                                )}

                                <button
                                    title="Registrar pago"
                                    onClick={() => openWindow('patient-record', { patientId, activeTab: 'payments' })}
                                    className="px-2 py-1 bg-blue-500 rounded text-xs text-white"
                                >Pagar</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Widget: Pagos Pendientes (acción rápida para registrar/ver pagos)
function PendingPaymentsWidget({ patientId }: { patientId: number }) {
    const [balance, setBalance] = React.useState<number | null>(null);
    const { openWindow } = useWindowManager();

    React.useEffect(() => {
        let mounted = true;
        getPatientBalance(patientId).then(b => { if (mounted) setBalance(b?.total_balance ?? 0); }).catch(() => { });
        return () => { mounted = false };
    }, [patientId]);

    return (
        <div className="p-4 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-white/90">Pagos Pendientes</h3>
            </div>
            <div className="flex-1 flex items-center justify-center flex-col">
                <div className="text-2xl font-bold text-orange-400">${(balance ?? 0).toFixed(2)}</div>
                <p className="text-xs text-white/50 mt-1">Total adeudado</p>
                <div className="mt-3">
                    <button
                        onClick={() => openWindow('patient-record', { patientId, activeTab: 'payments' })}
                        className="px-3 py-1 bg-blue-500 rounded text-sm text-white"
                    >Registrar pago / Ver pagos</button>
                </div>
            </div>
        </div>
    );
}

// Widget: Próxima Cita (ver / crear cita desde el widget)
function NextAppointmentWidget({ patientId }: { patientId: number }) {
    const { getUpcomingAppointments } = useAppointments();
    const [next, setNext] = React.useState<any | null>(null);
    const { openWindow } = useWindowManager();

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            const upcoming = await getUpcomingAppointments(72);
            if (!mounted) return;
            const forPatient = (upcoming || []).find((a: any) => a.patient_id === patientId || a.patient?.id === patientId);
            setNext(forPatient || null);
        })();
        return () => { mounted = false };
    }, [patientId, getUpcomingAppointments]);

    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-white/90">Próxima Cita</h3>
            </div>
            <div className="text-center py-2 text-white/50">
                {next ? (
                    <div>
                        <div className="font-medium text-white/90">{next.title || 'Cita'}</div>
                        <div className="text-sm text-white/60 mb-3">{new Date(next.start_time || next.appointment_date).toLocaleString()}</div>
                        <div className="flex justify-center gap-2">
                            <button onClick={() => openWindow('appointments')} className="px-3 py-1 bg-white/5 rounded text-sm">Ver cita</button>
                            <button onClick={() => openWindow('appointments')} className="px-3 py-1 bg-blue-500 rounded text-sm text-white">Abrir calendario</button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-sm">No hay citas programadas</p>
                        <div className="mt-3"><button onClick={() => openWindow('appointments')} className="px-3 py-1 bg-blue-500 rounded text-sm text-white">Agendar cita</button></div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Widget: Historial Médico
function MedicalHistoryWidget({ patient }: { patient: Patient }) {
    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-white/90">Historial Médico</h3>
            </div>
            <div className="space-y-2 text-sm text-white/60">
                <p>{patient.medical_notes || 'No hay notas del historial médico.'}</p>
            </div>
        </div>
    );
}

// Widget: Vista Previa Odontograma (muestra conteo y acceso rápido)
function OdontogramPreviewWidget({ patientId }: { patientId: number }) {
    const [count, setCount] = React.useState<number | null>(null);
    const { openWindow } = useWindowManager();

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const surfaces: any[] = await getOdontogramSurfacesByPatient(patientId);
                if (!mounted) return;
                setCount(surfaces.length || 0);
            } catch (err) {
                console.error('Error cargando odontograma:', err);
            }
        })();
        return () => { mounted = false };
    }, [patientId]);

    return (
        <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
                <Smile className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white/90">Odontograma</h3>
            </div>
            <div className="text-center py-4 text-white/50">
                <div className="mb-2 text-sm">Entradas: {count === null ? '–' : count}</div>
                <div>
                    <button onClick={() => openWindow('patient-record', { patientId, activeTab: 'odontogram' })} className="px-3 py-1 bg-blue-500 rounded text-sm text-white">Abrir odontograma</button>
                </div>
            </div>
        </div>
    );
}
