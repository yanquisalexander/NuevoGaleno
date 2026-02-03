import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    Appointment,
    AppointmentWithPatient,
    AppointmentFilter,
    AppointmentReminder,
} from '../types/appointments';

export function useAppointments() {
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAppointments = useCallback(async (filter?: AppointmentFilter) => {
        setLoading(true);
        setError(null);
        try {
            const result = await invoke<AppointmentWithPatient[]>('list_appointments', {
                filter: filter || {},
            });
            setAppointments(result);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            console.error('Error fetching appointments:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const createAppointment = useCallback(async (appointment: Appointment) => {
        setLoading(true);
        setError(null);
        try {
            const id = await invoke<number>('create_appointment', { appointment });
            await fetchAppointments();
            return id;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            console.error('Error creating appointment:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAppointments]);

    const updateAppointment = useCallback(async (id: number, appointment: Appointment) => {
        setLoading(true);
        setError(null);
        try {
            await invoke('update_appointment', { appointment: { ...appointment, id } });
            await fetchAppointments();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            console.error('Error updating appointment:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAppointments]);

    const deleteAppointment = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            await invoke('delete_appointment', { id });
            await fetchAppointments();
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            console.error('Error deleting appointment:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, [fetchAppointments]);

    const getAppointment = useCallback(async (id: number) => {
        setLoading(true);
        setError(null);
        try {
            const result = await invoke<Appointment>('get_appointment', { id });
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            console.error('Error getting appointment:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const getPendingReminders = useCallback(async () => {
        try {
            const result = await invoke<AppointmentReminder[]>('get_pending_reminders');
            return result;
        } catch (err) {
            console.error('Error getting pending reminders:', err);
            return [];
        }
    }, []);

    const markReminderSent = useCallback(async (reminderId: number, notificationId: string) => {
        try {
            await invoke('mark_reminder_sent', { reminderId, notificationId });
        } catch (err) {
            console.error('Error marking reminder sent:', err);
        }
    }, []);

    const getUpcomingAppointments = useCallback(async (hours: number = 24) => {
        try {
            const result = await invoke<AppointmentWithPatient[]>('get_upcoming_appointments', { hours });
            return result;
        } catch (err) {
            console.error('Error getting upcoming appointments:', err);
            return [];
        }
    }, []);

    return {
        appointments,
        loading,
        error,
        fetchAppointments,
        createAppointment,
        updateAppointment,
        deleteAppointment,
        getAppointment,
        getPendingReminders,
        markReminderSent,
        getUpcomingAppointments,
    };
}
