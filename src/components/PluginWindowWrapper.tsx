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

export function PluginWindowWrapper({ pluginId, data }: PluginWindowWrapperProps) {
    const [manifest, setManifest] = useState<PluginManifest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Load plugin manifest
        invoke<PluginManifest>('get_plugin_manifest', { pluginId })
            .then((data) => {
                setManifest(data);
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
                permissions={manifest.permissions || []}
                onError={(err) => {
                    console.error('Plugin error:', err);
                    setError(err);
                }}
            />
        </div>
    );
}
