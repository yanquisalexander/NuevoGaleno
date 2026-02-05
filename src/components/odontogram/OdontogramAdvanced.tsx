import { useState, useEffect } from 'react';
import {
    OdontogramSurface,
    getOdontogramSurfacesByPatient,
    updateToothSurface,
} from '../../hooks/useOdontogram';
import {
    TreatmentCatalogEntry,
    TreatmentCatalogItem,
    getAllTreatmentCatalog,
    getTreatmentCatalogItems,
} from '../../hooks/useTreatmentCatalog';
import { createTreatment } from '../../hooks/useTreatments';
import { motion, AnimatePresence } from 'motion/react';
import { Baby, User as UserIcon, Save, X, CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

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

// Caras del diente
const TOOTH_SURFACES = ['mesial', 'distal', 'vestibular', 'palatina', 'oclusal'] as const;
type Surface = typeof TOOTH_SURFACES[number];

export function OdontogramAdvanced({ patientId }: OdontogramProps) {
    const [surfaces, setSurfaces] = useState<OdontogramSurface[]>([]);
    const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
    const [selectedSurface, setSelectedSurface] = useState<Surface | null>(null);
    const [isPermanent, setIsPermanent] = useState(true);
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

    const TEETH = isPermanent ? TEETH_FDI_PERMANENT : TEETH_FDI_DECIDUOUS;

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

        const surface = surfaces.find(
            (s) => s.tooth_number === selectedTooth.toString() && s.surface === selectedSurface
        );

        if (surface) {
            setSelectedTreatment(surface.treatment_catalog_id || null);
            setSelectedTreatmentItem(surface.treatment_catalog_item_id || null);
            setNotes(surface.notes || '');
        } else {
            setSelectedTreatment(null);
            setSelectedTreatmentItem(null);
            setNotes('');
        }
    };

    const getSurfaceData = (toothNumber: number, surface: Surface): OdontogramSurface | null => {
        return surfaces.find(
            (s) => s.tooth_number === toothNumber.toString() && s.surface === surface
        ) || null;
    };

    const getSurfaceColor = (toothNumber: number, surface: Surface): string => {
        const surfaceData = getSurfaceData(toothNumber, surface);
        if (!surfaceData) return '#4b5563';

        if (surfaceData.treatment_catalog_id) {
            const treatment = catalog.find((t) => t.id === surfaceData.treatment_catalog_id);
            if (treatment?.color) return treatment.color;

            if (surfaceData.treatment_catalog_item_id) {
                const item = catalogItems.find((i) => i.id === surfaceData.treatment_catalog_item_id);
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

    const handleSaveSurface = async () => {
        if (!selectedTooth || !selectedSurface) return;

        try {
            // Crear tratamiento si se seleccionó uno y está habilitado
            let treatmentId: number | undefined;
            if (createTreatmentRecord && selectedTreatment && selectedTreatmentItem) {
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

            // Actualizar superficie del odontograma
            await updateToothSurface({
                patient_id: patientId,
                tooth_number: selectedTooth.toString(),
                surface: selectedSurface,
                treatment_catalog_id: selectedTreatment || undefined,
                treatment_catalog_item_id: selectedTreatmentItem || undefined,
                condition: selectedTreatment ? 'treatment' : 'healthy',
                notes: notes || undefined,
            });

            await loadData();
            toast.success('Odontograma actualizado');

            // Reset form
            setSelectedTooth(null);
            setSelectedSurface(null);
        } catch (error) {
            console.error('Error guardando:', error);
            toast.error('Error al guardar');
        }
    };

    const renderTooth = (toothNumber: number) => {
        const isSelected = selectedTooth === toothNumber;

        return (
            <div key={toothNumber} className="relative flex flex-col items-center gap-1">
                {/* Tooth number label */}
                <span className="text-[9px] text-white/40 font-mono">{toothNumber}</span>

                {/* Tooth visualization with surfaces */}
                <div
                    className={cn(
                        'relative w-11 h-16 rounded-[3px] transition-all overflow-hidden',
                        isSelected && 'ring-2 ring-blue-400 ring-offset-2 ring-offset-[#202020] shadow-lg'
                    )}
                    style={{ backgroundColor: '#2a2a2a' }}
                >
                    {/* Oclusal surface (top) - clickeable */}
                    <motion.button
                        whileHover={{ opacity: 0.8 }}
                        onClick={(e) => handleSurfaceClick(e, toothNumber, 'oclusal')}
                        className={cn(
                            'absolute top-0 left-0 right-0 h-1/5 border-b border-black/20 transition-all',
                            selectedTooth === toothNumber && selectedSurface === 'oclusal' && 'ring-1 ring-white ring-inset'
                        )}
                        style={{ backgroundColor: getSurfaceColor(toothNumber, 'oclusal') }}
                    />

                    {/* Middle row: Mesial | Center | Distal */}
                    <div className="absolute top-1/5 left-0 right-0 bottom-1/5 flex">
                        {/* Mesial - clickeable */}
                        <motion.button
                            whileHover={{ opacity: 0.8 }}
                            onClick={(e) => handleSurfaceClick(e, toothNumber, 'mesial')}
                            className={cn(
                                'w-1/3 border-r border-black/20 transition-all',
                                selectedTooth === toothNumber && selectedSurface === 'mesial' && 'ring-1 ring-white ring-inset'
                            )}
                            style={{ backgroundColor: getSurfaceColor(toothNumber, 'mesial') }}
                        />
                        {/* Center - number display */}
                        <div className="w-1/3 flex items-center justify-center bg-[#1a1a1a]">
                            <span className="text-[9px] font-semibold text-white/30">
                                {toothNumber}
                            </span>
                        </div>
                        {/* Distal - clickeable */}
                        <motion.button
                            whileHover={{ opacity: 0.8 }}
                            onClick={(e) => handleSurfaceClick(e, toothNumber, 'distal')}
                            className={cn(
                                'w-1/3 border-l border-black/20 transition-all',
                                selectedTooth === toothNumber && selectedSurface === 'distal' && 'ring-1 ring-white ring-inset'
                            )}
                            style={{ backgroundColor: getSurfaceColor(toothNumber, 'distal') }}
                        />
                    </div>

                    {/* Vestibular/Palatina surface (bottom) - clickeable */}
                    <motion.button
                        whileHover={{ opacity: 0.8 }}
                        onClick={(e) => handleSurfaceClick(e, toothNumber, 'vestibular')}
                        className={cn(
                            'absolute bottom-0 left-0 right-0 h-1/5 border-t border-black/20 transition-all',
                            selectedTooth === toothNumber && selectedSurface === 'vestibular' && 'ring-1 ring-white ring-inset'
                        )}
                        style={{ backgroundColor: getSurfaceColor(toothNumber, 'vestibular') }}
                    />
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
            {/* Toggle dentición */}
            <div className="flex items-center justify-center gap-4 p-4 bg-[#272727] rounded-lg border border-white/5">
                <button
                    onClick={() => setIsPermanent(true)}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                        isPermanent
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                >
                    <UserIcon className="w-4 h-4" />
                    Dentición Permanente
                </button>
                <button
                    onClick={() => setIsPermanent(false)}
                    className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                        !isPermanent
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                    )}
                >
                    <Baby className="w-4 h-4" />
                    Dentición Decidua (Niños)
                </button>
            </div>

            {/* Odontograma */}
            <div className="flex flex-col items-center gap-8 py-6 bg-[#202020] rounded-lg border border-white/5">
                {/* Arcada Superior */}
                <div className="w-full px-6">
                    <div className="text-xs text-white/40 mb-4 text-center uppercase tracking-widest font-semibold">
                        Arcada Superior
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {TEETH.upper.map(renderTooth)}
                    </div>
                </div>

                {/* Separator */}
                <div className="w-40 h-px bg-white/10" />

                {/* Arcada Inferior */}
                <div className="w-full px-6">
                    <div className="text-xs text-white/40 mb-4 text-center uppercase tracking-widest font-semibold">
                        Arcada Inferior
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                        {TEETH.lower.map(renderTooth)}
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
                            <h3 className="text-lg font-semibold">
                                Pieza Dental {selectedTooth}
                            </h3>
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
                                onClick={handleSaveSurface}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium"
                            >
                                <Save className="w-4 h-4" />
                                Guardar
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
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function cn(...classes: (string | boolean | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}
