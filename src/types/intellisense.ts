// ─── Raw DB types (matching Rust structs) ─────────────────────────────────────

export interface IntelliSenseEvent {
    id: number;
    user_id: string;
    event_type: EventType;
    payload: string | null; // JSON string
    hour: number;           // 0-23
    day_of_week: number;    // 0-6 (0 = Sunday)
    created_at: string;
}

export interface IntelliSenseWorkflow {
    id: number;
    user_id: string;
    name: string;
    app_ids: string; // JSON array string e.g. '["patients","treatments"]'
    icon: string | null;
    created_at: string;
}

// ─── Event types ──────────────────────────────────────────────────────────────

export type EventType =
    | 'app:open'
    | 'app:close'
    | 'patient:viewed'
    | 'action:executed'
    | 'search:performed';

export interface AppOpenPayload {
    appId: string;
}

export interface PatientViewedPayload {
    patientId: number;
}

export interface ActionPayload {
    actionId: string;
    label?: string;
}

// ─── Engine types ─────────────────────────────────────────────────────────────

/** Computed frequency/usage pattern per app */
export interface AppPattern {
    appId: string;
    totalOpens: number;
    lastOpenedAt: string | null;
    /** Count per hour bucket 0-23 */
    hourHistogram: number[];
    /** Count per day-of-week 0-6 */
    dayHistogram: number[];
    /** How often this app is opened *after* another app (keyed by previous appId) */
    prevAppCounts: Record<string, number>;
}

export type SuggestionReason =
    | 'frequent'
    | 'time_based'
    | 'sequence'
    | 'recent_patient';

export interface SuggestionItem {
    /** Unique stable key for React */
    id: string;
    type: 'app' | 'patient';
    /** App ID (for type=app) or patient ID as string (for type=patient) */
    targetId: string;
    label: string;
    subtitle?: string;
    score: number;
    reason: SuggestionReason;
}

// ─── Input types for commands ───────────────────────────────────────────────

export interface CreateWorkflowInput {
    name: string;
    app_ids: string; // JSON array string e.g. '["patients","treatments"]'
    icon: string | null;
}

// ─── Parsed workflow ──────────────────────────────────────────────────────────

export interface ParsedWorkflow {
    id: number;
    name: string;
    appIds: string[];
    icon: string | null;
    createdAt: string;
}
