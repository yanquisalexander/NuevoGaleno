import { useWindowManager } from '../../contexts/WindowManagerContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useShell } from '@/contexts/ShellContext';
import { Search, Bell } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { motion } from 'motion/react';

export function Dock() {
    const { windows, apps, openWindow, focusWindow } = useWindowManager();
    const { notifications } = useNotifications();
    const { toggleSearch, toggleNotifications, showNotifications } = useShell();

    // Filtramos las apps que están abiertas (tienen ventana) o son fijas (opcional)
    // En este caso, mostramos todas las apps fijas que no tengan showOnDesktop false
    const desktopApps = Array.from(apps.values()).filter(app => app.showOnDesktop !== false);

    const handleAppClick = (appId: string) => {
        const window = windows.find(w => w.appId === appId);
        if (window) {
            focusWindow(window.id);
        } else {
            openWindow(appId);
        }
    };

    return (
        <div className="fixed bottom-4 left-0 right-0 h-16 z-40 flex justify-center pointer-events-none">
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl p-2 px-4 flex items-end gap-2 pointer-events-auto shadow-2xl"
            >
                {desktopApps.map(app => {
                    const isOpen = windows.some(w => w.appId === app.id);
                    const isFocused = windows.find(w => w.appId === app.id)?.isFocused;

                    return (
                        <motion.div
                            key={app.id}
                            className="relative flex flex-col items-center group"
                            whileHover={{ scale: 1.2, y: -10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                        >
                            <button
                                onClick={() => handleAppClick(app.id)}
                                className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors shadow-lg"
                                title={app.name}
                            >
                                <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={28} />
                            </button>

                            {/* Indicador de App Abierta (Punto debajo) */}
                            {isOpen && (
                                <div className={`absolute -bottom-1 w-1 h-1 rounded-full ${isFocused ? 'bg-white scale-125' : 'bg-white/40'}`} />
                            )}

                            {/* Tooltip */}
                            <div className="absolute -top-10 px-2 py-1 bg-black/80 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
                                {app.name}
                            </div>
                        </motion.div>
                    );
                })}

                <div className="w-[1px] h-8 bg-white/10 self-center mx-1" />

                {/* Utilidades rápidas */}
                <motion.button
                    whileHover={{ scale: 1.2, y: -10 }}
                    onClick={() => toggleSearch()}
                    className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                    <Search className="w-5 h-5 text-white/80" />
                </motion.button>

                <motion.button
                    whileHover={{ scale: 1.2, y: -10 }}
                    onClick={() => toggleNotifications()}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors relative ${showNotifications ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}
                >
                    <Bell className="w-5 h-5 text-white/80" />
                    {notifications.length > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                </motion.button>
            </motion.div>
        </div>
    );
}
