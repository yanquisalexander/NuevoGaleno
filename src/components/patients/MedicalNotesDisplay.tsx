import React, { useState } from 'react';
import { Patient, usePatients } from '@/hooks/usePatients';
import { MedicalNotesEditor } from './MedicalNotesEditor';
import { Edit3, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface MedicalNotesDisplayProps {
    patient: Patient;
    onUpdate?: () => void;
}

export function MedicalNotesDisplay({ patient, onUpdate }: MedicalNotesDisplayProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(patient.medical_notes || '');
    const [saving, setSaving] = useState(false);
    const { updatePatient } = usePatients();

    const handleSave = async () => {
        setSaving(true);
        try {
            await updatePatient(patient.id, { medical_notes: content });
            toast.success('Notas clínicas guardadas');
            setIsEditing(false);
            onUpdate?.();
        } catch (err) {
            console.error(err);
            toast.error('Error guardando notas');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setContent(patient.medical_notes || '');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-hidden">
                    <MedicalNotesEditor
                        content={content}
                        onChange={setContent}
                        placeholder="Escribe notas clínicas del paciente..."
                    />
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-white/5">
                    <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors flex items-center gap-2"
                    >
                        <X className="w-3 h-3" />
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-sm text-white disabled:opacity-60 transition-colors flex items-center gap-2"
                    >
                        <Save className="w-3 h-3" />
                        {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col">
            <div
                className="flex-1 text-sm text-white/70 leading-relaxed overflow-y-auto prose prose-sm prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                    __html: patient.medical_notes || '<p class="text-white/40">No hay notas adicionales registradas para este paciente.</p>'
                }}
            />
            <button
                id="edit-notes-btn"
                onClick={() => setIsEditing(true)}
                className="mt-4 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded text-sm transition-colors flex items-center gap-2 self-start"
            >
                <Edit3 className="w-3 h-3" />
                Editar Notas
            </button>
        </div>
    );
}
