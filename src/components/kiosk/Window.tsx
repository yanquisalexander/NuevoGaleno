import { useRef, useState, useEffect, ReactNode } from 'react';
import { X, Square, Copy, Minus } from 'lucide-react'; // Iconos más estilo Windows
import { motion } from 'motion/react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { useConfig } from '../../hooks/useConfig';
import { useSession } from '@/hooks/useSession';
import type { WindowId } from '../../types/window-manager';

interface WindowProps {
    windowId: WindowId;
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    onClose?: () => void;
}

export function Window({ windowId, title, icon, children, onClose }: WindowProps) {
    const {
        windows,
        closeWindow,
        minimizeWindow,
        maximizeWindow,
        restoreWindow,
        focusWindow,
        updatePosition,
        updateSize
    } = useWindowManager();

    const { values } = useConfig();
    const { getUserPreferences } = useSession();
    const userPrefs = getUserPreferences();
    const layoutStyle = (userPrefs.layout_style as string) || (values.layoutStyle as string) || 'windows';
    const isMac = layoutStyle === 'macos';

    const windowState = windows.find(w => w.id === windowId);
    const windowRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    if (!windowState) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        focusWindow(windowId);
    };

    const handleDragStart = (e: React.MouseEvent) => {
        if (windowState.isMaximized || (e.target as HTMLElement).closest('.window-controls')) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - windowState.position.x,
            y: e.clientY - windowState.position.y,
        });
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: windowState.size.width,
            height: windowState.size.height,
        });
    };

    useEffect(() => {
        if (!isDragging && !isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                updatePosition(windowId, {
                    x: e.clientX - dragOffset.x,
                    y: e.clientY - dragOffset.y,
                });
            } else if (isResizing) {
                updateSize(windowId, {
                    width: Math.max(300, resizeStart.width + (e.clientX - resizeStart.x)),
                    height: Math.max(200, resizeStart.height + (e.clientY - resizeStart.y)),
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, dragOffset, resizeStart, windowId, updatePosition, updateSize]);

    const containerStyle = windowState.isMaximized
        ? {
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
        }
        : {
            top: windowState.position.y,
            left: windowState.position.x,
            width: windowState.size.width,
            height: windowState.size.height,
        };

    return (
        <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={windowState.isMinimized ? {
                opacity: 0,
                scale: 0.5,
                y: window.innerHeight,
            } : {
                opacity: 1,
                scale: 1,
                y: 0,
                ...containerStyle
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onMouseDown={handleMouseDown}
            className={`
                absolute flex flex-col overflow-hidden
                bg-[#202020]/80 backdrop-blur-[30px] 
                border border-white/10 ${windowState.isMaximized ? '' : (isMac ? 'rounded-xl' : 'rounded-lg')}
                shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                ${windowState.isFocused ? 'ring-1 ring-white/20' : 'brightness-90'}
            `}
            style={{
                zIndex: windowState.zIndex,
                pointerEvents: windowState.isMinimized ? 'none' : 'auto',
                visibility: windowState.isMinimized ? 'hidden' : 'visible'
            }}
        >
            {/* Title Bar - Estilo Dinámico */}
            <div
                onMouseDown={handleDragStart}
                onDoubleClick={() => windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)}
                className="flex items-center gap-2 h-9 px-3 select-none cursor-default"
            >
                {/* Botones de control (MacOS a la izquierda, Windows a la derecha) */}
                <div className={`window-controls flex items-center h-full ${isMac ? 'order-first gap-1.5' : 'order-last'}`}>
                    {isMac ? (
                        <>
                            <button
                                onClick={() => { onClose?.(); closeWindow(windowId); }}
                                className="w-3.5 h-3.5 rounded-full bg-[#ff5f57] border border-black/10 flex items-center justify-center group"
                            >
                                <X size={8} className="text-black opacity-0 group-hover:opacity-100" />
                            </button>
                            <button
                                onClick={() => minimizeWindow(windowId)}
                                className="w-3.5 h-3.5 rounded-full bg-[#febc2e] border border-black/10 flex items-center justify-center group"
                            >
                                <Minus size={8} className="text-black opacity-0 group-hover:opacity-100" />
                            </button>
                            <button
                                onClick={() => windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)}
                                className="w-3.5 h-3.5 rounded-full bg-[#28c840] border border-black/10 flex items-center justify-center group"
                            >
                                <Square size={6} className="text-black opacity-0 group-hover:opacity-100" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => minimizeWindow(windowId)}
                                className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <Minus size={14} className="text-white" />
                            </button>
                            <button
                                onClick={() => windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)}
                                className="w-11 h-9 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                {windowState.isMaximized ? (
                                    <Copy size={12} className="text-white -rotate-90" />
                                ) : (
                                    <Square size={12} className="text-white" />
                                )}
                            </button>
                            <button
                                onClick={() => { onClose?.(); closeWindow(windowId); }}
                                className="w-11 h-9 flex items-center justify-center hover:bg-[#e81123] transition-colors"
                            >
                                <X size={16} className="text-white" />
                            </button>
                        </>
                    )}
                </div>

                <div className={`flex items-center gap-2 flex-1 ${isMac ? 'justify-center' : 'justify-start'}`}>
                    <span className="text-lg">{icon}</span>
                    <span className="text-[12px] text-white/90 font-normal">
                        {title}
                    </span>
                </div>

                {/* Spacer para centrado perfecto en macOS */}
                {isMac && <div className="w-12" />}
            </div>

            {/* Window Content */}
            <div className="flex-1 overflow-auto bg-[#191919]/90">
                {children}
            </div>

            {/* Resize Handle - Invisible pero grande para facilidad de uso */}
            {!windowState.isMaximized && (
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-50"
                />
            )}
        </motion.div>
    );
}