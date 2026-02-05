import { ReactNode } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Key, Lock } from 'lucide-react';
import { useState } from 'react';
import { LicenseActivationDialog } from './LicenseActivationDialog';

interface LicenseGuardProps {
    children: ReactNode;
    feature?: keyof import('@/types/licensing').LicenseRestrictions;
    limitKey?: 'max_patients' | 'max_appointments' | 'max_treatments';
    currentCount?: number;
    fallback?: ReactNode;
    showActivateButton?: boolean;
}

/**
 * Componente que protege funciones según el estado de la licencia
 * 
 * Uso:
 * ```tsx
 * <LicenseGuard feature="can_export">
 *   <ExportButton />
 * </LicenseGuard>
 * 
 * <LicenseGuard limitKey="max_patients" currentCount={patientCount}>
 *   <AddPatientButton />
 * </LicenseGuard>
 * ```
 */
export function LicenseGuard({
    children,
    feature,
    limitKey,
    currentCount,
    fallback,
    showActivateButton = true,
}: LicenseGuardProps) {
    const { hasFeature, isLimitReached, getLimitMessage, isActive, isLicensed } =
        useLicense();
    const [showActivationDialog, setShowActivationDialog] = useState(false);

    // Si está activa y licenciada, mostrar todo
    if (isActive && isLicensed) {
        return <>{children}</>;
    }

    // Verificar feature específica
    if (feature && !hasFeature(feature)) {
        return (
            fallback || (
                <Alert variant="destructive" className="my-4 bg-red-500/10 border-red-500/20 text-red-200">
                    <Lock className="h-4 w-4 text-red-400" />
                    <AlertTitle>Función no disponible</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>Esta función requiere una licencia activa de Nuevo Galeno.</p>
                        {showActivateButton && (
                            <Button size="sm" onClick={() => setShowActivationDialog(true)} className="bg-red-500/20 hover:bg-red-500/30 text-red-100 border-transparent">
                                <Key className="mr-2 h-3 w-3" />
                                Activar licencia
                            </Button>
                        )}
                    </AlertDescription>
                    <LicenseActivationDialog
                        open={showActivationDialog}
                        onOpenChange={setShowActivationDialog}
                    />
                </Alert>
            )
        );
    }

    // Verificar límite
    if (limitKey && currentCount !== undefined && isLimitReached(limitKey, currentCount)) {
        const message = getLimitMessage(limitKey);
        return (
            fallback || (
                <Alert variant="destructive" className="my-4 bg-orange-500/10 border-orange-500/20 text-orange-200">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <AlertTitle>Límite alcanzado</AlertTitle>
                    <AlertDescription className="space-y-2">
                        <p>{message}</p>
                        {showActivateButton && (
                            <Button size="sm" onClick={() => setShowActivationDialog(true)} className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-100 border-transparent">
                                <Key className="mr-2 h-3 w-3" />
                                Activar licencia
                            </Button>
                        )}
                    </AlertDescription>
                    <LicenseActivationDialog
                        open={showActivationDialog}
                        onOpenChange={setShowActivationDialog}
                    />
                </Alert>
            )
        );
    }

    return <>{children}</>;
}

/**
 * Hook para usar restricciones en lógica
 */
export function useLicenseRestrictions() {
    const license = useLicense();

    const canUseFeature = (feature: keyof import('@/types/licensing').LicenseRestrictions): boolean => {
        return license.hasFeature(feature);
    };

    const canAdd = (
        limitKey: 'max_patients' | 'max_appointments' | 'max_treatments',
        currentCount: number
    ): { allowed: boolean; message?: string } => {
        if (license.isActive && license.isLicensed) {
            return { allowed: true };
        }

        if (license.isLimitReached(limitKey, currentCount)) {
            return {
                allowed: false,
                message: license.getLimitMessage(limitKey),
            };
        }

        return { allowed: true };
    };

    const getWatermarkText = (): string | null => {
        const restrictions = license.getRestrictions();
        return restrictions.watermark || null;
    };

    return {
        ...license,
        canUseFeature,
        canAdd,
        getWatermarkText,
    };
}
