import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Shield, ShieldAlert, ChevronDown, Lock, X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogOverlay, // Asegúrate de exportar esto o usar Primitive si es necesario
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // O tu utilidad de clases

interface SystemPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmLabel?: string;
    onConfirm: (passwordHash: string) => Promise<void>;
    dangerous?: boolean;
}

export function SystemPasswordDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Sí',
    onConfirm,
    dangerous = false,
}: SystemPasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDetails, setShowDetails] = useState(true); // UAC suele mostrar detalles

    // Resetear estado al abrir
    useEffect(() => {
        if (open) {
            setPassword('');
            setLoading(false);
        }
    }, [open]);

    const handleConfirm = async () => {
        if (!password) {
            toast.error('Se requiere contraseña de administrador');
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
                // Simular el "shake" o error de Windows
                toast.error('La contraseña es incorrecta. Inténtelo de nuevo.');
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

    // Colores según severidad (Azul UAC vs Amarillo Advertencia)
    const accentColor = dangerous ? 'bg-amber-500' : 'bg-[#0067c0]';
    const Icon = dangerous ? ShieldAlert : Shield;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* EFECTO XP/SECURE DESKTOP:
                backdrop-grayscale: Elimina el color del fondo.
                backdrop-brightness-50: Oscurece el fondo.
                backdrop-blur: Desenfoque estilo Windows 11.
            */}
            <DialogOverlay className="fixed inset-0 z-50 bg-black/40 backdrop-grayscale backdrop-blur-[2px] backdrop-brightness-50 transition-all duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0" />

            <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-[480px] translate-x-[-50%] translate-y-[-50%] gap-0 border-none bg-[#1f1f1f] p-0 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl overflow-hidden ring-1 ring-white/10 font-segoe">

                {/* Header Strip de Color UAC */}
                <div className={`h-1.5 w-full ${accentColor}`} />

                <div className="p-6 pb-4">
                    <DialogTitle className="sr-only">{title}</DialogTitle>

                    {/* Cabecera visual UAC */}
                    <div className="flex items-start gap-5">
                        {/* Icono grande */}
                        <div className={`flex-shrink-0 ${dangerous ? 'text-amber-500' : 'text-[#0067c0]'}`}>
                            <Icon className="w-12 h-12" strokeWidth={1.5} />
                        </div>

                        <div className="flex-1 space-y-1">
                            <h2 className="text-xl font-semibold text-white leading-tight">
                                {title}
                            </h2>
                            <p className="text-[#a0a0a0] text-sm font-normal">
                                {dangerous
                                    ? "Esta aplicación intenta realizar cambios críticos en el dispositivo."
                                    : "Contraseña de administrador requerida para continuar."
                                }
                            </p>

                            {/* Bloque de detalles estilo "Verified Publisher" */}
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-start text-sm">
                                    <span className="text-[#a0a0a0]">Acción:</span>
                                    <span className="text-white font-medium text-right max-w-[200px] truncate">{description}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#a0a0a0]">Origen:</span>
                                    <span className="text-white font-medium">Sistema Local</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Input Password Area - Estilizada como la expansión de detalles */}
                    <div className="mt-6 bg-[#262626] border border-white/5 rounded-lg p-1">
                        <div
                            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/5 rounded transition-colors"
                            onClick={() => setShowDetails(!showDetails)}
                        >
                            <span className="text-xs text-white/70 font-medium uppercase tracking-wider">Credenciales</span>
                            <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                        </div>

                        {showDetails && (
                            <div className="p-3 pt-1 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                <p className="text-sm text-[#a0a0a0]">
                                    Para continuar, introduzca su contraseña de administrador.
                                </p>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a0a0a0] group-focus-within:text-[#0067c0] transition-colors" />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                        className="pl-10 h-10 bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/20 focus-visible:ring-2 focus-visible:ring-[#0067c0] focus-visible:ring-offset-0 focus-visible:border-transparent rounded-md transition-all"
                                        placeholder="Contraseña"
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer estilo Windows 11 */}
                <div className="bg-[#1a1a1a] p-4 flex justify-end gap-3 border-t border-white/5">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setPassword('');
                            onOpenChange(false);
                        }}
                        disabled={loading}
                        className="min-w-[100px] bg-[#2d2d2d] text-white hover:bg-[#383838] hover:text-white border border-white/5 rounded-md h-9 font-normal"
                    >
                        No
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || !password}
                        className={cn(
                            "min-w-[100px] h-9 rounded-md font-normal transition-all shadow-lg shadow-black/20",
                            dangerous
                                ? "bg-amber-600 hover:bg-amber-500 text-white border-amber-500"
                                : "bg-[#0067c0] hover:bg-[#0078d4] text-white border-blue-500"
                        )}
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : confirmLabel}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}