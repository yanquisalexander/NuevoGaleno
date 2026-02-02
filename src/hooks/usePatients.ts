import { invoke } from '@tauri-apps/api/core';

export interface Patient {
    id: number;
    legacy_id?: string;
    first_name: string;
    last_name: string;
    document_number?: string;
    phone?: string;
    email?: string;
    birth_date?: string;
    gender?: string;
    blood_type?: string;
    allergies?: string;
    medical_notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CreatePatientInput {
    first_name: string;
    last_name: string;
    document_number?: string;
    phone?: string;
    email?: string;
    birth_date?: string;
    gender?: string;
    blood_type?: string;
    allergies?: string;
    medical_notes?: string;
}

export interface UpdatePatientInput {
    first_name?: string;
    last_name?: string;
    document_number?: string;
    phone?: string;
    email?: string;
    birth_date?: string;
    gender?: string;
    blood_type?: string;
    allergies?: string;
    medical_notes?: string;
}

export async function getPatients(limit?: number, offset?: number): Promise<Patient[]> {
    return invoke('get_patients', { limit, offset });
}

export async function getPatientById(id: number): Promise<Patient | null> {
    return invoke('get_patient_by_id', { id });
}

export async function createPatient(input: CreatePatientInput): Promise<number> {
    return invoke('create_patient', { input });
}

export async function updatePatient(id: number, input: UpdatePatientInput): Promise<void> {
    return invoke('update_patient', { id, input });
}

export async function deletePatient(id: number): Promise<void> {
    return invoke('delete_patient', { id });
}

export async function searchPatients(query: string): Promise<Patient[]> {
    return invoke('search_patients', { query });
}

export async function getPatientsCount(): Promise<number> {
    return invoke('get_patients_count');
}
