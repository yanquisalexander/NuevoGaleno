import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function SplashScreen({ onComplete }: { onComplete: () => void }) {
    const [progress, setProgress] = useState(0);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        // Simulación de carga fluida (tipo Google)
        // Avanza rápido al principio, se detiene un poco, y termina rápido
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress === 100) {
                    clearInterval(timer);
                    setTimeout(() => setIsExiting(true), 200); // Pequeña pausa al 100%
                    setTimeout(onComplete, 800); // Tiempo para la animación de salida
                    return 100;
                }

                // Algoritmo de incremento variable para sentirlo "orgánico"
                const diff = Math.random() * 10;
                return Math.min(oldProgress + diff, 100);
            });
        }, 150);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <div
            className={`
                fixed inset-0 z-[9999] flex flex-col items-center justify-center 
                bg-[#1c1b1f] font-sans
                transition-all duration-700 ease-[cubic-bezier(0.2,0,0,1)]
                ${isExiting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            `}
        >
            {/* --- CONTENEDOR CENTRAL (Estilo MD3 Surface) --- 
               Usa un gris ligeramente más claro que el fondo para elevación
            */}
            <div className="flex flex-col items-center w-full max-w-[320px]">

                {/* 1. Icono / Logo */}
                {/* Contenedor 'Squircle' grande típico de Android 12/13 */}
                <div className="mb-8 p-6 bg-[#303035] rounded-[28px] shadow-lg flex items-center justify-center transition-transform duration-700 hover:scale-105">
                    {/* Icono abstracto o tu logo */}
                    <div className="relative">
                        <Sparkles className="w-12 h-12 text-[#a8c7fa]" strokeWidth={1.5} />
                        {/* Pequeño punto de acento */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#a8c7fa] rounded-full animate-ping" />
                    </div>
                </div>

                {/* 2. Tipografía (Google Sans vibe) */}
                <h1 className="text-2xl font-medium text-[#e3e2e6] mb-2 tracking-tight">
                    Nuevo Galeno
                </h1>

                {/* Texto de estado sutil */}
                <p className="text-sm text-[#c4c7c5] mb-8 font-normal opacity-80">
                    {progress < 100 ? 'Cargando sistema...' : 'Listo'}
                </p>

                {/* 3. Barra de Progreso (Híbrido MD3 + Win11) */}
                {/* Background de la barra (Surface Container Highest) */}
                <div className="w-full h-1 bg-[#444746] rounded-full overflow-hidden">
                    {/* Indicador (Primary Color MD3 - Azul Google) */}
                    <div
                        className="h-full bg-[#a8c7fa] rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* 4. Footer Minimalista */}
            <div className="absolute bottom-8">
                <p className="text-[11px] text-[#8e918f] font-medium tracking-wide">
                    ALEXITOO.DEV
                </p>
            </div>
        </div>
    );
}