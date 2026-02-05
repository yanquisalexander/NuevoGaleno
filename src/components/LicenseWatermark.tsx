import { useLicense } from '@/hooks/useLicense';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { LicenseActivationDialog } from './LicenseActivationDialog';

interface LicenseWatermarkProps {
    className?: string;
}

export function LicenseWatermark({ className }: LicenseWatermarkProps) {
    const { licenseStatus, isLicensed, isActive, isTrial, trialDaysRemaining, isOfflineMode } = useLicense();
    const [showActivationDialog, setShowActivationDialog] = useState(false);

    // No mostrar nada si la licencia está activa y válida
    if (isActive && isLicensed) {
        return null;
    }

    const getTitle = () => {
        if (isTrial && trialDaysRemaining <= 0) return 'Prueba expirada';
        return 'Activar Nuevo Galeno';
    };

    const getSubtitle = () => {
        if (isOfflineMode) {
            return 'Modo sin conexión';
        }
        if (isTrial && trialDaysRemaining > 0) {
            return `Versión de prueba (${trialDaysRemaining} días restantes)`;
        }
        return 'Ve a configuración para activar la licencia.';
    };

    return (
        <>
            {/* Watermark estilo Windows:
                - Sin fondo (bg-transparent)
                - Texto blanco/gris con opacidad baja
                - Drop-shadow para legibilidad en cualquier fondo
                - Pointer-events-auto para permitir click
            */}
            <div
                className={cn(
                    'fixed bottom-32 right-12 z-[9999] pointer-events-auto cursor-pointer select-none',
                    'flex flex-col items-end text-right',
                    'opacity-40 hover:opacity-100 transition-opacity duration-300', // Sutil por defecto, visible al pasar el mouse
                    className
                )}
                onClick={() => setShowActivationDialog(true)}
                title="Haga clic para activar la licencia"
            >
                {/* Título Grande */}
                <h1 className={cn(
                    "text-lg font-medium tracking-tight leading-tight",
                    // Texto adaptativo: Gris oscuro en light mode, blanco en dark mode
                    "text-white/80",
                    // Sombra para contraste
                    "drop-shadow-md"
                )}>
                    {getTitle()}
                </h1>

                {/* Subtítulo pequeño */}
                <p className={cn(
                    "text-xs font-normal mt-0.5",
                    "text-white/60",
                    "drop-shadow-sm"
                )}>
                    {getSubtitle()}
                </p>
            </div>

            <LicenseActivationDialog open={showActivationDialog} onOpenChange={setShowActivationDialog} />
        </>
    );
}