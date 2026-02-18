import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Shield, ShieldAlert, ChevronDown, Lock } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogOverlay,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useWindowManager } from "@/contexts/WindowManagerContext";

interface SystemPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: (passwordHash: string) => Promise<void>;
    dangerous?: boolean;
    appId?: string;
    moduleName?: string;
    actionType?: 'admin' | 'dangerous' | 'install' | 'delete' | 'system';
}

export function SystemPasswordDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Sí',
    onConfirm,
    dangerous = false,
    appId,
    moduleName,
    actionType = 'admin',
}: SystemPasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { apps } = useWindowManager();

    useEffect(() => {
        if (open) {
            setPassword('');
            setLoading(false);
            // En Windows 11, los detalles suelen estar ocultos por defecto
            setShowDetails(false);
            // Focus automático tras una pequeña espera para la animación
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const handleConfirm = async () => {
        if (!password) {
            // Animación de error sutil podría ir aquí
            inputRef.current?.focus();
            return;
        }

        setLoading(true);
        try {
            const pwBuffer = new TextEncoder().encode(password);
            const hashBuf = await crypto.subtle.digest('SHA-256', pwBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            const isValid: boolean = await invoke('verify_system_password', {
                passwordHash: hashHex,
            });

            if (!isValid) {
                toast.error('La contraseña es incorrecta. Inténtelo de nuevo.');
                setPassword('');
                inputRef.current?.focus();
                setLoading(false);
                return;
            }

            await onConfirm(hashHex);
            onOpenChange(false);
        } catch (err: any) {
            console.error('Error:', err);
            toast.error(err.toString());
        } finally {
            setLoading(false);
        }
    };

    // Colores exactos de Windows 11
    const winBlue = '#0078D4';
    const winYellow = '#FCE100'; // El amarillo de advertencia de Windows

    // Icono y color base
    const Icon = dangerous ? ShieldAlert : Shield;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* SECURE DESKTOP BACKDROP:
                Windows 11 oscurece mucho el fondo (casi negro 70-80%) 
                y hace una transición de desaturación.
            */}
            <DialogOverlay className="fixed inset-0 z-[9999] bg-black/70 backdrop-grayscale transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0" />

            <DialogContent
                className="fixed left-[50%] top-[50%] z-[9999] grid w-full max-w-[460px] translate-x-[-50%] translate-y-[-50%] 
                gap-0 border border-[#383838] bg-[#1c1c1c] p-0 shadow-2xl shadow-black/50 
                duration-200 
                data-[state=open]:animate-in data-[state=closed]:animate-out 
                data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 
                data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 
                sm:rounded-lg overflow-hidden font-[Segoe_UI_Variable,Segoe_UI,sans-serif]"
                style={{ fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif' }}
            >
                <DialogTitle className="sr-only">{title}</DialogTitle>

                {/* --- CUERPO PRINCIPAL --- */}
                <div className="p-6 pb-2">
                    <div className="flex items-start gap-4">
                        {/* ICONO ESCUDO */}
                        <div className="flex-shrink-0 pt-1">
                            <Icon
                                className={cn("w-10 h-10", dangerous ? "text-yellow-500" : "text-[#0078D4]")}
                                strokeWidth={1.5}
                                fill={dangerous ? "currentColor" : "none"} // El de warning suele tener relleno
                                fillOpacity={dangerous ? 0.1 : 0}
                            />
                        </div>

                        {/* TEXTOS PRINCIPALES */}
                        <div className="flex-1 space-y-1">
                            <h2 className="text-[17px] font-semibold text-white leading-tight">
                                Nuevo Galeno requiere confirmación
                            </h2>

                            <div className="pt-2 pb-1">
                                <p className="text-[13px] text-white font-semibold">
                                    {title}
                                </p>
                                <div className="flex items-center gap-1 text-[13px]">
                                    <span className="text-[#9CA3AF]">Aplicación:</span>
                                    <span className="text-white">{apps.get(appId!)?.name || 'Desconocida'}</span>
                                </div>

                                {moduleName && (
                                    <div className="flex items-center gap-1 text-[13px]">
                                        <span className="text-[#9CA3AF]">Módulo:</span>
                                        <span className="text-white">{moduleName}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* INPUT PASSWORD */}
                    <div className="mt-5 mb-2 pl-[56px]">
                        <p className="text-[13px] text-white mb-2">
                            Para continuar, escriba una contraseña de administrador y luego haga clic en Sí.
                        </p>
                        <div className="relative">
                            <Input
                                ref={inputRef}
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                className="h-9 w-full bg-[#2C2C2C] border-[#454545] text-white placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-[#0078D4] focus-visible:border-transparent rounded-[4px] text-sm pr-2"
                                placeholder="Contraseña"
                                autoComplete="off"
                            />
                            {/* Borde inferior brillante estilo Windows focus (opcional, Input de shadcn ya tiene ring) */}
                        </div>
                        {description && (
                            <p className="text-xs text-[#9CA3AF] mt-2 truncate">
                                Acción: {description}
                            </p>
                        )}
                    </div>
                </div>

                {/* --- SECCIÓN DETALLES (Acordeón) --- */}
                <div className="px-6 pb-4 pl-[80px]">
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-1 text-[13px] text-[#0078D4] hover:text-[#198AE0] hover:underline focus:outline-none transition-colors"
                    >
                        <span>{showDetails ? 'Ocultar detalles' : 'Mostrar más detalles'}</span>
                        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", showDetails ? "rotate-180" : "")} />
                    </button>

                    {showDetails && (
                        <div className="mt-2 space-y-1 animate-in slide-in-from-top-1 fade-in duration-200 text-[12px]">
                            <div className="flex">
                                <span className="text-[#9CA3AF] w-32">ID de aplicación:</span>
                                <span className="text-white font-mono text-xs">{appId || 'N/A'}</span>
                            </div>
                            <div className="flex">
                                <span className="text-[#9CA3AF] w-32">Tipo de acción:</span>
                                <span className="text-white capitalize">
                                    {actionType === 'admin' ? 'Administrativo' :
                                        actionType === 'dangerous' ? 'Crítico' :
                                            actionType === 'install' ? 'Instalación' :
                                                actionType === 'delete' ? 'Eliminación' :
                                                    actionType === 'system' ? 'Sistema' : 'General'}
                                </span>
                            </div>


                        </div>
                    )}
                </div>

                {/* --- FOOTER / BOTONES --- */}
                {/* En Win11 el footer es del mismo color o ligeramente distinto, muy limpio */}
                <div className="bg-[#202020] p-4 flex justify-end gap-2 border-t border-[#2C2C2C]">
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || !password}
                        className={cn(
                            "min-w-[120px] h-8 rounded-[4px] text-[13px] font-normal transition-all active:scale-[0.98]",
                            "bg-[#0078D4] hover:bg-[#006CC0] text-white shadow-sm border border-transparent",
                            dangerous && "bg-[#D83B01] hover:bg-[#C53000]" // Rojo anaranjado si es peligroso
                        )}
                    >
                        {loading ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2 inline-block" />
                        ) : null}
                        {confirmLabel}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setPassword('');
                            onOpenChange(false);
                        }}
                        disabled={loading}
                        className="min-w-[120px] h-8 rounded-[4px] text-[13px] font-normal bg-[#333333] text-white hover:bg-[#3D3D3D] hover:text-white border border-[#454545] active:scale-[0.98]"
                    >
                        No
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}