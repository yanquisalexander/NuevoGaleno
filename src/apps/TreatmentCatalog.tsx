import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, FolderOpen, Save, X, List } from 'lucide-react';
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
            <div className="flex items-center justify-center h-full bg-[#202020]">
                <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full flex bg-[#202020] text-white">
            {/* Sidebar - Lista de Tratamientos */}
            <div className="w-80 bg-[#1a1a1a] border-r border-white/5 flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-semibold text-white/90 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        Tratamientos
                    </h2>
                    <button
                        onClick={() => setIsCreatingTreatment(true)}
                        className="p-1.5 hover:bg-white/5 rounded-md transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {catalog.map((treatment) => (
                        <button
                            key={treatment.id}
                            onClick={() => setSelectedTreatment(treatment)}
                            className={cn(
                                'w-full px-4 py-3 text-left hover:bg-white/5 border-b border-white/5 transition-colors',
                                selectedTreatment?.id === treatment.id && 'bg-white/10'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {treatment.color && (
                                            <div
                                                className="w-3 h-3 rounded-full shrink-0"
                                                style={{ backgroundColor: treatment.color }}
                                            />
                                        )}
                                        <p className="font-medium text-sm truncate">{treatment.name}</p>
                                    </div>
                                    {treatment.category && (
                                        <p className="text-xs text-white/50 mt-1">{treatment.category}</p>
                                    )}
                                    <p className="text-xs text-white/60 mt-1">
                                        ${treatment.default_cost.toFixed(2)}
                                    </p>
                                </div>
                                <div className="flex gap-1 ml-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingTreatment(treatment);
                                        }}
                                        className="p-1 hover:bg-white/10 rounded"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTreatment(treatment.id);
                                        }}
                                        className="p-1 hover:bg-red-500/20 rounded text-red-400"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content - Sub-tratamientos */}
            <div className="flex-1 flex flex-col">
                {selectedTreatment ? (
                    <>
                        <div className="p-6 border-b border-white/5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h1 className="text-xl font-bold">{selectedTreatment.name}</h1>
                                    {selectedTreatment.description && (
                                        <p className="text-sm text-white/60 mt-1">
                                            {selectedTreatment.description}
                                        </p>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsCreatingItem(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-4 h-4" />
                                    Agregar Sub-tratamiento
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            <div className="grid gap-4 max-w-4xl">
                                {items.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-[#272727] border border-white/5 rounded-lg p-4 hover:border-white/10 transition-colors"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    {item.color && (
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: item.color }}
                                                        />
                                                    )}
                                                    <h3 className="font-medium">{item.name}</h3>
                                                </div>
                                                {item.description && (
                                                    <p className="text-sm text-white/60 mt-2">
                                                        {item.description}
                                                    </p>
                                                )}
                                                <div className="flex items-center gap-2 mt-3">
                                                    <DollarSign className="w-4 h-4 text-green-400" />
                                                    <span className="text-sm font-medium text-green-400">
                                                        ${item.default_cost.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <button
                                                    onClick={() => setEditingItem(item)}
                                                    className="p-2 hover:bg-white/5 rounded transition-colors"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}

                                {items.length === 0 && (
                                    <div className="text-center py-12 text-white/40">
                                        <List className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No hay sub-tratamientos registrados</p>
                                        <p className="text-sm mt-2">Agregue uno usando el botón superior</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-white/40">
                        <div className="text-center">
                            <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">Seleccione un tratamiento</p>
                            <p className="text-sm mt-2">o cree uno nuevo desde el menú lateral</p>
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
// Form Dialogs
// =============================================================================

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
        color: treatment?.color || '#10b981',
        is_active: treatment?.is_active ?? true,
    });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#272727] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
                <h2 className="text-lg font-bold mb-6">
                    {treatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Categoría</label>
                        <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Costo</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.default_cost}
                                onChange={(e) =>
                                    setFormData({ ...formData, default_cost: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Color</label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-9 bg-[#1a1a1a] border border-white/10 rounded-md cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => onSave(formData)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium"
                    >
                        <Save className="w-4 h-4" />
                        Guardar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-sm font-medium"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
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
        color: item?.color || '#10b981',
        display_order: item?.display_order || 0,
        is_active: item?.is_active ?? true,
    });

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#272727] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl"
            >
                <h2 className="text-lg font-bold mb-6">
                    {item ? 'Editar Sub-tratamiento' : 'Nuevo Sub-tratamiento'}
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Nombre</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Descripción</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={2}
                            className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Costo</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.default_cost}
                                onChange={(e) =>
                                    setFormData({ ...formData, default_cost: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/70 mb-2">Color</label>
                            <input
                                type="color"
                                value={formData.color}
                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                className="w-full h-9 bg-[#1a1a1a] border border-white/10 rounded-md cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={() => onSave(formData)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors text-sm font-medium"
                    >
                        <Save className="w-4 h-4" />
                        Guardar
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-sm font-medium"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
