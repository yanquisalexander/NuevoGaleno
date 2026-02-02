import { invoke } from '@tauri-apps/api/core';

export interface Payment {
    id: number;
    treatment_id: number;
    legacy_id?: string;
    amount: number;
    payment_date: string;
    payment_method?: string;
    notes?: string;
    created_at: string;
}

export interface CreatePaymentInput {
    treatment_id: number;
    amount: number;
    payment_date?: string;
    payment_method?: string;
    notes?: string;
}

export interface UpdatePaymentInput {
    amount?: number;
    payment_date?: string;
    payment_method?: string;
    notes?: string;
}

export interface PatientBalance {
    patient_id: number;
    patient_name: string;
    total_treatments_cost: number;
    total_paid: number;
    total_balance: number;
    treatments_count: number;
}

export async function getAllPayments(limit?: number, offset?: number): Promise<Payment[]> {
    return invoke('get_all_payments', { limit, offset });
}

export async function getPaymentById(id: number): Promise<Payment | null> {
    return invoke('get_payment_by_id', { id });
}

export async function getPaymentsByTreatment(treatmentId: number): Promise<Payment[]> {
    return invoke('get_payments_by_treatment', { treatmentId });
}

export async function getPaymentsByPatient(patientId: number): Promise<Payment[]> {
    return invoke('get_payments_by_patient', { patientId });
}

export async function createPayment(input: CreatePaymentInput): Promise<number> {
    return invoke('create_payment', { input });
}

export async function updatePayment(id: number, input: UpdatePaymentInput): Promise<void> {
    return invoke('update_payment', { id, input });
}

export async function deletePayment(id: number): Promise<void> {
    return invoke('delete_payment', { id });
}

export async function getPatientBalance(patientId: number): Promise<PatientBalance> {
    return invoke('get_patient_balance', { patientId });
}

export async function getPatientsWithDebt(): Promise<PatientBalance[]> {
    return invoke('get_patients_with_debt');
}

export async function getTotalDebt(): Promise<number> {
    return invoke('get_total_debt');
}

export async function getRecentPayments(limit?: number): Promise<Payment[]> {
    return invoke('get_recent_payments', { limit });
}
