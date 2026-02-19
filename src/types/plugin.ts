export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    icon: string;
    entry: string;
    permissions: PluginPermission[];
    hooks?: Record<string, string>;
    menuItems?: PluginMenuItem[];
    defaultSize?: {
        width: number;
        height: number;
    };
    allowMultipleInstances?: boolean;
    minVersion?: string;
    repository?: string;
    homepage?: string;
    license?: string;
}

export type PluginPermission =
    | 'patients:read'
    | 'patients:write'
    | 'treatments:read'
    | 'treatments:write'
    | 'appointments:read'
    | 'appointments:write'
    | 'payments:read'
    | 'payments:write'
    | 'api:network'
    | 'storage:local'
    | 'ui:notifications'
    | 'system:commands';

export interface PluginMenuItem {
    label: string;
    icon: string;
    action: string;
    shortcut?: string;
}

export interface PluginContext {
    plugin: {
        id: string;
        name: string;
        version: string;
    };
    api: PluginAPI;
    hooks: PluginHooks;
}

export interface PluginAPI {
    patients?: PatientsAPI;
    treatments?: TreatmentsAPI;
    appointments?: AppointmentsAPI;
    payments?: PaymentsAPI;
    ui: UIApi;
    storage: StorageAPI;
    network?: NetworkAPI;
}

export interface PatientsAPI {
    getAll(limit?: number, offset?: number): Promise<any[]>;
    getById(id: number): Promise<any>;
    search(query: string): Promise<any[]>;
    create(data: any): Promise<number>;
    update(id: number, data: any): Promise<void>;
}

export interface TreatmentsAPI {
    getAll(limit?: number, offset?: number): Promise<any[]>;
    getByPatient(patientId: number): Promise<any[]>;
    create(data: any): Promise<number>;
    update(id: number, data: any): Promise<void>;
}

export interface AppointmentsAPI {
    list(filter: any): Promise<any[]>;
    create(data: any): Promise<number>;
    update(data: any): Promise<void>;
    delete(id: number): Promise<void>;
}

export interface PaymentsAPI {
    getByPatient(patientId: number): Promise<any[]>;
    getByTreatment(treatmentId: number): Promise<any[]>;
    create(data: any): Promise<number>;
}

export interface UIApi {
    showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void;
    openWindow(title: string, component: React.ComponentType, data?: any): void;
    closeWindow(): void;
    showDialog(options: DialogOptions): Promise<boolean>;
}

export interface DialogOptions {
    title: string;
    message: string;
    type?: 'info' | 'warning' | 'error' | 'confirm';
    confirmText?: string;
    cancelText?: string;
}

export interface StorageAPI {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    remove(key: string): Promise<void>;
    clear(): Promise<void>;
}

export interface NetworkAPI {
    fetch(url: string, options?: RequestInit): Promise<Response>;
}

export interface PluginHooks {
    on(event: PluginEvent, handler: Function): void;
    off(event: PluginEvent, handler: Function): void;
    emit(event: string, data: any): void;
}

export type PluginEvent =
    | 'patient:open'
    | 'patient:create'
    | 'patient:update'
    | 'treatment:create'
    | 'treatment:update'
    | 'appointment:create'
    | 'appointment:update'
    | 'payment:create'
    | 'app:ready'
    | 'app:shutdown';

export interface InstalledPlugin {
    manifest: PluginManifest;
    enabled: boolean;
    installedAt: string;
    installed_at?: string; // Rust snake_case
    updatedAt?: string;
    updated_at?: string; // Rust snake_case
    path: string;
}

// Rust response type (snake_case)
export interface InstalledPluginRust {
    manifest: PluginManifestRust;
    enabled: boolean;
    installed_at: string;
    updated_at?: string;
    path: string;
}

export interface PluginManifestRust {
    id: string;
    name: string;
    version: string;
    author: string;
    description: string;
    icon: string;
    entry: string;
    permissions: string[];
    hooks?: Record<string, string>;
    menu_items?: PluginMenuItemRust[];
    default_size?: {
        width: number;
        height: number;
    };
    allow_multiple_instances?: boolean;
    min_version?: string;
    repository?: string;
    homepage?: string;
    license?: string;
}

export interface PluginMenuItemRust {
    label: string;
    icon: string;
    action: string;
    shortcut?: string;
}

export interface StorePlugin {
    manifest: PluginManifest;
    downloads: number;
    rating: number;
    reviews: number;
    verified: boolean;
    price?: number;
    screenshots?: string[];
    changelog?: string;
}
