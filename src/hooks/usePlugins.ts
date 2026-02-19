import { useEffect, useState } from 'react';
import { pluginManager } from '../lib/PluginManager';
import type { InstalledPlugin } from '../types/plugin';

export function usePlugins() {
    const [plugins, setPlugins] = useState<InstalledPlugin[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        try {
            await pluginManager.initialize();
            const installed = pluginManager.getAllPlugins();
            setPlugins(installed);
        } catch (error) {
            console.error('Failed to load plugins:', error);
        } finally {
            setLoading(false);
        }
    };

    const installPlugin = async (pluginPath: string) => {
        await pluginManager.installPlugin(pluginPath);
        await loadPlugins();
    };

    const uninstallPlugin = async (pluginId: string) => {
        await pluginManager.uninstallPlugin(pluginId);
        await loadPlugins();
    };

    const enablePlugin = async (pluginId: string) => {
        await pluginManager.enablePlugin(pluginId);
        await loadPlugins();
    };

    const disablePlugin = async (pluginId: string) => {
        await pluginManager.disablePlugin(pluginId);
        await loadPlugins();
    };

    return {
        plugins,
        loading,
        installPlugin,
        uninstallPlugin,
        enablePlugin,
        disablePlugin,
        reload: loadPlugins,
    };
}
