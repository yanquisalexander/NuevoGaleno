// Unified Galeno Client
// Provides a single interface for communicating with backend
// Automatically switches between local (invoke) and remote (HTTP) based on context

import { invoke } from '@tauri-apps/api/core';
import { ActiveContext } from '../contexts/NodeContext';

// ===== TYPES =====

export interface Patient {
  id: number;
  legacy_patient_id?: string;
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

// ===== CLIENT INTERFACE =====

export interface GalenoClient {
  // Patients
  getPatients(limit?: number, offset?: number): Promise<Patient[]>;
  getPatientById(id: number): Promise<Patient | null>;
  createPatient(input: CreatePatientInput): Promise<number>;
  updatePatient(id: number, input: UpdatePatientInput): Promise<void>;
  deletePatient(id: number): Promise<void>;
  searchPatients(query: string): Promise<Patient[]>;
  getPatientsCount(): Promise<number>;
}

// ===== LOCAL ADAPTER (Tauri invoke) =====

export class LocalGalenoClient implements GalenoClient {
  async getPatients(limit?: number, offset?: number): Promise<Patient[]> {
    return await invoke<Patient[]>('get_patients', { limit, offset });
  }

  async getPatientById(id: number): Promise<Patient | null> {
    return await invoke<Patient | null>('get_patient_by_id', { id });
  }

  async createPatient(input: CreatePatientInput): Promise<number> {
    return await invoke<number>('create_patient', { input });
  }

  async updatePatient(id: number, input: UpdatePatientInput): Promise<void> {
    await invoke('update_patient', { id, input });
  }

  async deletePatient(id: number): Promise<void> {
    await invoke('delete_patient', { id });
  }

  async searchPatients(query: string): Promise<Patient[]> {
    return await invoke<Patient[]>('search_patients', { query });
  }

  async getPatientsCount(): Promise<number> {
    return await invoke<number>('get_patients_count');
  }
}

// ===== REMOTE ADAPTER (HTTP) =====

export class RemoteGalenoClient implements GalenoClient {
  private baseUrl: string;
  private authToken: string;

  constructor(baseUrl: string, authToken: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    this.authToken = authToken;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}/api${path}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  }

  async getPatients(limit?: number, offset?: number): Promise<Patient[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    const query = params.toString();
    return await this.request<Patient[]>('GET', `/patients${query ? `?${query}` : ''}`);
  }

  async getPatientById(id: number): Promise<Patient | null> {
    try {
      return await this.request<Patient>('GET', `/patients/${id}`);
    } catch (error) {
      // Handle 404 as null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async createPatient(input: CreatePatientInput): Promise<number> {
    const result = await this.request<{ id: number }>('POST', '/patients', input);
    return result.id;
  }

  async updatePatient(id: number, input: UpdatePatientInput): Promise<void> {
    await this.request<void>('PUT', `/patients/${id}`, input);
  }

  async deletePatient(id: number): Promise<void> {
    await this.request<void>('DELETE', `/patients/${id}`);
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const params = new URLSearchParams({ q: query });
    return await this.request<Patient[]>('GET', `/patients/search?${params}`);
  }

  async getPatientsCount(): Promise<number> {
    const result = await this.request<{ count: number }>('GET', '/patients/count');
    return result.count;
  }
}

// ===== CLIENT FACTORY =====

export function createGalenoClient(context: ActiveContext | null): GalenoClient {
  if (!context || context.mode === 'local') {
    return new LocalGalenoClient();
  }

  if (context.mode === 'remote') {
    if (!context.apiBaseUrl || !context.authToken) {
      throw new Error('Remote mode requires apiBaseUrl and authToken');
    }
    return new RemoteGalenoClient(context.apiBaseUrl, context.authToken);
  }

  throw new Error(`Unknown context mode: ${context.mode}`);
}
