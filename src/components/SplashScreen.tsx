import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [progress, setProgress] = useState(0);
    const [isExiting, setIsExiting] = useState(false);
    const [statusText, setStatusText] = useState("Iniciando...");

    useEffect(() => {
        // Simulación de carga no lineal (estilo Windows boot)
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress >= 100) {
                    clearInterval(timer);
                    setStatusText("Listo");
                    setTimeout(() => setIsExiting(true), 400); 
                    setTimeout(onComplete, 1200); // Dar tiempo a la animación de salida
                    return 100;
                }

                // Cambiamos el texto según el progreso para dar feedback
                if (oldProgress > 30) setStatusText("Cargando módulos...");
                if (oldProgress > 70) setStatusText("Preparando interfaz...");

                // Incrementos aleatorios
                const diff = Math.random() * 15;
                return Math.min(oldProgress + diff, 100);
            });
        }, 150);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <div
            className={`
                fixed inset-0 z-[9999] flex flex-col items-center justify-center 
                bg-[#181818] font-[Segoe UI,sans-serif] select-none cursor-wait
                transition-all duration-1000 ease-[cubic-bezier(0.1,0,0,1)]
                ${isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}
            `}
        >
            {/* Contenedor central limpio */}
            <div className="flex flex-col items-center gap-8 w-[360px]">
                
                {/* 1. Icono Minimalista (Sin fondo, estilo Windows Start) */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-[#60cdff] blur-[40px] opacity-20 rounded-full animate-pulse" />
                    <Sparkles 
                        className="w-16 h-16 text-white drop-shadow-[0_0_15px_rgba(96,205,255,0.3)] transition-transform duration-700" 
                        strokeWidth={1.5} 
                    />
                </div>

                {/* 2. Tipografía y Estado */}
                <div className="text-center space-y-1">
                    <h1 className="text-2xl text-white font-semibold tracking-wide antialiased">
                        Nuevo Galeno
                    </h1>
                    <p className="text-sm text-white/60 font-normal h-5 animate-pulse">
                        {statusText}
                    </p>
                </div>

                {/* 3. Barra de Progreso "Fluent" (Track rail + Indicator) */}
                <div className="w-full max-w-[240px] flex flex-col gap-2">
                    {/* El track es muy sutil */}
                    <div className="h-[3px] w-full bg-white/10 rounded-full overflow-hidden relative">
                        {/* El indicador es el azul característico de Windows 11 */}
                        <div
                            className="h-full bg-[#60cdff] rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(96,205,255,0.8)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

            </div>

            {/* 4. Footer discreto */}
            <div className="absolute bottom-10 flex flex-col items-center gap-1 opacity-40">
                <span className="text-[10px] text-white tracking-widest uppercase font-semibold">
                    Alexitoo.Dev
                </span>
               
            </div>
        </div>
    );
}