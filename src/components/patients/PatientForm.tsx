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

    const inputClasses = "w-full h-9 bg-[#2d2d2d] hover:bg-[#323232] border border-white/5 rounded-[4px] px-3 text-sm text-white focus:outline-none focus:bg-[#1f1f1f] focus:border-b-2 focus:border-b-[#60cdff] transition-all";
    const labelClasses = "block text-sm text-white/70 mb-1.5 font-normal";

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                className="bg-[#2c2c2c] ring-1 ring-white/10 shadow-2xl w-full max-w-2xl max-h-full overflow-hidden flex flex-col rounded-[8px]"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#2c2c2c]">
                    <h2 className="text-xl font-semibold text-white/90">
                        {patient ? 'Editar Paciente' : 'Nuevo Paciente'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-white/5 rounded-[4px] transition-colors text-white/70 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                        {/* Nombre */}
                        <div>
                            <label className={labelClasses}>
                                Nombre *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.first_name}
                                onChange={(e) => handleChange('first_name', e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* Apellido */}
                        <div>
                            <label className={labelClasses}>
                                Apellido *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.last_name}
                                onChange={(e) => handleChange('last_name', e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* DNI */}
                        <div>
                            <label className={labelClasses}>
                                DNI
                            </label>
                            <input
                                type="text"
                                value={formData.document_number}
                                onChange={(e) => handleChange('document_number', e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className={labelClasses}>
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className={labelClasses}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* Fecha de Nacimiento */}
                        <div>
                            <label className={labelClasses}>
                                Fecha de Nacimiento
                            </label>
                            <input
                                type="date"
                                value={formData.birth_date}
                                onChange={(e) => handleChange('birth_date', e.target.value)}
                                className={inputClasses}
                            />
                        </div>

                        {/* Género */}
                        <div>
                            <label className={labelClasses}>
                                Género
                            </label>
                            <div className="relative">
                                <select
                                    value={formData.gender}
                                    onChange={(e) => handleChange('gender', e.target.value)}
                                    className={inputClasses}
                                >
                                    <option value="">Seleccionar</option>
                                    <option value="M">Masculino</option>
                                    <option value="F">Femenino</option>
                                    <option value="O">Otro</option>
                                </select>
                            </div>
                        </div>

                        {/* Grupo Sanguíneo */}
                        <div>
                            <label className={labelClasses}>
                                Grupo Sanguíneo
                            </label>
                            <select
                                value={formData.blood_type}
                                onChange={(e) => handleChange('blood_type', e.target.value)}
                                className={inputClasses}
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
                            <label className={labelClasses}>
                                Alergias
                            </label>
                            <textarea
                                value={formData.allergies}
                                onChange={(e) => handleChange('allergies', e.target.value)}
                                rows={2}
                                className={`${inputClasses} h-auto py-2 resize-none`}
                            />
                        </div>

                        {/* Notas Médicas */}
                        <div className="col-span-2">
                            <label className={labelClasses}>
                                Notas Médicas
                            </label>
                            <textarea
                                value={formData.medical_notes}
                                onChange={(e) => handleChange('medical_notes', e.target.value)}
                                rows={3}
                                className={`${inputClasses} h-auto py-2 resize-none`}
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-6 border-t border-white/5 bg-[#272727]/50">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-1.5 min-w-[80px] text-sm text-white/90 hover:bg-white/10 rounded-[4px] transition-colors border border-white/5 bg-[#2d2d2d]"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-1.5 min-w-[80px] text-sm font-normal text-white bg-[#005FB8] hover:bg-[#1874D0] active:bg-[#00529E] rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 shadow-sm"
                    >
                        {isSubmitting ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
