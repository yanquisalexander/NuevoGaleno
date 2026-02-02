import { useNotifications } from '../contexts/NotificationContext';

/**
 * Hook de utilidad para crear notificaciones comunes con estilos predefinidos
 */
export function useToast() {
    const { addNotification } = useNotifications();

    return {
        success: (title: string, message?: string, options?: { actions?: any[], duration?: number }) => {
            return addNotification({
                type: 'success',
                title,
                message,
                ...options
            });
        },

        error: (title: string, message?: string, options?: { actions?: any[], duration?: number }) => {
            return addNotification({
                type: 'error',
                title,
                message,
                duration: options?.duration ?? 8000, // Errores duran más
                ...options
            });
        },

        warning: (title: string, message?: string, options?: { actions?: any[], duration?: number }) => {
            return addNotification({
                type: 'warning',
                title,
                message,
                ...options
            });
        },

        info: (title: string, message?: string, options?: { actions?: any[], duration?: number }) => {
            return addNotification({
                type: 'info',
                title,
                message,
                ...options
            });
        },

        // Notificación persistente que requiere acción del usuario
        persistent: (title: string, message?: string, actions?: any[]) => {
            return addNotification({
                type: 'info',
                title,
                message,
                duration: 0,
                actions,
                priority: 'high'
            });
        },

        // Notificación urgente con sonido y alta prioridad
        urgent: (title: string, message?: string, actions?: any[]) => {
            return addNotification({
                type: 'error',
                title,
                message,
                duration: 0,
                actions,
                priority: 'urgent',
                sound: true
            });
        }
    };
}
