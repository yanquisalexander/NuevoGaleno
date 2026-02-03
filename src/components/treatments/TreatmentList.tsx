import { useState, useEffect } from 'react';
import { Treatment, getTreatmentsByPatient, createTreatment, updateTreatment } from '../../hooks/useTreatments';
import { TreatmentStatusBadge } from './TreatmentStatusBadge';
import { TreatmentForm } from './TreatmentForm';
import { Stethoscope, DollarSign, Calendar, Plus, Edit } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface TreatmentListProps {
    patientId: number;
    onSelectTreatment?: (treatment: Treatment) => void;
}

export function TreatmentList({ patientId, onSelectTreatment }: TreatmentListProps) {
    const [treatments, setTreatments] = useState<Treatment[]>([]);
    const [isLoading, setIsLoading] = useState(true); const [showForm, setShowForm] = useState(false);
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
                    <Stethoscope className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium mb-4">No hay tratamientos registrados</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-6 py-2 bg-[#005FB8] hover:bg-[#1874D0] active:bg-[#00529E] text-white rounded-[4px] font-medium shadow-sm transition-all border border-white/10"
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
        <div className="space-y-4 max-w-5xl">
            {/* Header con botón */}
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-semibold text-white/90">Tratamientos</h3>
                    <span className="text-xs text-white/40">{treatments.length} total</span>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#005FB8] hover:bg-[#1874D0] active:bg-[#00529E] text-white rounded-[4px] text-sm font-medium shadow-sm transition-all border border-white/10"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Tratamiento
                </button>
            </div>

            {/* Lista */}
            <div className="grid grid-cols-1 gap-3">
                {treatments.map((treatment, index) => (
                    <motion.div
                        key={treatment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-[#272727] border border-white/5 rounded-[8px] p-5 hover:border-white/10 transition-all group"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="font-semibold text-white/90 text-[15px]">{treatment.name}</h3>
                                {(treatment.tooth_number) && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-white/5 text-white/60">
                                            Pieza {treatment.tooth_number}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <TreatmentStatusBadge status={treatment.status} size="sm" />
                                <button
                                    onClick={() => {
                                        setSelectedTreatment(treatment);
                                        setShowForm(true);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-[4px] bg-[#323232] hover:bg-[#3d3d3d] text-white/60 hover:text-white transition-colors border border-white/5"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#202020] rounded-[6px] p-3 border border-white/5">
                            <div>
                                <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">
                                    <DollarSign className="w-3 h-3" />
                                    <span>Costo</span>
                                </div>
                                <div className="text-white/90 font-medium text-sm">{formatCurrency(treatment.total_cost)}</div>
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">
                                    <DollarSign className="w-3 h-3" />
                                    <span>Saldo</span>
                                </div>
                                <div className={`font-medium text-sm ${treatment.balance > 0 ? 'text-red-400' : 'text-green-500'}`}>
                                    {formatCurrency(treatment.balance)}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Inicio</span>
                                </div>
                                <div className="text-white/70 text-sm">
                                    {treatment.start_date ? new Date(treatment.start_date).toLocaleDateString('es-AR') : '-'}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-wider mb-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>Estado</span>
                                </div>
                                <div className="text-white/70 text-sm">
                                    {treatment.completion_date ? new Date(treatment.completion_date).toLocaleDateString('es-AR') : 'En curso'}
                                </div>
                            </div>
                        </div>

                        {treatment.notes && (
                            <div className="mt-3 pt-3 border-t border-white/5">
                                <p className="text-xs text-white/50 line-clamp-2">
                                    {treatment.notes}
                                </p>
                            </div>
                        )}
                    </motion.div>
                ))}
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
        </div>
    );
}
