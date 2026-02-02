import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { AlertTriangle, Lock } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    confirmLabel = 'Confirmar',
    onConfirm,
    dangerous = false,
}: SystemPasswordDialogProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!password) {
            toast.error('Ingresa la contraseña del sistema');
            return;
        }

        setLoading(true);
        try {
            // Hash de la contraseña
            const pwBuffer = new TextEncoder().encode(password);
            const hashBuf = await crypto.subtle.digest('SHA-256', pwBuffer);
            const hashHex = Array.from(new Uint8Array(hashBuf))
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('');

            // Verificar la contraseña del sistema
            const isValid: boolean = await invoke('verify_system_password', {
                passwordHash: hashHex,
            });

            if (!isValid) {
                toast.error('Contraseña del sistema incorrecta');
                setLoading(false);
                return;
            }

            // Ejecutar la acción
            await onConfirm(hashHex);

            setPassword('');
            onOpenChange(false);
        } catch (err: any) {
            console.error('Error:', err);
            toast.error(err.toString());
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dangerous ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-xl">{title}</DialogTitle>
                    </div>
                    <DialogDescription className="text-base">
                        {description}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Contraseña del Sistema</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                                className="pl-11"
                                placeholder="Ingresa la contraseña del sistema"
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            Esta es la contraseña maestra configurada durante la instalación inicial.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setPassword('');
                            onOpenChange(false);
                        }}
                        disabled={loading}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading || !password}
                        className={dangerous ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                        {loading ? 'Verificando...' : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
