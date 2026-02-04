import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Battery, BatteryCharging, Wifi, Volume2, User, Power, LayoutGrid, Bell } from 'lucide-react';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useSession } from '@/hooks/useSession';
import { useNotifications } from '@/contexts/NotificationContext';
import { useShell } from '@/contexts/ShellContext';

interface SystemInfo {
    batteryLevel: number;
    isCharging: boolean;
    batteryAvailable: boolean;
}

export function Taskbar() {
    const { windows, apps, openWindow, focusWindow } = useWindowManager();
    const { currentUser } = useSession();
    const { notifications } = useNotifications();
    const [currentTime, setCurrentTime] = useState(new Date());
    const {
        showStartMenu, setShowStartMenu,
        showNotifications,
        toggleStartMenu,
        setShowSearch,
        setShowNotifications,
        setShowCalendar,
        showCalendar,
        setShowPowerMenu
    } = useShell();

    const [systemInfo, setSystemInfo] = useState<SystemInfo>({
        batteryLevel: 100,
        isCharging: false,
        batteryAvailable: false
    });

    // Reloj
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Batería
    useEffect(() => {
        const updateBattery = async () => {
            if ('getBattery' in navigator) {
                try {
                    const battery = await (navigator as any).getBattery();
                    const sync = () => setSystemInfo({
                        batteryLevel: Math.round(battery.level * 100),
                        isCharging: battery.charging,
                        batteryAvailable: true
                    });
                    sync();
                    battery.addEventListener('levelchange', sync);
                    battery.addEventListener('chargingchange', sync);
                } catch (e) { console.log('Battery API not supported'); }
            }
        };
        updateBattery();
    }, []);

    const handleWindowClick = (windowId: string) => {
        focusWindow(windowId);
    };

    // Variantes de animación para los iconos de apps
    const iconVariants = {
        initial: { scale: 0, opacity: 0, y: 15 },
        animate: {
            scale: 1,
            opacity: 1,
            y: 0,
            transition: { type: "spring" as const, stiffness: 400, damping: 28 }
        },
        exit: {
            scale: 0,
            opacity: 0,
            transition: { duration: 0.2 }
        },
        hover: { y: -3, transition: { duration: 0.2 } },
        tap: { scale: 0.8 }
    };

    return (
        <>
            {/* --- BARRA DE TAREAS --- */}
            <div className="fixed bottom-0 left-0 right-0 h-12 bg-[#1c1c1c]/99 backdrop-blur-[20px] border-t border-white/20 shadow-2xl z-40 flex items-center justify-between px-2">

                {/* Sección Izquierda */}
                <div className="flex items-center h-full gap-1">
                    {/* Botón Inicio */}
                    <motion.button
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => toggleStartMenu()}
                        className={`relative h-10 w-10 flex items-center justify-center rounded-[4px] transition-all ${showStartMenu ? 'bg-white/10' : ''
                            }`}
                    >
                        <LayoutGrid
                            className={`w-5 h-5 transition-transform duration-300 ${showStartMenu ? 'rotate-45' : ''}`}
                            style={{ color: '#00a4ef' }}
                        />
                    </motion.button>

                    {/* Buscador */}
                    <motion.button
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowSearch(true)}
                        className="h-10 w-10 flex items-center justify-center rounded-[4px]"
                    >
                        <Search className="w-5 h-5 text-white/90" />
                    </motion.button>

                    <div className="h-6 w-[1px] bg-white/10 mx-1" />

                    {/* Iconos de Aplicaciones Abiertas */}
                    <div className="flex items-center gap-1 h-full">
                        <AnimatePresence mode="popLayout">
                            {windows.map(window => {
                                const app = apps.get(window.appId);
                                if (!app) return null;
                                return (
                                    <motion.button
                                        key={window.id}
                                        layout // Esto anima el deslizamiento lateral cuando otros iconos se cierran
                                        variants={iconVariants}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        whileHover="hover"
                                        whileTap="tap"
                                        onClick={() => handleWindowClick(window.id)}
                                        className={`relative h-10 w-10 flex items-center justify-center rounded-[4px] transition-colors ${window.isFocused && !window.isMinimized ? 'bg-white/10' : 'hover:bg-white/10'
                                            }`}
                                    >
                                        <span className="text-2xl">{app.icon}</span>

                                        {/* Indicador inferior (Pill) */}
                                        <motion.div
                                            layoutId={`indicator-${window.id}`}
                                            className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-blue-400"
                                            animate={{
                                                width: window.isFocused && !window.isMinimized ? 16 : 6,
                                                height: 3,
                                                opacity: window.isMinimized ? 0.5 : 1
                                            }}
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Sección Derecha: System Tray */}
                <div className="flex items-center h-full gap-1">
                    {/* Centro de Notificaciones */}
                    <motion.button
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowNotifications(!showNotifications)}
                        className={`relative h-10 w-10 flex items-center justify-center rounded-[4px] transition-colors ${showNotifications ? 'bg-white/10' : 'hover:bg-white/10'
                            }`}
                    >
                        <Bell className="w-5 h-5 text-white/90" />
                        {notifications.length > 0 && (
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                            >
                                <span className="text-[10px] font-bold text-white">
                                    {notifications.length > 9 ? '9+' : notifications.length}
                                </span>
                            </motion.div>
                        )}
                    </motion.button>

                    <motion.button
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        className="flex items-center gap-2 px-2 h-10 rounded-[4px] transition-colors"
                    >
                        <Wifi className="w-4 h-4 text-white/90" />
                        <Volume2 className="w-4 h-4 text-white/90" />
                        <div className="flex items-center gap-1">
                            {systemInfo.isCharging ? <BatteryCharging className="w-4 h-4 text-green-400" /> : <Battery className="w-4 h-4 text-white/90" />}
                            <span className="text-[11px] text-white/90 font-medium">{systemInfo.batteryLevel}%</span>
                        </div>
                    </motion.button>

                    <motion.button
                        whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowCalendar(!showCalendar)}
                        className={`flex flex-col items-end px-2 h-10 justify-center rounded-[4px] text-right transition-colors ${showCalendar ? 'bg-white/10' : ''
                            }`}
                    >
                        <span className="text-[11px] text-white font-medium leading-none mb-1">
                            {currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-white/70 leading-none">
                            {currentTime.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', })}
                        </span>
                    </motion.button>
                </div>
            </div>

            {/* --- MENÚ DE INICIO (PORTAL) --- */}
            {createPortal(
                <AnimatePresence>
                    {showStartMenu && (
                        <>
                            {/* Backdrop invisible para cerrar el menú */}
                            <div className="fixed inset-0 z-[48]" onClick={() => setShowStartMenu(false)} />

                            <motion.div
                                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                                className="fixed bottom-14 left-3 w-[520px] h-[620px] bg-[#2c2c2c]/90 backdrop-blur-[30px] rounded-xl shadow-2xl border border-white/10 z-[49] flex flex-col overflow-hidden"
                            >
                                {/* Barra de Búsqueda */}
                                <div className="p-6">
                                    <div className="relative group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-blue-400 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Buscar aplicaciones, documentos y configuración"
                                            className="w-full h-9 bg-black/20 border-b border-white/10 rounded-sm pl-10 pr-4 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 transition-all"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                {/* Apps Ancladas */}
                                <div className="flex-1 px-8 overflow-y-auto pt-2">
                                    <div className="flex justify-between items-center mb-6">
                                        <span className="text-xs font-semibold text-white">Anclado</span>
                                        <button className="text-[11px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/80 transition-colors">Todas las aplicaciones &gt;</button>
                                    </div>
                                    <div className="grid grid-cols-6 gap-y-6">
                                        {Array.from(apps.values()).filter(app => app.showOnDesktop !== false).map((app) => (
                                            <motion.button
                                                key={app.id}
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => { openWindow(app.id); setShowStartMenu(false); }}
                                                className="flex flex-col items-center gap-2 group"
                                            >
                                                <div className="w-10 h-10 flex items-center justify-center text-3xl transition-transform">
                                                    {app.icon}
                                                </div>
                                                <span className="text-[11px] text-white/90 text-center line-clamp-1 w-16">{app.name}</span>
                                            </motion.button>
                                        ))}
                                    </div>

                                    {/* Recomendados */}
                                    <div className="mt-10">
                                        <span className="text-xs font-semibold text-white">Recomendado</span>
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <div className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer">
                                                <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-sm">📄</div>
                                                <div className="flex flex-col"><span className="text-[11px] text-white">Manual_Galeno.pdf</span><span className="text-[10px] text-white/40">Reciente</span></div>
                                            </div>
                                            <div className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer">
                                                <div className="w-8 h-8 rounded bg-orange-500/20 flex items-center justify-center text-sm">📊</div>
                                                <div className="flex flex-col"><span className="text-[11px] text-white">Estadísticas_V1</span><span className="text-[10px] text-white/40">Ayer a las 14:00</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer: Usuario y Energía */}
                                <div className="h-16 bg-black/20 backdrop-blur-md flex items-center justify-between px-10 border-t border-white/5">
                                    <div className="flex items-center gap-3 py-1 px-2 rounded hover:bg-white/5 cursor-pointer transition-colors">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center border border-white/20">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                        <span className="text-xs font-medium text-white">
                                            {currentUser?.name || 'Usuario'}
                                        </span>
                                    </div>
                                    <motion.button
                                        whileHover={{ scale: 1.1, color: "#fff" }}
                                        onClick={() => setShowPowerMenu(true)}
                                        className="p-2 text-white/70 transition-colors"
                                    >
                                        <Power className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}