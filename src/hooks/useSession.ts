import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface User {
    id: number;
    username: string;
    name: string;
    role: string;
}

interface SessionInfo {
    user: User;
    login_time: string;
}

export function useSession() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionDuration, setSessionDuration] = useState<number | null>(null);

    useEffect(() => {
        loadSession();

        // Actualizar duración de sesión cada minuto
        const interval = setInterval(loadSessionDuration, 60000);
        return () => clearInterval(interval);
    }, []);

    const loadSession = async () => {
        setIsLoading(true);
        try {
            const user = await invoke<User>('get_current_user');
            setCurrentUser(user);
            loadSessionDuration();
        } catch (error) {
            console.error('No hay sesión activa:', error);
            setCurrentUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSessionDuration = async () => {
        try {
            const duration = await invoke<number | null>('get_session_duration');
            setSessionDuration(duration);
        } catch (error) {
            console.error('Error obteniendo duración de sesión:', error);
        }
    };

    const login = async (username: string, password: string): Promise<User> => {
        const pwBuffer = new TextEncoder().encode(password);
        const hashBuf = await crypto.subtle.digest('SHA-256', pwBuffer);
        const hashHex = Array.from(new Uint8Array(hashBuf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

        const user = await invoke<User>('login_user', {
            username,
            passwordHash: hashHex,
        });

        setCurrentUser(user);
        loadSessionDuration();
        return user;
    };

    const logout = async () => {
        await invoke('logout_user');
        setCurrentUser(null);
        setSessionDuration(null);
    };

    const verifySession = async (): Promise<boolean> => {
        try {
            return await invoke<boolean>('verify_session');
        } catch (error) {
            return false;
        }
    };

    const exitApp = async () => {
        await invoke('exit_application');
    };

    return {
        currentUser,
        isLoading,
        sessionDuration,
        login,
        logout,
        verifySession,
        exitApp,
        refreshSession: loadSession,
    };
}
