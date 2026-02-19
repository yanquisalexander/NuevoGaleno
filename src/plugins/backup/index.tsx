import type { PluginContext } from '../../types/plugin';
import { BackupManager } from './components/BackupManager';

let context: PluginContext | null = null;

export async function activate(pluginContext: PluginContext) {
    context = pluginContext;
    console.log(`${context.plugin.name} activado`);

    // Verificar último backup
    const lastBackup = await context.api.storage.get('lastBackupDate');
    if (lastBackup) {
        const daysSince = Math.floor((Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > 7) {
            context.api.ui.showNotification(
                `Hace ${daysSince} días del último backup`,
                'warning'
            );
        }
    }
}

export async function deactivate() {
    console.log('Backup & Restore desactivado');
}

export async function openMainWindow() {
    if (!context) return;

    context.api.ui.openWindow(
        'Backup & Restore',
        BackupManager,
        { context }
    );
}
