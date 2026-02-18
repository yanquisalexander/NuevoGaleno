import { useEffect, useState, useCallback, useRef } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useNotifications } from '@/contexts/NotificationContext';

export interface UpdateInfo {
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
}

// --- Manager singleton para compartir estado y evitar duplicados / carreras ---
type ManagerState = {
    updateAvailable: boolean;
    updateInfo: UpdateInfo | null;
    isChecking: boolean;
    lastChecked: Date | null;
};

const LOCAL_KEY = 'lastUpdateCheck';

const initialLastChecked = (() => {
    try {
        const stored = localStorage.getItem(LOCAL_KEY);
        return stored ? new Date(stored) : null;
    } catch {
        return null;
    }
})();

const manager = (() => {
    let state: ManagerState = {
        updateAvailable: false,
        updateInfo: null,
        isChecking: false,
        lastChecked: initialLastChecked,
    };

    const subscribers = new Set<(s: ManagerState) => void>();
    let inFlight = false; // evita carreras concurrentes
    let notificationId: string | null = null; // evita notificaciones duplicadas

    const notifyAll = () => subscribers.forEach((cb) => cb(state));

    const subscribe = (cb: (s: ManagerState) => void): () => void => {
        subscribers.add(cb);
        cb(state);
        return () => { subscribers.delete(cb); };
    };

    const clearNotificationId = () => {
        notificationId = null;
    };

    const doCheck = async (opts?: { addNotification?: any; openWindow?: (id: string) => void }) => {
        if (inFlight) return false;
        inFlight = true;
        state.isChecking = true;
        state.lastChecked = new Date();
        try {
            localStorage.setItem(LOCAL_KEY, state.lastChecked.toISOString());
        } catch {
            /* ignore */
        }
        notifyAll();

        try {
            const update = await check();

            // comprobar explicitamente `update?.available`
            if (update) {
                const info: UpdateInfo = {
                    version: update.version,
                    currentVersion: update.currentVersion,
                    body: update.body,
                    date: update.date,
                };

                state.updateAvailable = true;
                state.updateInfo = info;

                // Notificar al usuario SOLO una vez (guardado en `notificationId`)
                if (opts?.addNotification && !notificationId) {
                    try {
                        notificationId = opts.addNotification({
                            type: 'info',
                            title: '🎉 Actualización disponible',
                            message: `Galeno ${info.version} está listo para instalar`,
                            icon: '📦',
                            priority: 'high',
                            duration: 0,
                            actions: [
                                {
                                    label: 'Instalar ahora',
                                    onClick: () => {
                                        opts.openWindow?.('galeno-update');
                                        clearNotificationId();
                                    },
                                },
                                {
                                    label: 'Más tarde',
                                    onClick: () => {
                                        clearNotificationId();
                                    },
                                },
                            ],
                        });
                    } catch (err) {
                        console.error('addNotification failed:', err);
                        notificationId = null;
                    }
                }

                notifyAll();
                return true;
            } else {
                state.updateAvailable = false;
                state.updateInfo = null;
                notifyAll();
                return false;
            }
        } catch (error) {
            console.error('Error checking for updates (manager):', error);
            return false;
        } finally {
            inFlight = false;
            state.isChecking = false;
            notifyAll();
        }
    };

    return {
        subscribe,
        checkForUpdates: doCheck,
        getState: () => state,
        clearNotificationId,
    };
})();

export function useAutoUpdate(enabled: boolean = true) {
    const { openWindow } = useWindowManager();
    const { addNotification } = useNotifications();

    const [state, setState] = useState(manager.getState());

    useEffect(() => {
        const unsub = manager.subscribe((s) => setState(s));
        return unsub;
    }, []);

    const checkForUpdates = useCallback(async () => {
        return manager.checkForUpdates({ addNotification, openWindow });
    }, [addNotification, openWindow]);

    // Check inicial (solo si `enabled`)
    const hasCheckedOnMount = useRef(false);
    useEffect(() => {
        if (!enabled || hasCheckedOnMount.current) return;
        hasCheckedOnMount.current = true;
        const checkTimer = setTimeout(() => checkForUpdates(), 5000);
        return () => clearTimeout(checkTimer);
    }, [enabled, checkForUpdates]);

    // Intervalo de 4 horas
    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(() => checkForUpdates(), 4 * 60 * 60 * 1000);
        return () => clearInterval(interval);
    }, [enabled, checkForUpdates]);

    return {
        updateAvailable: state.updateAvailable,
        updateInfo: state.updateInfo,
        isChecking: state.isChecking,
        lastChecked: state.lastChecked,
        checkForUpdates,
    };
}