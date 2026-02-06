import {
    error as logError,
    warn as logWarn,
    info as logInfo,
    attachConsole,
} from '@tauri-apps/plugin-log';

/**
 * Inicializa el sistema de logging de Tauri y captura errores globales
 */
export async function initErrorLogging() {
    try {
        // Attach console methods to Tauri logger
        // Esto redirige console.log, console.error, etc. al logger de Tauri
        await attachConsole();

        await logInfo('Error logging system initialized');
    } catch (e) {
        console.error('Failed to attach console to Tauri logger:', e);
    }

    // Capturar errores no manejados (uncaught errors)
    window.addEventListener('error', async (event) => {
        const errorMessage = `Uncaught Error:
Message: ${event.message}
Source: ${event.filename}:${event.lineno}:${event.colno}
Error Object: ${event.error ? event.error.stack : 'No stack trace available'}`;

        try {
            await logError(errorMessage);
        } catch (e) {
            console.error('Failed to log uncaught error:', e);
        }
    });

    // Capturar promesas rechazadas no manejadas
    window.addEventListener('unhandledrejection', async (event) => {
        const errorMessage = `Unhandled Promise Rejection:
Reason: ${event.reason}
${event.reason?.stack ? `Stack: ${event.reason.stack}` : ''}`;

        try {
            await logError(errorMessage);
        } catch (e) {
            console.error('Failed to log unhandled rejection:', e);
        }
    });

    // Advertir sobre warnings en el navegador (opcional)
    window.addEventListener('securitypolicyviolation', async (event) => {
        const warningMessage = `Content Security Policy Violation:
Violated Directive: ${event.violatedDirective}
Blocked URI: ${event.blockedURI}
Source File: ${event.sourceFile}:${event.lineNumber}`;

        try {
            await logWarn(warningMessage);
        } catch (e) {
            console.error('Failed to log CSP violation:', e);
        }
    });

    // Override console methods para asegurar que vayan al logger de Tauri
    const originalConsoleError = console.error;
    console.error = async (...args: any[]) => {
        originalConsoleError(...args);
        try {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            await logError(`Console Error: ${message}`);
        } catch (e) {
            originalConsoleError('Failed to log to Tauri:', e);
        }
    };

    const originalConsoleWarn = console.warn;
    console.warn = async (...args: any[]) => {
        originalConsoleWarn(...args);
        try {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            await logWarn(`Console Warning: ${message}`);
        } catch (e) {
            originalConsoleWarn('Failed to log to Tauri:', e);
        }
    };

    const originalConsoleInfo = console.info;
    console.info = async (...args: any[]) => {
        originalConsoleInfo(...args);
        try {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');
            await logInfo(`Console Info: ${message}`);
        } catch (e) {
            originalConsoleInfo('Failed to log to Tauri:', e);
        }
    };
}

/**
 * Función helper para loggear errores manualmente desde cualquier parte de la app
 */
export async function logAppError(error: Error, context?: string) {
    const errorMessage = `Application Error${context ? ` [${context}]` : ''}:
Message: ${error.message}
Stack: ${error.stack || 'No stack trace available'}`;

    try {
        await logError(errorMessage);
    } catch (e) {
        console.error('Failed to log app error:', e);
    }
}

/**
 * Función helper para loggear warnings manualmente
 */
export async function logAppWarning(message: string, context?: string) {
    const warningMessage = `Application Warning${context ? ` [${context}]` : ''}: ${message}`;

    try {
        await logWarn(warningMessage);
    } catch (e) {
        console.error('Failed to log app warning:', e);
    }
}

/**
 * Función helper para loggear info manualmente
 */
export async function logAppInfo(message: string, context?: string) {
    const infoMessage = `Application Info${context ? ` [${context}]` : ''}: ${message}`;

    try {
        await logInfo(infoMessage);
    } catch (e) {
        console.error('Failed to log app info:', e);
    }
}
