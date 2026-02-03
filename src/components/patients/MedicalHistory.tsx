import { useState, useEffect } from 'react';
import { Patient, updatePatient } from '../../hooks/usePatients';
import { FileText, Save, Edit, Calendar, AlertCircle, Activity, Pill, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface MedicalHistoryProps {
    patient: Patient;
    onUpdate: () => void;
}

export function MedicalHistory({ patient, onUpdate }: MedicalHistoryProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        allergies: patient.allergies || '',
        medical_notes: patient.medical_notes || '',
    });

    useEffect(() => {
        setFormData({
            allergies: patient.allergies || '',
            medical_notes: patient.medical_notes || '',
        });
    }, [patient]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePatient(patient.id, formData);
            toast.success('Historia clínica actualizada');
            setIsEditing(false);
            onUpdate();
        } catch (error) {
            console.error('Error actualizando historia:', error);
            toast.error('Error al actualizar la historia clínica');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            allergies: patient.allergies || '',
            medical_notes: patient.medical_notes || '',
        });
        setIsEditing(false);
    };

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Header con botón de editar */}
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-[#E3008C] flex items-center justify-center shadow-lg">
                        <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white/90 tracking-tight">Historia Clínica</h3>
                        <p className="text-xs text-white/50">Resumen clínico y antecedentes</p>
                    </div>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#353535] border border-white/5 hover:border-white/10 text-white text-sm rounded-[4px] transition-all shadow-sm"
                    >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#353535] border border-white/5 text-white/90 hover:text-white text-sm rounded-[4px] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-1.5 bg-[#005FB8] hover:bg-[#1874D0] active:bg-[#00529E] text-white text-sm rounded-[4px] transition-colors border border-white/10 shadow-sm disabled:opacity-50"
                        >
                            <Save className="w-3.5 h-3.5" />
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                )}
            </div>

            {/* Información Básica */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#272727] border border-white/5 rounded-[8px] p-4 group hover:border-white/10 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-blue-500/10 flex items-center justify-center mt-1">
                            <Calendar className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-white/40 font-semibold mb-0.5">Fecha Nac.</p>
                            <p className="text-sm font-medium text-white/90">
                                {patient.birth_date
                                    ? new Date(patient.birth_date).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    })
                                    : 'No reg.'}
                            </p>
                            {patient.birth_date && (
                                <p className="text-xs text-white/50 mt-1">
                                    {Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años
                                </p>
                            )}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 }}
                    className="bg-[#272727] border border-white/5 rounded-[8px] p-4 group hover:border-white/10 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-red-500/10 flex items-center justify-center mt-1">
                            <Activity className="w-4 h-4 text-red-400" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-white/40 font-semibold mb-0.5">Grupo Sang.</p>
                            <p className="text-lg font-semibold text-white/90">
                                {patient.blood_type || '-'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-[#272727] border border-white/5 rounded-[8px] p-4 group hover:border-white/10 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-purple-500/10 flex items-center justify-center mt-1">
                            <Stethoscope className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-white/40 font-semibold mb-0.5">Género</p>
                            <p className="text-sm font-medium text-white/90">
                                {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : patient.gender || '-'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-[#272727] border border-white/5 rounded-[8px] p-4 group hover:border-white/10 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-[4px] bg-green-500/10 flex items-center justify-center mt-1">
                            <FileText className="w-4 h-4 text-green-400" />
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-white/40 font-semibold mb-0.5">Actualizado</p>
                            <p className="text-sm font-medium text-white/90">
                                {new Date(patient.updated_at).toLocaleDateString('es-AR')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Alergias */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#272727] border-l-4 border-l-orange-500 border-y border-r border-white/5 rounded-r-[8px] p-5 shadow-sm"
            >
                <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                        <div>
                            <h4 className="text-sm font-semibold text-white/90">Alergias y Reacciones</h4>
                            <p className="text-xs text-white/50">Información crítica para procedimientos</p>
                        </div>
                        {isEditing ? (
                            <textarea
                                value={formData.allergies}
                                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                                placeholder="Registre aquí las alergias del paciente: medicamentos, alimentos, materiales dentales, etc."
                                rows={4}
                                className="w-full bg-[#252525] border border-white/10 rounded-[4px] px-3 py-2 text-white placeholder:text-white/40 focus:border-b-2 focus:border-b-[#60cdff] focus:outline-none resize-none transition-all"
                            />
                        ) : (
                            <div className="bg-[#222222] rounded-[4px] p-4 min-h-[60px] border border-white/5">
                                {formData.allergies ? (
                                    <p className="text-white/90 text-sm whitespace-pre-wrap">{formData.allergies}</p>
                                ) : (
                                    <p className="text-white/40 italic text-sm">No se han registrado alergias</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Notas Médicas / Historia Clínica */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-[#272727] border border-white/5 rounded-[8px] p-6 shadow-sm"
            >
                <div className="flex items-start gap-4 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Pill className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-white/90">Notas Médicas</h4>
                        <p className="text-xs text-white/50">Historial clínico, condiciones preexistentes, medicación actual</p>
                    </div>
                </div>
                {isEditing ? (
                    <textarea
                        value={formData.medical_notes}
                        onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                        placeholder="Registre aquí el historial médico del paciente: enfermedades crónicas, cirugías previas, medicación actual, condiciones especiales, etc."
                        rows={8}
                        className="w-full bg-[#252525] border border-white/10 rounded-[4px] px-3 py-2 text-white placeholder:text-white/40 focus:border-b-2 focus:border-b-[#60cdff] focus:outline-none resize-none transition-all"
                    />
                ) : (
                    <div className="bg-[#222222] rounded-[4px] p-4 min-h-[150px] border border-white/5">
                        {formData.medical_notes ? (
                            <p className="text-white/90 text-sm whitespace-pre-wrap leading-relaxed">{formData.medical_notes}</p>
                        ) : (
                            <p className="text-white/40 italic text-sm">No se han registrado notas médicas</p>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
