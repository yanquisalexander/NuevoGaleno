export const PLUGIN_NOTIFICATION_EVENT = 'plugin:notify';

export type PluginNotificationType = 'info' | 'success' | 'warning' | 'error';
export type PluginNotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface PluginNotificationPayload {
    pluginId?: string;
    title: string;
    message?: string;
    type?: PluginNotificationType;
    icon?: string;
    priority?: PluginNotificationPriority;
    duration?: number;
    sound?: boolean;
    soundFile?: string;
}
