import { useState, useEffect } from 'react';
import { Patient, updatePatient } from '../../hooks/usePatients';
import { FileText, Save, Edit, Calendar, AlertCircle, Activity, Pill, Stethoscope } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '../ui/button';

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
        <div className="space-y-6">
            {/* Header con botón de editar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center border border-red-500/30">
                        <FileText className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Historia Clínica</h3>
                        <p className="text-sm text-white/60">Información médica del paciente</p>
                    </div>
                </div>
                {!isEditing ? (
                    <Button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg h-10 px-4 shadow-lg shadow-blue-500/20"
                    >
                        <Edit className="w-4 h-4" />
                        Editar
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleCancel}
                            variant="outline"
                            className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:border-white/20 rounded-lg h-10 px-4"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg h-10 px-4 shadow-lg shadow-green-500/20 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                )}
            </div>

            {/* Información Básica */}
            <div className="grid grid-cols-2 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Fecha de Nacimiento</p>
                            <p className="text-white font-medium">
                                {patient.birth_date
                                    ? new Date(patient.birth_date).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric'
                                    })
                                    : 'No registrada'}
                            </p>
                        </div>
                    </div>
                    {patient.birth_date && (
                        <p className="text-xs text-white/50">
                            Edad: {Math.floor((new Date().getTime() - new Date(patient.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} años
                        </p>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Grupo Sanguíneo</p>
                            <p className="text-white font-medium text-lg">
                                {patient.blood_type || 'No registrado'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Género</p>
                            <p className="text-white font-medium">
                                {patient.gender || 'No registrado'}
                            </p>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-br from-white/8 to-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-xs text-white/60 uppercase tracking-wide">Última Actualización</p>
                            <p className="text-white font-medium text-sm">
                                {new Date(patient.updated_at).toLocaleDateString('es-AR')}
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Alergias */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-orange-500/10 to-red-500/5 border border-orange-500/30 rounded-xl p-6 backdrop-blur-sm"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                        <AlertCircle className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white">Alergias</h4>
                        <p className="text-xs text-white/60">Alergias conocidas y reacciones adversas</p>
                    </div>
                </div>
                {isEditing ? (
                    <textarea
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        placeholder="Registre aquí las alergias del paciente: medicamentos, alimentos, materiales dentales, etc."
                        rows={4}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 focus:outline-none resize-none"
                    />
                ) : (
                    <div className="bg-white/5 rounded-lg p-4 min-h-[100px]">
                        {formData.allergies ? (
                            <p className="text-white whitespace-pre-wrap">{formData.allergies}</p>
                        ) : (
                            <p className="text-white/40 italic">No se han registrado alergias</p>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Notas Médicas / Historia Clínica */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-gradient-to-br from-blue-500/10 to-purple-500/5 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <Pill className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-white">Notas Médicas</h4>
                        <p className="text-xs text-white/60">Historial clínico, condiciones preexistentes, medicación actual</p>
                    </div>
                </div>
                {isEditing ? (
                    <textarea
                        value={formData.medical_notes}
                        onChange={(e) => setFormData({ ...formData, medical_notes: e.target.value })}
                        placeholder="Registre aquí el historial médico del paciente: enfermedades crónicas, cirugías previas, medicación actual, condiciones especiales, etc."
                        rows={8}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 focus:outline-none resize-none"
                    />
                ) : (
                    <div className="bg-white/5 rounded-lg p-4 min-h-[200px]">
                        {formData.medical_notes ? (
                            <p className="text-white whitespace-pre-wrap">{formData.medical_notes}</p>
                        ) : (
                            <p className="text-white/40 italic">No se han registrado notas médicas</p>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
