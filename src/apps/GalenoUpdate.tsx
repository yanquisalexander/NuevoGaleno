import { useState, useEffect } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, RefreshCw, Package, Sparkles, Clock, Pause, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/useToast';
import { getVersion } from '@tauri-apps/api/app';
import { useNotImplemented } from "@/utils/system/NotImplemented";
import { useAutoUpdate } from '@/hooks/useAutoUpdate';

interface UpdateInfo {
    version: string;
    currentVersion: string;
    body?: string;
    date?: string;
}

type UpdateState =
    | { type: 'idle' }
    | { type: 'checking' }
    | { type: 'available'; info: UpdateInfo }
    | { type: 'not-available' }
    | { type: 'downloading'; progress: number }
    | { type: 'installing' }
    | { type: 'done' }
    | { type: 'error'; message: string };

export function GalenoUpdateApp() {
    const [state, setState] = useState<UpdateState>({ type: 'idle' });
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const toastHelpers = useToast();
    const notImplemented = useNotImplemented();
    const { lastChecked, checkForUpdates: autoCheckForUpdates } = useAutoUpdate(false);

    // Cargar versión inicial
    useEffect(() => {
        getVersion().then(setCurrentVersion).catch(console.error);
    }, []);

    const formatLastChecked = (date: Date | null) => {
        if (!date) return 'Nunca';
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return `Hoy, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
        return date.toLocaleString();
    };

    const handleCheckForUpdates = async () => {
        setState({ type: 'checking' });

        try {
            if (!currentVersion) {
                const version = await getVersion();
                setCurrentVersion(version);
            }

            // Simular un pequeño delay para que se vea la animación de carga
            await new Promise(resolve => setTimeout(resolve, 800));

            // Llamar al check del hook para sincronizar el lastChecked
            await autoCheckForUpdates();

            const update = await check();

            if (update?.available) {
                const info: UpdateInfo = {
                    version: update.version,
                    currentVersion: update.currentVersion,
                    body: update.body,
                    date: update.date,
                };

                setState({ type: 'available', info });
                // toastHelpers.info('Nueva versión disponible', `Versión ${update.version} lista para descargar.`);
            } else {
                setState({ type: 'not-available' });
                // toastHelpers.info('Estás actualizado', 'Ya tienes la última versión instalada.');
            }
        } catch (error: any) {
            const errorMsg = error?.toString() || 'Error desconocido';
            setState({ type: 'error', message: errorMsg });
            toastHelpers.error('Error', errorMsg);
        }
    };

    const handleInstallUpdate = async () => {
        if (state.type !== 'available') return;

        try {
            setState({ type: 'downloading', progress: 0 });

            const update = await check();
            if (!update?.available) {
                throw new Error('No hay actualización disponible');
            }

            let downloaded = 0;
            let contentLength = 0;

            await update.downloadAndInstall((event) => {
                switch (event.event) {
                    case 'Started':
                        contentLength = event.data.contentLength || 0;
                        setState({ type: 'downloading', progress: 0 });
                        break;

                    case 'Progress':
                        downloaded += event.data.chunkLength;
                        if (contentLength > 0) {
                            const percentage = Math.round((downloaded / contentLength) * 100);
                            setState({ type: 'downloading', progress: percentage });
                        }
                        break;

                    case 'Finished':
                        setState({ type: 'installing' });
                        break;
                }
            });

            setState({ type: 'done' });

            // Relaunch the app after a short delay
            setTimeout(async () => {
                await relaunch();
            }, 1000);

        } catch (error: any) {
            const errorMsg = error?.toString() || 'Error durante la instalación';
            setState({ type: 'error', message: errorMsg });
            toastHelpers.error('Error', errorMsg);
        }
    };

    // Renderizado del contenido principal de la tarjeta
    const renderCardContent = () => {
        switch (state.type) {
            case 'idle':
            case 'not-available':
                return (
                    <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-500 shrink-0">
                            <CheckCircle2 size={28} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h2 className="text-xl font-semibold mb-1">Todo está actualizado</h2>
                            <p className="text-sm text-white/60 mb-6">
                                Última comprobación: {formatLastChecked(lastChecked)}
                            </p>
                            <Button
                                onClick={handleCheckForUpdates}
                                className="bg-[#0067C0] hover:bg-[#0067C0]/90 text-white rounded-[4px] px-6 h-9 text-sm font-normal"
                            >
                                Buscar actualizaciones
                            </Button>
                        </div>
                    </div>
                );

            case 'checking':
                return (
                    <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 items-center justify-center shrink-0">
                            <RefreshCw className="animate-spin text-blue-400" size={28} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h2 className="text-xl font-semibold mb-1">Buscando actualizaciones...</h2>
                            <p className="text-sm text-white/60">
                                Esto puede tardar unos segundos.
                            </p>
                        </div>
                    </div>
                );

            case 'available':
                return (
                    <div className="flex flex-col gap-6">
                        <div className="flex items-start gap-5">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 shrink-0">
                                <Sparkles size={28} />
                            </div>
                            <div className="flex-1 pt-1">
                                <h2 className="text-xl font-semibold mb-1">Actualización disponible</h2>
                                <p className="text-sm text-white/60">
                                    Nuevo Galeno {state.info.version} está listo para instalar.
                                </p>
                            </div>
                        </div>

                        {/* Detalle de la actualización en un bloque anidado estilo Windows */}
                        <div className="bg-[#202020]/50 border border-white/5 rounded-lg p-4 ml-[68px]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold">Actualización de características a Nuevo Galeno {state.info.version}</h3>
                                    <p className="text-xs text-white/50">
                                        Versión actual: {state.info.currentVersion}
                                    </p>
                                    {state.info.body && (
                                        <div className="mt-3 text-xs text-white/70 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap font-mono bg-black/20 p-2 rounded">
                                            {state.info.body}
                                        </div>
                                    )}
                                </div>
                                <Button
                                    onClick={handleInstallUpdate}
                                    className="shrink-0 bg-[#0067C0] hover:bg-[#0067C0]/90 text-white rounded-[4px] px-5 h-8 text-sm"
                                >
                                    Descargar e instalar
                                </Button>
                            </div>
                        </div>
                    </div>
                );

            case 'downloading':
                return (
                    <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 items-center justify-center shrink-0">
                            {/* Spinner circular simple */}
                            <div className="h-6 w-6 rounded-full border-2 border-t-transparent border-blue-400 animate-spin" />
                        </div>
                        <div className="flex-1 pt-1 space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold mb-1">Descargando actualizaciones</h2>
                                <p className="text-sm text-white/60">
                                    {state.progress}% completado
                                </p>
                            </div>
                            {/* Barra de progreso estilo Windows */}
                            <div className="h-[2px] w-full bg-[#3d3d3d] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-blue-400"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${state.progress}%` }}
                                    transition={{ duration: 0.2 }}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'installing':
                return (
                    <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 items-center justify-center shrink-0">
                            <RotateCw className="animate-spin text-blue-400" size={28} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h2 className="text-xl font-semibold mb-1">Instalando...</h2>
                            <p className="text-sm text-white/60">
                                La aplicación se reiniciará automáticamente cuando termine.
                            </p>
                        </div>
                    </div>
                );

            case 'done':
                return (
                    <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-500 shrink-0">
                            <CheckCircle2 size={28} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h2 className="text-xl font-semibold mb-1">¡Listo!</h2>
                            <p className="text-sm text-white/60">
                                Reiniciando Nuevo Galeno...
                            </p>
                        </div>
                    </div>
                );

            case 'error':
                return (
                    <div className="flex items-start gap-5">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-500 shrink-0">
                            <AlertCircle size={28} />
                        </div>
                        <div className="flex-1 pt-1">
                            <h2 className="text-xl font-semibold mb-1">Algo salió mal</h2>
                            <p className="text-sm text-white/60 mb-6">
                                {state.message}
                            </p>
                            <Button
                                onClick={handleCheckForUpdates}
                                variant="outline"
                                className="border-[#3d3d3d] bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded-[4px] px-6 h-9 text-sm"
                            >
                                Reintentar
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-full bg-[#202020] text-white flex flex-col font-sans select-none overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-4">
                <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-semibold tracking-tight">Galeno Update</h1>
                </div>
                {/* Breadcrumbs / Info opcional */}
                <div className="text-sm text-blue-400 cursor-pointer hover:underline mb-6 flex items-center gap-1">
                    <span>Opciones avanzadas</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 px-8 overflow-y-auto custom-scrollbar">

                {/* Hero Card - Estilo Windows 11 Settings */}
                <div className="bg-[#2c2c2c] rounded-xl border border-white/5 p-6 mb-6 shadow-sm relative overflow-hidden">
                    {/* Mica effect overlay (simulado) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={state.type}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                            >
                                {renderCardContent()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Additional Settings List */}
                <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-white/70 px-1 mb-2">Más opciones</h3>

                    <div className="bg-[#272727] rounded-xl border border-white/5 overflow-hidden">
                        <button
                            onClick={notImplemented}
                            className="w-full flex items-center justify-between p-4 hover:bg-[#323232] transition-colors text-left group border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-4">
                                <Pause size={18} className="text-white/50 group-hover:text-white/80" />
                                <div>
                                    <div className="text-sm font-medium">Pausar actualizaciones</div>
                                    <div className="text-xs text-white/50">Pausar temporalmente las descargas automáticas</div>
                                </div>
                            </div>
                            <div className="px-3 py-1 rounded bg-[#2c2c2c] border border-white/10 text-xs text-white/70 group-hover:bg-[#3a3a3a]">
                                Por 1 semana
                            </div>
                        </button>

                        <button
                            onClick={notImplemented}
                            className="w-full flex items-center justify-between p-4 hover:bg-[#323232] transition-colors text-left group border-b border-white/5 last:border-0">
                            <div className="flex items-center gap-4">
                                <Clock size={18} className="text-white/50 group-hover:text-white/80" />
                                <div>
                                    <div className="text-sm font-medium">Historial de actualizaciones</div>
                                    <div className="text-xs text-white/50">Ver qué se ha instalado recientemente</div>
                                </div>
                            </div>
                        </button>


                    </div>
                </div>



            </div>
        </div >
    );
}
