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

export interface OdontogramSurface {
    id: number;
    patient_id: number;
    tooth_number: string;
    surface: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    is_active: boolean;
    applied_date: string;
    created_at: string;
    updated_at: string;
    treatment_id?: number;
}

export interface SurfaceHistoryEntry {
    id: number;
    patient_id: number;
    tooth_number: string;
    surface: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    action: string; // 'created', 'updated', 'deactivated'
    applied_date: string;
    recorded_at: string;
}

export interface UpdateSurfaceInput {
    patient_id: number;
    tooth_number: string;
    surface: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
}

export interface AddSurfaceTreatmentInput {
    patient_id: number;
    tooth_number: string;
    surface: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    applied_date?: string;
    treatment_id?: number;
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

// ============================================================================
// Odontogram Surfaces API - Soporte para múltiples tratamientos
// ============================================================================

export async function getOdontogramSurfacesByPatient(patientId: number): Promise<OdontogramSurface[]> {
    return invoke('get_odontogram_surfaces_by_patient', { patientId });
}

export async function getToothSurfaces(patientId: number, toothNumber: string): Promise<OdontogramSurface[]> {
    return invoke('get_tooth_surfaces', { patientId, toothNumber });
}

export async function getSurfaceTreatments(patientId: number, toothNumber: string, surface: string): Promise<OdontogramSurface[]> {
    return invoke('get_surface_treatments', { patientId, toothNumber, surface });
}

export async function addToothSurfaceTreatment(input: AddSurfaceTreatmentInput): Promise<number> {
    return invoke('add_tooth_surface_treatment', { input });
}

export async function updateToothSurface(input: UpdateSurfaceInput): Promise<number> {
    return invoke('update_tooth_surface', { input });
}

export async function deactivateSurfaceTreatment(surfaceId: number): Promise<void> {
    return invoke('deactivate_surface_treatment', { surfaceId });
}

export async function getSurfaceHistory(patientId: number, toothNumber: string, surface: string): Promise<SurfaceHistoryEntry[]> {
    return invoke('get_surface_history', { patientId, toothNumber, surface });
}

export async function getToothSurfaceHistory(patientId: number, toothNumber: string): Promise<SurfaceHistoryEntry[]> {
    return invoke('get_tooth_surface_history', { patientId, toothNumber });
}

export async function deleteToothSurface(patientId: number, toothNumber: string, surface: string): Promise<void> {
    return invoke('delete_tooth_surface', { patientId, toothNumber, surface });
}

export async function clearToothSurfaces(patientId: number, toothNumber: string): Promise<void> {
    return invoke('clear_tooth_surfaces', { patientId, toothNumber });
}

// ============================================================================
// Odontogram Tooth Treatments API - Tratamientos a nivel de diente completo
// ============================================================================

export interface OdontogramToothTreatment {
    id: number;
    patient_id: number;
    tooth_number: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    is_active: boolean;
    applied_date: string;
    created_at: string;
    updated_at: string;
    treatment_id?: number;
}

export interface AddToothTreatmentInput {
    patient_id: number;
    tooth_number: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    applied_date?: string;
    treatment_id?: number;
}

export interface ToothTreatmentHistoryEntry {
    id: number;
    patient_id: number;
    tooth_number: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    condition: string;
    notes?: string;
    action: string;
    applied_date: string;
    recorded_at: string;
}

export async function getToothTreatments(patientId: number, toothNumber: string): Promise<OdontogramToothTreatment[]> {
    return invoke('get_tooth_treatments', { patientId, toothNumber });
}

export async function getToothTreatmentsByPatient(patientId: number): Promise<OdontogramToothTreatment[]> {
    return invoke('get_tooth_treatments_by_patient', { patientId });
}

export async function addToothTreatment(input: AddToothTreatmentInput): Promise<number> {
    return invoke('add_tooth_treatment', { input });
}

export async function deactivateToothTreatment(treatmentId: number): Promise<void> {
    return invoke('deactivate_tooth_treatment', { treatmentId });
}

export async function getToothTreatmentHistory(patientId: number, toothNumber: string): Promise<ToothTreatmentHistoryEntry[]> {
    return invoke('get_tooth_treatment_history', { patientId, toothNumber });
}

// ============================================================================
// Odontogram Bridges API - Puentes dentales
// ============================================================================

export interface OdontogramBridge {
    id: number;
    patient_id: number;
    bridge_name: string;
    tooth_start: string;
    tooth_end: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    notes?: string;
    is_active: boolean;
    applied_date: string;
    created_at: string;
    updated_at: string;
    treatment_id?: number;
}

export interface AddBridgeInput {
    patient_id: number;
    bridge_name: string;
    tooth_start: string;
    tooth_end: string;
    treatment_catalog_id?: number;
    treatment_catalog_item_id?: number;
    notes?: string;
    applied_date?: string;
    treatment_id?: number;
}

export async function getBridgesByPatient(patientId: number): Promise<OdontogramBridge[]> {
    return invoke('get_bridges_by_patient', { patientId });
}

export async function addBridge(input: AddBridgeInput): Promise<number> {
    return invoke('add_bridge', { input });
}

export async function deactivateBridge(bridgeId: number): Promise<void> {
    return invoke('deactivate_bridge', { bridgeId });
}

