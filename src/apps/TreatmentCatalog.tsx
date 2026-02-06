import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, FolderOpen, Save, X, List, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
    TreatmentCatalogEntry,
    TreatmentCatalogItem,
    getAllTreatmentCatalog,
    getTreatmentCatalogItems,
    createTreatmentCatalog,
    updateTreatmentCatalog,
    deleteTreatmentCatalog,
    createTreatmentCatalogItem,
    updateTreatmentCatalogItem,
    deleteTreatmentCatalogItem,
} from '../hooks/useTreatmentCatalog';
import { useAppMenuBar } from '../hooks/useAppMenuBar';
import type { WindowId } from '../types/window-manager';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EmojiPicker } from '@/components/ui/EmojiPicker';

export function TreatmentCatalogApp({ windowId }: { windowId: WindowId }) {
    const [catalog, setCatalog] = useState<TreatmentCatalogEntry[]>([]);
    const [selectedTreatment, setSelectedTreatment] = useState<TreatmentCatalogEntry | null>(null);
    const [items, setItems] = useState<TreatmentCatalogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingTreatment, setEditingTreatment] = useState<TreatmentCatalogEntry | null>(null);
    const [editingItem, setEditingItem] = useState<TreatmentCatalogItem | null>(null);
    const [isCreatingTreatment, setIsCreatingTreatment] = useState(false);
    const [isCreatingItem, setIsCreatingItem] = useState(false);

    useAppMenuBar({
        windowId,
        config: {
            appName: 'Catálogo de Tratamientos',
            menus: [
                {
                    id: 'file',
                    label: 'Archivo',
                    items: [
                        {
                            id: 'refresh',
                            label: 'Actualizar',
                            type: 'item',
                            shortcut: '⌘R',
                            action: () => {
                                loadCatalog();
                                toast.success('Catálogo actualizado');
                            },
                        },
                    ],
                },
                {
                    id: 'edit',
                    label: 'Edición',
                    items: [
                        {
                            id: 'new-treatment',
                            label: 'Nuevo Tratamiento',
                            type: 'item',
                            shortcut: '⌘N',
                            action: () => setIsCreatingTreatment(true),
                        },
                        {
                            id: 'new-item',
                            label: 'Nuevo Sub-tratamiento',
                            type: 'item',
                            shortcut: '⌘⇧N',
                            action: () => {
                                if (selectedTreatment) {
                                    setIsCreatingItem(true);
                                } else {
                                    toast.info('Seleccione un tratamiento primero');
                                }
                            },
                        },
                    ],
                },
            ],
        },
        deps: [selectedTreatment],
    });

    useEffect(() => {
        loadCatalog();
    }, []);

    useEffect(() => {
        if (selectedTreatment) {
            loadItems(selectedTreatment.id);
        } else {
            setItems([]);
        }
    }, [selectedTreatment]);

    const loadCatalog = async () => {
        setIsLoading(true);
        try {
            const data = await getAllTreatmentCatalog();
            setCatalog(data);
        } catch (error) {
            console.error('Error cargando catálogo:', error);
            toast.error('Error al cargar el catálogo');
        } finally {
            setIsLoading(false);
        }
    };

    const loadItems = async (treatmentId: number) => {
        try {
            const data = await getTreatmentCatalogItems(treatmentId);
            setItems(data);
        } catch (error) {
            console.error('Error cargando items:', error);
            toast.error('Error al cargar sub-tratamientos');
        }
    };

    const handleSaveTreatment = async (data: any) => {
        try {
            if (data.id) {
                await updateTreatmentCatalog(data);
                toast.success('Tratamiento actualizado');
            } else {
                await createTreatmentCatalog(data);
                toast.success('Tratamiento creado');
            }
            await loadCatalog();
            setEditingTreatment(null);
            setIsCreatingTreatment(false);
        } catch (error) {
            console.error('Error guardando tratamiento:', error);
            toast.error('Error al guardar');
        }
    };

    const handleDeleteTreatment = async (id: number) => {
        if (!confirm('¿Eliminar este tratamiento?')) return;
        try {
            await deleteTreatmentCatalog(id);
            toast.success('Tratamiento eliminado');
            if (selectedTreatment?.id === id) {
                setSelectedTreatment(null);
            }
            await loadCatalog();
        } catch (error) {
            console.error('Error eliminando:', error);
            toast.error('Error al eliminar');
        }
    };

    const handleSaveItem = async (data: any) => {
        try {
            if (data.id) {
                await updateTreatmentCatalogItem(data);
                toast.success('Sub-tratamiento actualizado');
            } else {
                await createTreatmentCatalogItem({
                    ...data,
                    treatment_catalog_id: selectedTreatment!.id,
                });
                toast.success('Sub-tratamiento creado');
            }
            if (selectedTreatment) {
                await loadItems(selectedTreatment.id);
            }
            setEditingItem(null);
            setIsCreatingItem(false);
        } catch (error) {
            console.error('Error guardando item:', error);
            toast.error('Error al guardar');
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!confirm('¿Eliminar este sub-tratamiento?')) return;
        try {
            await deleteTreatmentCatalogItem(id);
            toast.success('Sub-tratamiento eliminado');
            if (selectedTreatment) {
                await loadItems(selectedTreatment.id);
            }
        } catch (error) {
            console.error('Error eliminando:', error);
            toast.error('Error al eliminar');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full bg-[#1c1c1c]">
                <div className="w-8 h-8 border-[3px] border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex bg-[#1c1c1c] text-white overflow-hidden">
            {/* Sidebar - Lista de Tratamientos */}
            <div className="w-72 bg-[#202020]/50 backdrop-blur-xl border-r border-white/[0.06] flex flex-col">
                <div className="p-4 flex items-center justify-between">
                    <h2 className="text-[13px] font-semibold text-white/70 uppercase tracking-wider px-1">
                        Tratamientos
                    </h2>
                    <button
                        onClick={() => setIsCreatingTreatment(true)}
                        className="p-1.5 hover:bg-white/10 rounded-md transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4 text-blue-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5 custom-scrollbar">
                    {catalog.map((treatment) => (
                        <button
                            key={treatment.id}
                            onClick={() => setSelectedTreatment(treatment)}
                            className={cn(
                                'w-full px-3 py-2.5 text-left rounded-md transition-all group relative',
                                selectedTreatment?.id === treatment.id
                                    ? 'bg-white/10 shadow-sm'
                                    : 'hover:bg-white/5'
                            )}
                        >
                            {selectedTreatment?.id === treatment.id && (
                                <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-full" />
                            )}
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{ backgroundColor: treatment.color || '#3b82f6' }}
                                        />
                                        <p className="font-medium text-[13.5px] truncate text-white/90">
                                            {treatment.name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[11px] text-white/40 truncate bg-white/5 px-1.5 rounded">
                                            {treatment.category || 'General'}
                                        </span>
                                        <span className="text-[11px] text-blue-400/80 font-mono">
                                            ${treatment.default_cost.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTreatment(treatment);
                                        }}
                                        className="p-1.5 hover:bg-white/10 rounded-md text-white/60 hover:text-white"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - Sub-tratamientos */}
            <div className="flex-1 flex flex-col bg-[#1c1c1c]">
                {selectedTreatment ? (
                    <>
                        <div className="px-8 py-6 border-b border-white/[0.04] bg-[#202020]/30">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-2xl font-semibold tracking-tight">
                                            {selectedTreatment.name}
                                        </h1>
                                        <button
                                            onClick={() => handleDeleteTreatment(selectedTreatment.id)}
                                            className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <p className="text-[13px] text-white/50 mt-1 max-w-2xl leading-relaxed">
                                        {selectedTreatment.description || 'Sin descripción disponible para este tratamiento principal.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsCreatingItem(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-lg shadow-blue-600/20 text-[13px] font-medium active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Nuevo Sub-tratamiento
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 max-w-6xl">
                                {items.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-[#2b2b2b]/40 border border-white/[0.05] rounded-xl p-4 hover:bg-[#2b2b2b]/60 hover:border-white/[0.1] transition-all group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-1.5 h-4 rounded-full"
                                                        style={{ backgroundColor: item.color || selectedTreatment.color }}
                                                    />
                                                    <h3 className="font-medium text-[15px]">{item.name}</h3>
                                                </div>
                                                <p className="text-[13px] text-white/50 mt-2 line-clamp-2 min-h-[40px]">
                                                    {item.description || 'Sin descripción.'}
                                                </p>
                                                <div className="flex items-center gap-4 mt-4">
                                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-md border border-green-500/20">
                                                        <DollarSign className="w-3.5 h-3.5 text-green-400" />
                                                        <span className="text-[13px] font-bold text-green-400">
                                                            {item.default_cost.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <span className="text-[11px] text-white/30 uppercase tracking-widest font-bold">
                                                        ID: {item.id}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setEditingItem(item)}
                                                    className="p-2 hover:bg-white/10 rounded-md text-white/60 hover:text-white transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="p-2 hover:bg-red-500/10 rounded-md text-white/30 hover:text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {items.length === 0 && (
                                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/[0.03] rounded-2xl">
                                        <List className="w-12 h-12 mb-4" />
                                        <p className="text-lg font-medium">No hay sub-tratamientos</p>
                                        <p className="text-sm">Agregue configuraciones específicas para este catálogo</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-white/20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/[0.02] to-transparent">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/[0.05]">
                                <FolderOpen className="w-10 h-10 opacity-40" />
                            </div>
                            <p className="text-xl font-medium text-white/40">Seleccione un tratamiento</p>
                            <p className="text-sm mt-2">Elija una categoría del panel izquierdo para comenzar</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <AnimatePresence>
                {(isCreatingTreatment || editingTreatment) && (
                    <TreatmentFormDialog
                        treatment={editingTreatment}
                        onSave={handleSaveTreatment}
                        onClose={() => {
                            setIsCreatingTreatment(false);
                            setEditingTreatment(null);
                        }}
                    />
                )}

                {(isCreatingItem || editingItem) && selectedTreatment && (
                    <ItemFormDialog
                        item={editingItem}
                        onSave={handleSaveItem}
                        onClose={() => {
                            setIsCreatingItem(false);
                            setEditingItem(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

// =============================================================================
// Estilo de Inputs Fluent
// =============================================================================
const fluentInputClass = "w-full bg-[#1a1a1a] border-b border-white/20 hover:border-white/40 border-t-0 border-x-0 rounded-t-md px-3 py-2 text-[13px] focus:outline-none focus:border-blue-500 focus:bg-[#252525] transition-all";

function TreatmentFormDialog({
    treatment,
    onSave,
    onClose,
}: {
    treatment: TreatmentCatalogEntry | null;
    onSave: (data: any) => void;
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        id: treatment?.id || 0,
        name: treatment?.name || '',
        description: treatment?.description || '',
        default_cost: treatment?.default_cost || 0,
        category: treatment?.category || '',
        color: treatment?.color || '#3b82f6',
        icon: treatment?.icon || '',
        show_independently: treatment?.show_independently ?? false,
        is_active: treatment?.is_active ?? true,
    });

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#2c2c2c] border border-white/[0.1] rounded-2xl p-8 max-w-md w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
            >
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-semibold">
                        {treatment ? 'Editar Catálogo' : 'Nuevo Catálogo'}
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md"><X className="w-5 h-5 text-white/50" /></button>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Nombre del Tratamiento</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={fluentInputClass}
                            placeholder="Ej: Ortodoncia"
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Categoría</label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className={fluentInputClass}
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Descripción General</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className={cn(fluentInputClass, "resize-none rounded-md border-x border-t")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Costo Base</label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/30" />
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.default_cost}
                                    onChange={(e) =>
                                        setFormData({ ...formData, default_cost: parseFloat(e.target.value) || 0 })
                                    }
                                    className={cn(fluentInputClass, "pl-8")}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Etiqueta Color</label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-[37px] bg-[#1a1a1a] border-b border-white/20 rounded-t-md cursor-pointer overflow-hidden p-0"
                            />
                        </div>
                    </div>

                    {/* Ícono */}
                    <div>
                        <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Ícono</label>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(true)}
                            className="w-full h-[42px] bg-[#1a1a1a] border-b border-white/20 hover:border-white/40 rounded-t-md px-3 flex items-center justify-between transition-colors group"
                        >
                            <span className="text-[13px] text-white/60 group-hover:text-white/80">
                                {formData.icon ? `Seleccionado: ${formData.icon}` : 'Seleccionar ícono...'}
                            </span>
                            <div className="flex items-center gap-2">
                                {formData.icon && <span className="text-2xl">{formData.icon}</span>}
                                <Smile className="w-4 h-4 text-white/40" />
                            </div>
                        </button>
                    </div>

                    {/* Mostrar Independientemente */}
                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-lg border border-white/10">
                        <div className="flex-1">
                            <label className="block text-[13px] font-medium text-white mb-1">
                                Mostrar de forma independiente
                            </label>
                            <p className="text-xs text-white/50">
                                Este tratamiento se mostrará debajo del odontograma sin pieza asignada
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, show_independently: !formData.show_independently })}
                            className={cn(
                                "relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ml-4",
                                formData.show_independently ? "bg-blue-500" : "bg-white/20"
                            )}
                        >
                            <motion.div
                                className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                                animate={{
                                    left: formData.show_independently ? '26px' : '2px'
                                }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 mt-10">
                    <button
                        onClick={() => onSave(formData)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all font-medium text-[13px] shadow-lg shadow-blue-600/20 active:scale-95"
                    >
                        <Save className="w-4 h-4" />
                        Guardar cambios
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-md transition-all text-[13px] font-medium active:scale-95"
                    >
                        Cancelar
                    </button>
                </div>

                {/* Emoji Picker */}
                <AnimatePresence>
                    {showEmojiPicker && (
                        <EmojiPicker
                            value={formData.icon || ''}
                            onChange={(emoji) => setFormData({ ...formData, icon: emoji })}
                            onClose={() => setShowEmojiPicker(false)}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

function ItemFormDialog({
    item,
    onSave,
    onClose,
}: {
    item: TreatmentCatalogItem | null;
    onSave: (data: any) => void;
    onClose: () => void;
}) {
    const [formData, setFormData] = useState({
        id: item?.id || 0,
        name: item?.name || '',
        description: item?.description || '',
        default_cost: item?.default_cost || 0,
        color: item?.color || '#3b82f6',
        icon: item?.icon || '',
        display_order: item?.display_order || 0,
        is_active: item?.is_active ?? true,
    });

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#2c2c2c] border border-white/[0.1] rounded-2xl p-8 max-w-md w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]"
            >
                <h2 className="text-xl font-semibold mb-8">
                    {item ? 'Editar Sub-tratamiento' : 'Nuevo Sub-tratamiento'}
                </h2>

                <div className="space-y-5">
                    <div>
                        <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={fluentInputClass}
                            placeholder="Ej: Limpieza profunda"
                        />
                    </div>

                    <div>
                        <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Descripción del procedimiento</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            className={cn(fluentInputClass, "resize-none rounded-md border-x border-t")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Precio</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.default_cost}
                                onChange={(e) =>
                                    setFormData({ ...formData, default_cost: parseFloat(e.target.value) || 0 })
                                }
                                className={fluentInputClass}
                            />
                        </div>

                        <div>
                            <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Orden</label>
                            <input
                                type="number"
                                value={formData.display_order}
                                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                                className={fluentInputClass}
                            />
                        </div>
                    </div>

                    {/* Ícono del sub-tratamiento */}
                    <div>
                        <label className="block text-[12px] font-medium text-white/50 mb-1.5 ml-1">Ícono (opcional)</label>
                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker(true)}
                            className="w-full h-[42px] bg-[#1a1a1a] border-b border-white/20 hover:border-white/40 rounded-t-md px-3 flex items-center justify-between transition-colors group"
                        >
                            <span className="text-[13px] text-white/60 group-hover:text-white/80">
                                {formData.icon ? `Seleccionado: ${formData.icon}` : 'Seleccionar ícono...'}
                            </span>
                            <div className="flex items-center gap-2">
                                {formData.icon && <span className="text-2xl">{formData.icon}</span>}
                                <Smile className="w-4 h-4 text-white/40" />
                            </div>
                        </button>
                    </div>
                </div>

                <div className="flex gap-3 mt-10">
                    <button
                        onClick={() => onSave(formData)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all font-medium text-[13px] active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        <Save className="w-4 h-4" />
                        Guardar Sub-tratamiento
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white/5 hover:bg-white/10 rounded-md transition-all text-[13px] font-medium"
                    >
                        Cancelar
                    </button>
                </div>

                {/* Emoji Picker */}
                <AnimatePresence>
                    {showEmojiPicker && (
                        <EmojiPicker
                            value={formData.icon || ''}
                            onChange={(emoji) => setFormData({ ...formData, icon: emoji })}
                            onClose={() => setShowEmojiPicker(false)}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}