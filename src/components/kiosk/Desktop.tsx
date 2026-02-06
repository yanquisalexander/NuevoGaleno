import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { DesktopContextMenu } from './DesktopContextMenu';
import { AltTabSwitcher } from './AltTabSwitcher';
import { playSound, UI_SOUNDS } from "@/consts/Sounds";
import { useNotifications } from "@/contexts/NotificationContext";
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

interface ChromecastImage {
    url: string;
    name: string;
    photographer: string;
    location: string;
}

interface DesktopProps {
    layout?: string;
}

const CHROMECAST_API = 'https://chromecastbg.alexmeub.com/images.v9.json';
const FETCH_TIMEOUT = 10000; // 10 segundos
const FALLBACK_WALLPAPER = 'https://images.unsplash.com/photo-1620121692029-d088224ddc74';

// Helper para fetch con timeout usando Tauri fetch (evita CORS)
const fetchWithTimeout = async (url: string, timeout: number = FETCH_TIMEOUT) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await tauriFetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

export function Desktop({ layout = 'windows' }: DesktopProps) {
    const { apps, openWindow } = useWindowManager();
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    const isMac = layout === 'macos';

    const [wallpapers, setWallpapers] = useState<ChromecastImage[]>([]);
    const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
    const [prevWallpaper, setPrevWallpaper] = useState<string>('');
    const [wallpaperInfo, setWallpaperInfo] = useState<ChromecastImage | null>(null);

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

    // Referencia para evitar ciclos en el random
    const usedIndices = useRef<Set<number>>(new Set());
    const wallpapersRef = useRef<ChromecastImage[]>([]);
    const isChangingRef = useRef(false);

    // Normalizar URL de Google (http -> https)
    const normalizeUrl = (url: string) => url.replace('http://', 'https://');

    const changeWallpaper = useCallback((dataList?: ChromecastImage[]) => {
        const list = dataList || wallpapersRef.current;
        if (list.length === 0 || isChangingRef.current) return;

        isChangingRef.current = true;

        // Lógica para no repetir hasta agotar la lista
        if (usedIndices.current.size >= list.length) usedIndices.current.clear();

        let randomIndex: number;
        do {
            randomIndex = Math.floor(Math.random() * list.length);
        } while (usedIndices.current.has(randomIndex));

        usedIndices.current.add(randomIndex);
        const nextData = list[randomIndex];
        const nextUrl = normalizeUrl(nextData.url);

        // Precarga de imagen
        const img = new Image();
        img.src = nextUrl;
        img.onload = () => {
            console.log('[Desktop] Wallpaper loaded:', nextData.location);
            setCurrentWallpaper((prev) => {
                setPrevWallpaper(prev);
                return nextUrl;
            });
            setWallpaperInfo(nextData);

            // Tiempo de la animación de motion (1.5s) + margen
            setTimeout(() => {
                setPrevWallpaper('');
                isChangingRef.current = false;
            }, 1600);
        };
        img.onerror = (err) => {
            console.error('[Desktop] Error loading wallpaper image:', nextUrl, err);
            isChangingRef.current = false;
            // Intentar otra imagen
            changeWallpaper(list);
        };
    }, []);

    // Actualizar ref cuando wallpapers cambie
    useEffect(() => {
        wallpapersRef.current = wallpapers;
    }, [wallpapers]);

    useEffect(() => {
        let isMounted = true;

        console.log('[Desktop] Fetching wallpapers from:', CHROMECAST_API);

        fetchWithTimeout(CHROMECAST_API)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            })
            .then((data: ChromecastImage[]) => {
                if (isMounted) {
                    console.log('[Desktop] Loaded', data.length, 'wallpapers');
                    setWallpapers(data);
                    changeWallpaper(data);
                }
            })
            .catch((error) => {
                console.error('[Desktop] Failed to load wallpapers:', error);
                if (isMounted) {
                    // Fondo de emergencia si la API falla
                    console.warn('[Desktop] Using fallback wallpaper');
                    setCurrentWallpaper(FALLBACK_WALLPAPER);
                }
            });

        return () => { isMounted = false; };
    }, [changeWallpaper]);

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
                {Array.from(apps.values()).filter(app => app.showOnDesktop !== false).map(app => (
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
                                app.iconComponent
                                    ? <app.iconComponent fontSize={40} />
                                    : <span className="text-4xl">{app.icon}</span>
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
                ))}
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