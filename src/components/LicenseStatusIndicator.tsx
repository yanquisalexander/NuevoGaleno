import { useState } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Key, RefreshCw, ShieldAlert, Laptop2, LogOut, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LicenseActivationDialog } from './LicenseActivationDialog';
import { FluentCertificate } from "@/icons/FluentCertificate";

export function LicenseStatusIndicator() {
    const { currentUser } = useSession();
    const {
        licenseStatus,
        isLicensed,
        isActive,
        isTrial,
        trialDaysRemaining,
        isOfflineMode,
        validateLicense,
        deactivateLicense,
    } = useLicense();

    const [showActivationDialog, setShowActivationDialog] = useState(false);
    const [showDeactivateAlert, setShowDeactivateAlert] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    // Configuración de estados visuales (Minimalista)
    const getStatusState = () => {
        // Licensed: Punto verde, Icono ShieldCheck
        if (isActive && isLicensed) return {
            dotColor: 'bg-emerald-500',
            icon: FluentCertificate,
            label: 'Licencia Activa'
        };
        // Trial OK: Punto Azul, Icono Shield
        if (isTrial && trialDaysRemaining > 7) return {
            dotColor: 'bg-blue-500',
            icon: FluentCertificate,
            label: 'Periodo de prueba'
        };
        // Trial Warning: Punto Naranja, Icono Clock
        if (isTrial && trialDaysRemaining > 0) return {
            dotColor: 'bg-amber-500',
            icon: Clock,
            label: 'Prueba por expirar'
        };
        // Error: Punto Rojo, Icono ShieldAlert
        return {
            dotColor: 'bg-red-500',
            icon: ShieldAlert,
            label: 'Sin Licencia'
        };
    };

    const status = getStatusState();
    const StatusIcon = status.icon;

    const handleValidate = async (e: React.MouseEvent) => {
        e.preventDefault();
        setIsValidating(true);
        await validateLicense();
        setIsValidating(false);
    };

    const handleDeactivateConfirm = async () => {
        await deactivateLicense();
        setShowDeactivateAlert(false);
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                            "h-8 w-8 rounded-[4px] relative transition-colors duration-200",
                            "hover:bg-transparent text-white/90 hover:text-white p-0"
                        )}
                        title={status.label}
                    >
                        {/* 1. El Icono Base (Neutro y limpio) */}
                        <StatusIcon className="w-4 h-4" />

                        {/* 2. El "Dot" de Estado (Estático y nítido) */}
                        <span className={cn(
                            "absolute bottom-1 right-1 translate-x-[2px] translate-y-[2px]",
                            "h-1.5 w-1.5 rounded-full border border-[#1c1c1c]",
                            status.dotColor
                        )} />
                    </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                    align="end"
                    sideOffset={8}
                    className="w-72 p-0 bg-[#2c2c2c]/95 backdrop-blur-[30px] border border-white/10 shadow-2xl rounded-xl text-white overflow-hidden"
                >
                    {/* Header Minimalista */}
                    <div className="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs font-semibold tracking-wide text-white/50">ESTADO DE LICENCIA</span>
                        {isOfflineMode && <Laptop2 className="w-3 h-3 text-orange-400" />}
                    </div>

                    <div className="p-2">
                        {/* Tarjeta de Estado */}
                        <div className="bg-black/20 rounded-lg p-3 border border-white/5 mb-2">
                            <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center bg-white/5", status.dotColor.replace('bg-', 'text-'))}>
                                    <StatusIcon className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-white/90">{status.label}</span>
                                    {isTrial && trialDaysRemaining > 0 && (
                                        <span className="text-xs text-white/50">Quedan {trialDaysRemaining} días</span>
                                    )}
                                    {!isLicensed && !isTrial && (
                                        <span className="text-xs text-white/50">Funciones limitadas</span>
                                    )}
                                </div>
                            </div>

                            {/* Serial corto si existe */}
                            {isLicensed && licenseStatus?.license_key && (
                                <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-white/40">
                                    <span>KEY ID</span>
                                    <span>••••-{licenseStatus.license_key.slice(-4)}</span>
                                </div>
                            )}
                        </div>

                        {/* Acciones */}
                        {currentUser?.role === 'admin' && (
                            <div className="space-y-0.5">
                                {!isLicensed && (
                                    <DropdownMenuItem
                                        onClick={() => setShowActivationDialog(true)}
                                        className="cursor-pointer bg-white/5 focus:bg-emerald-500/20 focus:text-emerald-400 text-white gap-2 mb-1 rounded-[4px]"
                                    >
                                        <Key className="w-4 h-4" />
                                        <span>Activar ahora</span>
                                    </DropdownMenuItem>
                                )}

                                <DropdownMenuItem
                                    onClick={handleValidate}
                                    disabled={isValidating}
                                    className="cursor-pointer focus:bg-white/10 text-white/70 gap-2 rounded-[4px]"
                                >
                                    <RefreshCw className={cn('w-4 h-4', isValidating && 'animate-spin')} />
                                    <span>Sincronizar</span>
                                </DropdownMenuItem>


                            </div>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Alert Dialog */}
            <AlertDialog open={showDeactivateAlert} onOpenChange={setShowDeactivateAlert}>
                <AlertDialogContent className="bg-[#202020] border-white/10 text-white max-w-sm rounded-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">¿Desvincular licencia?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">
                            La aplicación volverá al estado de prueba o restringido inmediatamente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-[#333] border-white/10 hover:bg-[#3d3d3d] text-white rounded-[4px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeactivateConfirm} className="bg-red-600 hover:bg-red-700 text-white border-0 rounded-[4px]">Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <LicenseActivationDialog open={showActivationDialog} onOpenChange={setShowActivationDialog} />
        </>
    );
}