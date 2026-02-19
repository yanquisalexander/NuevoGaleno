import React, { createContext, useContext, useState, useCallback } from 'react';

interface ShellContextType {
    showSearch: boolean;
    setShowSearch: (show: boolean) => void;
    showNotifications: boolean;
    setShowNotifications: (show: boolean) => void;
    showCalendar: boolean;
    setShowCalendar: (show: boolean) => void;
    showStartMenu: boolean;
    setShowStartMenu: (show: boolean) => void;
    showPowerMenu: boolean;
    setShowPowerMenu: (show: boolean) => void;
    showAltTab: boolean;
    setShowAltTab: (show: boolean) => void;
    updateAvailable: boolean;
    setUpdateAvailable: (available: boolean) => void;

    // Galeno Companion (panel independiente)
    showCompanion: boolean;
    setShowCompanion: (show: boolean) => void;
    toggleCompanion: () => void;

    toggleSearch: () => void;
    toggleNotifications: () => void;
    toggleCalendar: () => void;
    toggleStartMenu: () => void;
    togglePowerMenu: () => void;
    closeAll: () => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export function ShellProvider({ children }: { children: React.ReactNode }) {
    const [showSearch, setShowSearch] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showStartMenu, setShowStartMenu] = useState(false);
    const [showPowerMenu, setShowPowerMenu] = useState(false);
    const [showAltTab, setShowAltTab] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);

    // Companion panel state (independent)
    const [showCompanion, setShowCompanion] = useState(false);

    const closeAll = useCallback(() => {
        setShowSearch(false);
        setShowNotifications(false);
        setShowCalendar(false);
        setShowStartMenu(false);
        setShowPowerMenu(false);
        setShowAltTab(false);
        // Note: intentionally NOT closing `showCompanion` here — Companion is independent
    }, []);

    const toggleSearch = useCallback(() => {
        const next = !showSearch;
        closeAll();
        setShowSearch(next);
    }, [showSearch, closeAll]);

    const toggleNotifications = useCallback(() => {
        const next = !showNotifications;
        closeAll();
        setShowNotifications(next);
    }, [showNotifications, closeAll]);

    const toggleCalendar = useCallback(() => {
        const next = !showCalendar;
        closeAll();
        setShowCalendar(next);
    }, [showCalendar, closeAll]);

    const toggleStartMenu = useCallback(() => {
        const next = !showStartMenu;
        closeAll();
        setShowStartMenu(next);
    }, [showStartMenu, closeAll]);

    const togglePowerMenu = useCallback(() => {
        const next = !showPowerMenu;
        closeAll();
        setShowPowerMenu(next);
    }, [showPowerMenu, closeAll]);

    const toggleCompanion = useCallback(() => {
        // Companion toggles independently and does NOT call `closeAll`.
        setShowCompanion(s => !s);
    }, []);

    return (
        <ShellContext.Provider value={{
            showSearch, setShowSearch,
            showNotifications, setShowNotifications,
            showCalendar, setShowCalendar,
            showStartMenu, setShowStartMenu,
            showPowerMenu, setShowPowerMenu,
            showAltTab, setShowAltTab,
            updateAvailable, setUpdateAvailable,

            // Companion
            showCompanion, setShowCompanion, toggleCompanion,

            toggleSearch,
            toggleNotifications,
            toggleCalendar,
            toggleStartMenu,
            togglePowerMenu,
            closeAll
        }}>
            {children}
        </ShellContext.Provider>
    );
}

export function useShell() {
    const context = useContext(ShellContext);
    if (context === undefined) {
        throw new Error('useShell must be used within a ShellProvider');
    }
    return context;
}
