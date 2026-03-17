import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PluginFrame } from './PluginFrame';

interface PluginWindowWrapperProps {
    pluginId: string;
    data?: any;
}

interface PluginManifest {
    id: string;
    name: string;
    entry: string;
    permissions: string[];
}

interface InstalledPluginEntry {
    manifest: PluginManifest;
    granted_permissions?: string[];
    grantedPermissions?: string[];
}

export function PluginWindowWrapper({ pluginId, data }: PluginWindowWrapperProps) {
    const [manifest, setManifest] = useState<PluginManifest | null>(null);
    const [grantedPermissions, setGrantedPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load plugin runtime state from installed plugins list
        invoke<InstalledPluginEntry[]>('get_installed_plugins')
            .then((plugins) => {
                const plugin = plugins.find((item) => item.manifest.id === pluginId);

                if (!plugin) {
                    throw new Error('Plugin not found');
                }

                setManifest(plugin.manifest);
                setGrantedPermissions(plugin.granted_permissions || plugin.grantedPermissions || []);
                setLoading(false);
            })
            .catch((err) => {
                setError(err.toString());
                setLoading(false);
            });
    }, [pluginId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/50">Cargando plugin...</div>
            </div>
        );
    }

    if (error || !manifest) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-red-400">Error: {error || 'Manifest not found'}</div>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <PluginFrame
                pluginId={pluginId}
                entryFile={manifest.entry}
                permissions={grantedPermissions}
                onError={(err) => {
                    console.error('Plugin error:', err);
                    setError(err);
                }}
            />
        </div>
    );
}
