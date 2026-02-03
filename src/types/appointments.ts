export interface Appointment {
    id?: number;
    patient_id: number;
    title: string;
    description?: string;
    start_time: string; // ISO 8601
    end_time: string;   // ISO 8601
    status: AppointmentStatus;
    appointment_type?: string;
    location?: string;
    reminder_minutes?: number;
    color?: string;
    created_by?: number;
    created_at?: string;
    updated_at?: string;
}

export interface AppointmentWithPatient extends Appointment {
    patient_name: string;
    patient_phone?: string;
}

export type AppointmentStatus =
    | 'scheduled'
    | 'confirmed'
    | 'completed'
    | 'cancelled'
    | 'no_show';

export interface AppointmentFilter {
    start_date?: string;
    end_date?: string;
    patient_id?: number;
    status?: AppointmentStatus;
}

export interface AppointmentReminder {
    id?: number;
    appointment_id: number;
    scheduled_time: string;
    sent: boolean;
    sent_at?: string;
    notification_id?: string;
    created_at?: string;
}

// Tipo para react-big-calendar
export interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    resource: AppointmentWithPatient;
}

export const APPOINTMENT_TYPES = [
    'Consulta General',
    'Limpieza',
    'Ortodoncia',
    'Endodoncia',
    'Cirugía',
    'Prótesis',
    'Implante',
    'Emergencia',
    'Seguimiento',
] as const;

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
    scheduled: 'Programada',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    no_show: 'No Asistió',
};

export const APPOINTMENT_STATUS_COLORS: Record<AppointmentStatus, string> = {
    scheduled: '#60cdff',
    confirmed: '#6ccb5f',
    completed: '#8b8b8b',
    cancelled: '#ff99a4',
    no_show: '#ffda6a',
};
