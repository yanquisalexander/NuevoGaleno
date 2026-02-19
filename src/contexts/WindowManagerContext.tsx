import { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react';
import type { WindowState, WindowAction, WindowId, AppDefinition } from '../types/window-manager';
import type { InstalledPluginRust } from '../types/plugin';
import { RuntimeApp } from "@/lib/AppRuntimeManager";
import { runtimeManager } from "@/hooks/useAppRuntime";
import { invoke } from '@tauri-apps/api/core';

interface WindowManagerContextType {
    windows: WindowState[];
    apps: Map<string, AppDefinition>;
    openWindow: (appId: string, data?: any, title?: string) => void;
    closeWindow: (windowId: WindowId) => void;
    updateTitle: (windowId: WindowId, title: string) => void;
    closeAllWindows: () => void;
    minimizeWindow: (windowId: WindowId) => void;
    maximizeWindow: (windowId: WindowId) => void;
    restoreWindow: (windowId: WindowId) => void;
    focusWindow: (windowId: WindowId) => void;
    updatePosition: (windowId: WindowId, position: { x: number; y: number }) => void;
    updateSize: (windowId: WindowId, size: { width: number; height: number }) => void;
    registerApp: (app: AppDefinition) => void;
    killApp: (appId: string) => void;
    freezeApp: (appId: string) => void;
    resumeApp: (appId: string) => void;
    getRuntimeApps: () => RuntimeApp[];
}

const WindowManagerContext = createContext<WindowManagerContextType | null>(null);

function windowReducer(state: WindowState[], action: WindowAction, apps: Map<string, AppDefinition>): WindowState[] {
    switch (action.type) {
        case 'OPEN_WINDOW': {
            // Obtenemos el tamaño por defecto de la aplicación o usamos 800x600 como fallback
            const app = apps.get(action.appId);
            const windowWidth = app?.defaultSize?.width ?? 800;
            const windowHeight = app?.defaultSize?.height ?? 600;

            // Obtenemos las dimensiones actuales del viewport
            const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
            const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

            // Calculamos el centro relativo al área de trabajo (aproximado)
            // No restamos MenuBar/Taskbar aquí porque la Window ahora es 'absolute'
            // dentro de un contenedor que ya tiene esos márgenes (WindowContainer).
            const centerX = (screenWidth - windowWidth) / 2 + (state.length * 20);
            const centerY = (screenHeight - windowHeight) / 2 + (state.length * 20);

            const newWindow: WindowState = {
                id: `${action.appId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                appId: action.appId,
                title: action.title || app?.name || '',
                isMinimized: false,
                isMaximized: false,
                isFocused: true,
                // Aplicamos la posición centrada
                position: {
                    x: Math.max(0, centerX),
                    y: Math.max(0, centerY)
                },
                size: { width: windowWidth, height: windowHeight },
                zIndex: Math.max(...state.map(w => w.zIndex), 0) + 1,
                data: action.data,
            };

            return [...state.map(w => ({ ...w, isFocused: false })), newWindow];
        }

        case 'CLOSE_WINDOW':
            return state.filter(w => w.id !== action.windowId);

        case 'CLOSE_ALL_WINDOWS':
            return [];

        case 'MINIMIZE_WINDOW':
            return state.map(w =>
                w.id === action.windowId ? { ...w, isMinimized: true, isFocused: false } : w
            );

        case 'MAXIMIZE_WINDOW':
            return state.map(w =>
                w.id === action.windowId ? { ...w, isMaximized: true } : w
            );

        case 'RESTORE_WINDOW':
            return state.map(w =>
                w.id === action.windowId ? { ...w, isMaximized: false } : w
            );

        case 'FOCUS_WINDOW': {
            const maxZ = Math.max(...state.map(w => w.zIndex), 0);
            return state.map(w => ({
                ...w,
                isFocused: w.id === action.windowId,
                isMinimized: w.id === action.windowId ? false : w.isMinimized,
                zIndex: w.id === action.windowId ? maxZ + 1 : w.zIndex,
            }));
        }

        case 'UPDATE_POSITION':
            return state.map(w =>
                w.id === action.windowId ? { ...w, position: action.position } : w
            );

        case 'UPDATE_SIZE':
            return state.map(w =>
                w.id === action.windowId ? { ...w, size: action.size } : w
            );

        case 'UPDATE_TITLE':
            return state.map(w =>
                w.id === action.windowId ? { ...w, title: action.title } : w
            );

        default:
            return state;
    }
}

export function WindowManagerProvider({ children }: { children: ReactNode }) {
    const [apps, appsDispatch] = useReducer(
        (state: Map<string, AppDefinition>, action: { type: 'REGISTER' | 'UNREGISTER'; app?: AppDefinition; appId?: string }) => {
            if (action.type === 'REGISTER' && action.app) {
                const newMap = new Map(state);
                newMap.set(action.app.id, action.app);
                console.log('App registered in map:', action.app.id, 'Total apps:', newMap.size);
                return newMap;
            }
            if (action.type === 'UNREGISTER' && action.appId) {
                const newMap = new Map(state);
                newMap.delete(action.appId);
                console.log('App unregistered from map:', action.appId, 'Total apps:', newMap.size);
                return newMap;
            }
            return state;
        },
        new Map()
    );

    const [windows, dispatch] = useReducer((state: WindowState[], action: WindowAction) => {
        return windowReducer(state, action, apps);
    }, []);

    // Escuchar eventos de logout para cerrar todas las ventanas
    useEffect(() => {
        const handleLogout = () => {
            dispatch({ type: 'CLOSE_ALL_WINDOWS' });
        };

        window.addEventListener('session:logout', handleLogout);
        return () => window.removeEventListener('session:logout', handleLogout);
    }, []);

    const openWindow = useCallback((appId: string, data?: any, title?: string) => {
        const app = apps.get(appId);
        if (!app) return;

        // Check if multiple instances are allowed
        if (!app.allowMultipleInstances) {
            const existingWindow = windows.find(w => w.appId === appId);
            if (existingWindow) {
                dispatch({ type: 'FOCUS_WINDOW', windowId: existingWindow.id });
                return;
            }
        }

        dispatch({ type: 'OPEN_WINDOW', appId, data, title });
    }, [apps, windows]);

    const closeWindow = useCallback((windowId: WindowId) => {
        dispatch({ type: 'CLOSE_WINDOW', windowId });
    }, []);

    const closeAllWindows = useCallback(() => {
        dispatch({ type: 'CLOSE_ALL_WINDOWS' });
    }, []);

    const minimizeWindow = useCallback((windowId: WindowId) => {
        dispatch({ type: 'MINIMIZE_WINDOW', windowId });
    }, []);

    const maximizeWindow = useCallback((windowId: WindowId) => {
        dispatch({ type: 'MAXIMIZE_WINDOW', windowId });
    }, []);

    const restoreWindow = useCallback((windowId: WindowId) => {
        dispatch({ type: 'RESTORE_WINDOW', windowId });
    }, []);

    const focusWindow = useCallback((windowId: WindowId) => {
        dispatch({ type: 'FOCUS_WINDOW', windowId });
    }, []);

    const updatePosition = useCallback((windowId: WindowId, position: { x: number; y: number }) => {
        dispatch({ type: 'UPDATE_POSITION', windowId, position });
    }, []);

    const updateSize = useCallback((windowId: WindowId, size: { width: number; height: number }) => {
        dispatch({ type: 'UPDATE_SIZE', windowId, size });
    }, []);

    const updateTitle = useCallback((windowId: WindowId, title: string) => {
        dispatch({ type: 'UPDATE_TITLE', windowId, title });
    }, []);

    const registerApp = useCallback((app: AppDefinition) => {
        console.log('Registering app:', app.id, app.name);
        appsDispatch({ type: 'REGISTER', app });
        runtimeManager.register(app.id, app.name);
    }, []);

    const unregisterApp = useCallback((appId: string) => {
        console.log('Unregistering app:', appId);
        appsDispatch({ type: 'UNREGISTER', appId });
        // Close any open windows for this app
        windows.filter(w => w.appId === appId).forEach(w => closeWindow(w.id));
    }, [windows, closeWindow]);

    // Register plugin apps dynamically
    useEffect(() => {
        let isSubscribed = true;

        const loadPluginApps = async () => {
            if (!isSubscribed) return;

            try {
                console.log('Loading plugin apps...');
                const installedPlugins = await invoke<InstalledPluginRust[]>('get_installed_plugins');
                console.log('Installed plugins:', installedPlugins);

                // Dynamically import PluginWindowWrapper
                const { PluginWindowWrapper } = await import('../components/PluginWindowWrapper');

                if (!isSubscribed) return;

                installedPlugins.forEach(plugin => {
                    if (plugin.enabled && plugin.manifest.menu_items) {
                        plugin.manifest.menu_items.forEach(menuItem => {
                            const pluginId = plugin.manifest.id;
                            const appDef: AppDefinition = {
                                id: `plugin.${pluginId}`,
                                name: menuItem.label,
                                icon: menuItem.icon,
                                component: ({ windowId, data }) => (
                                    <PluginWindowWrapper pluginId={pluginId} data={data} />
                                ),
                                allowMultipleInstances: plugin.manifest.allow_multiple_instances ?? false,
                                defaultSize: plugin.manifest.default_size,
                            };
                            console.log('Registering plugin app:', appDef.id, appDef.name);
                            registerApp(appDef);
                        });
                    }
                });
            } catch (error) {
                console.error('Failed to load plugin apps:', error);
            }
        };

        loadPluginApps();

        // Listen for plugin changes
        const handlePluginChange = () => {
            console.log('Plugin change detected, reloading...');
            // Clear existing plugin apps
            const currentApps = Array.from(apps.keys());
            currentApps.forEach(appId => {
                if (appId.startsWith('plugin.')) {
                    unregisterApp(appId);
                }
            });
            // Reload plugins
            loadPluginApps();
        };

        window.addEventListener('plugin:changed', handlePluginChange);

        return () => {
            isSubscribed = false;
            window.removeEventListener('plugin:changed', handlePluginChange);
        };
    }, []); // Empty dependencies - only run once on mount

    const killApp = useCallback((appId: string) => {
        runtimeManager.kill(appId);
        // Close windows
        windows.filter(w => w.appId === appId).forEach(w => closeWindow(w.id));
    }, [windows]);

    const freezeApp = useCallback((appId: string) => {
        runtimeManager.freeze(appId);
        // Perhaps minimize windows
        windows.filter(w => w.appId === appId).forEach(w => minimizeWindow(w.id));
    }, [windows]);

    const resumeApp = useCallback((appId: string) => {
        runtimeManager.resume(appId);
        // Restore windows
        windows.filter(w => w.appId === appId).forEach(w => restoreWindow(w.id));
    }, [windows]);

    const getRuntimeApps = useCallback(() => runtimeManager.getAll(), []);

    return (
        <WindowManagerContext.Provider
            value={{
                windows,
                apps,
                openWindow,
                closeWindow,
                closeAllWindows,
                minimizeWindow,
                maximizeWindow,
                restoreWindow,
                focusWindow,
                updatePosition,
                updateSize,
                updateTitle,
                registerApp,
                killApp,
                freezeApp,
                resumeApp,
                getRuntimeApps,
            }}
        >
            {children}
        </WindowManagerContext.Provider>
    );
}

export function useWindowManager() {
    const context = useContext(WindowManagerContext);
    if (!context) {
        throw new Error('useWindowManager must be used within WindowManagerProvider');
    }
    return context;
}
