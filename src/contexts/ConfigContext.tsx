import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { ConfigDefinition } from '@/types/config';

type ConfigSchema = Record<string, ConfigDefinition>;
type ConfigValues = Record<string, unknown>;

interface ConfigContextType {
    schema: ConfigSchema | null;
    values: ConfigValues;
    isLoading: boolean;
    reload: () => Promise<void>;
    setConfigValue: (key: string, value: unknown) => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
    const [schema, setSchema] = useState<ConfigSchema | null>(null);
    const [values, setValues] = useState<ConfigValues>({});
    const [isLoading, setIsLoading] = useState(true);

    const load = useCallback(async () => {
        setIsLoading(true);
        try {
            const [schemaResponse, valuesResponse] = await Promise.all([
                invoke<ConfigSchema>('get_config_schema'),
                invoke<ConfigValues>('get_config_values'),
            ]);

            setSchema(schemaResponse ?? {});
            setValues(valuesResponse ?? {});
        } catch (error) {
            console.error('Error cargando configuración:', error);
            // Evitamos toast en el primer load para no molestar en splash
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setConfigValue = useCallback(async (key: string, value: unknown) => {
        try {
            await invoke('set_config_value', { key, value });
            setValues(prev => ({ ...prev, [key]: value }));
        } catch (error) {
            console.error('Error al guardar configuración:', error);
            toast.error('Error al guardar la configuración');
            throw error;
        }
    }, []);

    return (
        <ConfigContext.Provider value={{ schema, values, isLoading, reload: load, setConfigValue }}>
            {children}
        </ConfigContext.Provider>
    );
}

export function useConfigContext() {
    const context = useContext(ConfigContext);
    if (context === undefined) {
        throw new Error('useConfigContext must be used within a ConfigProvider');
    }
    return context;
}
