import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface User {
    id: number;
    username: string;
    name: string;
    role: string;
    pin?: string;
}

interface SessionContextType {
    currentUser: User | null;
    isLoading: boolean;
    isLocked: boolean;
    sessionDuration: number | null;
    login: (username: string, password: string, client: any) => Promise<User>;
    loginWithPin: (username: string, pin: string) => Promise<User>;
    lockScreen: () => void;
    unlock: (password: string, isPin: boolean) => Promise<void>;
    logout: (client: any) => Promise<void>;
    setPin: (pin: string) => Promise<void>;
    removePin: () => Promise<void>;
    verifySession: (client: any) => Promise<boolean>;
    exitApp: () => Promise<void>;
    refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(false);
    const [sessionDuration, setSessionDuration] = useState<number | null>(null);

    const loadSessionDuration = useCallback(async () => {
        try {
            const duration = await invoke<number | null>('get_session_duration');
            setSessionDuration(duration);
        } catch (error) {
            console.error('Error obteniendo duración de sesión:', error);
        }
    }, []);

    const loadSession = useCallback(async () => {
        setIsLoading(true);
        try {
            const user = await invoke<User>('get_current_user');
            setCurrentUser(user);
            setIsLocked(true); // Iniciar bloqueado si hay sesión
            await loadSessionDuration();
        } catch (error) {
            console.error('No hay sesión activa:', error);
            setCurrentUser(null);
            setIsLocked(false);
        } finally {
            setIsLoading(false);
        }
    }, [loadSessionDuration]);

    // NO cargar sesión automáticamente al inicio
    // La sesión se cargará solo después del login
    useEffect(() => {
        // Solo verificamos que no hay sesión activa y marcamos como no-loading
        setIsLoading(false);
        const interval = setInterval(loadSessionDuration, 60000);
        return () => clearInterval(interval);
    }, [loadSessionDuration]);

    const login = async (username: string, password: string, client: any): Promise<User> => {
        const response = await client.login(username, password);
        const user = response.user;

        setCurrentUser(user);
        setIsLocked(false);
        await loadSessionDuration();
        return user;
    };

    const loginWithPin = async (username: string, pin: string): Promise<User> => {
        // PIN solo funciona en modo local
        const user = await invoke<User>('login_with_pin', {
            username,
            pin,
        });

        setCurrentUser(user);
        setIsLocked(false);
        await loadSessionDuration();
        return user;
    };

    const lockScreen = () => {
        setIsLocked(true);
    };

    const unlock = async (password: string, isPin: boolean): Promise<void> => {
        if (!currentUser) throw new Error('No hay usuario en sesión');

        try {
            if (isPin) {
                await invoke<User>('unlock_with_pin', {
                    username: currentUser.username,
                    pin: password,
                });
            } else {
                const pwBuffer = new TextEncoder().encode(password);
                const hashBuf = await crypto.subtle.digest('SHA-256', pwBuffer);
                const hashHex = Array.from(new Uint8Array(hashBuf))
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('');

                await invoke<User>('unlock_with_password', {
                    username: currentUser.username,
                    passwordHash: hashHex,
                });
            }
            setIsLocked(false);
        } catch (error) {
            throw error;
        }
    };

    const logout = async (client: any) => {
        await client.logout();
        // Emitir evento para que WindowManager cierre todas las ventanas
        window.dispatchEvent(new CustomEvent('session:logout'));
        setCurrentUser(null);
        setIsLocked(false);
        setSessionDuration(null);
    };

    const setPin = async (pin: string): Promise<void> => {
        if (!currentUser) throw new Error('No hay usuario en sesión');
        await invoke('set_user_pin', { username: currentUser.username, pin });
        setCurrentUser({ ...currentUser, pin });
    };

    const removePin = async (): Promise<void> => {
        if (!currentUser) throw new Error('No hay usuario en sesión');
        await invoke('remove_user_pin', { username: currentUser.username });
        const updatedUser = { ...currentUser };
        delete updatedUser.pin;
        setCurrentUser(updatedUser);
    };

    const verifySession = async (client: any): Promise<boolean> => {
        try {
            return await client.verifySession();
        } catch (error) {
            return false;
        }
    };

    const exitApp = async () => {
        await invoke('exit_application');
    };

    return (
        <SessionContext.Provider value={{
            currentUser, isLoading, isLocked, sessionDuration,
            login, loginWithPin, lockScreen, unlock, logout,
            setPin, removePin, verifySession, exitApp,
            refreshSession: loadSession
        }}>
            {children}
        </SessionContext.Provider>
    );
}

export function useSessionContext() {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSessionContext must be used within a SessionProvider');
    }
    return context;
}
