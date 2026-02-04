import { useCallback } from 'react';
import { useNotifications, NotificationAction } from '../contexts/NotificationContext';
import { UISound } from '../consts/Sounds';

interface ToastOptions {
    actions?: NotificationAction[];
    duration?: number;
    sound?: boolean;
    soundFile?: UISound;
}

type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Hook optimizado para crear notificaciones toast.
 * Usa useCallback en lugar de useMemo para mejor performance.
 */
export function useToast() {
    const { addNotification } = useNotifications();

    const success = useCallback((title: string, message?: string, options?: ToastOptions) => {
        return addNotification({ type: 'success', title, message, ...options });
    }, [addNotification]);

    const info = useCallback((title: string, message?: string, options?: ToastOptions) => {
        return addNotification({ type: 'info', title, message, ...options });
    }, [addNotification]);

    const warning = useCallback((title: string, message?: string, options?: ToastOptions) => {
        return addNotification({ type: 'warning', title, message, ...options });
    }, [addNotification]);

    const error = useCallback((title: string, message?: string, options?: ToastOptions) => {
        return addNotification({ type: 'error', title, message, duration: 8000, ...options });
    }, [addNotification]);

    const persistent = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
        return addNotification({
            type: 'info',
            title,
            message,
            duration: 0,
            actions,
            priority: 'high'
        });
    }, [addNotification]);

    const urgent = useCallback((title: string, message?: string, actions?: NotificationAction[], soundFile?: UISound) => {
        return addNotification({
            type: 'error',
            title,
            message,
            duration: 0,
            actions,
            priority: 'urgent',
            sound: true,
            soundFile
        });
    }, [addNotification]);

    return { success, info, warning, error, persistent, urgent };
}