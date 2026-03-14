import { motion, AnimatePresence } from 'motion/react';
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '../contexts/NotificationContext';
import { useEffect, useRef } from 'react';
import { usePlaySound } from '../hooks/useSound';

function NotificationItem({ notification }: { notification: Notification }) {
    const { removeNotification } = useNotifications();

    // Solo el icono lleva color — el fondo es siempre neutro (Fluent dark)
    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-[#6ccb5f]" />;
            case 'error': return <XCircle className="w-4 h-4 text-[#f1707b]" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-[#fce100]" />;
            default: return <Info className="w-4 h-4 text-[#479ef5]" />;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
                opacity: 0,
                x: 20,
                scale: 0.95,
                transition: { duration: 0.15, ease: 'easeIn' },
            }}
            // Fondo siempre #202020 — sin variación por tipo
            className="relative w-[360px] bg-[#202020]/90 backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden group mb-2"
        >
            {/* Barra superior de progreso de auto-dismiss (opcional, decorativa) */}
            <div className="h-[1px] bg-white/[0.06] w-full" />

            <div className="p-4">
                <div className="flex gap-3">
                    {/* Icono — única señal visual del tipo */}
                    <div className="flex-shrink-0 mt-0.5">
                        {notification.icon
                            ? <span className="text-base leading-none">{notification.icon}</span>
                            : getIcon(notification.type)
                        }
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[13px] font-semibold text-white/90 leading-tight">
                                {notification.title}
                            </h4>

                            <button
                                onClick={() => removeNotification(notification.id)}
                                className="flex-shrink-0 p-1 rounded-md hover:bg-white/[0.08] active:bg-white/[0.12] transition-colors"
                                aria-label="Cerrar notificación"
                            >
                                <X className="w-3.5 h-3.5 text-white/50" />
                            </button>
                        </div>

                        {notification.message && (
                            <p className="text-[12px] text-white/55 mt-1 leading-snug font-normal">
                                {notification.message}
                            </p>
                        )}

                        {notification.actions && notification.actions.length > 0 && (
                            <div className="flex gap-2 mt-3">
                                {notification.actions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            action.onClick();
                                            removeNotification(notification.id);
                                        }}
                                        className="flex-1 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.04] border border-white/[0.07] rounded-md text-[12px] text-white/85 transition-all active:scale-[0.98]"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

export function NotificationCenter() {
    const { notifications, removeNotification } = useNotifications();
    const currentNotification = notifications[0];
    const lastNotificationIdRef = useRef<string | null>(null);
    const soundPlayedRef = useRef<Set<string>>(new Set());
    const dismissTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const play = usePlaySound();

    useEffect(() => {
        console.log('NotificationCenter - Total notifications:', notifications.length);
        if (currentNotification) {
            console.log('NotificationCenter - Current notification:', currentNotification);
        }
    }, [notifications, currentNotification]);

    // Manejar el sonido cuando una notificación se vuelve visible
    useEffect(() => {
        if (!currentNotification) return;

        const notificationId = currentNotification.id;

        if (
            notificationId !== lastNotificationIdRef.current &&
            !soundPlayedRef.current.has(notificationId)
        ) {
            lastNotificationIdRef.current = notificationId;
            soundPlayedRef.current.add(notificationId);

            console.log('Playing notification sound:', currentNotification.soundFile);

            if (currentNotification.sound && currentNotification.soundFile) {
                // soundFile may already be a UISound constant
                play(currentNotification.soundFile as any, 0.5);
            }

            if (soundPlayedRef.current.size > 50) {
                const entries = Array.from(soundPlayedRef.current);
                soundPlayedRef.current = new Set(entries.slice(-25));
            }
        }
    }, [currentNotification]);

    // Manejar auto-dismiss cuando la notificación es visible
    useEffect(() => {
        // Limpiar timeout anterior
        if (dismissTimeoutRef.current) {
            clearTimeout(dismissTimeoutRef.current);
            dismissTimeoutRef.current = null;
        }

        if (!currentNotification) return;

        // Solo si tiene duración y es mayor a 0
        if (currentNotification.duration && currentNotification.duration > 0) {
            dismissTimeoutRef.current = setTimeout(() => {
                removeNotification(currentNotification.id);
                dismissTimeoutRef.current = null;
            }, currentNotification.duration);
        }

        // Limpiar timeout si la notificación ya no es visible o se desmonta el componente
        return () => {
            if (dismissTimeoutRef.current) {
                clearTimeout(dismissTimeoutRef.current);
                dismissTimeoutRef.current = null;
            }
        };
    }, [currentNotification]);

    return (
        <div className="fixed bottom-12 right-4 z-[70] pointer-events-none flex flex-col items-end">
            <AnimatePresence mode="wait">
                {currentNotification && (
                    <motion.div key={currentNotification.id} className="pointer-events-auto">
                        <NotificationItem notification={currentNotification} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Pill de "N más" — estilo Windows 11 */}
            <AnimatePresence>
                {notifications.length > 1 && (
                    <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="mt-1 mr-2 px-2.5 py-0.5 bg-[#2a2a2a] border border-white/[0.08] rounded-full shadow-lg"
                    >
                        <p className="text-[10px] text-white/40 font-medium tracking-wide">
                            {notifications.length - 1} más en el centro de control
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}