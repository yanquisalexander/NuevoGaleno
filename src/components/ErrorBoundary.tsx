import { Component, ErrorInfo, ReactNode } from 'react';
import { error as logError, warn as logWarn } from '@tauri-apps/plugin-log';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

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
                <div className="h-screen w-full flex items-center justify-center bg-[#1c1c1c] text-white">
                    <div className="max-w-2xl mx-auto p-8">
                        <div className="bg-[#272727] border border-red-500/30 rounded-xl p-8 space-y-6">
                            {/* Header */}
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                                    <AlertTriangle className="w-7 h-7 text-red-500" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-red-400">
                                        Algo salió mal
                                    </h1>
                                    <p className="text-sm text-white/60 mt-1">
                                        La aplicación encontró un error inesperado
                                    </p>
                                </div>
                            </div>

                            {/* Error Details */}
                            {this.state.error && (
                                <div className="bg-[#1c1c1c] rounded-lg p-4 border border-white/5">
                                    <p className="text-sm font-semibold text-white/90 mb-2">
                                        Detalles del error:
                                    </p>
                                    <p className="text-xs text-red-400 font-mono break-all">
                                        {this.state.error.message}
                                    </p>
                                    {this.state.error.stack && (
                                        <details className="mt-3">
                                            <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60">
                                                Ver stack trace
                                            </summary>
                                            <pre className="mt-2 text-[10px] text-white/30 overflow-auto max-h-40 whitespace-pre-wrap">
                                                {this.state.error.stack}
                                            </pre>
                                        </details>
                                    )}
                                </div>
                            )}

                            {/* Component Stack */}
                            {this.state.errorInfo && (
                                <details className="bg-[#1c1c1c] rounded-lg p-4 border border-white/5">
                                    <summary className="text-xs text-white/60 cursor-pointer hover:text-white/80">
                                        Ver árbol de componentes
                                    </summary>
                                    <pre className="mt-2 text-[10px] text-white/30 overflow-auto max-h-40 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                </details>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Home className="w-4 h-4" />
                                    Intentar Recuperar
                                </button>
                                <button
                                    onClick={this.handleReload}
                                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Recargar App
                                </button>
                            </div>

                            {/* Help Text */}
                            <p className="text-xs text-white/40 text-center pt-2 border-t border-white/5">
                                Este error ha sido registrado automáticamente. Si el problema persiste,
                                contacte al soporte técnico.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
