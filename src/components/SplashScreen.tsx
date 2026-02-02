import { useEffect, useState } from 'react';

const LOADING_STEPS = [
    "Inicializando núcleo...",
    "Verificando base de datos...",
    "Cargando módulos médicos...",
    "Estableciendo conexión segura...",
    "Preparando interfaz de usuario..."
];

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [progress, setProgress] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsExiting(true);
                        setTimeout(onComplete, 1000);
                    }, 500);
                    return 100;
                }
                const next = prev + Math.random() * 12;
                return next > 100 ? 100 : next;
            });
        }, 300);

        return () => clearInterval(interval);
    }, [onComplete]);

    // Cambiar el texto de estado basado en el progreso
    useEffect(() => {
        const index = Math.min(
            Math.floor((progress / 100) * LOADING_STEPS.length),
            LOADING_STEPS.length - 1
        );
        setStatusIndex(index);
    }, [progress]);

    return (
        <div className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999] transition-all duration-1000 ease-in-out ${isExiting ? 'opacity-0' : 'opacity-100'}`}>

            {/* Efecto de Scanlines (Típico de monitores industriales) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 4px, 3px 100%' }} />

            <div className="relative flex flex-col items-center w-full max-w-sm px-8">

                {/* Logo / Isotipo Central */}
                <div className="relative mb-16">
                    <div className="absolute inset-0 bg-blue-600/20 blur-[60px] rounded-full animate-pulse" />
                    <div className="relative flex flex-col items-center">
                        <svg className="w-20 h-20 text-blue-500 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                        <h1 className="text-3xl font-bold text-white tracking-[0.2em] uppercase">
                            Nuevo Galeno
                        </h1>
                        <div className="h-1 w-12 bg-blue-600 mt-2" />
                    </div>
                </div>

                {/* Área de Carga Técnica */}
                <div className="w-full space-y-3">
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] text-blue-400/80 font-mono uppercase tracking-widest animate-pulse">
                            {LOADING_STEPS[statusIndex]}
                        </span>
                        <span className="text-xs text-blue-400 font-mono tracking-tighter">
                            {Math.round(progress)}%
                        </span>
                    </div>

                    {/* Barra de progreso segmentada */}
                    <div className="flex gap-1 h-1.5 w-full">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className={`h-full flex-1 transition-all duration-300 ${progress > (i * 5) ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-white/10'
                                    }`}
                            />
                        ))}
                    </div>

                    <div className="pt-4 flex justify-center">
                        <span className="text-[9px] text-white/20 font-mono uppercase tracking-[0.3em]">
                            System Environment v2.4.0
                        </span>
                    </div>
                </div>
            </div>

            {/* Footer de Autoría */}
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center">
                <p className="text-white/30 text-[10px] tracking-[0.5em] uppercase font-light">
                    Desarrollado por <span className="text-white/60 font-semibold">Alexitoo.DEV</span>
                </p>
            </div>

        </div>
    );
}