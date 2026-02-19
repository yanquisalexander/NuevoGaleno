import { invoke } from '@tauri-apps/api/core';
import type {
    PluginManifest,
    InstalledPlugin,
    PluginContext,
    PluginPermission,
    PluginEvent,
} from '../types/plugin';
import { createPluginAPI } from './PluginAPI';

class PluginManager {
    private plugins: Map<string, InstalledPlugin> = new Map();
    private loadedModules: Map<string, any> = new Map();
    private eventHandlers: Map<string, Set<Function>> = new Map();

    async initialize() {
        const installed = await this.getInstalledPlugins();
        for (const plugin of installed) {
            if (plugin.enabled) {
                await this.loadPlugin(plugin);
            }
        }
    }

    async getInstalledPlugins(): Promise<InstalledPlugin[]> {
        try {
            return await invoke('get_installed_plugins');
        } catch (error) {
            console.error('Failed to get installed plugins:', error);
            return [];
        }
    }

    async installPlugin(pluginPath: string): Promise<void> {
        const manifest = await this.loadManifest(pluginPath);

        // Validar manifest
        this.validateManifest(manifest);

        // Verificar permisos
        await this.requestPermissions(manifest.permissions);

        // Instalar en el sistema
        await invoke('install_plugin', { pluginPath, manifest });

        // Cargar el plugin
        const plugin: InstalledPlugin = {
            manifest,
            enabled: true,
            installedAt: new Date().toISOString(),
            path: pluginPath,
        };

        await this.loadPlugin(plugin);
    }

    async uninstallPlugin(pluginId: string): Promise<void> {
        await this.unloadPlugin(pluginId);
        await invoke('uninstall_plugin', { pluginId });
        this.plugins.delete(pluginId);
    }

    async enablePlugin(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) throw new Error('Plugin not found');

        plugin.enabled = true;
        await this.loadPlugin(plugin);
        await invoke('update_plugin_status', { pluginId, enabled: true });
    }

    async disablePlugin(pluginId: string): Promise<void> {
        await this.unloadPlugin(pluginId);
        const plugin = this.plugins.get(pluginId);
        if (plugin) {
            plugin.enabled = false;
            await invoke('update_plugin_status', { pluginId, enabled: false });
        }
    }

    private async loadPlugin(plugin: InstalledPlugin): Promise<void> {
        try {
            const { manifest } = plugin;

            // Crear contexto del plugin
            const context = this.createPluginContext(manifest);

            // Cargar el módulo del plugin
            const module = await this.loadPluginModule(plugin.path, manifest.entry);

            // Inicializar el plugin
            if (module.activate) {
                await module.activate(context);
            }

            this.plugins.set(manifest.id, plugin);
            this.loadedModules.set(manifest.id, module);

            console.log(`Plugin loaded: ${manifest.name} v${manifest.version}`);
        } catch (error) {
            console.error(`Failed to load plugin ${plugin.manifest.name}:`, error);
            throw error;
        }
    }

    private async unloadPlugin(pluginId: string): Promise<void> {
        const module = this.loadedModules.get(pluginId);
        if (module?.deactivate) {
            await module.deactivate();
        }

        this.loadedModules.delete(pluginId);

        // Limpiar event handlers del plugin
        for (const [event, handlers] of this.eventHandlers.entries()) {
            // Filtrar handlers que pertenecen a este plugin
            const filtered = Array.from(handlers).filter(h => {
                return !(h as any).__pluginId || (h as any).__pluginId !== pluginId;
            });
            this.eventHandlers.set(event, new Set(filtered));
        }
    }

    private createPluginContext(manifest: PluginManifest): PluginContext {
        return {
            plugin: {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
            },
            api: createPluginAPI(manifest.permissions),
            hooks: {
                on: (event: PluginEvent, handler: Function) => {
                    if (!this.eventHandlers.has(event)) {
                        this.eventHandlers.set(event, new Set());
                    }
                    // Marcar el handler con el ID del plugin
                    (handler as any).__pluginId = manifest.id;
                    this.eventHandlers.get(event)!.add(handler);
                },
                off: (event: PluginEvent, handler: Function) => {
                    this.eventHandlers.get(event)?.delete(handler);
                },
                emit: (event: string, data: any) => {
                    this.emitEvent(event, data);
                },
            },
        };
    }

    private async loadPluginModule(pluginPath: string, entry: string): Promise<any> {
        // En producción, cargar desde el sistema de archivos
        const modulePath = `${pluginPath}/${entry}`;

        // Usar dynamic import con sandboxing
        try {
            const module = await import(/* @vite-ignore */ modulePath);
            return module;
        } catch (error) {
            console.error('Failed to load plugin module:', error);
            throw error;
        }
    }

    private async loadManifest(pluginPath: string): Promise<PluginManifest> {
        return await invoke('load_plugin_manifest', { pluginPath });
    }

    private validateManifest(manifest: PluginManifest): void {
        const required = ['id', 'name', 'version', 'author', 'entry'];
        for (const field of required) {
            if (!(field in manifest)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validar formato de ID
        if (!/^[a-z0-9.-]+$/.test(manifest.id)) {
            throw new Error('Invalid plugin ID format');
        }

        // Validar versión semántica
        if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
            throw new Error('Invalid version format');
        }
    }

    private async requestPermissions(permissions: PluginPermission[]): Promise<void> {
        // Mostrar diálogo de permisos al usuario
        // Por ahora, auto-aprobar en desarrollo
        console.log('Requesting permissions:', permissions);
    }

    emitEvent(event: string, data: any): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    getPlugin(pluginId: string): InstalledPlugin | undefined {
        return this.plugins.get(pluginId);
    }

    getAllPlugins(): InstalledPlugin[] {
        return Array.from(this.plugins.values());
    }

    getPluginsByPermission(permission: PluginPermission): InstalledPlugin[] {
        return this.getAllPlugins().filter(p =>
            p.manifest.permissions.includes(permission)
        );
    }
}

export const pluginManager = new PluginManager();
