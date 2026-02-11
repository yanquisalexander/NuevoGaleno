import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, ChevronUp, Info } from 'lucide-react';
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

// --- Custom Hooks ---

const useClock = () => {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setDate(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);
    return date;
};

const useBingImage = () => {
    const [bgUrl, setBgUrl] = useState('https://images.unsplash.com/photo-1620121692029-d088224ddc74?q=80&w=2064'); // Fallback

    useEffect(() => {
        const fetchBingImage = async () => {
            try {
                // Endpoint público que devuelve la imagen de Bing del día sin problemas de CORS
                const res = await fetch('https://bing.biturl.top/?resolution=1920&format=json&index=0&mkt=es-ES');
                const data = await res.json();
                if (data.url) setBgUrl(data.url);
            } catch (error) {
                console.warn('No se pudo cargar la imagen de Bing, usando fallback.', error);
            }
        };
        fetchBingImage();
    }, []);

    return bgUrl;
};

const useMedicalFact = () => {
    const facts = useMemo(() => [
        "El esmalte dental es la sustancia más dura y mineralizada de todo el cuerpo humano.",
        "El corazón bombea aproximadamente 7.000 litros de sangre al día.",
        "Los dientes humanos son tan fuertes como los de un tiburón.",
        "El cuerpo humano tiene suficientes vasos sanguíneos como para dar la vuelta a la Tierra 2.5 veces.",
        "La lengua es el único músculo del cuerpo que está unido por un solo extremo.",
        "El hueso más pequeño del cuerpo humano está en el oído: el estribo, que mide unos 3 milímetros.",
        "Producimos suficiente saliva en nuestra vida como para llenar dos piscinas olímpicas.",
        "Los impulsos nerviosos viajan a una velocidad de hasta 120 metros por segundo.",
        "El cerebro humano utiliza aproximadamente el 20% de la energía y el oxígeno del cuerpo.",
        "Las huellas dactilares y la impresión de la lengua son únicas en cada persona."
    ], []);

    const [fact, setFact] = useState('');

    useEffect(() => {
        const randomFact = facts[Math.floor(Math.random() * facts.length)];
        setFact(randomFact);
    }, [facts]);

    return fact;
};

// --- Componente Principal ---

export function LockScreen({ user, onUnlock }: LockScreenProps) {
    const [expanded, setExpanded] = useState(false);
    const [password, setPassword] = useState('');
    const [isPinMode, setIsPinMode] = useState(!!user?.pin);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const date = useClock();
    const bgImage = useBingImage();
    const fact = useMedicalFact();

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

    // Formateo sutilmente adaptado a la región (es-UY)
    const timeStr = date.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dayStr = date.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });

    const handleInteraction = () => {
        if (!expanded) {
            setExpanded(true);
            if (!user) {
                setTimeout(() => onUnlock('', false), 600);
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
            {/* Background Layer: Bing Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-all duration-[1500ms] ease-out"
                style={{
                    backgroundImage: `url('${bgImage}')`,
                    transform: expanded ? 'scale(1.05)' : 'scale(1)',
                    filter: expanded ? 'blur(30px) brightness(0.6)' : 'blur(0px) brightness(0.95)'
                }}
            />

            {/* Overlay estilo Mica / Apple Glass */}
            <div className={`absolute inset-0 transition-opacity duration-1000 bg-gradient-to-b from-black/10 via-transparent to-black/60 ${expanded ? 'opacity-100' : 'opacity-40'}`} />

            <div className="relative z-10 flex flex-col items-center justify-between h-full px-8 pt-24 pb-12">

                {/* Top Section: Reloj Central */}
                <motion.div
                    animate={{
                        y: expanded ? -40 : 0,
                        scale: expanded ? 0.9 : 1,
                        opacity: (expanded && !user) ? 0 : 1
                    }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="flex flex-col items-center select-none cursor-default"
                >
                    <h1 className="text-[130px] md:text-[150px] font-extralight text-white leading-none tracking-tighter drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                        {timeStr}
                    </h1>
                    <p className="text-2xl font-light text-white/90 drop-shadow-lg capitalize tracking-wide mt-2">
                        {dayStr}
                    </p>
                </motion.div>

                {/* Center Section: UI de Desbloqueo */}
                <AnimatePresence mode="wait">
                    {expanded && user ? (
                        <motion.div
                            key="login-form"
                            initial={{ opacity: 0, y: 40, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            className="w-full max-w-[380px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-10"
                        >
                            {/* Card estilo macOS Glass / Fluent */}
                            <div className="bg-white/5 backdrop-blur-[60px] border border-white/10 rounded-[40px] p-8 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] text-center relative overflow-hidden">
                                {/* Brillo sutil de fondo en la tarjeta */}
                                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 blur-[50px] rounded-full pointer-events-none" />

                                <div className="flex flex-col items-center mb-8 relative z-10">
                                    <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-4xl font-light text-white shadow-2xl mb-5 border border-white/20 ring-4 ring-black/10">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <h3 className="text-2xl font-medium text-white tracking-tight">{user.name}</h3>
                                    <p className="text-[11px] text-white/40 uppercase tracking-[0.2em] mt-1.5 font-semibold">Pantalla Bloqueada</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4 relative z-10" onClick={(e) => e.stopPropagation()}>
                                    <div className="relative group">
                                        <Input
                                            type={isPinMode ? "password" : (showPassword ? "text" : "password")}
                                            value={password}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (isPinMode) {
                                                    setPassword(val.replace(/\D/g, '').slice(0, 6));
                                                } else setPassword(val);
                                                setError('');
                                            }}
                                            placeholder={isPinMode ? "PIN" : "Contraseña"}
                                            className={`h-12 bg-black/20 border-white/10 focus:bg-black/40 focus:border-white/30 rounded-2xl text-center text-white placeholder:text-white/30 transition-all ${isPinMode ? 'tracking-[0.5em] text-xl' : 'text-base'}`}
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
                                        <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-[13px] font-medium">
                                            {error}
                                        </motion.p>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={loading || !password}
                                        className="w-full h-12 bg-white/10 hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all active:scale-[0.98] font-medium"
                                    >
                                        {loading ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : "Desbloquear"}
                                    </Button>

                                    {user.pin && (
                                        <button
                                            type="button"
                                            onClick={() => { setIsPinMode(!isPinMode); setPassword(''); }}
                                            className="text-[11px] text-white/40 hover:text-white uppercase tracking-widest pt-3 transition-colors font-bold block w-full text-center"
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
                            className="flex flex-col items-center gap-4 cursor-pointer group pb-4"
                        >
                            <div className="flex items-center gap-3 px-6 py-2.5 bg-black/30 backdrop-blur-md border border-white/10 rounded-full group-hover:bg-black/50 transition-all shadow-lg">
                                <Lock size={16} className="text-white/80" />
                                <span className="text-white/90 text-[15px] font-medium tracking-wide">Desliza para desbloquear</span>
                            </div>
                            <ChevronUp size={24} className="text-white/40 animate-bounce mt-2" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom Section: Dato curioso (Windows Spotlight / Lockscreen Hint style) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: expanded ? 0 : 1 }}
                    transition={{ duration: 0.5 }}
                    className="absolute bottom-10 left-10 max-w-sm hidden md:flex items-start gap-3 p-4 rounded-2xl hover:bg-black/20 backdrop-blur-sm transition-all border border-transparent hover:border-white/10 group cursor-default"
                >
                    <div className="mt-0.5 p-1.5 bg-white/10 rounded-full group-hover:bg-blue-500/20 group-hover:text-blue-300 transition-colors">
                        <Info size={16} className="text-white/70" />
                    </div>
                    <div>
                        <p className="text-[13px] font-medium text-white drop-shadow-md leading-relaxed">
                            {fact}
                        </p>
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );
}