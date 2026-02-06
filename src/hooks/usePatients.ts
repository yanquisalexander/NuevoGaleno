// Patient hooks - Now uses the unified Galeno client
// Automatically works with both local and remote backends

import { useGalenoClient } from './useGalenoClient';

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

// Hook for patient operations
export function usePatients() {
    const client = useGalenoClient();

    return {
        getPatients: (limit?: number, offset?: number) => client.getPatients(limit, offset),
        getPatientById: (id: number) => client.getPatientById(id),
        createPatient: (input: CreatePatientInput) => client.createPatient(input),
        updatePatient: (id: number, input: UpdatePatientInput) => client.updatePatient(id, input),
        deletePatient: (id: number) => client.deletePatient(id),
        searchPatients: (query: string) => client.searchPatients(query),
        getPatientsCount: () => client.getPatientsCount(),
    };
}

// Legacy exports for backward compatibility
// ⚠️ DEPRECATED: These functions use a default local client and do not respond to node configuration changes.
// For new code, use the usePatients() hook which respects the active node context.
// These are kept for backward compatibility only.

import { createGalenoClient } from '../lib/galeno-client';

// Create a default client (local mode)
const defaultClient = createGalenoClient({ mode: 'local', nodeName: 'default' });

/** @deprecated Use usePatients() hook instead for node-aware operations */
export async function getPatients(limit?: number, offset?: number): Promise<Patient[]> {
    return defaultClient.getPatients(limit, offset);
}

/** @deprecated Use usePatients() hook instead for node-aware operations */
export async function getPatientById(id: number): Promise<Patient | null> {
    return defaultClient.getPatientById(id);
}

/** @deprecated Use usePatients() hook instead for node-aware operations */
export async function createPatient(input: CreatePatientInput): Promise<number> {
    return defaultClient.createPatient(input);
}

/** @deprecated Use usePatients() hook instead for node-aware operations */
export async function updatePatient(id: number, input: UpdatePatientInput): Promise<void> {
    return defaultClient.updatePatient(id, input);
}

/** @deprecated Use usePatients() hook instead for node-aware operations */
export async function deletePatient(id: number): Promise<void> {
    return defaultClient.deletePatient(id);
}

/** @deprecated Use usePatients() hook instead for node-aware operations */
export async function searchPatients(query: string): Promise<Patient[]> {
    return defaultClient.searchPatients(query);
}

/** @deprecated Use usePatients() hook instead for node-aware operations */
export async function getPatientsCount(): Promise<number> {
    return defaultClient.getPatientsCount();
}

