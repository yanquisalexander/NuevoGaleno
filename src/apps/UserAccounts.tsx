import { useState } from 'react';
import { User, Shield, KeyRound, LogOut, Check, X, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';

export function UserAccountsApp() {
    const { currentUser, setPin, removePin, logout } = useSession();

    // States for PIN management
    const [isSettingPin, setIsSettingPin] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const handleSetPin = async () => {
        if (newPin.length < 4) {
            setPinError('El PIN debe tener al menos 4 dígitos');
            return;
        }
        if (newPin !== confirmPin) {
            setPinError('Los PIN no coinciden');
            return;
        }

        try {
            await setPin(newPin);
            toast.success('Galeno Hello configurado correctamente');
            setIsSettingPin(false);
            setNewPin('');
            setConfirmPin('');
            setPinError('');
        } catch (error) {
            toast.error('Error al configurar el PIN');
            console.error(error);
        }
    };

    const handleRemovePin = async () => {
        try {
            if (confirm('¿Estás seguro de que quieres quitar el acceso con PIN?')) {
                await removePin();
                toast.success('PIN eliminado');
            }
        } catch (error) {
            toast.error('Error al eliminar el PIN');
        }
    };

    const handleLogout = async () => {
        await logout();
        // The session context/app wrapper should handle the redirect/state change
    };

    if (!currentUser) return null;

    return (
        <div className="flex h-full flex-col bg-[#202020] text-white selection:bg-blue-500/30 font-sans">
            {/* Header / Hero */}
            <div className="flex-none px-8 py-8 pb-4">
                <h1 className="text-3xl font-semibold tracking-tight mb-6">Tu Cuenta</h1>

                <div className="flex items-center gap-6 p-6 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 relative overflow-hidden">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                    {/* Avatar */}
                    <div className="relative z-10 w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-3xl font-bold shadow-xl shadow-blue-500/20 border-4 border-[#202020]">
                        {getInitials(currentUser.name || currentUser.username)}
                    </div>

                    {/* Info */}
                    <div className="relative z-10 space-y-1">
                        <h2 className="text-2xl font-semibold">{currentUser.name}</h2>
                        <div className="flex items-center gap-2 text-white/60">
                            <span className="text-sm">@{currentUser.username}</span>
                            <span>•</span>
                            <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/80 border border-white/10 capitalize">
                                {currentUser.role === 'admin' ? <Shield className="w-3 h-3 mr-1 text-amber-400" /> : <User className="w-3 h-3 mr-1" />}
                                {currentUser.role}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar space-y-6">

                {/* Opciones de Inicio de Sesion */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold px-1">Opciones de inicio de sesión</h3>

                    <div className="flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#272727] shadow-sm">

                        {/* Galeno Hello (PIN) */}
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                    <KeyRound className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-base font-medium text-white/90">Galeno Hello (PIN)</h4>
                                            <p className="text-sm text-white/50 mt-1 max-w-lg">
                                                Inicia sesión de forma rápida y segura utilizando solo un código numérico.
                                            </p>
                                        </div>

                                        {!isSettingPin && (
                                            <div>
                                                {currentUser.pin ? (
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-sm text-emerald-400 font-medium flex items-center gap-1.5 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
                                                            <Check className="w-3.5 h-3.5" />
                                                            Configurado
                                                        </span>
                                                        <Button
                                                            variant="outline"
                                                            className="border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 text-white/70"
                                                            onClick={handleRemovePin}
                                                        >
                                                            Quitar
                                                        </Button>
                                                        <Button
                                                            className="bg-blue-600 hover:bg-blue-500 text-white"
                                                            onClick={() => { setIsSettingPin(true); setNewPin(''); setConfirmPin(''); }}
                                                        >
                                                            Cambiar
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                                        onClick={() => setIsSettingPin(true)}
                                                    >
                                                        Configurar
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Inline PIN Setup Form */}
                                    {isSettingPin && (
                                        <div className="bg-[#1a1a1a] rounded-lg p-5 border border-white/5 animate-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-4 max-w-xs">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-white/70 ml-1">Nuevo PIN</label>
                                                    <input
                                                        type="password"
                                                        pattern="[0-9]*"
                                                        inputMode="numeric"
                                                        maxLength={6}
                                                        className="w-full h-10 rounded-md bg-[#252525] border border-white/10 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-center tracking-widest text-lg"
                                                        placeholder="••••"
                                                        value={newPin}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            if (val.length <= 6) setNewPin(val);
                                                            if (pinError) setPinError('');
                                                        }}
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-white/70 ml-1">Confirmar PIN</label>
                                                    <input
                                                        type="password"
                                                        pattern="[0-9]*"
                                                        inputMode="numeric"
                                                        maxLength={6}
                                                        className={`w-full h-10 rounded-md bg-[#252525] border border-white/10 px-3 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono text-center tracking-widest text-lg ${confirmPin && newPin !== confirmPin ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' : ''
                                                            }`}
                                                        placeholder="••••"
                                                        value={confirmPin}
                                                        onChange={(e) => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            if (val.length <= 6) setConfirmPin(val);
                                                        }}
                                                    />
                                                </div>

                                                {pinError && (
                                                    <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                                                        <X className="w-3 h-3" /> {pinError}
                                                    </p>
                                                )}

                                                <div className="flex items-center gap-2 pt-2">
                                                    <Button
                                                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white"
                                                        onClick={handleSetPin}
                                                        disabled={!newPin || !confirmPin}
                                                    >
                                                        Guardar PIN
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        className="flex-shrink-0 hover:bg-white/10 text-white/70"
                                                        onClick={() => { setIsSettingPin(false); setPinError(''); setConfirmPin(''); setNewPin(''); }}
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Account Actions */}
                <div className="space-y-3">
                    <h3 className="text-lg font-semibold px-1">Acciones de cuenta</h3>

                    <div className="flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#272727] shadow-sm divide-y divide-white/5">
                        <div
                            className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                            onClick={handleLogout}
                        >
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-400">
                                    <LogOut className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-base font-medium text-white/90 group-hover:text-red-400 transition-colors">Cerrar Sesión</h4>
                                    <p className="text-sm text-white/50">
                                        Finalizar tu sesión actual en este dispositivo.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                className="text-white/60 hover:text-red-400 hover:bg-red-500/10 self-start sm:self-center"
                            >
                                <span className="mr-2">Salir ahora</span>
                                <ArrowIcon />
                            </Button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

const ArrowIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
        <path d="m9 18 6-6-6-6" />
    </svg>
)
