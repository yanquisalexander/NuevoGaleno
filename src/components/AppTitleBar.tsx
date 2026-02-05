import { useEffect, useRef, useState } from "react";
import { getCurrentWindow, Window } from '@tauri-apps/api/window';
import { exit } from '@tauri-apps/plugin-process';
import { invoke } from "@tauri-apps/api/core";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { WindowControls } from "./WindowControls";
import { NativeContextMenu } from "./NativeContextMenu";
import { LicenseStatusIndicator } from './LicenseStatusIndicator';

export const AppTitleBar = () => {
    const [window, setWindow] = useState<Window | null>(null);
    const [isMaximized, setIsMaximized] = useState<boolean | undefined>(undefined);
    const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
    const contextMenuTriggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const initWindow = async () => {
            const currentWindow = await getCurrentWindow();
            setWindow(currentWindow);
        };

        initWindow().catch(error => {
            console.error("Error initializing window:", error);
        });
    }, []);

    useEffect(() => {
        const handleResize = async () => {
            const maximized = await window?.isMaximized();
            setIsMaximized(maximized);
        };

        const cleanup = async () => {
            const unlisten = await window?.onResized(handleResize);
            handleResize();
            return unlisten;
        };

        const unlistenPromise = cleanup();

        return () => {
            unlistenPromise.then(unlisten => {
                if (unlisten) unlisten();
            });
        };
    }, [window]);

    const handleMaximize = async () => {
        if (isMaximized) {
            await window?.unmaximize();
            setIsMaximized(false);
        } else {
            await window?.maximize();
            setIsMaximized(true);
        }
    };

    const handleClose = async () => {
        // Forzar cierre del menú contextual si está abierto
        const evt = new MouseEvent('click', { bubbles: true });
        contextMenuTriggerRef.current?.dispatchEvent(evt);

        try {
            const currentWindow = await getCurrentWindow();
            const minimizeOnCloseValue = await invoke<boolean | string | null>("get_config_value", { key: "minimizeOnClose" });
            const minimizeOnClose = typeof minimizeOnCloseValue === 'boolean'
                ? minimizeOnCloseValue
                : minimizeOnCloseValue === 'false'
                    ? false
                    : true;

            // Si no estamos en la ventana principal, cerramos directamente
            if (currentWindow.label !== "main") {
                await currentWindow.close();
                return;
            }

            // Ventana principal: Si la opción es true o null (defecto), ocultamos la ventana
            if (minimizeOnClose !== false) {
                await currentWindow.hide();
                return;
            }

            // Solo si es la ventana principal y la opción es fálse, mostramos el diálogo
            setIsExitDialogOpen(true);
        } catch (error) {
            console.error("Error in handleClose:", error);
            // Fallback: mostrar diálogo si algo falló para no dejar al usuario bloqueado
            setIsExitDialogOpen(true);
        }
    };

    const confirmClose = async () => {
        await window?.close();
        exit(0); // Close the application after closing the window
    };

    const handleMinimize = () => {
        window?.minimize();
    };

    return (
        <>
            <NativeContextMenu
                onMinimize={handleMinimize}
                onMaximize={handleMaximize}
                onRestore={handleMaximize}
                onCloseWindow={handleClose}
                isMaximized={!!isMaximized}
            >
                <div
                    ref={contextMenuTriggerRef}
                    data-tauri-drag-region
                    className="flex z-40 top-0 h-10 transition ease-in-out w-full items-center justify-between bg-white text-black select-none"
                >
                    <div className="flex items-center justify-center ml-4">
                        <span className="text-sm font-normal select-none pointer-events-none">
                            Nuevo Galeno
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mr-2">
                        <LicenseStatusIndicator />
                    </div>

                    <WindowControls
                        window={window}
                        isMaximized={isMaximized}
                        onMinimize={handleMinimize}
                        onMaximize={handleMaximize}
                        onClose={handleClose}
                    />
                </div>
            </NativeContextMenu>
            <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
                <AlertDialogContent className="bg-neutral-900 border border-neutral-800 text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription className="text-neutral-400">
                            ¿Realmente quieres cerrar la aplicación?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-neutral-800 hover:bg-neutral-700 text-white border-none">
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmClose}
                            className="bg-red-600 hover:bg-red-700 text-white border-none"
                        >
                            Salir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};