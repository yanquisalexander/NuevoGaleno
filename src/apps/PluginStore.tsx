import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Download, Star, Shield, ExternalLink, Trash2, Power, PowerOff } from 'lucide-react';
import type { StorePlugin, InstalledPlugin } from '../types/plugin';
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

export function PluginStore() {
    const [view, setView] = useState<'store' | 'installed'>('store');
    const [storePlugins, setStorePlugins] = useState<StorePlugin[]>([]);
    const [installedPlugins, setInstalledPlugins] = useState<InstalledPlugin[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPlugin, setSelectedPlugin] = useState<StorePlugin | null>(null);
    const [uninstallDialog, setUninstallDialog] = useState<{ open: boolean; pluginId: string | null }>({
        open: false,
        pluginId: null,
    });

    useEffect(() => {
        loadInstalledPlugins();
        if (view === 'store') {
            loadStorePlugins();
        }
    }, [view]);

    const loadStorePlugins = async () => {
        setLoading(true);
        try {
            const plugins = await invoke<StorePlugin[]>('get_store_plugins');
            setStorePlugins(plugins);
        } catch (error) {
            console.error('Failed to load store plugins:', error);
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
        }
    };

    const installPlugin = async (pluginId: string) => {
        try {
            await invoke('install_plugin_from_store', { pluginId });
            await loadInstalledPlugins();

            // Emit event to reload plugins in WindowManager
            window.dispatchEvent(new CustomEvent('plugin:changed'));

            toast.success('Plugin instalado correctamente');
        } catch (error) {
            console.error('Failed to install plugin:', error);
            toast.error('Error al instalar el plugin');
        }
    };

    const confirmUninstall = (pluginId: string) => {
        setUninstallDialog({ open: true, pluginId });
    };

    const uninstallPlugin = async () => {
        if (!uninstallDialog.pluginId) return;

        try {
            await invoke('uninstall_plugin', { pluginId: uninstallDialog.pluginId });
            await loadInstalledPlugins();

            // Emit event to reload plugins in WindowManager
            window.dispatchEvent(new CustomEvent('plugin:changed'));

            toast.success('Plugin desinstalado correctamente');
        } catch (error) {
            console.error('Failed to uninstall plugin:', error);
            toast.error('Error al desinstalar el plugin');
        } finally {
            setUninstallDialog({ open: false, pluginId: null });
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

            // Emit event to reload plugins in WindowManager
            window.dispatchEvent(new CustomEvent('plugin:changed'));
        } catch (error) {
            console.error('Failed to toggle plugin:', error);
        }
    };

    const isInstalled = (pluginId: string) => {
        return installedPlugins.some(p => p.manifest.id === pluginId);
    };

    return (
        <div className="flex flex-col h-full bg-[#191919]">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b border-white/10">
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('store')}
                        className={`px-4 py-2 rounded-lg transition-colors ${view === 'store'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                            }`}
                    >
                        Tienda
                    </button>
                    <button
                        onClick={() => setView('installed')}
                        className={`px-4 py-2 rounded-lg transition-colors ${view === 'installed'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-white/70 hover:bg-white/10'
                            }`}
                    >
                        Instalados ({installedPlugins.length})
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
                {view === 'store' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {storePlugins.map(plugin => (
                            <div
                                key={plugin.manifest.id}
                                className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors cursor-pointer"
                                onClick={() => setSelectedPlugin(plugin)}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="text-4xl">{plugin.manifest.icon}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-medium">{plugin.manifest.name}</h3>
                                            {plugin.verified && (
                                                <Shield size={14} className="text-blue-400" />
                                            )}
                                        </div>
                                        <p className="text-xs text-white/50">{plugin.manifest.author}</p>
                                    </div>
                                </div>

                                <p className="text-sm text-white/70 mb-3 line-clamp-2">
                                    {plugin.manifest.description}
                                </p>

                                <div className="flex items-center justify-between text-xs text-white/50 mb-3">
                                    <div className="flex items-center gap-1">
                                        <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                        <span>{plugin.rating.toFixed(1)}</span>
                                    </div>
                                    <span>{plugin.downloads.toLocaleString()} descargas</span>
                                </div>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        installPlugin(plugin.manifest.id);
                                    }}
                                    disabled={isInstalled(plugin.manifest.id)}
                                    className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${isInstalled(plugin.manifest.id)
                                        ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                        }`}
                                >
                                    <Download size={14} />
                                    {isInstalled(plugin.manifest.id) ? 'Instalado' : 'Instalar'}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {installedPlugins.map(plugin => (
                            <div
                                key={plugin.manifest.id}
                                className="bg-white/5 rounded-lg p-4 flex items-center gap-4"
                            >
                                <div className="text-3xl">{plugin.manifest.icon}</div>

                                <div className="flex-1">
                                    <h3 className="text-white font-medium">{plugin.manifest.name}</h3>
                                    <p className="text-xs text-white/50">
                                        v{plugin.manifest.version} • {plugin.manifest.author}
                                    </p>
                                    <p className="text-sm text-white/70 mt-1">
                                        {plugin.manifest.description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => togglePlugin(plugin.manifest.id, plugin.enabled)}
                                        className={`p-2 rounded-lg transition-colors ${plugin.enabled
                                            ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10'
                                            }`}
                                        title={plugin.enabled ? 'Desactivar' : 'Activar'}
                                    >
                                        {plugin.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                                    </button>

                                    {plugin.manifest.homepage && (
                                        <a
                                            href={plugin.manifest.homepage}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 transition-colors"
                                            title="Sitio web"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                    )}

                                    <button
                                        onClick={() => confirmUninstall(plugin.manifest.id)}
                                        className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                                        title="Desinstalar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {installedPlugins.length === 0 && (
                            <div className="text-center py-12 text-white/50">
                                <p>No hay plugins instalados</p>
                                <button
                                    onClick={() => setView('store')}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Explorar la tienda
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Plugin Detail Modal */}
            {selectedPlugin && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setSelectedPlugin(null)}
                >
                    <div
                        className="bg-[#202020] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className="text-5xl">{selectedPlugin.manifest.icon}</div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-2xl text-white font-bold">
                                        {selectedPlugin.manifest.name}
                                    </h2>
                                    {selectedPlugin.verified && (
                                        <Shield size={20} className="text-blue-400" />
                                    )}
                                </div>
                                <p className="text-white/50">{selectedPlugin.manifest.author}</p>
                            </div>
                        </div>

                        <p className="text-white/80 mb-4">{selectedPlugin.manifest.description}</p>

                        {selectedPlugin.screenshots && selectedPlugin.screenshots.length > 0 && (
                            <div className="mb-4 space-y-2">
                                {selectedPlugin.screenshots.map((url, i) => (
                                    <img
                                        key={i}
                                        src={url}
                                        alt={`Screenshot ${i + 1}`}
                                        className="w-full rounded-lg"
                                    />
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <span className="text-white/50">Versión:</span>
                                <span className="text-white ml-2">{selectedPlugin.manifest.version}</span>
                            </div>
                            <div>
                                <span className="text-white/50">Descargas:</span>
                                <span className="text-white ml-2">
                                    {selectedPlugin.downloads.toLocaleString()}
                                </span>
                            </div>
                            <div>
                                <span className="text-white/50">Rating:</span>
                                <span className="text-white ml-2 flex items-center gap-1">
                                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                    {selectedPlugin.rating.toFixed(1)} ({selectedPlugin.reviews} reseñas)
                                </span>
                            </div>
                            {selectedPlugin.manifest.license && (
                                <div>
                                    <span className="text-white/50">Licencia:</span>
                                    <span className="text-white ml-2">{selectedPlugin.manifest.license}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    installPlugin(selectedPlugin.manifest.id);
                                    setSelectedPlugin(null);
                                }}
                                disabled={isInstalled(selectedPlugin.manifest.id)}
                                className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${isInstalled(selectedPlugin.manifest.id)
                                    ? 'bg-white/5 text-white/30 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                <Download size={16} />
                                {isInstalled(selectedPlugin.manifest.id) ? 'Instalado' : 'Instalar'}
                            </button>
                            <button
                                onClick={() => setSelectedPlugin(null)}
                                className="px-6 py-2 rounded-lg bg-white/5 text-white hover:bg-white/10 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Uninstall Confirmation Dialog */}
            <AlertDialog open={uninstallDialog.open} onOpenChange={(open) => setUninstallDialog({ open, pluginId: null })}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Desinstalar plugin?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará el plugin y todos sus datos. No se puede deshacer.
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
