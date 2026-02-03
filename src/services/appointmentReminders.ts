import { invoke } from '@tauri-apps/api/core';
import { AppointmentReminder, AppointmentWithPatient } from '../types/appointments';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ReminderNotification {
    reminder: AppointmentReminder;
    appointment: AppointmentWithPatient;
}

class AppointmentReminderService {
    private intervalId: number | null = null;
    private checkIntervalMs = 60000; // Revisar cada minuto
    private onReminderCallback: ((notification: ReminderNotification) => void) | null = null;

    start(onReminder: (notification: ReminderNotification) => void) {
        if (this.intervalId) {
            console.warn('Reminder service already running');
            return;
        }

        this.onReminderCallback = onReminder;
        this.checkReminders(); // Check immediately
        this.intervalId = setInterval(() => this.checkReminders(), this.checkIntervalMs);
        console.log('Appointment reminder service started');
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            this.onReminderCallback = null;
            console.log('Appointment reminder service stopped');
        }
    }

    private async checkReminders() {
        try {
            const reminders = await invoke<AppointmentReminder[]>('get_pending_reminders');

            if (reminders.length === 0) {
                return;
            }

            console.log(`Found ${reminders.length} pending reminders`);

            for (const reminder of reminders) {
                try {
                    // Obtener datos completos con paciente
                    const appointments = await invoke<AppointmentWithPatient[]>('list_appointments', {
                        filter: {},
                    });

                    const fullAppointment = appointments.find(a => a.id === reminder.appointment_id);

                    if (fullAppointment && this.onReminderCallback) {
                        this.onReminderCallback({
                            reminder,
                            appointment: fullAppointment,
                        });
                    }
                } catch (error) {
                    console.error('Error processing reminder:', error);
                }
            }
        } catch (error) {
            console.error('Error checking reminders:', error);
        }
    }

    async markReminderSent(reminderId: number, notificationId: string) {
        try {
            await invoke('mark_reminder_sent', {
                reminderId,
                notificationId,
            });
        } catch (error) {
            console.error('Error marking reminder as sent:', error);
        }
    }

    setCheckInterval(intervalMs: number) {
        this.checkIntervalMs = intervalMs;
        if (this.intervalId) {
            // Restart with new interval
            this.stop();
            if (this.onReminderCallback) {
                this.start(this.onReminderCallback);
            }
        }
    }
}

export const reminderService = new AppointmentReminderService();

export function formatAppointmentNotification(appointment: AppointmentWithPatient): {
    title: string;
    message: string;
} {
    const startDate = new Date(appointment.start_time);
    const timeStr = format(startDate, 'HH:mm', { locale: es });
    const dateStr = format(startDate, "EEEE, d 'de' MMMM", { locale: es });

    return {
        title: `Recordatorio: ${appointment.title}`,
        message: `Paciente: ${appointment.patient_name}\n${dateStr} a las ${timeStr}\n${appointment.location ? `Ubicación: ${appointment.location}` : ''}`,
    };
}
