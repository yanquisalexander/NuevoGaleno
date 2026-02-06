import { useState } from 'react';
import { User, Shield, KeyRound, LogOut, Check, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSession } from '@/hooks/useSession';
import { useGalenoClient } from '@/hooks/useGalenoClient';

export function UserAccountsApp() {
    const { currentUser, setPin, removePin, logout } = useSession();
    const client = useGalenoClient();

    const [isSettingPin, setIsSettingPin] = useState(false);
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinError, setPinError] = useState('');

    const handleSetPin = async () => {
        setPinError('');
        if (newPin.length < 4) {
            setPinError('El PIN debe tener al menos 4 dígitos.');
            return;
        }
        if (newPin !== confirmPin) {
            setPinError('Los PINs no coinciden.');
            return;
        }
        try {
            await setPin(newPin);
            toast.success('PIN configurado correctamente.');
            setIsSettingPin(false);
            setNewPin('');
            setConfirmPin('');
        } catch (error) {
            console.error('Error configurando PIN:', error);
            toast.error('Error al configurar el PIN. Intenta nuevamente.');
        }
    };

    const handleRemovePin = async () => {
        try {
            await removePin();
            toast.success('PIN eliminado correctamente.');
        } catch (error) {
            console.error('Error eliminando PIN:', error);
            toast.error('Error al eliminar el PIN. Intenta nuevamente.');
        }
    };

    const getInitials = (name: string) => {
        return name.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2);
    };

    if (!currentUser) return null;

    return (
        <div className="flex h-full flex-col bg-[#1c1c1c] text-[#ffffff] font-sans antialiased selection:bg-[#0067c0]/40">
            {/* Header / Hero Section */}
            <div className="flex-none px-9 py-10 pb-6">
                <h1 className="text-2xl font-semibold leading-tight text-white/95 mb-8">Tu cuenta</h1>

                <div className="flex items-center gap-6">
                    {/* User Profile Picture - W11 Style */}
                    <div className="relative group">
                        <div className="w-[92px] h-[92px] rounded-full bg-gradient-to-b from-[#0078d4] to-[#005a9e] flex items-center justify-center text-3xl font-semibold shadow-lg">
                            {getInitials(currentUser.name || currentUser.username)}
                        </div>
                        {/* Status Badge */}
                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-[#1c1c1c] rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-[#60cdff] rounded-full shadow-[0_0_8px_rgba(96,205,255,0.4)]" />
                        </div>
                    </div>

                    <div className="space-y-0.5">
                        <h2 className="text-xl font-semibold text-white/95 leading-snug">{currentUser.name}</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-white/60">@{currentUser.username}</span>
                            <span className="text-white/20 text-xs">•</span>
                            <span className="flex items-center text-xs font-normal text-white/70 bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm capitalize">
                                {currentUser.role === 'admin' ? <Shield className="w-3 h-3 mr-1.5 text-[#ffb900]" /> : <User className="w-3 h-3 mr-1.5 text-[#60cdff]" />}
                                {currentUser.role}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-9 py-2 space-y-7 custom-scrollbar pb-10">

                {/* Opciones de Inicio de Sesión - Expander Style */}
                <section className="space-y-2">
                    <h3 className="text-[14px] font-semibold text-white/90 ml-1">Opciones de inicio de sesión</h3>

                    <div className="bg-[#2d2d2d]/60 border border-white/[0.06] rounded-md overflow-hidden shadow-sm backdrop-blur-xl">
                        {/* Galeno Hello Card */}
                        <div className="p-4 flex items-start gap-4 hover:bg-white/[0.04] transition-colors">
                            <div className="w-5 h-5 mt-1 flex items-center justify-center text-[#60cdff]">
                                <KeyRound strokeWidth={1.5} />
                            </div>

                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-medium text-white/95 leading-normal">Galeno Hello (PIN)</h4>
                                        <p className="text-xs text-white/50 mt-0.5">Inicia sesión de forma rápida y segura utilizando solo un código numérico.</p>
                                    </div>

                                    {!isSettingPin && (
                                        <div className="flex items-center gap-2">
                                            {currentUser.pin && (
                                                <span className="text-[11px] text-[#6ccb5f] flex items-center gap-1 bg-[#6ccb5f]/10 px-2 py-0.5 rounded border border-[#6ccb5f]/20 mr-2">
                                                    <Check className="w-3 h-3" /> Configurado
                                                </span>
                                            )}
                                            <Button
                                                onClick={() => setIsSettingPin(true)}
                                                className="h-8 px-4 bg-white/10 hover:bg-white/15 text-white text-[13px] border-b border-white/5 active:scale-[0.98] transition-all"
                                            >
                                                {currentUser.pin ? 'Cambiar' : 'Configurar'}
                                            </Button>
                                            {currentUser.pin && (
                                                <Button
                                                    onClick={handleRemovePin}
                                                    variant="ghost"
                                                    className="h-8 px-4 text-[13px] text-white/80 hover:bg-red-500/10 hover:text-red-400"
                                                >
                                                    Quitar
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Setup Form - Windows Style Inline Panel */}
                                {isSettingPin && (
                                    <div className="mt-5 p-5 bg-[#323232] border border-white/10 rounded-md shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                        <h5 className="text-[13px] font-medium mb-4 flex items-center gap-2">
                                            <KeyRound className="w-4 h-4 text-[#60cdff]" />
                                            Configurar nuevo PIN
                                        </h5>
                                        <div className="flex flex-col gap-3 max-w-[280px]">
                                            <div className="space-y-1">
                                                <input
                                                    type="password"
                                                    placeholder="Nuevo PIN"
                                                    value={newPin}
                                                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="w-full h-8 bg-[#1c1c1c] border-b-2 border-white/20 focus:border-[#60cdff] outline-none px-3 text-sm transition-all focus:bg-[#202020]"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <input
                                                    type="password"
                                                    placeholder="Confirmar PIN"
                                                    value={confirmPin}
                                                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    className="w-full h-8 bg-[#1c1c1c] border-b-2 border-white/20 focus:border-[#60cdff] outline-none px-3 text-sm transition-all focus:bg-[#202020]"
                                                />
                                            </div>

                                            {pinError && <p className="text-[11px] text-[#ff99a4] flex items-center gap-1.5"><X className="w-3 h-3" /> {pinError}</p>}

                                            <div className="flex gap-2 mt-2">
                                                <Button onClick={() => setIsSettingPin(false)} variant="outline" className="h-8 flex-1 bg-transparent border-white/20 text-white text-xs hover:bg-white/5">
                                                    Cancelar
                                                </Button>
                                                <Button onClick={handleSetPin} className="h-8 flex-1 bg-[#0067c0] hover:bg-[#1975c5] text-white border-b border-black/20 text-xs">
                                                    Aceptar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Acciones de Cuenta - List Style */}
                <section className="space-y-2">
                    <h3 className="text-[14px] font-semibold text-white/90 ml-1">Acciones de cuenta</h3>
                    <div className="bg-[#2d2d2d]/60 border border-white/[0.06] rounded-md overflow-hidden">
                        <button
                            onClick={() => logout(client)}
                            className="w-full p-4 flex items-center justify-between hover:bg-white/[0.04] transition-all group active:scale-[0.998]"
                        >
                            <div className="flex items-center gap-4 text-left">
                                <div className="w-5 h-5 flex items-center justify-center text-red-400/80">
                                    <LogOut strokeWidth={1.5} size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium text-white/95 group-hover:text-red-400 transition-colors">Cerrar sesión</h4>
                                    <p className="text-xs text-white/50">Finalizar tu sesión en este dispositivo.</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                        </button>
                    </div>
                </section>
            </div>

            {/* Minimalist Footer Bar */}
            <div className="h-1 flex-none bg-gradient-to-r from-transparent via-[#0067c0]/20 to-transparent opacity-50" />
        </div>
    );
}