import { useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useToast } from './useToast';

export function useAutoUpdate(enabled: boolean = true) {
    const { openWindow } = useWindowManager();
    const toastHelpers = useToast();

    useEffect(() => {
        if (!enabled) return;

        // Check for updates on mount (after a delay to let the app load)
        const checkTimer = setTimeout(async () => {
            try {
                const update = await check();

                if (!update) {
                    console.log('No hay actualizaciones disponibles.');
                    return
                }

                if (update) {
                    toastHelpers.info(
                        '🎉 Nueva versión disponible',
                        `Versión ${update.version} está lista para descargar.`,
                        {
                            duration: 10000,
                            actions: [
                                {
                                    label: 'Ver actualización',
                                    onClick: () => openWindow('galeno-update'),
                                },
                            ],
                        }
                    );
                }
            } catch (error) {
                console.error('Error checking for updates:', error);
            }
        }, 5000); // 5 seconds after app loads

        return () => {
            clearTimeout(checkTimer);
        };
    }, [enabled, openWindow, toastHelpers]);
}
