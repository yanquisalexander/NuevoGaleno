import { Component, ErrorInfo, ReactNode } from 'react';
import { error as logError, warn as logWarn } from '@tauri-apps/plugin-log';
import {
    Warning28Regular as Warning,
    ArrowCounterclockwise20Regular as RefreshCw,
    Home20Regular as Home,
    ChevronDown16Regular as ChevronDown,
    DocumentError20Regular as DocumentError,
    Code20Regular as Code
} from '@fluentui/react-icons';

interface Props {
    children: ReactNode;
    fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        return {
            hasError: true,
            error,
            errorInfo: null,
        };
    }

    async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log el error a Tauri
        const errorMessage = `React Error Boundary caught an error:
Error: ${error.message}
Stack: ${error.stack || 'No stack trace'}
Component Stack: ${errorInfo.componentStack}`;

        try {
            await logError(errorMessage);
        } catch (e) {
            console.error('Failed to log error to Tauri:', e);
        }

        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = async () => {
        try {
            await logWarn('User triggered error boundary reset');
        } catch (e) {
            console.error('Failed to log reset to Tauri:', e);
        }

        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error!, this.handleReset);
            }

            return (
                <div className="min-h-screen w-full flex items-center justify-center bg-[#111111] font-sans selection:bg-blue-500/30 p-6 relative overflow-hidden">

                    {/* Background Glow (Simula el resplandor de la pantalla detrás del Mica) */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[600px] h-[600px] bg-red-500/10 blur-[120px] rounded-full opacity-50" />
                    </div>

                    <div className="relative z-10 w-full max-w-2xl bg-[#1e1e1e]/80 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_32px_64px_-15px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-bottom-8 duration-500">
                        <div className="p-8 space-y-8">

                            {/* Header */}
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 shadow-inner">
                                    <Warning className="text-red-400" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-semibold text-white tracking-tight">
                                        Algo salió mal
                                    </h1>
                                    <p className="text-[14px] text-white/60 mt-1.5 leading-relaxed">
                                        Nuevo Galeno encontró un error inesperado y no pudo continuar. Hemos registrado el problema automáticamente.
                                    </p>
                                </div>
                            </div>

                            {/* Controles tipo "Expander" de Windows 11 */}
                            <div className="space-y-4">

                                {/* Detalles del Error */}
                                {this.state.error && (
                                    <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden shadow-sm">
                                        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
                                            <DocumentError className="text-red-400" />
                                            <span className="text-sm font-medium text-white/90">Mensaje del sistema</span>
                                        </div>
                                        <div className="p-4">
                                            <p className="text-[13px] font-mono text-red-300 bg-red-500/10 p-3 rounded-lg border border-red-500/10 break-words">
                                                {this.state.error.message}
                                            </p>

                                            {this.state.error.stack && (
                                                <details className="mt-4 group cursor-pointer">
                                                    <summary className="text-[13px] font-medium text-white/50 hover:text-white/80 transition-colors flex items-center gap-2 select-none list-none [&::-webkit-details-marker]:hidden">
                                                        <ChevronDown className="group-open:-rotate-180 transition-transform duration-200" />
                                                        Ver traza de la pila (Stack trace)
                                                    </summary>
                                                    <div className="mt-3 bg-black/40 p-3 rounded-lg border border-white/5">
                                                        <pre className="text-[11px] text-white/40 overflow-auto max-h-40 whitespace-pre-wrap custom-scrollbar">
                                                            {this.state.error.stack}
                                                        </pre>
                                                    </div>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Árbol de Componentes */}
                                {this.state.errorInfo && (
                                    <div className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden shadow-sm">
                                        <details className="group cursor-pointer">
                                            <summary className="px-4 py-3 flex items-center justify-between select-none list-none [&::-webkit-details-marker]:hidden hover:bg-white/[0.02] transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <Code className="text-white/50 group-hover:text-white/80 transition-colors" />
                                                    <span className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">Árbol de componentes</span>
                                                </div>
                                                <ChevronDown className="text-white/40 group-open:-rotate-180 transition-transform duration-200" />
                                            </summary>
                                            <div className="p-4 pt-0 border-t border-white/5">
                                                <div className="mt-3 bg-black/40 p-3 rounded-lg border border-white/5">
                                                    <pre className="text-[11px] text-white/40 overflow-auto max-h-40 whitespace-pre-wrap custom-scrollbar">
                                                        {this.state.errorInfo.componentStack}
                                                    </pre>
                                                </div>
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </div>

                            {/* Actions & Footer */}
                            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10">
                                <p className="text-[12px] text-white/40 hidden sm:block">
                                    Si el problema persiste, contacte al soporte.
                                </p>
                                <div className="flex gap-3 w-full sm:w-auto">
                                    <button
                                        onClick={this.handleReload}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 bg-white/[0.05] hover:bg-white/[0.08] active:bg-white/[0.03] border border-white/10 text-white rounded-lg transition-all text-[13px] font-medium"
                                    >
                                        <RefreshCw />
                                        Recargar App
                                    </button>
                                    <button
                                        onClick={this.handleReset}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-[#4cc2ff] hover:bg-[#4cc2ff]/90 active:bg-[#4cc2ff]/80 text-black rounded-lg transition-all text-[13px] font-semibold shadow-[0_0_15px_rgba(76,194,255,0.2)]"
                                    >
                                        <Home />
                                        Recuperar
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Estilos globales inyectados para la scrollbar Fluent */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
                        `
                    }} />
                </div>
            );
        }

        return this.props.children;
    }
}