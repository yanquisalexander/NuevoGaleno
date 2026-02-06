/**
 * Sistema de Licenciamiento con Lemon Squeezy
 * Tipo "Activar Windows" con trial de 30 días
 */

export interface LicenseKey {
    id: number;
    status: 'inactive' | 'active' | 'expired' | 'disabled';
    key: string;
    activation_limit: number;
    activation_usage: number;
    created_at: string;
    expires_at: string | null;
}

export interface LicenseInstance {
    id: string;
    name: string;
    created_at: string;
}

export interface LicenseMeta {
    store_id: number;
    order_id: number;
    order_item_id: number;
    product_id: number;
    product_name: string;
    variant_id: number;
    variant_name: string;
    customer_id: number;
    customer_name: string;
    customer_email: string;
}

export interface LemonSqueezyActivateResponse {
    activated: boolean;
    error: string | null;
    license_key: LicenseKey;
    instance: LicenseInstance;
    meta: LicenseMeta;
}

export interface LemonSqueezyValidateResponse {
    valid: boolean;
    error: string | null;
    license_key: LicenseKey;
    instance: LicenseInstance | null;
    meta: LicenseMeta;
}

export interface LemonSqueezyDeactivateResponse {
    deactivated: boolean;
    error: string | null;
    license_key: LicenseKey;
    meta: LicenseMeta;
}

export interface LocalLicenseInfo {
    license_key: string;
    instance_id: string;
    customer_email: string;
    last_validation: string;
    cached_response: LemonSqueezyValidateResponse | null;
    activated_at: string;
}

export interface TrialInfo {
    is_trial: boolean;
    trial_started_at: string | null;
    trial_days_remaining: number;
    trial_expired: boolean;
}

export interface LicenseStatus {
    is_licensed: boolean;
    is_active: boolean;
    is_trial: boolean;
    trial_days_remaining: number;
    trial_expired: boolean;
    trial_used: boolean; // Indica si alguna vez se inició el trial
    license_key: string | null;
    customer_email: string | null;
    status: 'active' | 'trial' | 'expired' | 'unlicensed';
    last_check: string | null;
    // Para modo offline
    offline_mode: boolean;
    cached_response: LemonSqueezyValidateResponse | null;
}

export interface ActivateLicenseRequest {
    license_key: string;
    customer_email: string;
    instance_name: string;
}

export interface ActivateLicenseResponse {
    success: boolean;
    message: string;
    license_status?: LicenseStatus;
    error?: string;
}

export interface LicenseRestrictions {
    max_patients?: number;
    max_appointments?: number;
    max_treatments?: number;
    can_export: boolean;
    can_import: boolean;
    can_use_templates: boolean;
    can_use_reminders: boolean;
    can_use_multi_user: boolean;
    watermark?: string;
}

// Configuración de variantes de licencia
export interface LicenseVariant {
    id: number;
    name: string;
    description: string;
}

// Configuración de Lemon Squeezy desde Rust
export interface LemonSqueezyConfig {
    store_id: number;
    product_id: number;
    variants: LicenseVariant[];
    trial_days: number;
    validation_interval_hours: number;
    offline_grace_period_days: number;
}

// Deprecated: Usar getLemonSqueezyConfig() en su lugar
export const LEMON_SQUEEZY_CONFIG = {
    STORE_ID: 0,
    PRODUCT_ID: 0,
    VARIANT_ID: 0,
    TRIAL_DAYS: 30,
    VALIDATION_INTERVAL_HOURS: 24,
    OFFLINE_GRACE_PERIOD_DAYS: 7,
};

export const LICENSE_RESTRICTIONS: {
    unlicensed: LicenseRestrictions;
    trial: LicenseRestrictions;
    active: LicenseRestrictions;
} = {
    unlicensed: {
        max_patients: 10,
        max_appointments: 50,
        max_treatments: 20,
        can_export: false,
        can_import: false,
        can_use_templates: false,
        can_use_reminders: false,
        can_use_multi_user: false,
        watermark: 'Versión sin licencia - Nuevo Galeno',
    },
    trial: {
        max_patients: 100,
        max_appointments: 500,
        max_treatments: 200,
        can_export: true,
        can_import: true,
        can_use_templates: true,
        can_use_reminders: true,
        can_use_multi_user: false,
        watermark: 'Versión de prueba - {days} días restantes',
    },
    active: {
        can_export: true,
        can_import: true,
        can_use_templates: true,
        can_use_reminders: true,
        can_use_multi_user: true,
    },
};
