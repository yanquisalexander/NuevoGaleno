import { invoke } from '@tauri-apps/api/core';

export interface OdontogramEntry {
    id: number;
    patient_id: number;
    tooth_number: string;
    condition: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface UpdateToothConditionInput {
    patient_id: number;
    tooth_number: string;
    condition: string;
    notes?: string;
}

export async function getOdontogramByPatient(patientId: number): Promise<OdontogramEntry[]> {
    return invoke('get_odontogram_by_patient', { patientId });
}

export async function getToothByPatientAndNumber(patientId: number, toothNumber: string): Promise<OdontogramEntry | null> {
    return invoke('get_tooth_by_patient_and_number', { patientId, toothNumber });
}

export async function updateToothCondition(input: UpdateToothConditionInput): Promise<number> {
    return invoke('update_tooth_condition', { input });
}

export async function deleteToothCondition(patientId: number, toothNumber: string): Promise<void> {
    return invoke('delete_tooth_condition', { patientId, toothNumber });
}

export async function clearPatientOdontogram(patientId: number): Promise<void> {
    return invoke('clear_patient_odontogram', { patientId });
}

export async function getToothHistory(patientId: number, toothNumber: string): Promise<OdontogramEntry[]> {
    return invoke('get_tooth_history', { patientId, toothNumber });
}
