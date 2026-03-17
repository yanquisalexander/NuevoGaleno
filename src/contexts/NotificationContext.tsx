import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { UI_SOUNDS, type UISound } from '../consts/Sounds';
import {
    PLUGIN_NOTIFICATION_EVENT,
    type PluginNotificationPayload,
} from '@/consts/plugin-events';

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
    soundFile?: UISound; // Archivo de sonido a reproducir
    timestamp: Date;
}

interface IntegrationNotifyPayload {
    type?: unknown;
    title?: unknown;
    message?: unknown;
    priority?: unknown;
    duration?: unknown;
    sound?: unknown;
    soundFile?: unknown;
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

    const removeNotification = useCallback((id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

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

        return id;
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    useEffect(() => {
        const handlePluginNotification = (event: Event) => {
            const customEvent = event as CustomEvent<PluginNotificationPayload>;
            const detail = customEvent.detail;

            if (!detail || typeof detail.title !== 'string' || detail.title.trim().length === 0) {
                return;
            }

            addNotification({
                type: isNotificationType(detail.type) ? detail.type : 'info',
                title: detail.title.trim(),
                message: typeof detail.message === 'string' ? detail.message : undefined,
                icon: typeof detail.icon === 'string' ? detail.icon : undefined,
                priority: isNotificationPriority(detail.priority) ? detail.priority : 'normal',
                duration: typeof detail.duration === 'number' ? Math.max(0, detail.duration) : undefined,
                sound: typeof detail.sound === 'boolean' ? detail.sound : true,
                soundFile: isUISound(detail.soundFile) ? detail.soundFile : undefined,
                actions: [],
            });
        };

        window.addEventListener(PLUGIN_NOTIFICATION_EVENT, handlePluginNotification as EventListener);

        const unlistenIntegrationNotify = listen<IntegrationNotifyPayload>('integration:notify', event => {
            const detail = event.payload;
            if (!detail || typeof detail.title !== 'string' || detail.title.trim().length === 0) {
                return;
            }

            addNotification({
                type: isNotificationType(detail.type) ? detail.type : 'info',
                title: detail.title.trim(),
                message: typeof detail.message === 'string' ? detail.message : undefined,
                priority: isNotificationPriority(detail.priority) ? detail.priority : 'normal',
                duration: typeof detail.duration === 'number' ? Math.max(0, detail.duration) : undefined,
                sound: typeof detail.sound === 'boolean' ? detail.sound : true,
                soundFile: isUISound(detail.soundFile) ? detail.soundFile : undefined,
                actions: [],
            });
        });

        return () => {
            window.removeEventListener(PLUGIN_NOTIFICATION_EVENT, handlePluginNotification as EventListener);
            unlistenIntegrationNotify.then(fn => fn());
        };
    }, [addNotification]);

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

function isNotificationType(value: unknown): value is NotificationType {
    return value === 'info' || value === 'success' || value === 'warning' || value === 'error';
}

function isNotificationPriority(value: unknown): value is NotificationPriority {
    return value === 'low' || value === 'normal' || value === 'high' || value === 'urgent';
}

function isUISound(value: unknown): value is UISound {
    return typeof value === 'string' && Object.values(UI_SOUNDS).includes(value as UISound);
}


