import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { DesktopContextMenu } from './DesktopContextMenu';
import { playSound, UI_SOUNDS } from "@/consts/Sounds";
import { useToast } from "@/hooks/useToast";

interface ChromecastImage {
    url: string;
    name: string;
    photographer: string;
    location: string;
}

const CHROMECAST_API = 'https://corsproxy.io/?url=https://chromecastbg.alexmeub.com/images.v9.json';

export function Desktop() {
    const { apps, openWindow } = useWindowManager();
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

    const [wallpapers, setWallpapers] = useState<ChromecastImage[]>([]);
    const [currentWallpaper, setCurrentWallpaper] = useState<string>('');
    const [prevWallpaper, setPrevWallpaper] = useState<string>('');
    const [wallpaperInfo, setWallpaperInfo] = useState<ChromecastImage | null>(null);
    const [isChanging, setIsChanging] = useState(false);

    const { success } = useToast();

    useEffect(() => {
        playSound(UI_SOUNDS.GALENO_BOOT, 0.3);

        setTimeout(() => {
            success('Bienvenido a Nuevo Galeno', 'Haz doble clic en un ícono para abrir una aplicación.', {
                sound: true,
                soundFile: UI_SOUNDS.ALERT_05
            })
        }, 2000)

    }, []);

    // Referencia para evitar ciclos en el random
    const usedIndices = useRef<Set<number>>(new Set());

    // Normalizar URL de Google (http -> https)
    const normalizeUrl = (url: string) => url.replace('http://', 'https://');

    const changeWallpaper = useCallback((dataList?: ChromecastImage[]) => {
        const list = dataList || wallpapers;
        if (list.length === 0 || isChanging) return;

        setIsChanging(true);

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
            setPrevWallpaper(currentWallpaper);
            setCurrentWallpaper(nextUrl);
            setWallpaperInfo(nextData);

            // Tiempo de la animación de motion (1.5s) + margen
            setTimeout(() => {
                setPrevWallpaper('');
                setIsChanging(false);
            }, 1600);
        };
        img.onerror = () => {
            console.warn("Error cargando imagen, intentando otra...");
            setIsChanging(false);
            changeWallpaper(list);
        };
    }, [wallpapers, currentWallpaper, isChanging]);

    useEffect(() => {
        fetch(CHROMECAST_API)
            .then(res => res.json())
            .then((data: ChromecastImage[]) => {
                setWallpapers(data);
                changeWallpaper(data);
            })
            .catch(() => {
                // Fondo de emergencia si la API falla
                setCurrentWallpaper('https://images.unsplash.com/photo-1620121692029-d088224ddc74');
            });
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 top-0 bottom-12 overflow-hidden select-none outline-none bg-[#121212]"
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

            {/* GRID DE ICONOS (ESTILO WINDOWS 11) */}
            <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.3 } }
                }}
                className="absolute inset-0 p-4 z-10 flex flex-wrap flex-col content-start gap-1"
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
                                ? 'bg-white/15 border-white/20 backdrop-blur-md shadow-lg'
                                : 'hover:bg-white/10 hover:border-white/10'}
                        `}
                    >
                        <span className="text-4xl drop-shadow-lg">{app.icon}</span>
                        <span className={`
                            text-[11px] text-white text-center leading-tight line-clamp-2 px-1
                            drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]
                            ${selectedApp === app.id ? 'bg-[#0078d7]/90 rounded-sm' : ''}
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
        </motion.div>
    );
}