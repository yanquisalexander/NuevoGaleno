import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface ShutdownScreenProps {
    onComplete?: () => void;
}

export function ShutdownScreen({ onComplete }: ShutdownScreenProps) {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Auto-complete después de 2 segundos
        const timer = setTimeout(() => {
            onComplete?.();
        }, 2000);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] bg-[#0a0a0a] flex items-center justify-center"
        >
            {/* Gradiente sutil de fondo */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#111111] to-[#0a0a0a]" />

            <div className="relative flex flex-col items-center gap-8">
                {/* Logo o ícono de la app */}
                <motion.div
                    initial={{ scale: 1, opacity: 1 }}
                    animate={{ scale: 0.95, opacity: 0.8 }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut"
                    }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/20"
                >
                    <svg
                        className="w-10 h-10 text-white"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                </motion.div>

                {/* Spinner estilo Windows 11 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                    className="flex flex-col items-center gap-6"
                >
                    {/* Spinner con diseño Windows 11 - círculo de puntos */}
                    <div className="relative w-12 h-12">
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-1.5 h-1.5 bg-white rounded-full"
                                style={{
                                    left: '50%',
                                    top: '50%',
                                    transformOrigin: '0 0',
                                }}
                                animate={{
                                    opacity: [0.2, 1, 0.2],
                                    scale: [0.8, 1, 0.8],
                                }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: i * 0.1,
                                    ease: "easeInOut",
                                }}
                                initial={{
                                    x: Math.cos((i * 30 * Math.PI) / 180) * 20,
                                    y: Math.sin((i * 30 * Math.PI) / 180) * 20,
                                }}
                            />
                        ))}
                    </div>

                    {/* Texto estilo Windows */}
                    <div className="text-center space-y-2">
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                            className="text-white text-xl font-light tracking-wide"
                        >
                            Cerrando Galeno{dots}
                        </motion.p>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.4 }}
                            className="text-white/40 text-sm font-light"
                        >
                            Por favor espere
                        </motion.p>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
