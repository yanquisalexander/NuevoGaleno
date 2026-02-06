import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, Plus } from 'lucide-react';
import { getAllTreatmentCatalog, type TreatmentCatalogEntry } from '@/hooks/useTreatmentCatalog';
import { getTreatmentsByPatient, deleteTreatment, type Treatment } from '@/hooks/useTreatments';
import { AddGeneralTreatmentDialog } from '../treatments/AddGeneralTreatmentDialog';
import { toast } from 'sonner';

interface IndependentTreatmentsProps {
    patientId: number;
    onRefresh?: () => void;
}

export function IndependentTreatments({ patientId, onRefresh }: IndependentTreatmentsProps) {
    const [catalog, setCatalog] = useState<TreatmentCatalogEntry[]>([]);
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);

    useEffect(() => {
        loadData();
    }, [patientId]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [catalogData, treatmentsData] = await Promise.all([
                getAllTreatmentCatalog(),
                getTreatmentsByPatient(patientId),
            ]);

            // Filtrar tratamientos del paciente sin tooth_number o sector
            const generalTreatments = treatmentsData.filter(
                (t) => (!t.tooth_number || t.tooth_number === '') && (!t.sector || t.sector === '')
            );
            setTreatments(generalTreatments);

            // Solo mantener los tratamientos del catálogo que el paciente realmente tiene
            const patientCatalogIds = new Set(
                generalTreatments
                    .map(t => {
                        // Buscar en el catálogo por nombre del tratamiento
                        return catalogData.find(c => c.show_independently && t.name?.includes(c.name));
                    })
                    .filter(Boolean)
                    .map(c => c!.id)
            );

            const activeCatalog = catalogData.filter(c => patientCatalogIds.has(c.id));
            setCatalog(activeCatalog);
        } catch (error) {
            console.error('Error cargando tratamientos independientes:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este tratamiento?')) return;

        try {
            await deleteTreatment(id);
            await loadData();
            onRefresh?.();
            toast.success('Tratamiento eliminado');
        } catch (error) {
            console.error('Error eliminando tratamiento:', error);
            toast.error('Error al eliminar');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (catalog.length === 0) {
        return null; // No mostrar nada si no hay tratamientos activos
    }

    return (
        <>
            <div className="mt-8 px-4">
                <div className="flex items-start gap-4">
                    {/* Título */}
                    <div className="flex-shrink-0">
                        <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2">
                            Tratamientos Generales
                        </h4>
                    </div>

                    {/* Lista horizontal compacta */}
                    <div className="flex flex-wrap gap-2">
                        {catalog.map((catalogItem) => {
                            const patientTreatments = treatments.filter(
                                (t) => t.name?.includes(catalogItem.name)
                            );

                            return (
                                <motion.div
                                    key={catalogItem.id}
                                    layout
                                    className="relative group"
                                >
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#272727] border border-white/5 hover:border-blue-500/30 rounded-lg transition-all">
                                        {/* Ícono */}
                                        {catalogItem.icon ? (
                                            <span className="text-lg">{catalogItem.icon}</span>
                                        ) : (
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                                style={{ backgroundColor: catalogItem.color || '#3b82f6' }}
                                            >
                                                <span className="text-white font-bold text-[8px]">
                                                    {catalogItem.name.substring(0, 2).toUpperCase()}
                                                </span>
                                            </div>
                                        )}

                                        {/* Nombre */}
                                        <span className="text-xs text-white/80 font-medium">
                                            {catalogItem.name}
                                        </span>

                                        {/* Badge de categoría */}
                                        {catalogItem.category && (
                                            <span className="text-[9px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                                                {catalogItem.category}
                                            </span>
                                        )}

                                        {/* Botón eliminar (hover) */}
                                        {patientTreatments.length > 0 && (
                                            <button
                                                onClick={() => handleDelete(patientTreatments[0].id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 hover:bg-red-500/20 rounded"
                                                title="Eliminar tratamiento"
                                            >
                                                <Trash2 className="w-3 h-3 text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}

                        {/* Botón para agregar nuevos tratamientos generales */}
                        <button
                            onClick={() => setShowAddDialog(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 hover:border-blue-500/50 rounded-lg transition-all group"
                            title="Agregar tratamiento general"
                        >
                            <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-300" />
                            <span className="text-[10px] font-medium text-blue-400 group-hover:text-blue-300">
                                Agregar
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Diálogo para agregar tratamiento */}
            <AddGeneralTreatmentDialog
                isOpen={showAddDialog}
                onClose={() => setShowAddDialog(false)}
                patientId={patientId}
                onSuccess={() => {
                    loadData();
                    onRefresh?.();
                }}
            />
        </>
    );
}
