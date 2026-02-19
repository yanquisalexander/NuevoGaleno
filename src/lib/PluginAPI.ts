import { invoke } from '@tauri-apps/api/core';
import type {
    PluginAPI,
    PluginPermission,
    PatientsAPI,
    TreatmentsAPI,
    AppointmentsAPI,
    PaymentsAPI,
    UIApi,
    StorageAPI,
    NetworkAPI,
} from '../types/plugin';

export function createPluginAPI(permissions: PluginPermission[]): PluginAPI {
    const api: Partial<PluginAPI> = {
        ui: createUIApi(),
        storage: createStorageAPI(),
    };

    if (permissions.includes('patients:read') || permissions.includes('patients:write')) {
        api.patients = createPatientsAPI(permissions.includes('patients:write'));
    }

    if (permissions.includes('treatments:read') || permissions.includes('treatments:write')) {
        api.treatments = createTreatmentsAPI(permissions.includes('treatments:write'));
    }

    if (permissions.includes('appointments:read') || permissions.includes('appointments:write')) {
        api.appointments = createAppointmentsAPI(permissions.includes('appointments:write'));
    }

    if (permissions.includes('payments:read') || permissions.includes('payments:write')) {
        api.payments = createPaymentsAPI(permissions.includes('payments:write'));
    }

    if (permissions.includes('api:network')) {
        api.network = createNetworkAPI();
    }

    return api as PluginAPI;
}

function createPatientsAPI(canWrite: boolean): PatientsAPI {
    return {
        async getAll(limit?: number, offset?: number) {
            return await invoke('get_patients', { limit, offset });
        },
        async getById(id: number) {
            return await invoke('get_patient_by_id', { id });
        },
        async search(query: string) {
            return await invoke('search_patients', { query });
        },
        async create(data: any) {
            if (!canWrite) throw new Error('Permission denied: patients:write');
            return await invoke('create_patient', { input: data });
        },
        async update(id: number, data: any) {
            if (!canWrite) throw new Error('Permission denied: patients:write');
            return await invoke('update_patient', { id, input: data });
        },
    };
}

function createTreatmentsAPI(canWrite: boolean): TreatmentsAPI {
    return {
        async getAll(limit?: number, offset?: number) {
            return await invoke('get_all_treatments', { limit, offset });
        },
        async getByPatient(patientId: number) {
            return await invoke('get_treatments_by_patient', { patientId });
        },
        async create(data: any) {
            if (!canWrite) throw new Error('Permission denied: treatments:write');
            return await invoke('create_treatment', { input: data });
        },
        async update(id: number, data: any) {
            if (!canWrite) throw new Error('Permission denied: treatments:write');
            return await invoke('update_treatment', { id, input: data });
        },
    };
}

function createAppointmentsAPI(canWrite: boolean): AppointmentsAPI {
    return {
        async list(filter: any) {
            return await invoke('list_appointments', { filter });
        },
        async create(data: any) {
            if (!canWrite) throw new Error('Permission denied: appointments:write');
            return await invoke('create_appointment', { appointment: data });
        },
        async update(data: any) {
            if (!canWrite) throw new Error('Permission denied: appointments:write');
            return await invoke('update_appointment', { appointment: data });
        },
        async delete(id: number) {
            if (!canWrite) throw new Error('Permission denied: appointments:write');
            return await invoke('delete_appointment', { id });
        },
    };
}

function createPaymentsAPI(canWrite: boolean): PaymentsAPI {
    return {
        async getByPatient(patientId: number) {
            return await invoke('get_payments_by_patient', { patientId });
        },
        async getByTreatment(treatmentId: number) {
            return await invoke('get_payments_by_treatment', { treatmentId });
        },
        async create(data: any) {
            if (!canWrite) throw new Error('Permission denied: payments:write');
            return await invoke('create_payment', { input: data });
        },
    };
}

function createUIApi(): UIApi {
    return {
        showNotification(message: string, type = 'info') {
            window.dispatchEvent(
                new CustomEvent('plugin:notification', {
                    detail: { message, type },
                })
            );
        },
        openWindow(title: string, component: React.ComponentType, data?: any) {
            window.dispatchEvent(
                new CustomEvent('plugin:openWindow', {
                    detail: { title, component, data },
                })
            );
        },
        closeWindow() {
            window.dispatchEvent(new CustomEvent('plugin:closeWindow'));
        },
        async showDialog(options) {
            return new Promise((resolve) => {
                const handler = (e: CustomEvent) => {
                    window.removeEventListener('plugin:dialogResponse', handler as any);
                    resolve(e.detail.confirmed);
                };
                window.addEventListener('plugin:dialogResponse', handler as any);
                window.dispatchEvent(
                    new CustomEvent('plugin:showDialog', { detail: options })
                );
            });
        },
    };
}

function createStorageAPI(): StorageAPI {
    return {
        async get(key: string) {
            return await invoke('plugin_storage_get', { key });
        },
        async set(key: string, value: any) {
            return await invoke('plugin_storage_set', { key, value });
        },
        async remove(key: string) {
            return await invoke('plugin_storage_remove', { key });
        },
        async clear() {
            return await invoke('plugin_storage_clear');
        },
    };
}

function createNetworkAPI(): NetworkAPI {
    return {
        async fetch(url: string, options?: RequestInit) {
            // Proxy a través de Tauri para control de seguridad
            const response = await invoke('plugin_network_fetch', {
                url,
                options: {
                    method: options?.method || 'GET',
                    headers: options?.headers,
                    body: options?.body,
                },
            });
            return new Response(JSON.stringify(response));
        },
    };
}
