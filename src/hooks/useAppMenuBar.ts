import { useEffect } from 'react';
import { useMenuBar } from '@/contexts/MenuBarContext';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import type { MenuBarConfig } from '@/types/menubar';

interface UseAppMenuBarOptions {
    windowId: string;
    config: MenuBarConfig;
    deps?: React.DependencyList;
}

/**
 * Hook para configurar el MenuBar de una aplicación
 * Se debe usar dentro de cada componente de aplicación
 */
export function useAppMenuBar({ windowId, config, deps = [] }: UseAppMenuBarOptions) {
    const { setMenuBar, clearMenuBar } = useMenuBar();
    const { windows } = useWindowManager();

    // Buscar la ventana actual
    const currentWindow = windows.find(w => w.id === windowId);
    const isFocused = currentWindow?.isFocused ?? false;

    useEffect(() => {
        // Solo configurar el menubar si la ventana está enfocada
        if (isFocused) {
            setMenuBar(config);
        } else {
            clearMenuBar();
        }

        // Limpiar cuando se desmonta
        return () => {
            clearMenuBar();
        };
    }, [windowId, isFocused, ...deps]);
}
