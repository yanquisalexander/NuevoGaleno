import { useEffect, useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useShell } from '@/contexts/ShellContext';
import { X } from 'lucide-react';
import { AppIcon } from './AppIcon';
import { cn } from "@/lib/utils";

export function AltTabSwitcher() {
    const { windows, apps, focusWindow } = useWindowManager();
    const { showAltTab, setShowAltTab } = useShell();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const keysPressed = useRef<Set<string>>(new Set());

    // Ordenar ventanas: La enfocada actualmente siempre debe ir primero (índice 0)
    // para que al hacer Tab, el selector se mueva a la anterior (índice 1)
    const sortedWindows = useMemo(() => {
        return [...windows]
            .filter(w => !w.isMinimized)
            .sort((a, b) => {
                if (a.isFocused) return -1;
                if (b.isFocused) return 1;
                return 0; // O usar un timestamp de 'lastFocused' si lo tienes en el contexto
            });
    }, [windows, showAltTab]); // Re-calcular solo al abrir o cambiar ventanas

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            keysPressed.current.add(e.key.toLowerCase());

            if (e.ctrlKey && e.key === 'Tab' && !e.altKey) {
                e.preventDefault();

                if (!showAltTab && sortedWindows.length > 0) {
                    setShowAltTab(true);
                    // IMPORTANTE: Si hay más de una, saltamos a la 1 (la anterior a la actual)
                    setSelectedIndex(sortedWindows.length > 1 ? 1 : 0);
                } else if (showAltTab) {
                    if (e.shiftKey) {
                        setSelectedIndex((prev) =>
                            prev === 0 ? sortedWindows.length - 1 : prev - 1
                        );
                    } else {
                        setSelectedIndex((prev) => (prev + 1) % sortedWindows.length);
                    }
                }
            }

            if (e.key === 'Enter' && showAltTab) {
                e.preventDefault();
                confirmSelection();
            }

            if (e.key === 'Escape' && showAltTab) {
                e.preventDefault();
                setShowAltTab(false);
            }

            // Flechas de navegación
            if (showAltTab && (e.key === 'ArrowRight' || e.key === 'ArrowDown')) {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % sortedWindows.length);
            }

            if (showAltTab && (e.key === 'ArrowLeft' || e.key === 'ArrowUp')) {
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev === 0 ? sortedWindows.length - 1 : prev - 1
                );
            }
        };

        const confirmSelection = () => {
            const selectedWindow = sortedWindows[selectedIndex];
            if (selectedWindow) {
                focusWindow(selectedWindow.id);
            }
            setShowAltTab(false);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());

            // Al soltar Control, ejecutamos el foco
            if (e.key === 'Control' && showAltTab) {
                confirmSelection();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [showAltTab, selectedIndex, sortedWindows, focusWindow, setShowAltTab]);

    // Reset de estado
    useEffect(() => {
        if (!showAltTab) {
            setSelectedIndex(0);
            keysPressed.current.clear();
        }
    }, [showAltTab]);

    if (!showAltTab || sortedWindows.length === 0) return null;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100] flex items-center justify-center"
                onClick={() => setShowAltTab(false)}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    transition={{ type: "spring", damping: 20, stiffness: 300 }}
                    className="bg-[#2c2c2c]/80 backdrop-blur-2xl rounded-[12px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 p-2 min-w-[500px] max-w-[85vw]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Contenido principal: Grid horizontal similar a Win11 */}
                    <div className="flex items-center gap-1 p-2 overflow-x-auto no-scrollbar">
                        {sortedWindows.map((window, index) => {
                            const app = apps.get(window.appId);
                            if (!app) return null;

                            const isSelected = index === selectedIndex;

                            return (
                                <button
                                    key={window.id}
                                    onClick={() => {
                                        focusWindow(window.id);
                                        setShowAltTab(false);
                                    }}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={cn(
                                        "relative flex flex-col items-center min-w-[110px] max-w-[140px] p-3 rounded-[8px] transition-all duration-150",
                                        isSelected
                                            ? "bg-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-blue-400 after:rounded-full"
                                            : "hover:bg-white/5"
                                    )}
                                >
                                    {/* App Icon */}
                                    <div className="relative mb-3">
                                        <div className={cn(
                                            "transition-transform duration-200",
                                            isSelected ? "scale-110" : "scale-100 opacity-80"
                                        )}>
                                            <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={40} className={isSelected ? 'text-white' : 'text-white/80'} />
                                        </div>
                                    </div>

                                    {/* App Info */}
                                    <div className="w-full text-center">
                                        <p className={cn(
                                            "text-[11px] leading-tight truncate px-1",
                                            isSelected ? "text-white font-medium" : "text-white/60"
                                        )}>
                                            {window.title || app.name}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer con info de la ventana seleccionada (Estilo Fluent) */}
                    <div className="bg-black/20 mt-1 rounded-b-[10px] px-4 py-2 flex items-center justify-between">
                        <span className="text-[11px] text-white/40 font-medium">
                            {sortedWindows[selectedIndex]?.title || "Seleccionar ventana"}
                        </span>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 opacity-40">
                                <kbd className="px-1.5 py-0.5 bg-white/10 rounded border border-white/10 text-[9px] text-white">Tab</kbd>
                                <span className="text-[10px] text-white uppercase tracking-tighter">Navegar</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}