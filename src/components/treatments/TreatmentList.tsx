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
                <div className="flex flex-col items-center justify-center py-12 text-white/60">
                    <Stethoscope className="w-16 h-16 mb-4 opacity-30" />
                    <p className="text-sm mb-4">No hay tratamientos registrados</p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all"
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
        <div className="space-y-4">
            {/* Header con botón */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">{treatments.length} tratamiento(s)</p>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Tratamiento
                </button>
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {treatments.map((treatment, index) => (
                    <motion.div
                        key={treatment.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 hover:shadow-lg hover:shadow-black/20 transition-all backdrop-blur-sm"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <h3 className="font-semibold text-white text-lg">{treatment.name}</h3>
                                {treatment.tooth_number && (
                                    <p className="text-sm text-white/60 mt-1">
                                        🦷 Pieza: {treatment.tooth_number}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <TreatmentStatusBadge status={treatment.status} size="sm" />
                                <button
                                    onClick={() => {
                                        setSelectedTreatment(treatment);
                                        setShowForm(true);
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    <span>Costo Total</span>
                                </div>
                                <div className="text-white font-semibold">{formatCurrency(treatment.total_cost)}</div>
                            </div>

                            <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    <span>Saldo</span>
                                </div>
                                <div className={`font-semibold ${treatment.balance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {formatCurrency(treatment.balance)}
                                </div>
                            </div>

                            {treatment.start_date && (
                                <div className="bg-white/5 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Inicio</span>
                                    </div>
                                    <div className="text-white text-sm">{new Date(treatment.start_date).toLocaleDateString('es-AR')}</div>
                                </div>
                            )}

                            {treatment.completion_date && (
                                <div className="bg-white/5 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-white/60 text-xs mb-1">
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Fin</span>
                                    </div>
                                    <div className="text-white text-sm">{new Date(treatment.completion_date).toLocaleDateString('es-AR')}</div>
                                </div>
                            )}
                        </div>

                        {treatment.notes && (
                            <div className="mt-3 pt-3 border-t border-white/10">
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
