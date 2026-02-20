import { useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';

interface PluginFrameProps {
    pluginId: string;
    entryFile: string;
    permissions: string[];
    onLoad?: () => void;
    onError?: (error: string) => void;
}

export function PluginFrame({
    pluginId,
    entryFile,
    permissions,
    onLoad,
    onError
}: PluginFrameProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [src, setSrc] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get the plugin asset URL from Rust
        invoke<string>('get_plugin_asset_url', {
            pluginId,
            filePath: entryFile
        })
            .then((path) => {
                const assetUrl = convertFileSrc(path);
                setSrc(assetUrl);
            })
            .catch((error) => {
                console.error('Failed to load plugin:', error);
                onError?.(error);
            });
    }, [pluginId, entryFile]);

    useEffect(() => {
        if (!src) return;

        // Setup message bridge for plugin communication
        const handleMessage = async (event: MessageEvent) => {
            // Verify origin is from Tauri asset protocol
            if (!event.origin.startsWith('http://asset.localhost') &&
                !event.origin.startsWith('https://asset.localhost') &&
                !event.origin.startsWith('asset://')) {
                return;
            }

            const { action, payload, requestId } = event.data;

            if (!action || !requestId) return;

            // Check if plugin has permission for this action
            const hasPermission = checkPermission(action, permissions);

            if (!hasPermission) {
                iframeRef.current?.contentWindow?.postMessage(
                    {
                        requestId,
                        error: `Permission denied: plugin does not have permission for '${action}'`
                    },
                    '*'
                );
                return;
            }

            // Execute the command and return result
            try {
                const result = await invoke(`plugin_${action}`, {
                    pluginId,
                    ...payload
                });

                iframeRef.current?.contentWindow?.postMessage(
                    { requestId, result },
                    '*'
                );
            } catch (error) {
                iframeRef.current?.contentWindow?.postMessage(
                    { requestId, error: String(error) },
                    '*'
                );
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [src, pluginId, permissions]);

    const handleLoad = () => {
        setLoading(false);
        onLoad?.();
    };

    const handleError = () => {
        setLoading(false);
        onError?.('Failed to load plugin iframe');
    };

    if (!src) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-gray-500">Loading plugin...</div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full">
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white">
                    <div className="text-gray-500">Loading plugin...</div>
                </div>
            )}
            <iframe
                ref={iframeRef}
                src={src}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin"
                onLoad={handleLoad}
                onError={handleError}
                title={`Plugin: ${pluginId}`}
            />
        </div>
    );
}

// Permission mapping: permission -> allowed actions
const PERMISSION_ACTIONS: Record<string, string[]> = {
    'patients:read': ['get_patients', 'get_patient'],
    'patients:write': ['create_patient', 'update_patient'],
    'treatments:read': ['get_treatments', 'get_treatment'],
    'treatments:write': ['create_treatment', 'update_treatment'],
    'appointments:read': ['get_appointments', 'get_appointment'],
    'appointments:write': ['create_appointment', 'update_appointment', 'delete_appointment'],
    'payments:read': ['get_payments', 'get_payment'],
    'payments:write': ['create_payment', 'update_payment'],
    'storage:read': ['storage_get'],
    'storage:write': ['storage_set', 'storage_remove', 'storage_clear'],
    'system:commands': ['execute_command'],
};

function checkPermission(action: string, permissions: string[]): boolean {
    for (const permission of permissions) {
        const allowedActions = PERMISSION_ACTIONS[permission];
        if (allowedActions && allowedActions.includes(action)) {
            return true;
        }
    }
    return false;
}
