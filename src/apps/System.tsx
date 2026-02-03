import { useState } from 'react';
import { MonitorDown, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useWindowManager } from '../contexts/WindowManagerContext';
import FirstRunWizard from '../components/FirstRunWizard';
import ImportReviewScreen from '../components/ImportReviewScreen';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { WindowId } from '../types/window-manager';

// App: Volver a Windows (Estilo Nativo Windows 11)
export function BackToWindowsApp({ windowId }: { windowId: WindowId; data?: any }) {
    const [showDialog, setShowDialog] = useState(true);
    const { closeWindow } = useWindowManager();

    const handleMinimize = async () => {
        try {
            const appWindow = getCurrentWindow();
            await appWindow.minimize();
            closeWindow(windowId);
        } catch (error) {
            console.error('Error al minimizar la ventana:', error);
        }
    };

    const handleCancel = () => {
        setShowDialog(false);
        closeWindow(windowId);
    };

    return (
        <AlertDialog open={showDialog} onOpenChange={(open) => {
            if (!open) closeWindow(windowId);
            setShowDialog(open);
        }}>
            {/* Overlay con blur estilo Mica */}
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />

            <AlertDialogContent className="bg-[#202020] border border-white/10 text-white p-0 gap-0 sm:rounded-xl shadow-2xl overflow-hidden max-w-[420px]">

                {/* Header visual minimalista con botón cerrar */}
                <div className="flex justify-end p-2">
                    <button
                        onClick={handleCancel}
                        className="p-1.5 rounded-md hover:bg-white/5 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 pb-6">
                    <div className="flex flex-col items-center text-center gap-4">
                        {/* Icono Central */}
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center border border-white/5 shadow-inner">
                            <MonitorDown className="w-8 h-8 text-blue-400" strokeWidth={1.5} />
                        </div>

                        <div className="space-y-2">
                            <AlertDialogTitle className="text-xl font-semibold tracking-tight">
                                ¿Volver al Escritorio?
                            </AlertDialogTitle>
                            <p className="text-sm text-white/60 leading-relaxed">
                                La aplicación <span className="font-medium text-white/80">Nuevo Galeno</span> se minimizará a la barra de tareas pero seguirá ejecutándose en segundo plano.
                            </p>
                        </div>
                    </div>

                    {/* Footer de Acciones */}
                    <div className="grid grid-cols-2 gap-3 mt-8">
                        <Button
                            variant="ghost"
                            onClick={handleCancel}
                            className="bg-[#2d2d2d] hover:bg-[#353535] text-white border border-white/5 h-10 font-normal rounded-lg"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleMinimize}
                            className="bg-[#0067c0] hover:bg-[#0078d4] text-white h-10 font-normal rounded-lg shadow-lg shadow-blue-900/20"
                        >
                            Minimizar
                        </Button>
                    </div>
                </div>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// App: Configuración Inicial (Wrapper)
export function InitialSetupApp({ windowId: _windowId, data }: { windowId: WindowId; data?: any }) {
    const onFinish = data?.onFinish || (() => { });

    return (
        // Fondo base consistente con el tema Fluent Dark (#202020)
        <div className="h-full w-full overflow-hidden bg-[#202020] text-white font-sans">
            <FirstRunWizard onFinish={onFinish} />
        </div>
    );
}

// App: Revisión e Importación de Datos (Wrapper)
export function ImportReviewApp({ windowId: _windowId, data }: { windowId: WindowId; data?: any }) {
    const extractedDir = data?.extractedDir || '';
    const onComplete = data?.onComplete || (() => { });
    const onCancel = data?.onCancel || (() => { });

    return (
        // Fondo base consistente con el tema Fluent Dark
        <div className="h-full w-full overflow-hidden bg-[#202020] text-white font-sans selection:bg-emerald-500/30">
            <ImportReviewScreen
                extractedDir={extractedDir}
                onComplete={onComplete}
                onCancel={onCancel}
            />
        </div>
    );
}