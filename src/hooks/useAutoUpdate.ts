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

export function useAutoUpdate(enabled: boolean = true) {
    const { openWindow } = useWindowManager();
    const { addNotification } = useNotifications();
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);
    const notificationIdRef = useRef<string | null>(null);
    const hasCheckedOnMount = useRef(false); // Nuevo ref

    const checkForUpdates = useCallback(async () => {
        if (isChecking) return;

        setIsChecking(true);
        setLastChecked(new Date());
        try {
            const update = await check();

            if (update) {
                const info: UpdateInfo = {
                    version: update.version,
                    currentVersion: update.currentVersion,
                    body: update.body,
                    date: update.date,
                };

                setUpdateAvailable(true);
                setUpdateInfo(info);

                if (!notificationIdRef.current) {
                    notificationIdRef.current = addNotification({
                        type: 'info',
                        title: '🎉 Actualización disponible',
                        message: `Galeno ${update.version} está listo para instalar`,
                        icon: '📦',
                        priority: 'high',
                        duration: 0,
                        actions: [
                            {
                                label: 'Instalar ahora',
                                onClick: () => {
                                    openWindow('galeno-update');
                                    if (notificationIdRef.current) {
                                        notificationIdRef.current = null;
                                    }
                                },
                            },
                            {
                                label: 'Más tarde',
                                onClick: () => {
                                    if (notificationIdRef.current) {
                                        notificationIdRef.current = null;
                                    }
                                },
                            },
                        ],
                    });
                }

                return true;
            } else {
                setUpdateAvailable(false);
                setUpdateInfo(null);
                return false;
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            return false;
        } finally {
            setIsChecking(false);
        }
    }, [isChecking, addNotification, openWindow]); // Mantén estas dependencias

    // Check inicial solo UNA vez
    useEffect(() => {
        if (!enabled || hasCheckedOnMount.current) return;

        hasCheckedOnMount.current = true;
        const checkTimer = setTimeout(() => {
            checkForUpdates();
        }, 5000);

        return () => {
            clearTimeout(checkTimer);
        };
    }, [enabled]); // Quita checkForUpdates de aquí

    // Intervalo de 4 horas
    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            checkForUpdates();
        }, 4 * 60 * 60 * 1000);

        return () => clearInterval(interval);
    }, [enabled]); // Quita checkForUpdates y lastChecked de aquí

    return {
        updateAvailable,
        updateInfo,
        isChecking,
        lastChecked,
        checkForUpdates,
    };
}