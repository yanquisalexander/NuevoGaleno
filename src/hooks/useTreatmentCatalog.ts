import { invoke } from '@tauri-apps/api/core';

export interface TreatmentCatalogEntry {
    id: number;
    name: string;
    description?: string;
    default_cost: number;
    category?: string;
    color?: string;
    icon?: string;
    show_independently: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface TreatmentCatalogItem {
    id: number;
    treatment_catalog_id: number;
    name: string;
    description?: string;
    default_cost: number;
    color?: string;
    icon?: string;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

export interface CreateTreatmentCatalogInput {
    name: string;
    description?: string;
    default_cost: number;
    category?: string;
    color?: string;
    icon?: string;
    show_independently: boolean;
}

export interface UpdateTreatmentCatalogInput {
    id: number;
    name: string;
    description?: string;
    default_cost: number;
    category?: string;
    color?: string;
    icon?: string;
    show_independently: boolean;
    is_active: boolean;
}

export interface CreateTreatmentCatalogItemInput {
    treatment_catalog_id: number;
    name: string;
    description?: string;
    default_cost: number;
    color?: string;
    icon?: string;
    display_order: number;
}

export interface UpdateTreatmentCatalogItemInput {
    id: number;
    name: string;
    description?: string;
    default_cost: number;
    color?: string;
    icon?: string;
    is_active: boolean;
    display_order: number;
}

// ============================================================================
// Treatment Catalog API
// ============================================================================

export async function getAllTreatmentCatalog(): Promise<TreatmentCatalogEntry[]> {
    return invoke('get_all_treatment_catalog');
}

export async function getTreatmentCatalogById(id: number): Promise<TreatmentCatalogEntry | null> {
    return invoke('get_treatment_catalog_by_id', { id });
}

export async function createTreatmentCatalog(input: CreateTreatmentCatalogInput): Promise<number> {
    return invoke('create_treatment_catalog', { input });
}

export async function updateTreatmentCatalog(input: UpdateTreatmentCatalogInput): Promise<void> {
    return invoke('update_treatment_catalog', { input });
}

export async function deleteTreatmentCatalog(id: number): Promise<void> {
    return invoke('delete_treatment_catalog', { id });
}

// ============================================================================
// Treatment Catalog Items API
// ============================================================================

export async function getTreatmentCatalogItems(treatmentCatalogId: number): Promise<TreatmentCatalogItem[]> {
    return invoke('get_treatment_catalog_items', { treatmentCatalogId });
}

export async function getTreatmentCatalogItemById(id: number): Promise<TreatmentCatalogItem | null> {
    return invoke('get_treatment_catalog_item_by_id', { id });
}

export async function createTreatmentCatalogItem(input: CreateTreatmentCatalogItemInput): Promise<number> {
    return invoke('create_treatment_catalog_item', { input });
}

export async function updateTreatmentCatalogItem(input: UpdateTreatmentCatalogItemInput): Promise<void> {
    return invoke('update_treatment_catalog_item', { input });
}

export async function deleteTreatmentCatalogItem(id: number): Promise<void> {
    return invoke('delete_treatment_catalog_item', { id });
}
