import { useState, useEffect } from 'react';
import { Treatment, getTreatmentsByPatient, createTreatment, updateTreatment, updateTreatmentStatus } from '../../hooks/useTreatments';
import { TreatmentForm } from './TreatmentForm';
import { AddGeneralTreatmentDialog } from './AddGeneralTreatmentDialog';
import { Stethoscope, DollarSign, Calendar, Plus, Edit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

interface TreatmentListProps {
    patientId: number;
    onSelectTreatment?: (treatment: Treatment) => void;
}

// Componente StatusSelect fuera para evitar recreaciones
const StatusSelect = ({ current, onChange }: { current: string, onChange: (s: string) => void }) => (
    <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="text-xs bg-white/5 border-white/10 rounded-md h-8 w-[140px] text-white/80">
            <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-[#1e1e1e] border-white/10">
            <SelectItem value="Pending" className="text-yellow-500 focus:bg-yellow-500/10 focus:text-yellow-400">
                Por Hacer
            </SelectItem>
            <SelectItem value="InProgress" className="text-blue-500 focus:bg-blue-500/10 focus:text-blue-400">
                En Proceso
            </SelectItem>
            <SelectItem value="Completed" className="text-green-500 focus:bg-green-500/10 focus:text-green-400">
                Terminado
            </SelectItem>
            <SelectItem value="Cancelled" className="text-red-500 focus:bg-red-500/10 focus:text-red-400">
                Cancelado
            </SelectItem>
        </SelectContent>
    </Select>
);

export function TreatmentList({ patientId, onSelectTreatment }: TreatmentListProps) {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [isLoading, setIsLoading] = useState(true); const [showForm, setShowForm] = useState(false);
    const [showCatalogDialog, setShowCatalogDialog] = useState(false);
    const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
    useEffect(() => {
        loadTreatments();
    }, [patientId]);

    const loadTreatments = async () => {
        setIsLoading(true);
        try {
            const data = await getTreatmentsByPatient(patientId);
            setTreatments(data);
        } catch (error) {
            console.error('Error cargando tratamientos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const handleSave = async (data: any) => {
        try {
            if (selectedTreatment) {
                await updateTreatment(selectedTreatment.id, data);
                toast.success('Tratamiento actualizado');
            } else {
                await createTreatment(data);
                toast.success('Tratamiento creado');
            }
            setShowForm(false);
            setSelectedTreatment(null);
            loadTreatments();
        } catch (error) {
            console.error('Error guardando tratamiento:', error);
            throw error;
        }
    };

    const handleQuickStatusChange = async (treatment: Treatment, newStatus: string) => {
        console.log('Cambiando estado de', treatment.id, 'a', newStatus);
        try {
            // Actualización optimista en la UI
            setTreatments(prev => prev.map(t =>
                t.id === treatment.id ? { ...t, status: newStatus as any } : t
            ));

            // Llamada al backend
            await updateTreatmentStatus(treatment.id, newStatus);
            toast.success('Estado actualizado');
        } catch (error) {
            console.error('Error actualizando estado:', error);
            toast.error('Error al actualizar estado');
            // Revertir cambio optimista
            loadTreatments();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (treatments.length === 0) {
        return (
            <>
                <div className="flex flex-col items-center justify-center py-20 text-white/40">
                    <div className="bg-white/5 p-4 rounded-full mb-4 ring-1 ring-white/10">
                        <Stethoscope className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="text-base font-medium mb-2 text-white/80">No hay tratamientos registrados</p>
                    <p className="text-sm mb-6 text-white/50 max-w-sm text-center">Comienza registrando un nuevo tratamiento para este paciente para llevar un seguimiento detallado.</p>
                    <button
                        onClick={() => setShowCatalogDialog(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#0067c0] hover:bg-[#0074d9] active:bg-[#005a9e] text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all border border-white/10"
                    >
                        <Plus className="w-4 h-4" />
                        Crear Primer Tratamiento
                    </button>
                </div>
                {showForm && (
                    <TreatmentForm
                        patientId={patientId}
                        onSave={handleSave}
                        onCancel={() => setShowForm(false)}
                    />
                )}
            </>
        );
    }

    return (
        <div className="space-y-4 max-w-6xl mx-auto">
            {/* Header Moderno */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex flex-col">
                    <h3 className="text-xl font-semibold text-white/95 tracking-tight">Tratamientos</h3>
                    <div className="flex items-center gap-2 text-xs text-white/50 mt-1">
                        <span className="bg-white/5 px-2 py-0.5 rounded text-white/60">{treatments.length} registros</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowCatalogDialog(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0067c0] hover:bg-[#0074d9] active:bg-[#005a9e] text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/10 transition-all border border-white/10 hover:scale-[1.02] active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Tratamiento
                </button>
            </div>

            {/* Grid de Tarjetas Fluent */}
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {treatments.map((treatment, index) => (
                        <motion.div
                            key={treatment.id}
                            layout
                            initial={{ opacity: 0, y: 10, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2, delay: index * 0.05 }}
                            className="bg-[#202020]/80 backdrop-blur-md border border-white/5 rounded-xl p-5 hover:bg-[#252525] transition-all group shadow-sm hover:shadow-md hover:border-white/10 relative overflow-hidden"
                        >
                            {/* Decorative gradient blob */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                            <div className="flex items-start justify-between relative z-10">
                                <div className="flex-1 min-w-0 pr-4">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="font-semibold text-white/95 text-lg truncate flex items-center gap-2">
                                            {treatment.name}
                                            {treatment.tooth_number && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 tracking-wide uppercase">
                                                    Pieza {treatment.tooth_number}
                                                </span>
                                            )}
                                        </h3>
                                    </div>

                                    {/* Inline Status Changer */}
                                    <div className="flex items-center gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
                                        <StatusSelect
                                            current={treatment.status}
                                            onChange={(val) => {
                                                console.log('🔵 onChange disparado:', val);
                                                handleQuickStatusChange(treatment, val);
                                            }}
                                        />
                                        <div className="h-4 w-px bg-white/10"></div>
                                        {treatment.completion_date && (
                                            <span className="text-xs text-green-400/80 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Finalizado el {new Date(treatment.completion_date).toLocaleDateString('es-AR')}
                                            </span>
                                        )}
                                        {!treatment.completion_date && treatment.start_date && (
                                            <span className="text-xs text-white/40 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Iniciado el {new Date(treatment.start_date).toLocaleDateString('es-AR')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedTreatment(treatment);
                                        setShowForm(true);
                                    }}
                                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors border border-white/5"
                                    title="Editar detalles"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-1 mt-5 bg-black/20 rounded-lg p-1 border border-white/5 max-w-md">
                                <div className="p-3 rounded-md hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase font-bold tracking-wider mb-1">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>Costo</span>
                                    </div>
                                    <div className="text-white/90 font-medium text-base tracking-tight">
                                        {formatCurrency(treatment.total_cost)}
                                    </div>
                                </div>

                                <div className="p-3 rounded-md hover:bg-white/5 transition-colors border-l border-white/5">
                                    <div className="flex items-center gap-2 text-white/40 text-[11px] uppercase font-bold tracking-wider mb-1">
                                        <DollarSign className="w-3.5 h-3.5" />
                                        <span>Saldo</span>
                                    </div>
                                    <div className={`font-medium text-base tracking-tight ${treatment.balance > 0 ? 'text-red-400' : 'text-green-500'}`}>
                                        {formatCurrency(treatment.balance)}
                                    </div>
                                </div>
                            </div>

                            {treatment.notes && (
                                <div className="mt-4 pt-3 border-t border-dashed border-white/10">
                                    <p className="text-xs text-white/50 leading-relaxed line-clamp-2 italic">
                                        "{treatment.notes}"
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Formulario Modal */}
            {showForm && (
                <TreatmentForm
                    treatment={selectedTreatment || undefined}
                    patientId={patientId}
                    onSave={handleSave}
                    onCancel={() => {
                        setShowForm(false);
                        setSelectedTreatment(null);
                    }}
                />
            )}

            {/* Diálogo de Catálogo */}
            <AddGeneralTreatmentDialog
                isOpen={showCatalogDialog}
                onClose={() => setShowCatalogDialog(false)}
                patientId={patientId}
                onSuccess={() => {
                    loadTreatments();
                }}
            />
        </div>
    );
}
