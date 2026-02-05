import { memo } from 'react';
import { motion } from 'motion/react';
import { useClockMinutes } from '@/hooks/useClock';

interface ClockProps {
    showCalendar?: boolean;
    onClick?: () => void;
}

/**
 * Componente de reloj optimizado que solo re-renderiza cuando cambia el minuto.
 * Aislado para evitar re-renders innecesarios en componentes padre.
 */
export const Clock = memo(function Clock({ showCalendar = false, onClick }: ClockProps) {
    const currentTime = useClockMinutes();

    return (
        <motion.button
            whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`flex flex-col items-end px-2 h-10 justify-center rounded-[4px] text-right transition-colors ${showCalendar ? 'bg-white/10' : ''
                }`}
        >
            <span className="text-[11px] text-white font-medium leading-none mb-1">
                {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] text-white/70 leading-none">
                {currentTime.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                })}
            </span>
        </motion.button>
    );
});
