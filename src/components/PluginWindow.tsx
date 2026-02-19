import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { InstalledPluginRust } from '../types/plugin';

interface PluginWindowProps {
    pluginId: string;
    data?: any;
}

export function PluginWindow({ pluginId, data }: PluginWindowProps) {
    const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPluginComponent();
    }, [pluginId]);

    const loadPluginComponent = async () => {
        try {
            // Get plugin info from Rust
            const plugins = await invoke<InstalledPluginRust[]>('get_installed_plugins');
            const plugin = plugins.find(p => p.manifest.id === pluginId);

            if (!plugin) {
                setError('Plugin no encontrado');
                return;
            }

            // Check if it's a first-party plugin (bundled with the app)
            if (pluginId.startsWith('com.nuevogaleno.')) {
                // Load from bundled source
                const pluginName = pluginId.split('.').pop(); // e.g., 'backup' or 'analytics'

                try {
                    let module;
                    if (pluginName === 'backup') {
                        module = await import('../plugins/backup/components/BackupManager');
                        setComponent(() => module.BackupManager);
                    } else if (pluginName === 'analytics') {
                        module = await import('../plugins/analytics/components/AnalyticsDashboard');
                        setComponent(() => module.AnalyticsDashboard);
                    } else {
                        setError('Plugin first-party no reconocido');
                    }
                } catch (err) {
                    console.error('Failed to load first-party plugin:', err);
                    setError('Error al cargar el plugin');
                }
            } else {
                // Third-party plugin - load from file system
                try {
                    const module = await import(
                        /* @vite-ignore */
                        `${plugin.path}/components/MainWindow.jsx`
                    );
                    setComponent(() => module.default);
                } catch (err) {
                    console.error('Failed to load third-party plugin:', err);
                    setError('Error al cargar el plugin');
                }
            }
        } catch (err) {
            console.error('Failed to load plugin component:', err);
            setError('Error al cargar el plugin');
        }
    };

    if (error) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="text-red-400 text-lg mb-2">⚠️</div>
                    <div className="text-white/70">{error}</div>
                    <div className="text-white/50 text-sm mt-2">Plugin ID: {pluginId}</div>
                </div>
            </div>
        );
    }

    if (!Component) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Cargando plugin...</div>
            </div>
        );
    }

    return <Component data={data} />;
}
