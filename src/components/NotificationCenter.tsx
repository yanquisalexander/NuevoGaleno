import { motion, AnimatePresence } from 'motion/react';
import { X, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useNotifications, Notification, NotificationType } from '../contexts/NotificationContext';
import { useEffect, useRef } from 'react';
import { playSound } from '../consts/Sounds';

function NotificationItem({ notification }: { notification: Notification }) {
    const { removeNotification } = useNotifications();

    // En Windows 11, el color solo aparece discretamente en el icono
    const getIcon = (type: NotificationType) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-4 h-4 text-[#6ccb5f]" />;
            case 'error': return <XCircle className="w-4 h-4 text-[#ff99a4]" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-[#ffda6a]" />;
            default: return <Info className="w-4 h-4 text-[#60cdff]" />;
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9, transition: { duration: 0.15 } }}
            // Fondo neutro oscuro (Mica), sin bordes de colores, bordes muy redondeados (xl)
            className="relative w-[360px] bg-[#202020]/90 backdrop-blur-2xl border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden group mb-2"
        >
            <div className="p-4">
                <div className="flex gap-3">
                    {/* Icono de la App o Estado */}
                    <div className="flex-shrink-0 mt-0.5">
                        {notification.icon ? (
                            <span className="text-base">{notification.icon}</span>
                        ) : (
                            getIcon(notification.type)
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="text-[13px] font-semibold text-white/90 leading-tight">
                                {notification.title}
                            </h4>

                            <button
                                onClick={() => removeNotification(notification.id)}
                                className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
                            >
                                <X className="w-3.5 h-3.5 text-white/70" />
                            </button>
                        </div>

                        {notification.message && (
                            <p className="text-[12px] text-white/60 mt-1 leading-snug font-normal">
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
                                        className="flex-1 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.05] rounded text-[12px] text-white/90 transition-all active:scale-[0.98]"
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
    const { notifications } = useNotifications();
    const currentNotification = notifications[0];
    const lastNotificationIdRef = useRef<string | null>(null);
    const soundPlayedRef = useRef<Set<string>>(new Set());

    // Debug: Log cuando cambian las notificaciones
    useEffect(() => {
        console.log('NotificationCenter - Total notifications:', notifications.length);
        if (currentNotification) {
            console.log('NotificationCenter - Current notification:', currentNotification);
        }
    }, [notifications, currentNotification]);

    // Reproducir sonido solo cuando aparece una nueva notificación visible
    useEffect(() => {
        if (!currentNotification) return;

        const notificationId = currentNotification.id;

        // Solo reproducir si es una notificación nueva y no se ha reproducido antes
        if (notificationId !== lastNotificationIdRef.current &&
            !soundPlayedRef.current.has(notificationId)) {

            lastNotificationIdRef.current = notificationId;
            soundPlayedRef.current.add(notificationId);

            console.log('Playing notification sound:', currentNotification.soundFile);

            // Reproducir sonido si está habilitado
            if (currentNotification.sound && currentNotification.soundFile) {
                playSound(currentNotification.soundFile, 0.5);
            }

            // Limpiar refs antiguas para evitar memory leaks (mantener solo las últimas 50)
            if (soundPlayedRef.current.size > 50) {
                const entries = Array.from(soundPlayedRef.current);
                soundPlayedRef.current = new Set(entries.slice(-25));
            }
        }
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

            {/* Indicador de más notificaciones estilo Windows 11 */}
            {notifications.length > 1 && (
                <div className="mt-1 mr-2 px-2 py-0.5 bg-[#2c2c2c] border border-white/10 rounded-full shadow-lg">
                    <p className="text-[10px] text-white/50 font-medium">
                        {notifications.length - 1} más en el centro de control
                    </p>
                </div>
            )}
        </div>
    );
}