import { useState } from 'react';
import { Treatment } from '../../hooks/useTreatments';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface TreatmentFormProps {
    treatment?: Treatment;
    patientId: number;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
}

export function TreatmentForm({ treatment, patientId, onSave, onCancel }: TreatmentFormProps) {
    const [formData, setFormData] = useState({
        name: treatment?.name || '',
        tooth_number: treatment?.tooth_number || '',
        sector: treatment?.sector || '',
        status: treatment?.status || 'Pending',
        total_cost: treatment?.total_cost || 0,
        start_date: treatment?.start_date || '',
        notes: treatment?.notes || '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name.trim()) {
            setError('El nombre del tratamiento es obligatorio');
            return;
        }

        if (formData.total_cost <= 0) {
            setError('El costo debe ser mayor a 0');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSave({
                ...formData,
                patient_id: patientId,
            });
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
                onClick={onCancel}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-2xl bg-[#1e1e1e] rounded-xl shadow-2xl border border-white/10 overflow-hidden"
                    style={{
                        backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.05), transparent)',
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
                        <h2 className="text-xl font-semibold text-white">
                            {treatment ? 'Editar Tratamiento' : 'Nuevo Tratamiento'}
                        </h2>
                        <button
                            onClick={onCancel}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Nombre del Tratamiento *
                                </label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Endodoncia, Extracción, etc."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-lg h-11"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Pieza Dental
                                </label>
                                <Input
                                    value={formData.tooth_number}
                                    onChange={(e) => setFormData({ ...formData, tooth_number: e.target.value })}
                                    placeholder="Ej: 16, 21, etc."
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-lg h-11"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Sector
                                </label>
                                <Input
                                    value={formData.sector}
                                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                    placeholder="Ej: Superior, Inferior"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-lg h-11"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Estado
                                </label>
                                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as any })}>
                                    <SelectTrigger className="w-full bg-white/5 border-white/10 rounded-lg h-11 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e1e1e] border-white/10">
                                        <SelectItem value="Pending" className="text-yellow-500 focus:bg-yellow-500/10 focus:text-yellow-400">
                                            Por Hacer
                                        </SelectItem>
                                        <SelectItem value="InProgress" className="text-blue-500 focus:bg-blue-500/10 focus:text-blue-400">
                                            En Tratamiento
                                        </SelectItem>
                                        <SelectItem value="Completed" className="text-green-500 focus:bg-green-500/10 focus:text-green-400">
                                            Terminado
                                        </SelectItem>

                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Costo Total *
                                </label>
                                <Input
                                    type="number"
                                    value={formData.total_cost}
                                    onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) || 0 })}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-lg h-11"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Fecha de Inicio
                                </label>
                                <Input
                                    type="date"
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 rounded-lg h-11"
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Notas
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Información adicional sobre el tratamiento..."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                            <Button
                                type="button"
                                onClick={onCancel}
                                variant="outline"
                                className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 rounded-lg h-10 px-5"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg h-10 px-6 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Guardando...' : treatment ? 'Actualizar' : 'Crear Tratamiento'}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
