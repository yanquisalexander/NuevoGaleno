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
    const notificationIdRef = useRef<string | null>(null);

    const checkForUpdates = useCallback(async () => {
        if (isChecking) return;

        setIsChecking(true);
        try {
            const update = await check();

            if (update?.available) {
                const info: UpdateInfo = {
                    version: update.version,
                    currentVersion: update.currentVersion,
                    body: update.body,
                    date: update.date,
                };

                setUpdateAvailable(true);
                setUpdateInfo(info);

                // Mostrar notificación solo si no hay una activa
                if (!notificationIdRef.current) {
                    notificationIdRef.current = addNotification({
                        type: 'info',
                        title: '🎉 Actualización disponible',
                        message: `Galeno ${update.version} está listo para instalar`,
                        icon: '📦',
                        priority: 'high',
                        duration: 0, // Persistente
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
    }, [isChecking, addNotification, openWindow]);

    // Check for updates on mount (after a delay to let the app load)
    useEffect(() => {
        if (!enabled) return;

        const checkTimer = setTimeout(() => {
            checkForUpdates();
        }, 5000); // 5 seconds after app loads

        return () => {
            clearTimeout(checkTimer);
        };
    }, [enabled, checkForUpdates]);

    // Periódicamente verificar actualizaciones (cada 4 horas)
    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            checkForUpdates();
        }, 4 * 60 * 60 * 1000); // 4 horas

        return () => clearInterval(interval);
    }, [enabled, checkForUpdates]);

    return {
        updateAvailable,
        updateInfo,
        isChecking,
        checkForUpdates,
    };
}
