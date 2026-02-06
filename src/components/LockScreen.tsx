import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, ChevronUp } from 'lucide-react'; // Cambié ChevronDown por Up para la inercia
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

    const timeStr = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const dayStr = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

    const handleInteraction = () => {
        if (!expanded) {
            setExpanded(true);
            if (!user) {
                setTimeout(() => {
                    onUnlock('', false);
                }, 600);
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -100, transition: { duration: 0.8, ease: [0.32, 0.72, 0, 1] } }}
            className="fixed inset-0 z-[200] overflow-hidden font-sans"
            onMouseDown={handleInteraction}
        >
            {/* Background Layer */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-out scale-110"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064')`,
                    filter: expanded ? 'blur(40px) brightness(0.5)' : 'blur(0px) brightness(0.9)'
                }}
            />

            {/* Overlay estilo Mica */}
            <div className={`absolute inset-0 transition-opacity duration-1000 ${expanded ? 'bg-black/20 opacity-100' : 'bg-transparent opacity-0'}`} />

            <div className="relative z-10 flex flex-col items-center justify-between h-full px-8 pt-24 pb-16">

                {/* Reloj Central (Windows 11 Feel) */}
                <motion.div
                    animate={{
                        y: expanded ? -20 : 0,
                        scale: expanded ? 0.85 : 1,
                        opacity: (expanded && !user) ? 0 : 1
                    }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="flex flex-col items-center select-none cursor-default"
                >
                    <h1 className="text-[140px] font-extralight text-white leading-none tracking-tighter drop-shadow-[0_10px_35px_rgba(0,0,0,0.5)]">
                        {timeStr}
                    </h1>
                    <p className="text-2xl font-light text-white/90 drop-shadow-lg capitalize tracking-wide mt-4">
                        {dayStr}
                    </p>
                </motion.div>

                {/* UI de Desbloqueo */}
                <AnimatePresence mode="wait">
                    {expanded && user ? (
                        <motion.div
                            key="login-form"
                            initial={{ opacity: 0, y: 30, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            className="w-full max-w-[380px] mb-20"
                        >
                            {/* Card estilo macOS Glass */}
                            <div className="bg-white/[0.05] backdrop-blur-[50px] border border-white/10 rounded-[40px] p-8 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] text-center">
                                <div className="flex flex-col items-center mb-8">
                                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-3xl font-light text-white shadow-2xl mb-4 border border-white/20">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="text-xl font-medium text-white">{user.name}</h3>
                                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Bloqueado</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative group">
                                        <Input
                                            type={isPinMode ? "password" : (showPassword ? "text" : "password")}
                                            value={password}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (isPinMode) {
                                                    const d = val.replace(/\D/g, '').slice(0, 6);
                                                    setPassword(d);
                                                } else setPassword(val);
                                                setError('');
                                            }}
                                            placeholder={isPinMode ? "PIN" : "Contraseña"}
                                            className="h-12 bg-black/20 border-white/10 focus:border-white/30 rounded-2xl text-center text-white placeholder:text-white/20 text-lg transition-all"
                                            autoFocus
                                            disabled={loading}
                                        />
                                        {!isPinMode && (
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        )}
                                    </div>

                                    {error && (
                                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs font-medium">
                                            {error}
                                        </motion.p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={loading || !password}
                                        className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all active:scale-95"
                                    >
                                        {loading ? (
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : "Desbloquear"}
                                    </Button>

                                    {user.pin && (
                                        <button
                                            type="button"
                                            onClick={() => { setIsPinMode(!isPinMode); setPassword(''); }}
                                            className="text-[10px] text-white/40 hover:text-white uppercase tracking-widest pt-2 transition-colors font-bold"
                                        >
                                            {isPinMode ? 'Usar Contraseña' : 'Usar PIN'}
                                        </button>
                                    )}
                                </form>
                            </div>
                        </motion.div>
                    ) : !expanded && (
                        <motion.div
                            key="hint"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-4 mb-12 cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 px-6 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full group-hover:bg-white/10 transition-all">
                                <Lock size={16} className="text-white/80" />
                                <span className="text-white/80 text-sm font-light tracking-wide">Desliza o pulsa para entrar</span>
                            </div>
                            <ChevronUp size={20} className="text-white/40 animate-bounce" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}