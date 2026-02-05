import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLicense } from '@/hooks/useLicense';
import {
    Key,
    Mail,
    Calendar,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    Shield,
    AlertTriangle,
    Copy,
    ExternalLink,
    Info,
    HelpCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { LicenseActivationDialog } from '@/components/LicenseActivationDialog';
import { cn } from '@/lib/utils';

/**
 * Panel de administración de licencias - Fluent Design Windows 10/11
 */
export function LicenseManagementPanel() {
    const {
        licenseStatus,
        isLicensed,
        isActive,
        isTrial,
        trialDaysRemaining,
        isOfflineMode,
        isLoading,
        validateLicense,
        deactivateLicense,
    } = useLicense();

    const [showActivationDialog, setShowActivationDialog] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);

    const handleValidate = async () => {
        setIsValidating(true);
        await validateLicense();
        setIsValidating(false);
    };

    const handleDeactivate = async () => {
        if (
            confirm(
                '¿Estás seguro de que deseas desactivar esta licencia? Esto liberará una activación para usar en otro equipo.'
            )
        ) {
            setIsDeactivating(true);
            await deactivateLicense();
            setIsDeactivating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const getStatusBadge = () => {
        if (isActive && isLicensed) {
            return (
                <Badge className="gap-1.5 px-2.5 py-0.5 bg-[#107c10]/15 text-[#6ccb5f] border-[#107c10]/30 hover:bg-[#107c10]/20 font-normal text-xs">
                    <CheckCircle className="h-3 w-3" strokeWidth={2} />
                    Activa
                </Badge>
            );
        }
        if (isTrial && trialDaysRemaining > 0) {
            return (
                <Badge className="gap-1.5 px-2.5 py-0.5 bg-[#0078d4]/15 text-[#60cdff] border-[#0078d4]/30 hover:bg-[#0078d4]/20 font-normal text-xs">
                    <Clock className="h-3 w-3" strokeWidth={2} />
                    Prueba ({trialDaysRemaining} días)
                </Badge>
            );
        }
        if (isTrial && trialDaysRemaining <= 0) {
            return (
                <Badge className="gap-1.5 px-2.5 py-0.5 bg-[#c42b1c]/15 text-[#ff6b6b] border-[#c42b1c]/30 hover:bg-[#c42b1c]/20 font-normal text-xs">
                    <XCircle className="h-3 w-3" strokeWidth={2} />
                    Expirada
                </Badge>
            );
        }
        return (
            <Badge className="gap-1.5 px-2.5 py-0.5 bg-white/[0.05] text-white/60 border-white/10 hover:bg-white/[0.08] font-normal text-xs">
                <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                Sin licencia
            </Badge>
        );
    };

    return (
        <div className="space-y-5">
            {/* Estado actual */}
            <FluentCard>
                <div className="flex items-start justify-between mb-6">
                    <div className="space-y-1">
                        <h3 className="text-base font-semibold text-white/95">Estado de Licencia</h3>
                        <p className="text-[13px] text-white/50">Información sobre la licencia activa en este equipo</p>
                    </div>
                    {getStatusBadge()}
                </div>

                <div className="space-y-5">
                    {isLicensed && licenseStatus ? (
                        <>
                            <div className="grid gap-4 md:grid-cols-2">
                                <FluentField label="Clave de licencia" icon={Key}>
                                    <div className="flex gap-2">
                                        <Input
                                            value={licenseStatus.license_key || ''}
                                            readOnly
                                            className="font-mono text-xs bg-[#2b2b2b]/60 border-white/[0.08] text-white/90 h-9 focus-visible:ring-1 focus-visible:ring-[#0067c0] focus-visible:border-[#0067c0]"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => copyToClipboard(licenseStatus.license_key || '')}
                                            className="h-9 w-9 bg-[#2b2b2b]/60 border-white/[0.08] text-white/70 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.12] active:scale-95 transition-all"
                                        >
                                            <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                                        </Button>
                                    </div>
                                </FluentField>

                                <FluentField label="Email del cliente" icon={Mail}>
                                    <Input
                                        value={licenseStatus.customer_email || ''}
                                        readOnly
                                        className="bg-[#2b2b2b]/60 border-white/[0.08] text-white/90 h-9 text-[13px] focus-visible:ring-1 focus-visible:ring-[#0067c0] focus-visible:border-[#0067c0]"
                                    />
                                </FluentField>

                                <FluentField label="Última verificación" icon={Calendar}>
                                    <Input
                                        value={
                                            licenseStatus.last_check
                                                ? new Date(licenseStatus.last_check).toLocaleString('es-ES')
                                                : 'Nunca'
                                        }
                                        readOnly
                                        className="bg-[#2b2b2b]/60 border-white/[0.08] text-white/90 h-9 text-[13px] focus-visible:ring-1 focus-visible:ring-[#0067c0] focus-visible:border-[#0067c0]"
                                    />
                                </FluentField>

                                <div className="space-y-2">
                                    <Label className="text-[13px] text-white/60 font-normal">Estado de conexión</Label>
                                    <div className="flex items-center gap-2.5 h-9 px-3 rounded-[4px] bg-[#2b2b2b]/60 border border-white/[0.08]">
                                        <div
                                            className={cn(
                                                "h-2 w-2 rounded-full",
                                                isOfflineMode ? "bg-[#ffa500] shadow-[0_0_8px_rgba(255,165,0,0.5)]" : "bg-[#107c10] shadow-[0_0_8px_rgba(16,124,16,0.5)]"
                                            )}
                                        />
                                        <span className="text-[13px] text-white/90">
                                            {isOfflineMode ? 'Modo sin conexión' : 'Conectado'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isOfflineMode && licenseStatus.cached_response && (
                                <FluentAlert variant="warning">
                                    <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                                    <div>
                                        <AlertTitle className="text-sm font-semibold mb-1">Modo sin conexión</AlertTitle>
                                        <AlertDescription className="text-[13px]">
                                            La aplicación está usando una respuesta de licencia en caché. Se intentará
                                            verificar nuevamente cuando haya conexión a internet.
                                        </AlertDescription>
                                    </div>
                                </FluentAlert>
                            )}

                            <Separator className="bg-white/[0.08]" />

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleValidate}
                                    disabled={isValidating || isLoading}
                                    variant="outline"
                                    className="bg-[#2b2b2b]/60 border-white/[0.08] text-white/90 hover:bg-white/[0.06] hover:text-white hover:border-white/[0.12] active:scale-95 transition-all h-9 text-[13px] font-normal"
                                >
                                    <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isValidating && "animate-spin")} strokeWidth={2} />
                                    Verificar ahora
                                </Button>
                                <Button
                                    onClick={handleDeactivate}
                                    disabled={isDeactivating || isLoading}
                                    variant="destructive"
                                    className="bg-[#c42b1c]/15 hover:bg-[#c42b1c]/25 text-[#ff6b6b] border border-[#c42b1c]/30 hover:border-[#c42b1c]/40 active:scale-95 transition-all h-9 text-[13px] font-normal"
                                >
                                    <XCircle className="mr-2 h-3.5 w-3.5" strokeWidth={2} />
                                    Desactivar licencia
                                </Button>
                            </div>
                        </>
                    ) : isTrial ? (
                        <>
                            <FluentAlert variant={trialDaysRemaining <= 7 ? 'error' : 'info'}>
                                <Clock className="h-4 w-4" strokeWidth={2} />
                                <div>
                                    <AlertTitle className="text-sm font-semibold mb-1">Versión de prueba</AlertTitle>
                                    <AlertDescription className="text-[13px]">
                                        Te quedan {trialDaysRemaining} día{trialDaysRemaining !== 1 ? 's' : ''} de prueba gratuita.
                                        {trialDaysRemaining <= 7 && ' ¡Activa tu licencia pronto!'}
                                    </AlertDescription>
                                </div>
                            </FluentAlert>

                            <Button
                                onClick={() => setShowActivationDialog(true)}
                                className="w-full bg-[#0067c0] hover:bg-[#005a9e] text-white h-9 text-[13px] font-medium active:scale-[0.98] transition-all rounded-[4px]"
                            >
                                <Key className="mr-2 h-4 w-4" strokeWidth={2} />
                                Activar licencia
                            </Button>
                        </>
                    ) : (
                        <>
                            <FluentAlert variant="error">
                                <AlertTriangle className="h-4 w-4" strokeWidth={2} />
                                <div>
                                    <AlertTitle className="text-sm font-semibold mb-1">Sin licencia activa</AlertTitle>
                                    <AlertDescription className="text-[13px]">
                                        Esta instalación de Nuevo Galeno no tiene una licencia activa. Algunas funciones
                                        están limitadas.
                                    </AlertDescription>
                                </div>
                            </FluentAlert>

                            <Button
                                onClick={() => setShowActivationDialog(true)}
                                className="w-full bg-[#0067c0] hover:bg-[#005a9e] text-white h-9 text-[13px] font-medium active:scale-[0.98] transition-all rounded-[4px]"
                            >
                                <Key className="mr-2 h-4 w-4" strokeWidth={2} />
                                Activar licencia
                            </Button>
                        </>
                    )}
                </div>
            </FluentCard>

            {/* Información adicional */}
            <FluentCard>
                <div className="space-y-1 mb-5">
                    <h3 className="text-base font-semibold text-white/95">Información</h3>
                    <p className="text-[13px] text-white/50">Detalles sobre el sistema de licenciamiento</p>
                </div>

                <div className="space-y-5">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Info className="h-4 w-4 text-[#0067c0]" strokeWidth={2} />
                            <h4 className="text-[13px] font-semibold text-white/90">¿Cómo funciona?</h4>
                        </div>
                        <ul className="space-y-2 text-[13px] text-white/60 pl-6">
                            <li className="flex items-start gap-2">
                                <span className="text-white/40 mt-1">•</span>
                                <span>Cada licencia puede activarse en múltiples equipos (según tu plan)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-white/40 mt-1">•</span>
                                <span>La licencia se valida automáticamente cada 24 horas</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-white/40 mt-1">•</span>
                                <span>Puedes usar la app sin conexión por hasta 7 días</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-white/40 mt-1">•</span>
                                <span>Puedes desactivar la licencia para usarla en otro equipo</span>
                            </li>
                        </ul>
                    </div>

                    <Separator className="bg-white/[0.08]" />

                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-[#0067c0]" strokeWidth={2} />
                            <h4 className="text-[13px] font-semibold text-white/90">¿Necesitas ayuda?</h4>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                variant="link"
                                className="justify-start p-0 h-auto text-[#60cdff] hover:text-[#4fb8e6] text-[13px] font-normal"
                                asChild
                            >
                                <a href="https://migaleno.com/soporte" target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-3.5 w-3.5" strokeWidth={2} />
                                    Contactar con soporte
                                </a>
                            </Button>
                            <Button
                                variant="link"
                                className="justify-start p-0 h-auto text-[#60cdff] hover:text-[#4fb8e6] text-[13px] font-normal"
                                asChild
                            >
                                <a href="https://migaleno.com/licencias" target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="mr-2 h-3.5 w-3.5" strokeWidth={2} />
                                    Comprar o renovar licencia
                                </a>
                            </Button>
                        </div>
                    </div>
                </div>
            </FluentCard>

            <LicenseActivationDialog open={showActivationDialog} onOpenChange={setShowActivationDialog} />
        </div>
    );
}

// --- Componentes auxiliares Fluent Design ---

function FluentCard({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={cn(
            "rounded-lg border border-white/[0.08] bg-[#2b2b2b]/40 backdrop-blur-sm p-6 shadow-sm",
            className
        )}>
            {children}
        </div>
    );
}

function FluentField({
    label,
    icon: Icon,
    children
}: {
    label: string;
    icon: any;
    children: React.ReactNode
}) {
    return (
        <div className="space-y-2">
            <Label className="text-[13px] text-white/60 font-normal flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-white/40" strokeWidth={2} />
                {label}
            </Label>
            {children}
        </div>
    );
}

function FluentAlert({
    variant = 'info',
    children
}: {
    variant?: 'info' | 'warning' | 'error';
    children: React.ReactNode
}) {
    const styles = {
        info: 'bg-[#0078d4]/10 border-[#0078d4]/30 text-[#60cdff]',
        warning: 'bg-[#ffa500]/10 border-[#ffa500]/30 text-[#ffb938]',
        error: 'bg-[#c42b1c]/10 border-[#c42b1c]/30 text-[#ff6b6b]',
    };

    return (
        <Alert className={cn(
            "rounded-[4px] flex items-start gap-3 p-4",
            styles[variant]
        )}>
            {children}
        </Alert>
    );
}