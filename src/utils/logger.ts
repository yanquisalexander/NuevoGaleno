/**
 * Re-exportar las funciones de logging de Tauri para uso en toda la aplicación
 */
export {
    error,
    warn,
    info,
    debug,
    trace,
    attachConsole,
    attachLogger,
} from '@tauri-apps/plugin-log';

export {
    initErrorLogging,
    logAppError,
    logAppWarning,
    logAppInfo
} from './errorLogging';
