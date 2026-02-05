import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLicense } from '@/hooks/useLicense';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, Mail, CheckCircle, XCircle, Info } from 'lucide-react';

interface LicenseActivationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LicenseActivationDialog({ open, onOpenChange }: LicenseActivationDialogProps) {
    const [licenseKey, setLicenseKey] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [activationResult, setActivationResult] = useState<{
        success: boolean;
        message: string;
    } | null>(null);

    const { activateLicense, startTrial, isTrial, licenseStatus } = useLicense();

    // El botón de trial solo se oculta si alguna vez se usó el trial
    const hasTrialHistory = licenseStatus?.trial_used ?? false;

    console.log('LicenseActivationDialog render, isTrial:', isTrial, 'licenseStatus:', licenseStatus, 'hasTrialHistory:', hasTrialHistory);

    const handleActivate = async () => {
        if (!licenseKey.trim() || !customerEmail.trim()) {
            setActivationResult({
                success: false,
                message: 'Por favor, completa todos los campos',
            });
            return;
        }

        setIsActivating(true);
        setActivationResult(null);

        const result = await activateLicense(licenseKey.trim(), customerEmail.trim());
        setActivationResult(result);
        setIsActivating(false);

        if (result.success) {
            setTimeout(() => {
                onOpenChange(false);
                setLicenseKey('');
                setCustomerEmail('');
                setActivationResult(null);
            }, 2000);
        }
    };

    const handleStartTrial = async () => {
        setIsActivating(true);
        const result = await startTrial();
        setActivationResult(result);
        setIsActivating(false);

        if (result.success) {
            setTimeout(() => {
                onOpenChange(false);
            }, 1500);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Contenedor principal con efecto de elevación y bordes Windows 11 */}
            <DialogContent className="sm:max-w-[480px] bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-xl overflow-hidden">

                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center gap-3 text-xl font-semibold tracking-tight">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <Key className="h-5 w-5 text-[#60cdff]" />
                        </div>
                        Activar Nuevo Galeno
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400 text-sm leading-relaxed">
                        Introduce tus credenciales para validar tu licencia. Si acabas de realizar la compra, el correo puede tardar unos minutos.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Campo: Clave de Producto */}
                    <div className="space-y-2">
                        <Label htmlFor="license-key" className="text-xs font-medium uppercase tracking-wider text-zinc-500 ml-1">
                            Clave de producto
                        </Label>
                        <div className="relative group">
                            <Input
                                id="license-key"
                                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                                value={licenseKey}
                                onChange={(e) => setLicenseKey(e.target.value)}
                                disabled={isActivating}
                                className="bg-[#2b2b2b] border-[#3d3d3d] border-b-2 border-b-zinc-500 focus-visible:border-b-[#60cdff] focus-visible:ring-0 focus-visible:bg-[#323232] transition-all duration-200 rounded-md placeholder:text-zinc-600"
                            />
                        </div>
                    </div>

                    {/* Campo: Email */}
                    <div className="space-y-2">
                        <Label htmlFor="customer-email" className="text-xs font-medium uppercase tracking-wider text-zinc-500 ml-1">
                            Correo electrónico
                        </Label>
                        <Input
                            id="customer-email"
                            type="email"
                            placeholder="nombre@ejemplo.com"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            disabled={isActivating}
                            className="bg-[#2b2b2b] border-[#3d3d3d] border-b-2 border-b-zinc-500 focus-visible:border-b-[#60cdff] focus-visible:ring-0 focus-visible:bg-[#323232] transition-all duration-200 rounded-md placeholder:text-zinc-600"
                        />
                    </div>

                    {/* Alertas de Estado */}
                    {activationResult && (
                        <Alert className={`animate-in fade-in zoom-in-95 duration-200 ${activationResult.success
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                            {activationResult.success ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            <AlertDescription className="ml-2 font-medium">{activationResult.message}</AlertDescription>
                        </Alert>
                    )}

                    {/* Sección Trial con estilo Info Bar de Windows */}
                    {!hasTrialHistory && !activationResult && (
                        <div className="bg-[#2d2d2d] rounded-lg p-4 border border-white/5 flex gap-3 items-start">
                            <Info className="h-5 w-5 text-[#60cdff] shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-zinc-200">¿Quieres probar antes de comprar?</p>
                                <p className="text-xs text-zinc-400 leading-snug">
                                    Puedes iniciar una prueba gratuita con todas las funciones habilitadas por 30 días.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="bg-[#1a1a1a]/50 p-6 -mx-6 -mb-6 mt-2 flex flex-col-reverse sm:flex-row gap-3">
                    {!hasTrialHistory && (
                        <Button
                            variant="secondary"
                            onClick={handleStartTrial}
                            disabled={isActivating}
                            className="w-full sm:w-auto bg-[#323232] hover:bg-[#3d3d3d] text-zinc-200 border-none rounded-md"
                        >
                            Probar gratis
                        </Button>
                    )}
                    <Button
                        onClick={handleActivate}
                        disabled={isActivating || !licenseKey.trim() || !customerEmail.trim()}
                        className="w-full sm:w-auto bg-[#0067c0] hover:bg-[#0078d4] text-white font-medium shadow-[0_2px_4px_rgba(0,0,0,0.3)] border-t border-white/10 rounded-md transition-all active:scale-[0.98]"
                    >
                        {isActivating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Validando...
                            </>
                        ) : (
                            'Activar ahora'
                        )}
                    </Button>
                </DialogFooter>

                <div className="pb-4 pt-8 text-center">
                    <a href="#" className="text-xs text-zinc-500 hover:text-[#60cdff] transition-colors underline-offset-4 hover:underline">
                        ¿Olvidaste tu clave o necesitas soporte técnico?
                    </a>
                </div>
            </DialogContent>
        </Dialog>
    );
}