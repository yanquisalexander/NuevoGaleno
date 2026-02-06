import { useState, useEffect } from 'react';
import {
    OdontogramSurface,
    SurfaceHistoryEntry,
    getOdontogramSurfacesByPatient,
    getSurfaceTreatments,
    addToothSurfaceTreatment,
    deactivateSurfaceTreatment,
    getSurfaceHistory,
} from '../../hooks/useOdontogram';
import {
    TreatmentCatalogEntry,
    TreatmentCatalogItem,
    getAllTreatmentCatalog,
    getTreatmentCatalogItems,
} from '../../hooks/useTreatmentCatalog';
import { createTreatment } from '../../hooks/useTreatments';
import { motion, AnimatePresence } from 'motion/react';
import { Baby, User as UserIcon, Save, X, CheckCircle2, Clock, Loader2, XCircle, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { IndependentTreatments } from './IndependentTreatments';

interface OdontogramProps {
    patientId: number;
}

// Notación FDI para dientes permanentes (adultos)
const TEETH_FDI_PERMANENT = {
    upper: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
    lower: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
};

// Notación para dentición decidua (niños) 
const TEETH_FDI_DECIDUOUS = {
    upper: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65],
    lower: [85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
};

// Caras del diente (palatina para superiores, lingual para inferiores)
const TOOTH_SURFACES = ['mesial', 'distal', 'vestibular', 'palatina', 'lingual', 'oclusal'] as const;
type Surface = typeof TOOTH_SURFACES[number];

// Determinar si un diente es superior o inferior
const isUpperTooth = (toothNumber: number): boolean => {
    return (toothNumber >= 11 && toothNumber <= 28) || (toothNumber >= 51 && toothNumber <= 65);
};

// Determinar si un diente está en el lado derecho del paciente (cuadrantes 1 y 4)
const isRightSideTooth = (toothNumber: number): boolean => {
    return (toothNumber >= 11 && toothNumber <= 18) || // Cuadrante 1
        (toothNumber >= 41 && toothNumber <= 48) || // Cuadrante 4
        (toothNumber >= 51 && toothNumber <= 55) || // Temporal superior derecho
        (toothNumber >= 81 && toothNumber <= 85);   // Temporal inferior derecho
};


export function OdontogramAdvanced({ patientId }: OdontogramProps) {
    const [surfaces, setSurfaces] = useState<OdontogramSurface[]>([]);
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
    const [selectedSurface, setSelectedSurface] = useState<Surface | null>(null);
    const [surfaceTreatments, setSurfaceTreatments] = useState<OdontogramSurface[]>([]);
    const [surfaceHistory, setSurfaceHistory] = useState<SurfaceHistoryEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Catálogo de tratamientos
    const [catalog, setCatalog] = useState<TreatmentCatalogEntry[]>([]);
    const [catalogItems, setCatalogItems] = useState<TreatmentCatalogItem[]>([]);
    const [selectedTreatment, setSelectedTreatment] = useState<number | null>(null);
    const [selectedTreatmentItem, setSelectedTreatmentItem] = useState<number | null>(null);
    const [notes, setNotes] = useState('');
    const [treatmentStatus, setTreatmentStatus] = useState<'Pending' | 'InProgress' | 'Completed' | 'Cancelled'>('Pending');
    const [createTreatmentRecord, setCreateTreatmentRecord] = useState(true);
    const [customCost, setCustomCost] = useState<number>(0);

    useEffect(() => {
        loadData();
    }, [patientId]);

    useEffect(() => {
        if (selectedTreatment) {
            loadCatalogItems(selectedTreatment);
        } else {
            setCatalogItems([]);
            setSelectedTreatmentItem(null);
            setCustomCost(0);
        }
    }, [selectedTreatment]);

    useEffect(() => {
        if (selectedTreatmentItem) {
            const item = catalogItems.find((i) => i.id === selectedTreatmentItem);
            if (item) {
                setCustomCost(item.default_cost);
            }
        } else {
            setCustomCost(0);
        }
    }, [selectedTreatmentItem, catalogItems]);

    useEffect(() => {
        if (selectedTooth && selectedSurface) {
            loadSurfaceData();
            loadSurfaceTreatments();
        } else {
            setSurfaceTreatments([]);
            setSurfaceHistory([]);
            setShowHistory(false);
        }
    }, [selectedTooth, selectedSurface]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [surfaceData, catalogData] = await Promise.all([
                getOdontogramSurfacesByPatient(patientId),
                getAllTreatmentCatalog(),
            ]);
            setSurfaces(surfaceData);
            setCatalog(catalogData);
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar el odontograma');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCatalogItems = async (treatmentId: number) => {
        try {
            const items = await getTreatmentCatalogItems(treatmentId);
            setCatalogItems(items);
        } catch (error) {
            console.error('Error cargando items:', error);
        }
    };

    const loadSurfaceData = async () => {
        if (!selectedTooth || !selectedSurface) return;

        // Resetear formulario
        setSelectedTreatment(null);
        setSelectedTreatmentItem(null);
        setNotes('');
    };

    const loadSurfaceTreatments = async () => {
        if (!selectedTooth || !selectedSurface) return;

        try {
            const treatments = await getSurfaceTreatments(
                patientId,
                selectedTooth.toString(),
                selectedSurface
            );
            setSurfaceTreatments(treatments);
        } catch (error) {
            console.error('Error cargando tratamientos de superficie:', error);
        }
    };

    const loadSurfaceHistoryData = async () => {
        if (!selectedTooth || !selectedSurface) return;

        try {
            const history = await getSurfaceHistory(
                patientId,
                selectedTooth.toString(),
                selectedSurface
            );
            setSurfaceHistory(history);
            setShowHistory(true);
        } catch (error) {
            console.error('Error cargando historial:', error);
            toast.error('Error al cargar el historial');
        }
    };

    const getSurfaceData = (toothNumber: number, surface: Surface): OdontogramSurface[] => {
        return surfaces.filter(
            (s) => s.tooth_number === toothNumber.toString() && s.surface === surface && s.is_active
        );
    };

    const getSurfaceColor = (toothNumber: number, surface: Surface): string => {
        const surfaceData = getSurfaceData(toothNumber, surface);
        if (surfaceData.length === 0) return '#4b5563'; // Sin tratamiento

        // Si hay múltiples tratamientos, usar el más reciente
        const mostRecent = surfaceData[0];

        if (mostRecent.treatment_catalog_id) {
            const treatment = catalog.find((t) => t.id === mostRecent.treatment_catalog_id);
            if (treatment?.color) return treatment.color;

            if (mostRecent.treatment_catalog_item_id) {
                const item = catalogItems.find((i) => i.id === mostRecent.treatment_catalog_item_id);
                if (item?.color) return item.color;
            }
        }

        return '#4ade80'; // healthy
    };

    const handleSurfaceClick = (e: React.MouseEvent, toothNumber: number, surface: Surface) => {
        e.stopPropagation();
        setSelectedTooth(toothNumber);
        setSelectedSurface(surface);
    };

    const handleAddTreatment = async () => {
        if (!selectedTooth || !selectedSurface) return;
        if (!selectedTreatment || !selectedTreatmentItem) {
            toast.error('Seleccione un tratamiento y sub-tratamiento');
            return;
        }

        try {
            // Crear tratamiento si está habilitado
            let treatmentId: number | undefined;
            if (createTreatmentRecord) {
                const treatment = catalog.find((t) => t.id === selectedTreatment);
                const item = catalogItems.find((i) => i.id === selectedTreatmentItem);

                if (treatment && item) {
                    treatmentId = await createTreatment({
                        patient_id: patientId,
                        name: `${treatment.name} - ${item.name}`,
                        tooth_number: selectedTooth.toString(),
                        sector: selectedSurface,
                        total_cost: customCost > 0 ? customCost : item.default_cost,
                        notes: notes || `${treatment.name} en superficie ${selectedSurface}`,
                    });

                    // Actualizar estado si no es pending
                    if (treatmentStatus !== 'Pending') {
                        const { updateTreatmentStatus } = await import('../../hooks/useTreatments');
                        await updateTreatmentStatus(treatmentId, treatmentStatus);
                    }

                    toast.success('Tratamiento creado');
                }
            }

            // Añadir nuevo tratamiento a la superficie
            await addToothSurfaceTreatment({
                patient_id: patientId,
                tooth_number: selectedTooth.toString(),
                surface: selectedSurface,
                treatment_catalog_id: selectedTreatment,
                treatment_catalog_item_id: selectedTreatmentItem,
                condition: 'treatment',
                notes: notes || undefined,
            });

            await loadData();
            await loadSurfaceTreatments();
            toast.success('Tratamiento añadido al odontograma');

            // Reset form but keep surface selected
            setSelectedTreatment(null);
            setSelectedTreatmentItem(null);
            setNotes('');
        } catch (error) {
            console.error('Error añadiendo tratamiento:', error);
            toast.error('Error al añadir tratamiento');
        }
    };

    const handleDeactivateTreatment = async (surfaceId: number) => {
        try {
            await deactivateSurfaceTreatment(surfaceId);
            await loadData();
            await loadSurfaceTreatments();
            toast.success('Tratamiento desactivado');
        } catch (error) {
            console.error('Error desactivando tratamiento:', error);
            toast.error('Error al desactivar tratamiento');
        }
    };

    const isDeciduousTooth = (toothNumber: number): boolean => {
        return toothNumber >= 51 && toothNumber <= 85;
    };

    const renderTooth = (toothNumber: number) => {
        const isDeciduous = isDeciduousTooth(toothNumber);
        const isSelected = selectedTooth === toothNumber;

        return (
            <div key={toothNumber} className="relative flex flex-col items-center gap-1">
                {/* Tooth number label with type indicator */}
                <div className="flex items-center gap-1">
                    <span className="text-[9px] text-white/40 font-mono">{toothNumber}</span>
                    {isDeciduous && (
                        <Baby className="w-2.5 h-2.5 text-blue-400/60" />
                    )}
                </div>

                {/* Tooth visualization with surfaces */}
                <div
                    className={cn(
                        'relative w-11 h-16 rounded-[3px] transition-all overflow-hidden',
                        isSelected && 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#202020] shadow-lg',
                        isDeciduous && 'opacity-90 border border-blue-400/30'
                    )}
                    style={{ backgroundColor: '#2a2a2a' }}
                >
                    {/* Top surface - Vestibular (superiores) o Lingual (inferiores) */}
                    {(() => {
                        const isUpper = isUpperTooth(toothNumber);
                        const topSurface: Surface = isUpper ? 'vestibular' : 'lingual';
                        return (
                            <motion.button
                                whileHover={{ opacity: 0.8 }}
                                onClick={(e) => handleSurfaceClick(e, toothNumber, topSurface)}
                                className={cn(
                                    'absolute top-0 left-0 right-0 h-1/5 border-b border-black/20 transition-all',
                                    selectedTooth === toothNumber && selectedSurface === topSurface && 'ring-1 ring-white ring-inset'
                                )}
                                style={{ backgroundColor: getSurfaceColor(toothNumber, topSurface) }}
                            />
                        );
                    })()}

                    {/* Middle row: Orden correcto de superficies según cuadrante */}
                    <div className="absolute top-1/5 left-0 right-0 bottom-1/5 flex">
                        {(() => {
                            const isRightSide = isRightSideTooth(toothNumber);
                            // Para dientes del lado derecho: Distal (izq) | Oclusal | Mesial (der)
                            // Para dientes del lado izquierdo: Mesial (izq) | Oclusal | Distal (der)
                            const leftSurface: Surface = isRightSide ? 'distal' : 'mesial';
                            const rightSurface: Surface = isRightSide ? 'mesial' : 'distal';

                            return (
                                <>
                                    {/* Superficie izquierda en pantalla */}
                                    <motion.button
                                        whileHover={{ opacity: 0.8 }}
                                        onClick={(e) => handleSurfaceClick(e, toothNumber, leftSurface)}
                                        className={cn(
                                            'w-1/3 border-r border-black/20 transition-all',
                                            selectedTooth === toothNumber && selectedSurface === leftSurface && 'ring-1 ring-white ring-inset'
                                        )}
                                        style={{ backgroundColor: getSurfaceColor(toothNumber, leftSurface) }}
                                    />
                                    {/* Center - Oclusal (clickeable) */}
                                    <motion.button
                                        whileHover={{ opacity: 0.8 }}
                                        onClick={(e) => handleSurfaceClick(e, toothNumber, 'oclusal')}
                                        className={cn(
                                            'w-1/3 flex items-center justify-center transition-all',
                                            selectedTooth === toothNumber && selectedSurface === 'oclusal' && 'ring-1 ring-white ring-inset'
                                        )}
                                        style={{ backgroundColor: getSurfaceColor(toothNumber, 'oclusal') }}
                                    >
                                        <span className="text-[9px] font-semibold text-white/30">
                                            {toothNumber}
                                        </span>
                                    </motion.button>
                                    {/* Superficie derecha en pantalla */}
                                    <motion.button
                                        whileHover={{ opacity: 0.8 }}
                                        onClick={(e) => handleSurfaceClick(e, toothNumber, rightSurface)}
                                        className={cn(
                                            'w-1/3 border-l border-black/20 transition-all',
                                            selectedTooth === toothNumber && selectedSurface === rightSurface && 'ring-1 ring-white ring-inset'
                                        )}
                                        style={{ backgroundColor: getSurfaceColor(toothNumber, rightSurface) }}
                                    />
                                </>
                            );
                        })()}
                    </div>

                    {/* Bottom surface - Palatina (superiores) o Vestibular (inferiores) */}
                    {(() => {
                        const isUpper = isUpperTooth(toothNumber);
                        const bottomSurface: Surface = isUpper ? 'palatina' : 'vestibular';
                        return (
                            <motion.button
                                whileHover={{ opacity: 0.8 }}
                                onClick={(e) => handleSurfaceClick(e, toothNumber, bottomSurface)}
                                className={cn(
                                    'absolute bottom-0 left-0 right-0 h-1/5 border-t border-black/20 transition-all',
                                    selectedTooth === toothNumber && selectedSurface === bottomSurface && 'ring-1 ring-white ring-inset'
                                )}
                                style={{ backgroundColor: getSurfaceColor(toothNumber, bottomSurface) }}
                            />
                        );
                    })()}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Información de dentición mixta y orientación */}
            <div className="space-y-3">
                <div className="flex items-center justify-center gap-6 p-3 bg-[#272727] rounded-lg border border-white/5">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                        <UserIcon className="w-4 h-4 text-white/50" />
                        <span>Permanentes (11-48)</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <div className="flex items-center gap-2 text-sm text-blue-400/80">
                        <Baby className="w-4 h-4" />
                        <span>Temporales (51-85)</span>
                    </div>
                </div>

                {/* Indicadores de orientación desde la perspectiva del odontólogo */}
                <div className="flex items-center justify-between px-8 text-xs text-white/40">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400/50" />
                        <span>Derecha del Paciente</span>
                    </div>
                    <div className="text-center">
                        <div className="font-semibold text-white/50">Vista del Odontólogo</div>
                        <div className="text-[10px] mt-0.5">Palatina (sup.) / Lingual (inf.)</div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Izquierda del Paciente</span>
                        <div className="w-2 h-2 rounded-full bg-blue-400/50" />
                    </div>
                </div>
            </div>

            {/* Odontograma Mixto Completo */}
            <div className="flex flex-col items-center gap-8 py-6 bg-[#202020] rounded-lg border border-white/5">
                {/* Arcada Superior - Permanentes y Temporales */}
                <div className="w-full px-6 space-y-4">
                    <div className="text-xs text-white/40 mb-4 text-center uppercase tracking-widest font-semibold">
                        Arcada Superior
                    </div>

                    {/* Dientes permanentes superiores */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {TEETH_FDI_PERMANENT.upper.map(renderTooth)}
                    </div>

                    {/* Dientes temporales superiores - Encima de permanentes */}
                    <div className="flex flex-wrap justify-center gap-3 pt-2 border-t border-white/5">
                        {TEETH_FDI_DECIDUOUS.upper.map(renderTooth)}
                    </div>
                </div>

                {/* Separator */}
                <div className="w-40 h-px bg-white/10" />

                {/* Arcada Inferior - Permanentes y Temporales */}
                <div className="w-full px-6 space-y-4">
                    <div className="text-xs text-white/40 mb-4 text-center uppercase tracking-widest font-semibold">
                        Arcada Inferior
                    </div>

                    {/* Dientes temporales inferiores - Encima de permanentes */}
                    <div className="flex flex-wrap justify-center gap-3 pb-2 border-b border-white/5">
                        {TEETH_FDI_DECIDUOUS.lower.map(renderTooth)}
                    </div>

                    {/* Dientes permanentes inferiores */}
                    <div className="flex flex-wrap justify-center gap-3">
                        {TEETH_FDI_PERMANENT.lower.map(renderTooth)}
                    </div>
                </div>
            </div>

            {/* Panel de edición */}
            <AnimatePresence>
                {selectedTooth && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="bg-[#272727] border border-white/5 rounded-lg p-6 space-y-6"
                    >
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div>
                                <h3 className="text-lg font-semibold">
                                    Pieza Dental {selectedTooth}
                                </h3>
                                {selectedSurface && (
                                    <p className="text-sm text-white/60 mt-1">
                                        Superficie: <span className="capitalize font-medium text-white/80">{selectedSurface}</span>
                                        {(selectedSurface === 'palatina' || selectedSurface === 'lingual') && (
                                            <span className="ml-2 text-xs text-white/40">
                                                ({selectedSurface === 'palatina' ? 'Superior - Paladar' : 'Inferior - Lengua'})
                                            </span>
                                        )}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedTooth(null);
                                    setSelectedSurface(null);
                                }}
                                className="p-2 hover:bg-white/5 rounded-md transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Selector de superficie */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-3">
                                    Superficie Dental
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {TOOTH_SURFACES.map((surface) => (
                                        <button
                                            key={surface}
                                            onClick={() => setSelectedSurface(surface)}
                                            className={cn(
                                                'px-4 py-2 rounded-md text-sm font-medium transition-all capitalize',
                                                selectedSurface === surface
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                                            )}
                                        >
                                            {surface}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selector de tratamiento */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-3">
                                    Tratamiento
                                </label>
                                <select
                                    value={selectedTreatment || ''}
                                    onChange={(e) =>
                                        setSelectedTreatment(e.target.value ? parseInt(e.target.value) : null)
                                    }
                                    className="w-full h-9 bg-[#1a1a1a] border border-white/10 rounded-md px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Sin tratamiento</option>
                                    {catalog.map((treatment) => (
                                        <option key={treatment.id} value={treatment.id}>
                                            {treatment.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Selector de sub-tratamiento */}
                            {selectedTreatment && catalogItems.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-3">
                                        Sub-tratamiento
                                    </label>
                                    <select
                                        value={selectedTreatmentItem || ''}
                                        onChange={(e) =>
                                            setSelectedTreatmentItem(
                                                e.target.value ? parseInt(e.target.value) : null
                                            )
                                        }
                                        className="w-full h-9 bg-[#1a1a1a] border border-white/10 rounded-md px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {catalogItems.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name} (${item.default_cost})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Campo de Costo Personalizado */}
                            {selectedTreatment && selectedTreatmentItem && (
                                <div>
                                    <label className="block text-sm font-medium text-white/70 mb-3">
                                        Costo del Tratamiento
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
                                        <input
                                            type="number"
                                            value={customCost}
                                            onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
                                            min="0"
                                            step="0.01"
                                            className="w-full h-9 pl-7 pr-3 bg-[#1a1a1a] border border-white/10 rounded-md text-sm text-white focus:outline-none focus:border-blue-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <p className="text-xs text-white/40 mt-1.5">Modifica el costo según sea necesario</p>
                                </div>
                            )}

                            {/* Crear registro de tratamiento */}
                            {selectedTreatment && selectedTreatmentItem && (
                                <>
                                    <div className="lg:col-span-2 flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                        <input
                                            type="checkbox"
                                            id="createTreatment"
                                            checked={createTreatmentRecord}
                                            onChange={(e) => setCreateTreatmentRecord(e.target.checked)}
                                            className="w-4 h-4 rounded border-white/20"
                                        />
                                        <label htmlFor="createTreatment" className="text-sm text-white/90">
                                            Crear registro de tratamiento automáticamente
                                        </label>
                                    </div>

                                    {/* Estado del tratamiento */}
                                    {createTreatmentRecord && (
                                        <div className="lg:col-span-2">
                                            <label className="block text-sm font-medium text-white/70 mb-3">
                                                Estado del Tratamiento
                                            </label>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <button
                                                    onClick={() => setTreatmentStatus('Pending')}
                                                    className={cn(
                                                        'flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all',
                                                        treatmentStatus === 'Pending'
                                                            ? 'bg-yellow-600 text-white'
                                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                    )}
                                                >
                                                    <Clock className="w-3.5 h-3.5" />
                                                    Por Hacer
                                                </button>
                                                <button
                                                    onClick={() => setTreatmentStatus('InProgress')}
                                                    className={cn(
                                                        'flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all',
                                                        treatmentStatus === 'InProgress'
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                    )}
                                                >
                                                    <Loader2 className="w-3.5 h-3.5" />
                                                    En Proceso
                                                </button>
                                                <button
                                                    onClick={() => setTreatmentStatus('Completed')}
                                                    className={cn(
                                                        'flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all',
                                                        treatmentStatus === 'Completed'
                                                            ? 'bg-green-600 text-white'
                                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                    )}
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Finalizado
                                                </button>
                                                <button
                                                    onClick={() => setTreatmentStatus('Cancelled')}
                                                    className={cn(
                                                        'flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-all',
                                                        treatmentStatus === 'Cancelled'
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                                                    )}
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Cancelado
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Notas */}
                            <div className="lg:col-span-2">
                                <label className="block text-sm font-medium text-white/70 mb-3">
                                    Observaciones
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                                    placeholder="Detalles adicionales..."
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={handleAddTreatment}
                                disabled={!selectedTreatment || !selectedTreatmentItem}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed rounded-md transition-colors text-sm font-medium"
                            >
                                <Save className="w-4 h-4" />
                                Añadir Tratamiento
                            </button>
                            <button
                                onClick={() => {
                                    setSelectedTooth(null);
                                    setSelectedSurface(null);
                                }}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                        </div>

                        {/* Lista de tratamientos activos en la superficie seleccionada */}
                        {selectedSurface && surfaceTreatments.length > 0 && (
                            <div className="border-t border-white/5 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-white/90">
                                        Tratamientos Activos - {selectedSurface}
                                    </h4>
                                    <button
                                        onClick={loadSurfaceHistoryData}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-xs"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Ver Historial
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {surfaceTreatments.map((treatment) => {
                                        const catalogEntry = catalog.find((c) => c.id === treatment.treatment_catalog_id);
                                        const itemEntry = catalogItems.find((i) => i.id === treatment.treatment_catalog_item_id);

                                        return (
                                            <div
                                                key={treatment.id}
                                                className="flex items-center justify-between p-3 bg-white/5 rounded-md border border-white/5 hover:bg-white/10 transition-colors"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: catalogEntry?.color || '#4ade80' }}
                                                        />
                                                        <span className="text-sm font-medium text-white">
                                                            {itemEntry?.name || catalogEntry?.name || 'Sin nombre'}
                                                        </span>
                                                    </div>
                                                    {treatment.notes && (
                                                        <p className="text-xs text-white/50 mt-1 ml-5">{treatment.notes}</p>
                                                    )}
                                                    <p className="text-xs text-white/40 mt-1 ml-5">
                                                        Fecha: {new Date(treatment.applied_date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeactivateTreatment(treatment.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded-md transition-colors group"
                                                    title="Desactivar tratamiento"
                                                >
                                                    <Trash2 className="w-4 h-4 text-white/40 group-hover:text-red-400" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Historial de la superficie */}
                        {showHistory && surfaceHistory.length > 0 && (
                            <div className="border-t border-white/5 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-semibold text-white/90">
                                        Historial - {selectedSurface}
                                    </h4>
                                    <button
                                        onClick={() => setShowHistory(false)}
                                        className="p-1.5 hover:bg-white/5 rounded-md transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                    {surfaceHistory.map((entry) => {
                                        const catalogEntry = catalog.find((c) => c.id === entry.treatment_catalog_id);
                                        const itemEntry = catalogItems.find((i) => i.id === entry.treatment_catalog_item_id);

                                        const actionColors = {
                                            created: 'text-green-400',
                                            updated: 'text-blue-400',
                                            deactivated: 'text-red-400',
                                        };

                                        return (
                                            <div
                                                key={entry.id}
                                                className="p-3 bg-white/5 rounded-md border border-white/5"
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-xs font-semibold uppercase ${actionColors[entry.action as keyof typeof actionColors] || 'text-white/60'}`}>
                                                                {entry.action}
                                                            </span>
                                                            <span className="text-xs text-white/40">
                                                                {new Date(entry.recorded_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <div className="text-sm text-white mt-1">
                                                            {itemEntry?.name || catalogEntry?.name || entry.condition}
                                                        </div>
                                                        {entry.notes && (
                                                            <p className="text-xs text-white/50 mt-1">{entry.notes}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tratamientos Generales / Independientes */}
            <IndependentTreatments patientId={patientId} onRefresh={loadData} />
        </div>
    );
}

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}
