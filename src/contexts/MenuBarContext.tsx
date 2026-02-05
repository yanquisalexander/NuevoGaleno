import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { MenuBarConfig } from '@/types/menubar';

interface MenuBarContextType {
    currentMenuBar: MenuBarConfig | null;
    setMenuBar: (config: MenuBarConfig | null) => void;
    clearMenuBar: () => void;
}

const MenuBarContext = createContext<MenuBarContextType | null>(null);

const DEFAULT_MENUBAR: MenuBarConfig = {
    appName: 'GalenoOS',
    menus: [],
};

export function MenuBarProvider({ children }: { children: ReactNode }) {
    const [currentMenuBar, setCurrentMenuBarState] = useState<MenuBarConfig | null>(DEFAULT_MENUBAR);

    const setMenuBar = useCallback((config: MenuBarConfig | null) => {
        setCurrentMenuBarState(config || DEFAULT_MENUBAR);
    }, []);

    const clearMenuBar = useCallback(() => {
        setCurrentMenuBarState(DEFAULT_MENUBAR);
    }, []);

    return (
        <MenuBarContext.Provider
            value={{
                currentMenuBar,
                setMenuBar,
                clearMenuBar,
            }}
        >
            {children}
        </MenuBarContext.Provider>
    );
}

export function useMenuBar() {
    const context = useContext(MenuBarContext);
    if (!context) {
        throw new Error('useMenuBar must be used within MenuBarProvider');
    }
    return context;
}
