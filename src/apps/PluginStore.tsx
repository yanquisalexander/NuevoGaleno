import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, ExternalLink, Power, PowerOff, Shield, Star, Trash2 } from 'lucide-react';
import {
    AppsColor,
    CalendarColor,
    CheckmarkCircleColor,
    DocumentFolderColor,
    PeopleListColor,
    PersonStarburstColor,
    SavingsColor,
    ShieldColor as ShieldTaskColor,
    WrenchColor,
} from '@fluentui/react-icons';
import type { InstalledPlugin, StorePlugin } from '../types/plugin';
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
import { toast } from 'sonner';

const tokens = {
    colorNeutralBackground2: '#1f1f1f',
    colorNeutralBackground3: '#141414',
    colorNeutralBackground4: '#262626',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: '#d6d6d6',
    colorNeutralForeground3: '#a6a6a6',
    colorNeutralStroke1: '#333333',
    colorNeutralStroke2: '#3f3f3f',
    colorBrandBackground: '#0078d4',
    colorBrandBackgroundHover: '#106ebe',
    colorBrandBackgroundPressed: '#005a9e',
    colorBrandForeground: '#7cc4ff',
    colorSuccessBackground: 'rgba(16, 124, 16, 0.2)',
    colorSuccessForeground: '#7ad47a',
    colorDangerBackground: 'rgba(196, 43, 28, 0.2)',
    colorDangerForeground: '#ff9f9f',
    colorWarningBackground: 'rgba(255, 185, 0, 0.16)',
    colorWarningForeground: '#ffd26e',
    borderRadiusMedium: '6px',
    borderRadiusLarge: '10px',
    fontFamilyBase: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
};

const fluentDialogContentClass =
    'max-w-2xl border-[#3f3f3f] bg-[#1f1f1f] p-0 text-white shadow-2xl sm:rounded-[8px]';
const fluentDialogSecondaryActionClass =
    'mt-0 border-[#5a5a5a] bg-[#2a2a2a] text-[#f3f3f3] hover:bg-[#323232] hover:text-white';
const fluentDialogPrimaryActionClass =
    'bg-[#0078d4] text-white hover:bg-[#106ebe] active:bg-[#005a9e]';

export function PluginStore() {
    const [view, setView] = useState<'store' | 'installed'>('store');
    const [search, setSearch] = useState('');
    const [storePlugins, setStorePlugins] = useState<StorePlugin[]>([]);
    const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
    const [loading, setLoading] = useState(false);

    const [selectedPlugin, setSelectedPlugin] = useState<StorePlugin | null>(null);
    const [uninstallDialog, setUninstallDialog] = useState<{ open: boolean; pluginId: string | null }>({
        open: false,
        pluginId: null,
    });

    const [installDialog, setInstallDialog] = useState<{ open: boolean; plugin: StorePlugin | null }>({
        open: false,
        plugin: null,
    });
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    const [permissionManager, setPermissionManager] = useState<{
        open: boolean;
        plugin: InstalledPlugin | null;
    }>({ open: false, plugin: null });

    useEffect(() => {
        void loadInstalledPlugins();
        if (view === 'store') {
            void loadStorePlugins();
        }
    }, [view]);

    const loadStorePlugins = async () => {
        setLoading(true);
        try {
            const plugins = await invoke<StorePlugin[]>('get_store_plugins');
            setStorePlugins(plugins);
        } catch (error) {
            console.error('Failed to load store plugins:', error);
            toast.error('No se pudo cargar la tienda de plugins');
        } finally {
            setLoading(false);
        }
    };

    const loadInstalledPlugins = async () => {
        try {
            const plugins = await invoke<InstalledPlugin[]>('get_installed_plugins');
            setInstalledPlugins(plugins);
        } catch (error) {
            console.error('Failed to load installed plugins:', error);
            toast.error('No se pudieron cargar los plugins instalados');
        }
    };

    const installPlugin = async (pluginId: string, grantedPermissions: string[]) => {
        try {
            await invoke('install_plugin_from_store', { pluginId, grantedPermissions });
            await loadInstalledPlugins();
            window.dispatchEvent(new CustomEvent('plugin:changed'));
            toast.success('Plugin instalado correctamente');
        } catch (error) {
            console.error('Failed to install plugin:', error);
            toast.error('Error al instalar el plugin');
        }
    };

    const togglePlugin = async (pluginId: string, enabled: boolean) => {
        try {
            if (enabled) {
                await invoke('disable_plugin', { pluginId });
            } else {
                await invoke('enable_plugin', { pluginId });
            }
            await loadInstalledPlugins();
            window.dispatchEvent(new CustomEvent('plugin:changed'));
        } catch (error) {
            console.error('Failed to toggle plugin:', error);
            toast.error('No se pudo cambiar el estado del plugin');
        }
    };

    const uninstallPlugin = async () => {
        if (!uninstallDialog.pluginId) return;

        try {
            await invoke('uninstall_plugin', { pluginId: uninstallDialog.pluginId });
            await loadInstalledPlugins();
            window.dispatchEvent(new CustomEvent('plugin:changed'));
            toast.success('Plugin desinstalado correctamente');
        } catch (error) {
            console.error('Failed to uninstall plugin:', error);
            toast.error('Error al desinstalar el plugin');
        } finally {
            setUninstallDialog({ open: false, pluginId: null });
        }
    };

    const isInstalled = (pluginId: string) => installedPlugins.some((plugin) => plugin.manifest.id === pluginId);

    const filteredStorePlugins = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return storePlugins;

        return storePlugins.filter((plugin) => {
            const text = [
                plugin.manifest.name,
                plugin.manifest.description,
                plugin.manifest.author,
                plugin.manifest.id,
            ]
                .join(' ')
                .toLowerCase();
            return text.includes(query);
        });
    }, [storePlugins, search]);

    const filteredInstalledPlugins = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return installedPlugins;

        return installedPlugins.filter((plugin) => {
            const text = [
                plugin.manifest.name,
                plugin.manifest.description,
                plugin.manifest.author,
                plugin.manifest.id,
            ]
                .join(' ')
                .toLowerCase();
            return text.includes(query);
        });
    }, [installedPlugins, search]);

    const openInstallDialog = (pluginId: string) => {
        const plugin = storePlugins.find((item) => item.manifest.id === pluginId) ?? null;
        if (!plugin) return;

        setSelectedPermissions([...plugin.manifest.permissions]);
        setInstallDialog({ open: true, plugin });
    };

    const confirmInstall = async () => {
        const plugin = installDialog.plugin;
        if (!plugin) return;

        await installPlugin(plugin.manifest.id, selectedPermissions);
        setInstallDialog({ open: false, plugin: null });
        setSelectedPermissions([]);
    };

    const openPermissionManager = (plugin: InstalledPlugin) => {
        const granted = getGrantedPermissions(plugin);
        setSelectedPermissions(granted.length > 0 ? granted : []);
        setPermissionManager({ open: true, plugin });
    };

    const saveManagedPermissions = async () => {
        const plugin = permissionManager.plugin;
        if (!plugin) return;

        try {
            await invoke<string[]>('set_plugin_permissions', {
                pluginId: plugin.manifest.id,
                permissions: selectedPermissions,
            });

            await loadInstalledPlugins();
            window.dispatchEvent(new CustomEvent('plugin:changed'));
            toast.success('Permisos actualizados');
            setPermissionManager({ open: false, plugin: null });
            setSelectedPermissions([]);
        } catch (error) {
            console.error('Failed to set plugin permissions:', error);
            toast.error('No se pudieron actualizar los permisos');
        }
    };

    const togglePermission = (permission: string) => {
        setSelectedPermissions((current) => {
            if (current.includes(permission)) {
                return current.filter((item) => item !== permission);
            }
            return [...current, permission];
        });
    };

    const managedRequestedPermissions = permissionManager.plugin
        ? getRequestedPermissions(permissionManager.plugin)
        : [];

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: tokens.colorNeutralBackground2,
                color: tokens.colorNeutralForeground1,
                fontFamily: tokens.fontFamilyBase,
            }}
        >
            <header
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '18px 20px 14px',
                    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
                }}
            >
                <div>
                    <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em' }}>
                        Tienda de plugins
                    </h2>
                    <p style={{ margin: '4px 0 0', color: tokens.colorNeutralForeground3, fontSize: 12 }}>
                        Instala extensiones y controla sus permisos en un solo lugar.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SegmentedButton
                        active={view === 'store'}
                        onClick={() => setView('store')}
                        label={`Tienda (${storePlugins.length})`}
                    />
                    <SegmentedButton
                        active={view === 'installed'}
                        onClick={() => setView('installed')}
                        label={`Instalados (${installedPlugins.length})`}
                    />
                </div>
            </header>

            <div style={{ padding: '12px 20px', borderBottom: `1px solid ${tokens.colorNeutralStroke1}` }}>
                <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={view === 'store' ? 'Buscar en tienda...' : 'Buscar instalados...'}
                    style={{
                        width: '100%',
                        height: 34,
                        borderRadius: tokens.borderRadiusMedium,
                        border: `1px solid ${tokens.colorNeutralStroke2}`,
                        background: tokens.colorNeutralBackground3,
                        color: tokens.colorNeutralForeground1,
                        padding: '0 12px',
                        outline: 'none',
                        fontSize: 13,
                    }}
                />
            </div>

            <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {view === 'store' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 12 }}>
                        {filteredStorePlugins.map((plugin) => {
                            const installed = isInstalled(plugin.manifest.id);
                            return (
                                <SurfaceCard key={plugin.manifest.id}>
                                    <button
                                        onClick={() => setSelectedPlugin(plugin)}
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            color: 'inherit',
                                            width: '100%',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            padding: 0,
                                        }}
                                    >
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                                            <div style={{ fontSize: 28, lineHeight: 1 }}>{plugin.manifest.icon}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600 }}>{plugin.manifest.name}</div>
                                                    {plugin.verified && <CheckmarkCircleColor className="h-4 w-4" />}
                                                </div>
                                                <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3 }}>
                                                    {plugin.manifest.author}
                                                </div>
                                            </div>
                                        </div>

                                        <p
                                            style={{
                                                margin: 0,
                                                color: tokens.colorNeutralForeground2,
                                                fontSize: 12,
                                                minHeight: 36,
                                                lineHeight: 1.45,
                                            }}
                                        >
                                            {plugin.manifest.description}
                                        </p>
                                    </button>

                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            marginTop: 12,
                                            color: tokens.colorNeutralForeground3,
                                            fontSize: 11,
                                        }}
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Star size={12} color="#f5c542" fill="#f5c542" />
                                            {plugin.rating.toFixed(1)}
                                        </span>
                                        <span>{plugin.downloads.toLocaleString()} descargas</span>
                                    </div>

                                    <button
                                        onClick={() => openInstallDialog(plugin.manifest.id)}
                                        disabled={installed}
                                        style={primaryButtonStyle(!installed)}
                                    >
                                        <Download size={14} />
                                        {installed ? 'Instalado' : 'Instalar'}
                                    </button>
                                </SurfaceCard>
                            );
                        })}

                        {!loading && filteredStorePlugins.length === 0 && (
                            <EmptyState
                                title="No hay resultados"
                                message="No encontramos plugins en la tienda con ese criterio."
                            />
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filteredInstalledPlugins.map((plugin) => {
                            const granted = getGrantedPermissions(plugin);
                            const requested = getRequestedPermissions(plugin);

                            return (
                                <SurfaceCard key={plugin.manifest.id} dense>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ fontSize: 30, lineHeight: 1 }}>{plugin.manifest.icon}</div>

                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 14, fontWeight: 600 }}>{plugin.manifest.name}</span>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        color: plugin.enabled
                                                            ? tokens.colorSuccessForeground
                                                            : tokens.colorNeutralForeground3,
                                                        background: plugin.enabled
                                                            ? tokens.colorSuccessBackground
                                                            : 'rgba(255,255,255,0.06)',
                                                        borderRadius: 999,
                                                        padding: '2px 8px',
                                                    }}
                                                >
                                                    {plugin.enabled ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginTop: 2 }}>
                                                v{plugin.manifest.version} • {plugin.manifest.author}
                                            </div>
                                            <div style={{ fontSize: 12, color: tokens.colorNeutralForeground2, marginTop: 6 }}>
                                                {plugin.manifest.description}
                                            </div>
                                            <div style={{ fontSize: 11, color: tokens.colorNeutralForeground3, marginTop: 8 }}>
                                                Permisos: {granted.length}/{requested.length} concedidos
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <IconButton
                                                title={plugin.enabled ? 'Desactivar plugin' : 'Activar plugin'}
                                                onClick={() => togglePlugin(plugin.manifest.id, plugin.enabled)}
                                            >
                                                {plugin.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                                            </IconButton>

                                            <IconButton
                                                title="Gestionar permisos"
                                                onClick={() => openPermissionManager(plugin)}
                                            >
                                                <Shield size={16} />
                                            </IconButton>

                                            {plugin.manifest.homepage && (
                                                <IconButton title="Abrir sitio web" as="a" href={plugin.manifest.homepage}>
                                                    <ExternalLink size={16} />
                                                </IconButton>
                                            )}

                                            <IconButton
                                                title="Desinstalar"
                                                onClick={() => setUninstallDialog({ open: true, pluginId: plugin.manifest.id })}
                                                danger
                                            >
                                                <Trash2 size={16} />
                                            </IconButton>
                                        </div>
                                    </div>
                                </SurfaceCard>
                            );
                        })}

                        {filteredInstalledPlugins.length === 0 && (
                            <EmptyState
                                title="No hay plugins instalados"
                                message="Instala plugins desde la tienda para ampliar funciones de Galeno."
                                action={{
                                    label: 'Ir a la tienda',
                                    onClick: () => setView('store'),
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            {selectedPlugin && (
                <div
                    onClick={() => setSelectedPlugin(null)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.62)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                        zIndex: 70,
                    }}
                >
                    <div
                        onClick={(event) => event.stopPropagation()}
                        style={{
                            width: 'min(760px, 100%)',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            borderRadius: tokens.borderRadiusLarge,
                            border: `1px solid ${tokens.colorNeutralStroke2}`,
                            background: tokens.colorNeutralBackground2,
                            padding: 20,
                        }}
                    >
                        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                            <div style={{ fontSize: 42 }}>{selectedPlugin.manifest.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <h3 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{selectedPlugin.manifest.name}</h3>
                                    {selectedPlugin.verified && <CheckmarkCircleColor className="h-5 w-5" />}
                                </div>
                                <p style={{ margin: '4px 0 0', color: tokens.colorNeutralForeground3 }}>
                                    {selectedPlugin.manifest.author}
                                </p>
                            </div>
                        </div>

                        <p style={{ margin: '0 0 14px', color: tokens.colorNeutralForeground2, lineHeight: 1.5 }}>
                            {selectedPlugin.manifest.description}
                        </p>

                        {!selectedPlugin.verified && (
                            <div
                                style={{
                                    borderRadius: tokens.borderRadiusMedium,
                                    border: '1px solid rgba(255, 185, 0, 0.35)',
                                    background: tokens.colorWarningBackground,
                                    color: tokens.colorWarningForeground,
                                    fontSize: 12,
                                    padding: '8px 10px',
                                    marginBottom: 12,
                                }}
                            >
                                Plugin no verificado. Revisa permisos y procedencia antes de instalar.
                            </div>
                        )}

                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, color: tokens.colorNeutralForeground3, marginBottom: 8 }}>
                                Permisos solicitados
                            </div>
                            <div style={{ display: 'grid', gap: 8 }}>
                                {selectedPlugin.manifest.permissions.map((permission) => {
                                    const meta = getPermissionMeta(permission);
                                    return (
                                        <PermissionRow key={permission} meta={meta} selected readOnly />
                                    );
                                })}
                            </div>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                color: tokens.colorNeutralForeground3,
                                fontSize: 12,
                                marginBottom: 16,
                            }}
                        >
                            <span>Versión: {selectedPlugin.manifest.version}</span>
                            <span>Descargas: {selectedPlugin.downloads.toLocaleString()}</span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Star size={12} color="#f5c542" fill="#f5c542" />
                                {selectedPlugin.rating.toFixed(1)} ({selectedPlugin.reviews})
                            </span>
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setSelectedPlugin(null)}
                                style={secondaryButtonStyle()}
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    openInstallDialog(selectedPlugin.manifest.id);
                                    setSelectedPlugin(null);
                                }}
                                disabled={isInstalled(selectedPlugin.manifest.id)}
                                style={primaryButtonStyle(!isInstalled(selectedPlugin.manifest.id))}
                            >
                                <Download size={14} />
                                {isInstalled(selectedPlugin.manifest.id) ? 'Instalado' : 'Instalar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AlertDialog
                open={installDialog.open}
                onOpenChange={(open) => {
                    setInstallDialog({ open, plugin: open ? installDialog.plugin : null });
                    if (!open) setSelectedPermissions([]);
                }}
            >
                <AlertDialogContent className={fluentDialogContentClass}>
                    <AlertDialogHeader className="border-b border-[#3a3a3a] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))] px-6 pt-5 pb-4">
                        <AlertDialogTitle className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-white">
                            <Shield size={16} />
                            Permisos de instalación
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[12px] text-[#c8c8c8]">
                            Selecciona qué permisos quieres conceder al plugin en la instalación inicial.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {installDialog.plugin && (
                        <div style={{ display: 'grid', gap: 8, padding: '14px 24px 6px' }}>
                            {installDialog.plugin.manifest.permissions.map((permission) => (
                                <PermissionRow
                                    key={permission}
                                    meta={getPermissionMeta(permission)}
                                    selected={selectedPermissions.includes(permission)}
                                    onToggle={() => togglePermission(permission)}
                                />
                            ))}

                            <div
                                style={{
                                    marginTop: 4,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: 12,
                                    color: tokens.colorNeutralForeground3,
                                }}
                            >
                                <span>
                                    {selectedPermissions.length}/{installDialog.plugin.manifest.permissions.length} permisos concedidos
                                </span>
                                <button
                                    onClick={() => setSelectedPermissions([...installDialog.plugin!.manifest.permissions])}
                                    style={linkButtonStyle()}
                                >
                                    Conceder todos
                                </button>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter className="border-t border-[#3a3a3a] bg-[#1b1b1b] px-6 py-4">
                        <AlertDialogCancel className={fluentDialogSecondaryActionClass}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmInstall} className={fluentDialogPrimaryActionClass}>
                            Instalar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={permissionManager.open}
                onOpenChange={(open) => {
                    setPermissionManager({ open, plugin: open ? permissionManager.plugin : null });
                    if (!open) setSelectedPermissions([]);
                }}
            >
                <AlertDialogContent className={fluentDialogContentClass}>
                    <AlertDialogHeader className="border-b border-[#3a3a3a] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0))] px-6 pt-5 pb-4">
                        <AlertDialogTitle className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.01em] text-white">
                            <Shield size={16} />
                            Gestor de permisos
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-[12px] text-[#c8c8c8]">
                            {permissionManager.plugin
                                ? `Configura permisos para ${permissionManager.plugin.manifest.name}.`
                                : 'Configura permisos del plugin.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {permissionManager.plugin && (
                        <div style={{ display: 'grid', gap: 8, padding: '14px 24px 6px' }}>
                            {managedRequestedPermissions.map((permission) => (
                                <PermissionRow
                                    key={permission}
                                    meta={getPermissionMeta(permission)}
                                    selected={selectedPermissions.includes(permission)}
                                    onToggle={() => togglePermission(permission)}
                                />
                            ))}

                            <div
                                style={{
                                    marginTop: 4,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: 12,
                                    color: tokens.colorNeutralForeground3,
                                }}
                            >
                                <span>
                                    {selectedPermissions.length}/{managedRequestedPermissions.length} permisos concedidos
                                </span>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button
                                        onClick={() => setSelectedPermissions([...managedRequestedPermissions])}
                                        style={linkButtonStyle()}
                                    >
                                        Conceder todos
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (managedRequestedPermissions.length > 0) {
                                                setSelectedPermissions([managedRequestedPermissions[0]]);
                                            }
                                        }}
                                        style={linkButtonStyle()}
                                    >
                                        Minimo seguro
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <AlertDialogFooter className="border-t border-[#3a3a3a] bg-[#1b1b1b] px-6 py-4">
                        <AlertDialogCancel className={fluentDialogSecondaryActionClass}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={saveManagedPermissions} className={fluentDialogPrimaryActionClass}>
                            Guardar permisos
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={uninstallDialog.open}
                onOpenChange={(open) => setUninstallDialog({ open, pluginId: open ? uninstallDialog.pluginId : null })}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Desinstalar plugin</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta accion elimina el plugin y su almacenamiento local.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={uninstallPlugin} className="bg-red-600 hover:bg-red-700">
                            Desinstalar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function SurfaceCard({
    children,
    dense = false,
}: {
    children: ReactNode;
    dense?: boolean;
}) {
    return (
        <div
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: dense ? 10 : 12,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
        >
            {children}
        </div>
    );
}

function SegmentedButton({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                border: `1px solid ${active ? '#1f6fb3' : '#3f3f3f'}`,
                borderRadius: 6,
                background: active ? '#0078d4' : '#252525',
                color: active ? '#fff' : '#d6d6d6',
                fontSize: 12,
                fontWeight: 600,
                height: 32,
                padding: '0 12px',
                cursor: 'pointer',
            }}
        >
            {label}
        </button>
    );
}

type IconButtonProps = {
    title: string;
    onClick?: () => void;
    children: ReactNode;
    danger?: boolean;
    as?: 'button' | 'a';
    href?: string;
};

function IconButton({ title, onClick, children, danger = false, as = 'button', href }: IconButtonProps) {
    const style = {
        width: 32,
        height: 32,
        borderRadius: 6,
        border: `1px solid ${danger ? 'rgba(196,43,28,0.35)' : 'rgba(255,255,255,0.1)'}`,
        background: danger ? 'rgba(196,43,28,0.16)' : 'rgba(255,255,255,0.04)',
        color: danger ? '#ffaaaa' : '#d9d9d9',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        textDecoration: 'none',
    } as const;

    if (as === 'a' && href) {
        return (
            <a href={href} target="_blank" rel="noreferrer" title={title} style={style}>
                {children}
            </a>
        );
    }

    return (
        <button title={title} onClick={onClick} style={style}>
            {children}
        </button>
    );
}

function EmptyState({
    title,
    message,
    action,
}: {
    title: string;
    message: string;
    action?: { label: string; onClick: () => void };
}) {
    return (
        <div
            style={{
                border: '1px dashed rgba(255,255,255,0.18)',
                borderRadius: 10,
                padding: '28px 20px',
                textAlign: 'center',
                background: 'rgba(255,255,255,0.02)',
            }}
        >
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#a6a6a6' }}>{message}</div>
            {action && (
                <button
                    onClick={action.onClick}
                    style={{ ...primaryButtonStyle(true), margin: '12px auto 0' }}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}

function PermissionRow({
    meta,
    selected,
    onToggle,
    readOnly = false,
}: {
    meta: PermissionMeta;
    selected: boolean;
    onToggle?: () => void;
    readOnly?: boolean;
}) {
    return (
        <label
            style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                borderRadius: 8,
                border: `1px solid ${selected ? 'rgba(124,196,255,0.5)' : 'rgba(255,255,255,0.12)'}`,
                background: selected ? 'rgba(0,120,212,0.12)' : 'rgba(255,255,255,0.02)',
                padding: '9px 10px',
                cursor: readOnly ? 'default' : 'pointer',
            }}
        >
            {!readOnly && (
                <input type="checkbox" checked={selected} onChange={onToggle} style={{ marginTop: 3 }} />
            )}
            <div style={{ marginTop: 2 }}>{meta.icon}</div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{meta.label}</div>
                    {meta.dangerous && (
                        <span
                            style={{
                                fontSize: 10,
                                color: '#ffb6b6',
                                background: 'rgba(196,43,28,0.28)',
                                borderRadius: 999,
                                padding: '1px 7px',
                                textTransform: 'uppercase',
                            }}
                        >
                            Riesgo
                        </span>
                    )}
                </div>
                <div style={{ fontSize: 11, color: '#b6b6b6', marginTop: 2 }}>{meta.description}</div>
            </div>
        </label>
    );
}

function getRequestedPermissions(plugin: InstalledPlugin): string[] {
    return (
        plugin.requested_permissions ??
        plugin.requestedPermissions ??
        plugin.manifest.permissions ??
        []
    );
}

function getGrantedPermissions(plugin: InstalledPlugin): string[] {
    return (
        plugin.granted_permissions ??
        plugin.grantedPermissions ??
        plugin.manifest.permissions ??
        []
    );
}

function primaryButtonStyle(enabled: boolean): React.CSSProperties {
    return {
        marginTop: 12,
        width: '100%',
        height: 32,
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.08)',
        background: enabled ? '#0078d4' : 'rgba(255,255,255,0.08)',
        color: enabled ? '#fff' : '#8f8f8f',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontSize: 12,
        fontWeight: 600,
        cursor: enabled ? 'pointer' : 'not-allowed',
    };
}

function secondaryButtonStyle(): React.CSSProperties {
    return {
        height: 32,
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(255,255,255,0.04)',
        color: '#e7e7e7',
        padding: '0 12px',
        cursor: 'pointer',
    };
}

function linkButtonStyle(): React.CSSProperties {
    return {
        border: 'none',
        background: 'transparent',
        color: '#7cc4ff',
        cursor: 'pointer',
        padding: 0,
        fontSize: 12,
    };
}

type PermissionMeta = {
    label: string;
    description: string;
    icon: ReactNode;
    dangerous: boolean;
};

function getPermissionMeta(permission: string): PermissionMeta {
    const fallback = {
        label: permission.replace(':', ' / ').replace(/_/g, ' '),
        description: 'Permiso personalizado del plugin.',
        icon: <AppsColor className="h-5 w-5" />,
        dangerous: false,
    };

    const map: Record<string, PermissionMeta> = {
        'patients:read': {
            label: 'Pacientes (lectura)',
            description: 'Permite leer fichas y datos clinicos de pacientes.',
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
            description: 'Permite consultar tratamientos y evolucion clinica.',
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
            description: 'Permite mostrar notificaciones dentro de Galeno.',
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
