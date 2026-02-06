import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, DollarSign, Save } from 'lucide-react';
import {
    getAllTreatmentCatalog,
    getTreatmentCatalogItems,
    type TreatmentCatalogEntry,
    type TreatmentCatalogItem,
} from '@/hooks/useTreatmentCatalog';
import { createTreatment } from '@/hooks/useTreatments';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AddGeneralTreatmentDialogProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: number;
    onSuccess?: () => void;
}

export function AddGeneralTreatmentDialog({
    isOpen,
    onClose,
    patientId,
    onSuccess,
}: AddGeneralTreatmentDialogProps) {
    const [catalog, setCatalog] = useState<TreatmentCatalogEntry[]>([]);
    const [catalogItems, setCatalogItems] = useState<TreatmentCatalogItem[]>([]);
    const [selectedTreatment, setSelectedTreatment] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<number | null>(null);
    const [customCost, setCustomCost] = useState<number>(0);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadCatalog();
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedTreatment) {
            loadItems(selectedTreatment);
        } else {
            setCatalogItems([]);
            setSelectedItem(null);
            setCustomCost(0);
        }
    }, [selectedTreatment]);

    useEffect(() => {
        if (selectedItem) {
            const item = catalogItems.find((i) => i.id === selectedItem);
            if (item) {
                setCustomCost(item.default_cost);
            }
        } else if (selectedTreatment) {
            const treatment = catalog.find((t) => t.id === selectedTreatment);
            if (treatment) {
                setCustomCost(treatment.default_cost);
            }
        }
    }, [selectedItem, selectedTreatment, catalogItems, catalog]);

    const loadCatalog = async () => {
        try {
            const data = await getAllTreatmentCatalog();
            // Priorizar los que son independientes
            const sorted = data.sort((a, b) => {
                if (a.show_independently && !b.show_independently) return -1;
                if (!a.show_independently && b.show_independently) return 1;
                return 0;
            });
            setCatalog(sorted);
        } catch (error) {
            console.error('Error cargando catálogo:', error);
            toast.error('Error al cargar el catálogo');
        }
    };

    const loadItems = async (treatmentId: number) => {
        try {
            const items = await getTreatmentCatalogItems(treatmentId);
            setCatalogItems(items);
        } catch (error) {
            console.error('Error cargando items:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedTreatment) {
            toast.error('Seleccione un tratamiento');
            return;
        }

        setIsLoading(true);
        try {
            const treatment = catalog.find((t) => t.id === selectedTreatment);
            const item = catalogItems.find((i) => i.id === selectedItem);

            const name = item ? `${treatment?.name} - ${item.name}` : treatment?.name || 'Tratamiento';

            await createTreatment({
                patient_id: patientId,
                name,
                tooth_number: '', // Sin pieza dental
                sector: '', // Sin sector
                total_cost: customCost,
                notes: notes || `${treatment?.name}${item ? ` - ${item.name}` : ''}`,
            });

            toast.success('Tratamiento agregado');
            onSuccess?.();
            handleClose();
        } catch (error) {
            console.error('Error creando tratamiento:', error);
            toast.error('Error al crear el tratamiento');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedTreatment(null);
        setSelectedItem(null);
        setCustomCost(0);
        setNotes('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
                onClick={handleClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-[#2c2c2c] border border-white/[0.1] rounded-2xl max-w-3xl w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] max-h-[90vh] flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Nuevo Tratamiento General</h2>
                            <p className="text-sm text-white/50 mt-1">
                                Selecciona un tratamiento del catálogo para agregarlo rápidamente
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                        >
                            <X className="w-5 h-5 text-white/50" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Catálogo de Tratamientos */}
                        <div>
                            <label className="block text-sm font-semibold text-white/70 mb-3">
                                Seleccionar Tratamiento
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {catalog.map((treatment) => (
                                    <button
                                        key={treatment.id}
                                        onClick={() => setSelectedTreatment(treatment.id)}
                                        className={cn(
                                            'p-4 rounded-xl border transition-all text-left',
                                            selectedTreatment === treatment.id
                                                ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20'
                                                : 'bg-[#1a1a1a] border-white/10 hover:border-white/20 hover:bg-white/5'
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            {treatment.icon ? (
                                                <span className="text-2xl">{treatment.icon}</span>
                                            ) : (
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                                    style={{ backgroundColor: treatment.color || '#3b82f6' }}
                                                >
                                                    <span className="text-white font-bold text-xs">
                                                        {treatment.name.substring(0, 2).toUpperCase()}
                                                    </span>
                                                </div>
                                            )}
                                            {treatment.show_independently && (
                                                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="text-sm font-medium text-white line-clamp-2">
                                            {treatment.name}
                                        </div>
                                        {treatment.category && (
                                            <div className="text-xs text-white/40 mt-1">{treatment.category}</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sub-tratamientos */}
                        {selectedTreatment && catalogItems.length > 0 && (
                            <div>
                                <label className="block text-sm font-semibold text-white/70 mb-3">
                                    Sub-tratamiento (opcional)
                                </label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {catalogItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setSelectedItem(item.id)}
                                            className={cn(
                                                'p-3 rounded-lg border transition-all text-left',
                                                selectedItem === item.id
                                                    ? 'bg-blue-500/10 border-blue-500/30'
                                                    : 'bg-[#1a1a1a] border-white/5 hover:border-white/10'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        {item.icon && <span className="text-lg">{item.icon}</span>}
                                                        <span className="text-sm text-white">{item.name}</span>
                                                    </div>
                                                    {item.description && (
                                                        <p className="text-xs text-white/40 mt-1 line-clamp-1">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-white/60 ml-2">
                                                    ${item.default_cost.toFixed(2)}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Costo y Notas */}
                        {selectedTreatment && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-white/70 mb-2">
                                        Costo
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={customCost}
                                            onChange={(e) => setCustomCost(parseFloat(e.target.value) || 0)}
                                            className="w-full h-11 bg-[#1a1a1a] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-white/70 mb-2">
                                        Notas (opcional)
                                    </label>
                                    <textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Detalles adicionales del tratamiento..."
                                        className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 p-6 border-t border-white/5">
                        <button
                            onClick={handleClose}
                            className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!selectedTreatment || isLoading}
                            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Agregar Tratamiento
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
