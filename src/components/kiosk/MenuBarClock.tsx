import { memo } from 'react';
import { useClockMinutes } from '@/hooks/useClock';

interface MenuBarClockProps {
    onClick?: () => void;
}

/**
 * Componente de reloj optimizado para MenuBar.
 * Solo re-renderiza cuando cambia el minuto.
 */
export const MenuBarClock = memo(function MenuBarClock({ onClick }: MenuBarClockProps) {
    const currentTime = useClockMinutes();

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
    };

    return (
        <div
            onClick={onClick}
            className="flex items-center gap-2 hover:bg-white/10 px-2 h-full cursor-pointer transition-colors"
        >
            <span>{formatDate(currentTime)}</span>
            <span>{formatTime(currentTime)}</span>
        </div>
    );
});
