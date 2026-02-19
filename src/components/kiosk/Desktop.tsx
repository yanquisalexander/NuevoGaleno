import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { DesktopContextMenu } from './DesktopContextMenu';
import { AltTabSwitcher } from './AltTabSwitcher';
import { AppIcon } from './AppIcon';
import { playSound, UI_SOUNDS } from "@/consts/Sounds";
import { useNotifications } from "@/contexts/NotificationContext";
import { useWallpaper, WallpaperProviderType } from "@/hooks/useWallpaper";
import { useWallpaperContext } from '@/contexts/WallpaperContext';
import { useSession } from "@/hooks/useSession";

interface DesktopProps {
    layout?: string;
}

export function Desktop({ layout: defaultLayout = 'windows' }: DesktopProps) {
    const { apps, openWindow } = useWindowManager();
    const { getUserPreferences } = useSession();
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    // Obtener preferences del usuario
    const userPrefs = getUserPreferences();
    const layout = (userPrefs.layout_style as string) || defaultLayout;
    const isMac = layout === 'macos';

    // Usar el contexto compartido de wallpaper
    const {
        currentWallpaper,
        prevWallpaper,
        wallpaperInfo,
        changeWallpaper,
        wallpapers,
        providerType
    } = useWallpaperContext();

    const { addNotification } = useNotifications();

    useEffect(() => {
        console.log('Desktop mounted - showing welcome notification');
        playSound(UI_SOUNDS.GALENO_BOOT, 0.3);

        const timer = setTimeout(() => {
            console.log('About to show notification...');
            try {
                const notifId = addNotification({
                    type: 'success',
                    title: 'Bienvenido a Nuevo Galeno',
                    message: 'Haz doble clic en un ícono para abrir una aplicación.',
                    sound: true,
                    soundFile: UI_SOUNDS.ALERT_05
                });
                console.log('Notification created with ID:', notifId);
                console.log('%cBienvenido a Nuevo Galeno!\n%c¡Gracias por usar nuestra aplicación!', 'color: #4ade80; font-size: 16px; font-weight: bold;', 'color: #9ca3af; font-size: 12px;');
            } catch (error) {
                console.error('Error creating notification:', error);
            }
        }, 2000);

        return () => clearTimeout(timer);
        // Solo ejecutar una vez cuando Desktop se monte
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`fixed inset-0 ${isMac ? 'top-7 bottom-0' : 'top-0 bottom-12'} overflow-hidden select-none outline-none bg-[#121212]`}
            onClick={() => { setSelectedApp(null); setContextMenu(null); }}
            onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY });
            }}
        >
            {/* CAPA FONDO ANTERIOR (Z-21) - Mantiene la imagen mientras la nueva carga */}
            {prevWallpaper && (
                <div
                    className="absolute inset-0 bg-cover bg-center -z-21 brightness-[0.8]"
                    style={{ backgroundImage: `url(${prevWallpaper})` }}
                />
            )}

            {/* CAPA FONDO ACTUAL (Z-20) */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentWallpaper}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-cover bg-center -z-20"
                    style={{ backgroundImage: `url(${currentWallpaper})` }}
                >
                    <div className="absolute inset-0 bg-black/20" />
                </motion.div>
            </AnimatePresence>

            {/* GRID DE ICONOS (ESTILO WINDOWS 11 / macOS) */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.3 } }
                }}
                className={`absolute inset-0 p-4 z-10 flex flex-wrap flex-col content-start gap-1 ${isMac ? 'items-end content-end' : 'items-start content-start'}`}
            >
                {(() => {
                    const desktopApps = Array.from(apps.values()).filter(app => app.showOnDesktop !== false);
                    console.log('Desktop apps to show:', desktopApps.length, 'Total apps:', apps.size);
                    return desktopApps.map(app => (
                        <motion.div
                            key={app.id}
                            variants={{
                                hidden: { y: 15, opacity: 0 },
                                visible: { y: 0, opacity: 1 }
                            }}
                            onClick={(e) => { e.stopPropagation(); setSelectedApp(app.id); }}
                            onDoubleClick={() => openWindow(app.id)}
                            className={`
                            flex flex-col items-center p-2 w-[94px] h-[104px] gap-1 rounded-sm 
                            transition-all duration-75 border border-transparent
                            ${selectedApp === app.id
                                    ? (isMac ? 'bg-white/20 border-white/30' : 'bg-white/15 border-white/20 backdrop-blur-md shadow-lg')
                                    : 'hover:bg-white/10 hover:border-white/10'}
                        `}
                        >
                            <div className="drop-shadow-lg">
                                {
                                    <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={40} />
                                }
                            </div>
                            <span className={`
                            text-[11px] text-white text-center leading-tight line-clamp-2 px-1
                            drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]
                            ${selectedApp === app.id ? (isMac ? 'bg-black/40 rounded-md px-2' : 'bg-[#0078d7]/90 rounded-sm') : ''}
                        `}>
                                {app.name}
                            </span>
                        </motion.div>
                    ));
                })()}
            </motion.div>

            {/* INFO WALLPAPER (WINDOWS SPOTLIGHT STYLE) */}
            {wallpaperInfo && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-6 right-6 flex flex-col items-end gap-1 pointer-events-none"
                >
                    <div className="bg-black/30 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 text-right shadow-2xl">
                        <p className="text-white text-xs font-semibold">{wallpaperInfo.location}</p>
                        <p className="text-white/60 text-[10px] uppercase tracking-widest">{wallpaperInfo.photographer}</p>
                    </div>
                </motion.div>
            )}

            {contextMenu && (
                <DesktopContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu(null)}
                    onNextWallpaper={() => changeWallpaper()}
                />
            )}

            {/* Alt+Tab Switcher */}
            <AltTabSwitcher />
        </motion.div>
    );
}