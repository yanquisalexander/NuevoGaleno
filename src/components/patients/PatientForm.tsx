import { useState } from 'react';
import { Patient, CreatePatientInput, UpdatePatientInput } from '../../hooks/usePatients';
import { X } from 'lucide-react';
import { motion } from 'motion/react';

interface PatientFormProps {
    patient?: Patient;
    onSave: (data: CreatePatientInput | UpdatePatientInput) => Promise<void>;
    onCancel: () => void;
}

export function PatientForm({ patient, onSave, onCancel }: PatientFormProps) {
    const [formData, setFormData] = useState<CreatePatientInput>({
        first_name: patient?.first_name || '',
        last_name: patient?.last_name || '',
        document_number: patient?.document_number || '',
        phone: patient?.phone || '',
        email: patient?.email || '',
        birth_date: patient?.birth_date || '',
        gender: patient?.gender || '',
        blood_type: patient?.blood_type || '',
        allergies: patient?.allergies || '',
        medical_notes: patient?.medical_notes || '',
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error guardando paciente:', error);
            alert('Error guardando paciente: ' + error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof CreatePatientInput, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value || undefined }));
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-[#2c2c2c] border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-semibold text-white">
                        {patient ? 'Editar Paciente' : 'Nuevo Paciente'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Nombre */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Nombre *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => handleChange('first_name', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Apellido */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Apellido *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => handleChange('last_name', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* DNI */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                DNI
                            </label>
                            <input
                                type="text"
                                value={formData.document_number}
                                onChange={(e) => handleChange('document_number', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Fecha de Nacimiento */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Fecha de Nacimiento
                            </label>
                            <input
                                type="date"
                                value={formData.birth_date}
                                onChange={(e) => handleChange('birth_date', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        {/* Género */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Género
                            </label>
                            <select
                                value={formData.gender}
                                onChange={(e) => handleChange('gender', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar</option>
                                <option value="M">Masculino</option>
                                <option value="F">Femenino</option>
                                <option value="O">Otro</option>
                            </select>
                        </div>

                        {/* Grupo Sanguíneo */}
                        <div>
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Grupo Sanguíneo
                            </label>
                            <select
                                value={formData.blood_type}
                                onChange={(e) => handleChange('blood_type', e.target.value)}
                                className="w-full h-10 bg-white/5 border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                            </select>
                        </div>

                        {/* Alergias */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Alergias
                            </label>
                            <textarea
                                value={formData.allergies}
                                onChange={(e) => handleChange('allergies', e.target.value)}
                                rows={2}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>

                        {/* Notas Médicas */}
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-white/90 mb-2">
                                Notas Médicas
                            </label>
                            <textarea
                                value={formData.medical_notes}
                                onChange={(e) => handleChange('medical_notes', e.target.value)}
                                rows={3}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
