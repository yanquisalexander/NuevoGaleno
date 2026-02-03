import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LockScreenProps {
    user?: {
        id: number;
        username: string;
        name: string;
        role: string;
        pin?: string;
    };
    onUnlock: (password: string, isPin: boolean) => Promise<void>;
}

// Hook para el reloj en tiempo real
const useClock = () => {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return date;
};

export function LockScreen({ user, onUnlock }: LockScreenProps) {
    const [expanded, setExpanded] = useState(false);
    const [password, setPassword] = useState('');
    // Modo PIN por defecto si el usuario tiene PIN configurado
    const [isPinMode, setIsPinMode] = useState(!!user?.pin);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const date = useClock();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || !user) return;

        setLoading(true);
        setError('');

        try {
            await onUnlock(password, isPinMode);
        } catch (err: any) {
            setError(err?.message || 'Credenciales incorrectas');
            setPassword('');
        } finally {
            setLoading(false);
        }
    };

    // Formato de hora y fecha al estilo Windows 11
    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const dayStr = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    // Si no hay usuario, al interactuar simplemente desbloqueamos (vamos al login)
    const handleInteraction = () => {
        if (!expanded) {
            setExpanded(true);
            if (!user) {
                // Pequeño delay para el efecto visual y saltamos al login
                setTimeout(() => {
                    onUnlock('', false);
                }, 400);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] overflow-hidden"
            onMouseDown={handleInteraction}
        >
            {/* Fondo con wallpaper blur */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`,
                    filter: expanded ? 'blur(20px) brightness(0.6)' : 'blur(0px) brightness(1)'
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/60" />

            {/* Contenedor principal */}
            <div className="relative z-10 flex flex-col items-center justify-between h-full px-8 py-12">

                {/* Reloj y fecha - Estilo Windows 11 */}
                <div className="flex flex-col items-center mt-32 select-none">
                    <motion.div
                        animate={{
                            scale: expanded ? 0.8 : 1,
                            y: expanded ? -40 : 0,
                            opacity: (expanded && !user) ? 0 : 1
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="text-center"
                    >
                        <div className="text-[120px] font-extralight text-white leading-none tracking-tight mb-2 drop-shadow-2xl">
                            {timeStr}
                        </div>
                        <div className="text-3xl font-light text-white drop-shadow-lg capitalize">
                            {dayStr}
                        </div>
                    </motion.div>
                </div>

                {/* Formulario de desbloqueo */}
                <AnimatePresence>
                    {expanded && user ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="w-full max-w-md mb-16"
                        >
                            <div className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                                {/* Avatar y nombre */}
                                <div className="flex flex-col items-center mb-8">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-4xl font-bold text-white shadow-lg mb-4 border-4 border-white/20">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="text-2xl font-light text-white">{user.name}</h3>
                                    <p className="text-sm text-white/60 mt-1">@{user.username}</p>
                                </div>

                                {/* Formulario */}
                                <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative">
                                        <Input
                                            type={isPinMode ? "password" : (showPassword ? "text" : "password")}
                                            value={password}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (isPinMode) {
                                                    // Solo permitir dígitos en modo PIN y máximo 6
                                                    const digitsOnly = value.replace(/\D/g, '');
                                                    if (digitsOnly.length <= 6) {
                                                        setPassword(digitsOnly);
                                                    }
                                                } else {
                                                    setPassword(value);
                                                }
                                                setError('');
                                            }}
                                            placeholder={isPinMode ? "Ingrese su PIN" : "Ingrese su contraseña"}
                                            className="h-14 px-5 pr-12 bg-white/10 border-white/20 focus-visible:ring-white/30 focus-visible:border-white/40 rounded-xl text-white placeholder:text-white/50 text-lg"
                                            autoFocus
                                            disabled={loading}
                                            maxLength={isPinMode ? 6 : undefined}
                                        />
                                        {!isPinMode && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        )}
                                    </div>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3"
                                        >
                                            {error}
                                        </motion.div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={loading || !password}
                                        className="w-full h-12 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all backdrop-blur-sm border border-white/10"
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Desbloqueando...</span>
                                            </div>
                                        ) : (
                                            <span>Desbloquear</span>
                                        )}
                                    </Button>

                                    {/* Toggle PIN/Contraseña - Solo mostrar si el usuario tiene PIN */}
                                    {user.pin && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPinMode(!isPinMode);
                                                setPassword('');
                                                setError('');
                                            }}
                                            className="w-full text-white/70 hover:text-white text-sm py-2 transition-colors"
                                        >
                                            {isPinMode ? 'Usar contraseña' : 'Usar PIN'}
                                        </button>
                                    )}
                                </form>
                            </div>
                        </motion.div>
                    ) : !expanded && (
                        <motion.div
                            key="prompt"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="flex flex-col items-center gap-4 mb-24 group cursor-pointer select-none"
                        >
                            <div className="flex items-center gap-3 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full transition-all group-hover:bg-white/20 group-hover:scale-105">
                                <Lock size={20} className="text-white" />
                                <span className="text-white text-lg font-light">Bloqueado</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/70 text-sm">
                                <span>Pulse cualquier tecla o haga clic para desbloquear</span>
                                <ChevronDown size={16} className="animate-bounce" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
