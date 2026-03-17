import { useEffect, useRef, useState, type ReactNode } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { invoke } from '@tauri-apps/api/core';
import { Shield } from 'lucide-react';
import {
    PeopleListColor,
    CalendarColor,
    SavingsColor,
    DocumentFolderColor,
    WrenchColor,
    AppsColor,
    PersonStarburstColor,
    ShieldColor as ShieldTaskColor,
} from '@fluentui/react-icons';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    PLUGIN_NOTIFICATION_EVENT,
    type PluginNotificationPayload,
} from '@/consts/plugin-events';

interface PluginFrameProps {
    pluginId: string;
    entryFile: string;
    permissions: string[];
    onLoad?: () => void;
    onError?: (error: string) => void;
}

interface RuntimePermissionRequest {
    requestId: string;
    origin: string;
    requested: string[];
    selected: string[];
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
    const [grantedPermissions, setGrantedPermissions] = useState<string[]>(permissions);
    const [runtimePermissionRequest, setRuntimePermissionRequest] = useState<RuntimePermissionRequest | null>(null);

    useEffect(() => {
        setGrantedPermissions(permissions);
    }, [permissions]);

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

        let pluginOrigin: string | null = null;
        try {
            pluginOrigin = new URL(src).origin;
        } catch {
            pluginOrigin = null;
        }

        // Setup message bridge for plugin communication
        const handleMessage = async (event: MessageEvent) => {
            const iframeWindow = iframeRef.current?.contentWindow;

            // Only accept messages from this plugin iframe instance
            if (!iframeWindow || event.source !== iframeWindow) {
                return;
            }

            // Verify origin is from the plugin document loaded in this iframe
            if (pluginOrigin && event.origin !== pluginOrigin) {
                return;
            }

            // Fallback for asset protocol environments
            if (!pluginOrigin &&
                !event.origin.startsWith('http://asset.localhost') &&
                !event.origin.startsWith('https://asset.localhost') &&
                !event.origin.startsWith('asset://')) {
                return;
            }

            const { action, payload, requestId } = event.data;

            if (!action || !requestId) return;

            // SDK metadata action that never requires plugin permissions
            if (action === 'sdk_get_permissions') {
                iframeWindow.postMessage(
                    { requestId, result: grantedPermissions },
                    event.origin || '*'
                );
                return;
            }

            if (action === 'sdk_request_permissions') {
                const requestedPermissions = normalizePermissionList(payload?.permissions);

                if (requestedPermissions.length === 0) {
                    iframeWindow.postMessage(
                        { requestId, error: 'No permissions were requested' },
                        event.origin || '*'
                    );
                    return;
                }

                const missingPermissions = requestedPermissions.filter(
                    (permission) => !grantedPermissions.includes(permission)
                );

                if (missingPermissions.length === 0) {
                    iframeWindow.postMessage(
                        {
                            requestId,
                            result: {
                                grantedPermissions,
                                granted: requestedPermissions,
                                denied: [],
                            },
                        },
                        event.origin || '*'
                    );
                    return;
                }

                setRuntimePermissionRequest({
                    requestId,
                    origin: event.origin || '*',
                    requested: missingPermissions,
                    selected: [...missingPermissions],
                });
                return;
            }

            // Check if plugin has permission for this action
            const hasPermission = checkPermission(action, grantedPermissions);

            if (!hasPermission) {
                iframeWindow.postMessage(
                    {
                        requestId,
                        error: `Permission denied: plugin does not have permission for '${action}'`
                    },
                    event.origin || '*'
                );
                return;
            }

            if (action === 'show_notification') {
                const notificationPayload = normalizePluginNotificationPayload(payload);

                if (!notificationPayload) {
                    iframeWindow.postMessage(
                        {
                            requestId,
                            error: 'Invalid notification payload: title is required',
                        },
                        event.origin || '*'
                    );
                    return;
                }

                window.dispatchEvent(
                    new CustomEvent<PluginNotificationPayload>(PLUGIN_NOTIFICATION_EVENT, {
                        detail: {
                            ...notificationPayload,
                            pluginId,
                        },
                    })
                );

                iframeWindow.postMessage(
                    { requestId, result: true },
                    event.origin || '*'
                );
                return;
            }

            // Execute the command and return result
            try {
                const result = await invoke(`plugin_${action}`, {
                    pluginId,
                    ...payload
                });

                iframeWindow.postMessage(
                    { requestId, result },
                    event.origin || '*'
                );
            } catch (error) {
                iframeWindow.postMessage(
                    { requestId, error: String(error) },
                    event.origin || '*'
                );
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [src, pluginId, grantedPermissions]);

    const respondRuntimePermissionRequest = async (approve: boolean) => {
        const pending = runtimePermissionRequest;
        const iframeWindow = iframeRef.current?.contentWindow;

        if (!pending || !iframeWindow) {
            setRuntimePermissionRequest(null);
            return;
        }

        if (!approve || pending.selected.length === 0) {
            iframeWindow.postMessage(
                {
                    requestId: pending.requestId,
                    result: {
                        grantedPermissions,
                        granted: [],
                        denied: pending.requested,
                    },
                },
                pending.origin
            );
            setRuntimePermissionRequest(null);
            return;
        }

        try {
            const updatedPermissions = await invoke<string[]>('request_plugin_permissions', {
                pluginId,
                permissions: pending.selected,
            });

            const granted = pending.requested.filter((permission) => updatedPermissions.includes(permission));
            const denied = pending.requested.filter((permission) => !updatedPermissions.includes(permission));

            setGrantedPermissions(updatedPermissions);

            iframeWindow.postMessage(
                {
                    requestId: pending.requestId,
                    result: {
                        grantedPermissions: updatedPermissions,
                        granted,
                        denied,
                    },
                },
                pending.origin
            );
        } catch (error) {
            iframeWindow.postMessage(
                {
                    requestId: pending.requestId,
                    error: String(error),
                },
                pending.origin
            );
        } finally {
            setRuntimePermissionRequest(null);
        }
    };

    const toggleRuntimePermission = (permission: string) => {
        setRuntimePermissionRequest((current) => {
            if (!current) return current;
            if (current.selected.includes(permission)) {
                return {
                    ...current,
                    selected: current.selected.filter((item) => item !== permission),
                };
            }
            return {
                ...current,
                selected: [...current.selected, permission],
            };
        });
    };

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

            <AlertDialog
                open={Boolean(runtimePermissionRequest)}
                onOpenChange={(open) => {
                    if (!open) {
                        void respondRuntimePermissionRequest(false);
                    }
                }}
            >
                <AlertDialogContent className="max-w-2xl border-[#3f3f3f] bg-[#1f1f1f] p-0 text-white shadow-2xl sm:rounded-[8px]">
                    <AlertDialogHeader className="border-b border-[#3a3a3a] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))] px-6 pt-5 pb-4">
                        <AlertDialogTitle className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-white">
                            <Shield size={18} className="text-[#4cc2ff]" />
                            Solicitud de permisos en runtime
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[12px] text-[#c8c8c8]">
                            Este plugin solicita nuevos permisos durante la ejecución.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {runtimePermissionRequest && (
                        <div className="space-y-3 px-6 py-4">
                            {runtimePermissionRequest.requested.map((permission) => {
                                const meta = getPermissionMeta(permission);
                                const selected = runtimePermissionRequest.selected.includes(permission);

                                return (
                                    <label
                                        key={permission}
                                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${selected
                                            ? 'border-[#4da6ff]/50 bg-[rgba(0,120,212,0.16)]'
                                            : 'border-[#444] bg-[#232323] hover:bg-[#2a2a2a]'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={() => toggleRuntimePermission(permission)}
                                            className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent accent-[#0078d4]"
                                        />
                                        <div className="mt-0.5">{meta.icon}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm font-medium text-white">{meta.label}</div>
                                                {meta.dangerous && (
                                                    <span className="rounded bg-[#4d1f1f] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#ffb4b4]">
                                                        Alto riesgo
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-white/65">{meta.description}</div>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    )}

                    <AlertDialogFooter className="border-t border-[#3a3a3a] bg-[#1b1b1b] px-6 py-4">
                        <AlertDialogCancel
                            onClick={() => void respondRuntimePermissionRequest(false)}
                            className="mt-0 border-[#5a5a5a] bg-[#2a2a2a] text-[#f3f3f3] hover:bg-[#323232] hover:text-white"
                        >
                            Denegar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => void respondRuntimePermissionRequest(true)}
                            className="bg-[#0078d4] text-white hover:bg-[#106ebe] active:bg-[#005a9e]"
                        >
                            Conceder seleccionados
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function normalizePermissionList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];

    const asStrings = value.filter((item): item is string => typeof item === 'string');
    return Array.from(new Set(asStrings));
}

function normalizePluginNotificationPayload(payload: unknown): PluginNotificationPayload | null {
    if (!payload || typeof payload !== 'object') {
        return null;
    }

    const data = payload as Record<string, unknown>;
    const title = typeof data.title === 'string' ? data.title.trim() : '';

    if (!title) {
        return null;
    }

    const safeType = data.type;
    const safePriority = data.priority;

    return {
        title,
        message: typeof data.message === 'string' ? data.message : undefined,
        type:
            safeType === 'info' || safeType === 'success' || safeType === 'warning' || safeType === 'error'
                ? safeType
                : undefined,
        icon: typeof data.icon === 'string' ? data.icon : undefined,
        priority:
            safePriority === 'low' ||
                safePriority === 'normal' ||
                safePriority === 'high' ||
                safePriority === 'urgent'
                ? safePriority
                : undefined,
        duration: typeof data.duration === 'number' ? data.duration : undefined,
        sound: typeof data.sound === 'boolean' ? data.sound : undefined,
        soundFile: typeof data.soundFile === 'string' ? data.soundFile : undefined,
    };
}

function getPermissionMeta(permission: string): {
    label: string;
    description: string;
    icon: ReactNode;
    dangerous: boolean;
} {
    const fallback = {
        label: permission.replace(':', ' / '),
        description: 'Permiso personalizado del plugin.',
        icon: <AppsColor className="h-5 w-5" />,
        dangerous: false,
    };

    const map: Record<string, { label: string; description: string; icon: ReactNode; dangerous: boolean }> = {
        'patients:read': {
            label: 'Pacientes (lectura)',
            description: 'Permite leer fichas y datos clínicos de pacientes.',
            icon: <PeopleListColor className="h-5 w-5" />,
            dangerous: false,
        },
        'patients:write': {
            label: 'Pacientes (escritura)',
            description: 'Permite crear o modificar fichas de pacientes.',
            icon: <PeopleListColor className="h-5 w-5" />,
            dangerous: true,
        },
        'treatments:read': {
            label: 'Tratamientos (lectura)',
            description: 'Permite ver tratamientos y evolución clínica.',
            icon: <DocumentFolderColor className="h-5 w-5" />,
            dangerous: false,
        },
        'treatments:write': {
            label: 'Tratamientos (escritura)',
            description: 'Permite crear y editar tratamientos.',
            icon: <DocumentFolderColor className="h-5 w-5" />,
            dangerous: true,
        },
        'appointments:read': {
            label: 'Agenda (lectura)',
            description: 'Permite consultar turnos y disponibilidad.',
            icon: <CalendarColor className="h-5 w-5" />,
            dangerous: false,
        },
        'appointments:write': {
            label: 'Agenda (escritura)',
            description: 'Permite crear, editar o eliminar turnos.',
            icon: <CalendarColor className="h-5 w-5" />,
            dangerous: true,
        },
        'payments:read': {
            label: 'Pagos (lectura)',
            description: 'Permite consultar cobros y cuentas corrientes.',
            icon: <SavingsColor className="h-5 w-5" />,
            dangerous: false,
        },
        'payments:write': {
            label: 'Pagos (escritura)',
            description: 'Permite registrar o modificar pagos.',
            icon: <SavingsColor className="h-5 w-5" />,
            dangerous: true,
        },
        'storage:read': {
            label: 'Almacenamiento local (lectura)',
            description: 'Permite leer datos locales del plugin.',
            icon: <ShieldTaskColor className="h-5 w-5" />,
            dangerous: false,
        },
        'storage:write': {
            label: 'Almacenamiento local (escritura)',
            description: 'Permite guardar o borrar datos locales del plugin.',
            icon: <ShieldTaskColor className="h-5 w-5" />,
            dangerous: false,
        },
        'storage:local': {
            label: 'Almacenamiento local',
            description: 'Permite leer y escribir datos locales del plugin.',
            icon: <ShieldTaskColor className="h-5 w-5" />,
            dangerous: false,
        },
        'ui:notifications': {
            label: 'Notificaciones',
            description: 'Permite mostrar avisos dentro de Galeno.',
            icon: <PersonStarburstColor className="h-5 w-5" />,
            dangerous: false,
        },
        'api:network': {
            label: 'Red externa',
            description: 'Permite comunicarse con servicios fuera de Galeno.',
            icon: <AppsColor className="h-5 w-5" />,
            dangerous: true,
        },
        'system:commands': {
            label: 'Comandos del sistema',
            description: 'Permite ejecutar comandos del sistema operativo.',
            icon: <WrenchColor className="h-5 w-5" />,
            dangerous: true,
        },
    };

    return map[permission] || fallback;
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
    'storage:local': ['storage_get', 'storage_set', 'storage_remove', 'storage_clear'],
    'ui:notifications': ['show_notification'],
    'api:network': ['network_fetch'],
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
