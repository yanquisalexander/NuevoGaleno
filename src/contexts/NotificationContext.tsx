import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationAction {
    label: string;
    onClick: () => void;
}

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message?: string;
    icon?: string;
    priority?: NotificationPriority;
    actions?: NotificationAction[];
    duration?: number; // milliseconds, 0 = persistent
    sound?: boolean;
    timestamp: Date;
}

interface NotificationContextType {
    notifications: Notification[];
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
    removeNotification: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: Notification = {
            ...notification,
            id,
            timestamp: new Date(),
            duration: notification.duration ?? 5000,
            priority: notification.priority ?? 'normal',
            sound: notification.sound ?? true,
        };

        setNotifications(prev => [newNotification, ...prev]);

        // Reproducir sonido si está habilitado
        if (newNotification.sound) {
            playNotificationSound(notification.type);
        }

        // Auto-dismiss si tiene duración
        if (newNotification.duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, newNotification.duration);
        }

        return id;
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, addNotification, removeNotification, clearAll }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
}

// Sonidos del sistema
function playNotificationSound(type: NotificationType) {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Frecuencias basadas en el tipo
        const frequencies: Record<NotificationType, number[]> = {
            info: [800, 1000],
            success: [600, 800, 1000],
            warning: [800, 600],
            error: [400, 300]
        };

        const freqs = frequencies[type];
        oscillator.frequency.value = freqs[0];

        // Envelope
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);

        // Segundo tono para success
        if (freqs.length > 2) {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = freqs[2];
            gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.1);
            gain2.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.11);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            osc2.start(audioContext.currentTime + 0.1);
            osc2.stop(audioContext.currentTime + 0.4);
        }
    } catch (error) {
        console.error('Error playing notification sound:', error);
    }
}
