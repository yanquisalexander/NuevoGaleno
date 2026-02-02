import { invoke } from '@tauri-apps/api/core';

export interface Treatment {
    id: number;
    patient_id: number;
    legacy_id?: string;
    name: string;
    tooth_number?: string;
    sector?: string;
    status: 'Pending' | 'InProgress' | 'Completed' | 'Cancelled';
    total_cost: number;
    paid_amount: number;
    balance: number;
    start_date?: string;
    completion_date?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateTreatmentInput {
    patient_id: number;
    name: string;
    tooth_number?: string;
    sector?: string;
    total_cost: number;
    start_date?: string;
    notes?: string;
}

export interface UpdateTreatmentInput {
    name?: string;
    tooth_number?: string;
    sector?: string;
    status?: string;
    total_cost?: number;
    start_date?: string;
    completion_date?: string;
    notes?: string;
}

export interface TreatmentStats {
    pending_count: number;
    in_progress_count: number;
    completed_count: number;
    total_pending_cost: number;
    total_in_progress_cost: number;
    total_completed_cost: number;
}

export async function getAllTreatments(limit?: number, offset?: number): Promise<Treatment[]> {
    return invoke('get_all_treatments', { limit, offset });
}

export async function getTreatmentById(id: number): Promise<Treatment | null> {
    return invoke('get_treatment_by_id', { id });
}

export async function getTreatmentsByPatient(patientId: number): Promise<Treatment[]> {
    return invoke('get_treatments_by_patient', { patientId });
}

export async function getTreatmentsByStatus(status: string): Promise<Treatment[]> {
    return invoke('get_treatments_by_status', { status });
}

export async function createTreatment(input: CreateTreatmentInput): Promise<number> {
    return invoke('create_treatment', { input });
}

export async function updateTreatment(id: number, input: UpdateTreatmentInput): Promise<void> {
    return invoke('update_treatment', { id, input });
}

export async function updateTreatmentStatus(id: number, status: string): Promise<void> {
    return invoke('update_treatment_status', { id, status });
}

export async function deleteTreatment(id: number): Promise<void> {
    return invoke('delete_treatment', { id });
}

export async function getTreatmentStats(): Promise<TreatmentStats> {
    return invoke('get_treatment_stats');
}
