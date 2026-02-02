import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Bell,
    X,
    ChevronRight,
    Settings,
    Clock
} from 'lucide-react';
import { useNotifications, Notification } from '../contexts/NotificationContext';

interface NotificationCenterPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

function NotificationItem({ notification }: { notification: Notification }) {
    const { removeNotification } = useNotifications();

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors group"
        >
            <div className="flex-shrink-0 text-lg mt-0.5">
                {notification.icon || getIcon(notification.type)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-white/90 leading-tight">
                        {notification.title}
                    </h4>
                    <button
                        onClick={() => removeNotification(notification.id)}
                        className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X className="w-3 h-3 text-white/50" />
                    </button>
                </div>

                {notification.message && (
                    <p className="text-xs text-white/60 mt-1 leading-snug">
                        {notification.message}
                    </p>
                )}

                <div className="flex items-center gap-1 mt-2 text-[10px] text-white/40">
                    <Clock className="w-3 h-3" />
                    <span>{notification.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        </motion.div>
    );
}

export function NotificationCenterPanel({ isOpen, onClose }: NotificationCenterPanelProps) {
    const { notifications, clearAll } = useNotifications();

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, x: 400 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 400 }}
                        transition={{ type: "spring", damping: 30, stiffness: 300 }}
                        className="fixed top-0 right-0 h-full w-[380px] bg-[#1c1c1c]/95 backdrop-blur-2xl border-l border-white/10 z-[61] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <h2 className="text-lg font-semibold text-white">Notificaciones</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X className="w-5 h-5 text-white/70" />
                            </button>
                        </div>

                        {/* Notificaciones */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white/90">
                                        Notificaciones ({notifications.length})
                                    </h3>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={clearAll}
                                            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            Limpiar todo
                                        </button>
                                    )}
                                </div>

                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <Bell className="w-12 h-12 text-white/20 mb-3" />
                                        <p className="text-sm text-white/50">No hay notificaciones</p>
                                        <p className="text-xs text-white/30 mt-1">Las nuevas aparecerán aquí</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <AnimatePresence>
                                            {notifications.map((notification) => (
                                                <NotificationItem
                                                    key={notification.id}
                                                    notification={notification}
                                                />
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10">
                            <button className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors group">
                                <div className="flex items-center gap-3">
                                    <Settings className="w-5 h-5 text-white/60" />
                                    <span className="text-sm text-white/90">Configuración</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}
