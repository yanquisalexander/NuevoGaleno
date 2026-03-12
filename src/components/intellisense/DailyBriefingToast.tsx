/**
 * DailyBriefingToast — se monta una vez al día después del login y dispara
 * una notificación via useToast con el resumen del día.
 * No renderiza nada en el DOM.
 */
import { useEffect, useRef } from 'react';
import { useIntelliSense } from '@/contexts/IntelliSenseContext';
import { useToast } from '@/hooks/useToast';
import { useShell } from '@/contexts/ShellContext';
import { APP_DEFINITIONS } from '@/apps';

export function DailyBriefingToast() {
    const { shouldBrief, markBriefingDone, suggestions } = useIntelliSense();
    const { info } = useToast();
    const { setShowIntelliSense } = useShell();
    const fired = useRef(false);

    useEffect(() => {
        if (!shouldBrief || fired.current) return;
        fired.current = true;

        // Pequeño delay para no disparar inmediatamente al montar
        const timer = setTimeout(() => {
            const topApps = suggestions
                .slice(0, 3)
                .map(s => APP_DEFINITIONS.find(a => a.id === s.targetId)?.name)
                .filter(Boolean)
                .join(', ');

            const message = topApps
                ? `Sugerido para hoy: ${topApps}`
                : 'Tu asistente inteligente está listo.';

            info('✦ Galeno Intellisense', message, {
                duration: 30000,
                actions: [
                    {
                        label: 'Ver sugerencias',
                        onClick: () => setShowIntelliSense(true),
                    },
                ],
            });

            markBriefingDone();
        }, 1800);

        return () => clearTimeout(timer);
    }, [shouldBrief]);// eslint-disable-line react-hooks/exhaustive-deps

    return null;
}
