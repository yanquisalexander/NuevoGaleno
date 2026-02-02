import { useRef, useState, useEffect, ReactNode } from 'react';
import { X, Square, Copy, Minus } from 'lucide-react'; // Iconos más estilo Windows
import { motion, AnimatePresence } from 'motion/react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
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
            width: '100vw',
            height: 'calc(100vh - 48px)', // Altura de tu taskbar
        }
        : {
            top: windowState.position.y,
            left: windowState.position.x,
            width: windowState.size.width,
            height: windowState.size.height,
        };

    return (
        <AnimatePresence>
            {!windowState.isMinimized && (
                <motion.div
                    ref={windowRef}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        ...containerStyle
                    }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    onMouseDown={handleMouseDown}
                    className={`
                        fixed flex flex-col overflow-hidden
                        bg-[#202020]/80 backdrop-blur-[30px] 
                        border border-white/10 ${windowState.isMaximized ? '' : 'rounded-xl'}
                        shadow-[0_20px_50px_rgba(0,0,0,0.3)]
                        ${windowState.isFocused ? 'ring-1 ring-white/20' : 'brightness-90'}
                    `}
                    style={{ zIndex: windowState.zIndex }}
                >
                    {/* Title Bar - Estilo Mica */}
                    <div
                        onMouseDown={handleDragStart}
                        onDoubleClick={() => windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)}
                        className="flex items-center justify-between h-9 px-3 select-none cursor-default"
                    >
                        <div className="flex items-center gap-2 flex-1">
                            <span className="text-lg">{icon}</span>
                            <span className="text-[12px] text-white/90 font-normal">
                                {title}
                            </span>
                        </div>

                        <div className="window-controls flex h-full">
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
                        </div>
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
            )}
        </AnimatePresence>
    );
}