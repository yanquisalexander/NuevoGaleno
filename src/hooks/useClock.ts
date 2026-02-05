import { useState, useEffect } from 'react';

/**
 * Hook personalizado para manejar el reloj del sistema.
 * Actualiza cada segundo y retorna la hora actual.
 * 
 * @returns Date objeto con la hora actual
 */
export function useClock() {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return currentTime;
}

/**
 * Hook optimizado que solo actualiza cuando cambia el minuto.
 * Útil para componentes que solo muestran horas y minutos.
 * 
 * @returns Date objeto con la hora actual
 */
export function useClockMinutes() {
    const [currentTime, setCurrentTime] = useState(() => new Date());

    useEffect(() => {
        // Calcular cuándo será el próximo minuto
        const now = new Date();
        const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        // Actualizar al inicio del próximo minuto
        const initialTimeout = setTimeout(() => {
            setCurrentTime(new Date());

            // Luego actualizar cada minuto
            const interval = setInterval(() => {
                setCurrentTime(new Date());
            }, 60000);

            return () => clearInterval(interval);
        }, msUntilNextMinute);

        return () => clearTimeout(initialTimeout);
    }, []);

    return currentTime;
}
