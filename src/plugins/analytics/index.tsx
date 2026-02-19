import type { PluginContext } from '../../types/plugin';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

let context: PluginContext | null = null;

export async function activate(pluginContext: PluginContext) {
    context = pluginContext;
    console.log(`${context.plugin.name} activado`);

    context.api.ui.showNotification(
        'Analytics Dashboard está listo',
        'success'
    );
}

export async function deactivate() {
    console.log('Analytics Dashboard desactivado');
}

export async function openMainWindow() {
    if (!context) return;

    context.api.ui.openWindow(
        'Analytics Dashboard',
        AnalyticsDashboard,
        { context }
    );
}
