import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { ConfigDefinition } from '@/types/config';

type ConfigSchema = Record<string, ConfigDefinition>;

type ConfigValues = Record<string, unknown>;

export function useConfig() {
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
            toast.error('No se pudo cargar la configuración');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const setConfigValue = useCallback(async (key: string, value: unknown) => {
        await invoke('set_config_value', { key, value });
        setValues(prev => ({ ...prev, [key]: value }));
    }, []);

    return {
        schema,
        values,
        isLoading,
        reload: load,
        setConfigValue,
    };
}
