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
import { MedicalNotesEditor } from './MedicalNotesEditor';

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
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-md border border-red-500/30 transition-colors cursor-pointer"
                        title="Eliminar widget"
                    >
                        <X className="w-4 h-4 text-red-400" />
                    </button>
                    <div
                        className="widget-grip p-1.5 bg-white/5 rounded-md border border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/10 transition-colors"
                        title="Arrastrar widget"
                    >
                        <GripVertical className="w-4 h-4 text-white/50" />
                    </div>
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

// Helper small Minus icon
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

// Widget: Notas Rápidas
function QuickNotesWidget({ patient, onSave }: { patient: Patient; onSave?: (text: string) => void }) {
    const [text, setText] = React.useState(patient.medical_notes || '');
    const [saving, setSaving] = React.useState(false);
    const { updatePatient } = usePatients();

    const handleSave = async () => {
        setSaving(true);
        try {
            await updatePatient(patient.id, { medical_notes: text });
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
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <StickyNote className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-white/90">Notas Clínicas</h3>
                </div>
            </div>
            <div className="flex-1 px-4 pb-2 overflow-hidden">
                <MedicalNotesEditor
                    content={text}
                    onChange={setText}
                    placeholder="Escribe notas clínicas del paciente..."
                />
            </div>
            <div className="px-4 pb-4 flex justify-end gap-2 border-t border-white/5 pt-3">
                <button
                    onClick={() => setText(patient.medical_notes || '')}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors"
                >Cancelar</button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-sm text-white disabled:opacity-60 transition-colors"
                >{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
        </div>
    );
}

// Widget: Tratamientos Recientes
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

// Widget: Pagos Pendientes
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

// Widget: Próxima Cita
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


// Widget: Vista Previa Odontograma (mini odontograma visual con superficies)
function OdontogramPreviewWidget({ patientId }: { patientId: number }) {
    const [surfaces, setSurfaces] = React.useState<any[]>([]);
    const [toothTreatments, setToothTreatments] = React.useState<any[]>([]);
    const [bridges, setBridges] = React.useState<any[]>([]);
    const [statusMap, setStatusMap] = React.useState<Map<number, string>>(new Map());
    const [catalog, setCatalog] = React.useState<any[]>([]);
    const [catalogItems, setCatalogItems] = React.useState<any[]>([]);
    const { openWindow } = useWindowManager();

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { getToothTreatmentsByPatient, getBridgesByPatient } = await import('@/hooks/useOdontogram');
                const { getTreatmentsByPatient } = await import('@/hooks/useTreatments');
                const { getAllTreatmentCatalog, getTreatmentCatalogItems } = await import('@/hooks/useTreatmentCatalog');

                const [surfaceData, toothTreatmentData, bridgeData, treatmentData, catalogData] = await Promise.all([
                    getOdontogramSurfacesByPatient(patientId),
                    getToothTreatmentsByPatient(patientId),
                    getBridgesByPatient(patientId),
                    getTreatmentsByPatient(patientId),
                    getAllTreatmentCatalog()
                ]);

                if (!mounted) return;

                setSurfaces(surfaceData || []);
                setToothTreatments(toothTreatmentData || []);
                setBridges(bridgeData || []);
                setCatalog(catalogData || []);

                // Load all catalog items
                const allItems: any[] = [];
                for (const cat of (catalogData || [])) {
                    try {
                        const items = await getTreatmentCatalogItems(cat.id);
                        allItems.push(...items);
                    } catch { /* skip */ }
                }
                if (mounted) setCatalogItems(allItems);

                // Build status map
                const map = new Map<number, string>();
                (treatmentData || []).forEach((t: any) => {
                    map.set(t.id, t.status);
                });
                setStatusMap(map);
            } catch (err) {
                console.error('Error cargando odontograma:', err);
            }
        })();
        return () => { mounted = false };
    }, [patientId]);

    const getSurfaceColor = (toothNumber: number, surface: string): string => {
        const surfaceData = surfaces.filter(s =>
            s.tooth_number === toothNumber.toString() &&
            s.surface === surface &&
            s.is_active
        );

        if (surfaceData.length === 0) return '#383838';

        const mostRecent = surfaceData[0];

        // If there's a treatment_id, use the status color
        if (mostRecent.treatment_id) {
            const status = statusMap.get(mostRecent.treatment_id);
            if (status) {
                switch (status) {
                    case 'Pending': return '#ffc107';
                    case 'InProgress': return '#2196f3';
                    case 'Completed': return '#4caf50';
                    case 'Cancelled': return '#f44336';
                }
            }
        }

        // If there's a treatment_catalog_id but no treatment_id, show yellow (pending)
        if (mostRecent.treatment_catalog_id) {
            return '#ffc107';
        }

        // Fallback to default color
        return '#383838';
    };

    const getToothBridge = (toothNumber: number): any | null => {
        return bridges.find(bridge => {
            const start = parseInt(bridge.tooth_start);
            const end = parseInt(bridge.tooth_end);
            return toothNumber >= Math.min(start, end) && toothNumber <= Math.max(start, end);
        }) || null;
    };

    const isUpperTooth = (n: number) => (n >= 11 && n <= 28) || (n >= 51 && n <= 65);
    const isRightSideTooth = (n: number) =>
        (n >= 11 && n <= 18) || (n >= 41 && n <= 48) || (n >= 51 && n <= 55) || (n >= 81 && n <= 85);

    const TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
    const TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

    const renderMiniTooth = (toothNumber: number) => {
        const isUpper = isUpperTooth(toothNumber);
        const isRight = isRightSideTooth(toothNumber);

        // Surface mapping based on tooth position
        const topSurface = isUpper ? 'vestibular' : 'lingual';
        const bottomSurface = isUpper ? 'palatina' : 'vestibular';
        const leftSurface = isRight ? 'distal' : 'mesial';
        const rightSurface = isRight ? 'mesial' : 'distal';

        const bridge = getToothBridge(toothNumber);
        const bridgeColor = bridge ? '#e08c00' : null;

        // Check if tooth is absent - check both condition and visual_effect
        const toothTreatment = toothTreatments.find(t =>
            t.tooth_number === toothNumber.toString() &&
            t.is_active
        );

        // Get visual effect from treatment catalog using component state
        let visualEffect: string | null = null;
        if (toothTreatment) {
            if (toothTreatment.treatment_catalog_item_id) {
                const item = catalogItems.find((i: any) => i.id === toothTreatment.treatment_catalog_item_id);
                if (item?.visual_effect) visualEffect = item.visual_effect;
            }
            if (!visualEffect && toothTreatment.treatment_catalog_id) {
                const treatment = catalog.find((t: any) => t.id === toothTreatment.treatment_catalog_id);
                if (treatment?.visual_effect) visualEffect = treatment.visual_effect;
            }
        }

        const isAbsent = visualEffect === 'absent' || toothTreatment?.condition === 'absent';

        const W = 48, H = 64; // Increased from 36x48 to 48x64 for better visibility

        return (
            <div
                key={toothNumber}
                className="flex flex-col items-center"
                title={`Pieza ${toothNumber}${bridge ? ` - Puente: ${bridge.bridge_name}` : ''}`}
            >
                <svg width={W} height={H + 4} viewBox={`0 0 ${W} ${H + 4}`}>
                    {/* Bridge indicator bar */}
                    {bridgeColor && (
                        <rect
                            x="-1" y="0"
                            width={W + 2} height="5"
                            rx="2"
                            fill={bridgeColor}
                            opacity="0.85"
                        />
                    )}

                    <g transform="translate(0, 4)">
                        {/* Outer tooth shape */}
                        <rect
                            x="0.5" y="0.5"
                            width={W - 1} height={H - 1}
                            rx="3"
                            fill="#1a1a1a"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="0.5"
                        />

                        {/* Top surface */}
                        <rect
                            x="0.5" y="0.5"
                            width={W - 1} height="11"
                            rx="3"
                            fill={getSurfaceColor(toothNumber, topSurface)}
                            opacity="0.9"
                        />
                        <rect x="0.5" y="8" width={W - 1} height="4" fill={getSurfaceColor(toothNumber, topSurface)} opacity="0.9" />

                        {/* Bottom surface */}
                        <rect
                            x="0.5" y={H - 11.5}
                            width={W - 1} height="11"
                            rx="3"
                            fill={getSurfaceColor(toothNumber, bottomSurface)}
                            opacity="0.9"
                        />
                        <rect x="0.5" y={H - 11.5} width={W - 1} height="4" fill={getSurfaceColor(toothNumber, bottomSurface)} opacity="0.9" />

                        {/* Left surface */}
                        <rect
                            x="0.5" y="12"
                            width="9" height={H - 24}
                            fill={getSurfaceColor(toothNumber, leftSurface)}
                            opacity="0.9"
                        />

                        {/* Right surface */}
                        <rect
                            x={W - 9.5} y="12"
                            width="9" height={H - 24}
                            fill={getSurfaceColor(toothNumber, rightSurface)}
                            opacity="0.9"
                        />

                        {/* Oclusal center */}
                        <rect
                            x="9.5" y="12"
                            width={W - 19} height={H - 24}
                            rx="2"
                            fill={getSurfaceColor(toothNumber, 'oclusal')}
                            opacity="0.9"
                        />

                        {/* Tooth number - LARGER and MORE VISIBLE */}
                        <text
                            x={W / 2} y={H / 2 + 5}
                            textAnchor="middle"
                            fontSize="15"
                            fontWeight="800"
                            fill="rgba(255,255,255,0.9)"
                            stroke="rgba(0,0,0,0.7)"
                            strokeWidth="0.8"
                        >
                            {toothNumber}
                        </text>

                        {/* Absent tooth indicator (X) */}
                        {isAbsent && (
                            <>
                                <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="3"
                                    fill="rgba(0,0,0,0.7)" />
                                <line x1="8" y1="8" x2={W - 8} y2={H - 8}
                                    stroke="#f44336" strokeWidth="4" strokeLinecap="round" />
                                <line x1={W - 8} y1="8" x2="8" y2={H - 8}
                                    stroke="#f44336" strokeWidth="4" strokeLinecap="round" />
                            </>
                        )}
                    </g>
                </svg>
            </div>
        );
    };

    const activeTreatments = surfaces.filter(s => s.is_active && s.treatment_catalog_id).length +
        toothTreatments.filter(t => t.is_active && t.treatment_catalog_id).length;

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <div className="flex items-center gap-2">
                    <Smile className="w-4 h-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white/90">Odontograma</h3>
                </div>
                <div className="flex items-center gap-2">
                    {activeTreatments > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">
                            {activeTreatments}
                        </span>
                    )}
                    {bridges.length > 0 && (
                        <span className="text-xs px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full">
                            {bridges.length} 🌉
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 px-2 pb-3 flex flex-col justify-center gap-3 overflow-auto">
                {/* Upper arch */}
                <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Superior</div>
                    <div className="flex gap-1.5">
                        {TEETH_UPPER.map(renderMiniTooth)}
                    </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 px-2">
                    <div className="flex-1 h-px bg-white/10" />
                    <span className="text-[9px] text-white/40 font-semibold">LÍNEA MEDIA</span>
                    <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Lower arch */}
                <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-1.5">
                        {TEETH_LOWER.map(renderMiniTooth)}
                    </div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">Inferior</div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-3 mt-2 text-[11px] flex-wrap">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-[#ffc107]" />
                        <span className="text-white/60">Pendiente</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-[#2196f3]" />
                        <span className="text-white/60">En Proceso</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-[#4caf50]" />
                        <span className="text-white/60">Completado</span>
                    </div>
                </div>

                {/* Action button */}
                <div className="text-center mt-1">
                    <button
                        onClick={() => openWindow('patient-record', { patientId, activeTab: 'odontogram' })}
                        className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded text-[10px] text-blue-400 transition-colors"
                    >
                        Abrir Odontograma Completo
                    </button>
                </div>
            </div>
        </div>
    );
}
