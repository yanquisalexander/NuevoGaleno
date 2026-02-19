import { useRef, useState, useEffect, ReactNode } from 'react';
import { X, Square, Copy, Minus, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

// ─── macOS Traffic Light Button ───────────────────────────────────────────────
function MacButton({
    color,
    hoverIcon,
    onClick,
    isHovered,
}: {
    color: string;
    hoverIcon: ReactNode;
    onClick: () => void;
    isHovered: boolean;
}) {
    return (
        <button
            onClick={onClick}
            className="relative flex items-center justify-center rounded-full transition-all duration-100 active:brightness-75"
            style={{
                width: 12,
                height: 12,
                backgroundColor: color,
                boxShadow: isHovered
                    ? `0 0 0 0.5px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.25)`
                    : `0 0 0 0.5px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)`,
            }}
        >
            <span
                style={{
                    opacity: isHovered ? 1 : 0,
                    transition: 'opacity 0.1s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {hoverIcon}
            </span>
        </button>
    );
}

// ─── Windows Fluent Caption Button ────────────────────────────────────────────
function FluentButton({
    icon,
    onClick,
    isClose,
}: {
    icon: ReactNode;
    onClick: () => void;
    isClose?: boolean;
}) {
    const [hovered, setHovered] = useState(false);
    const [pressed, setPressed] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            className="flex items-center justify-center transition-colors duration-75"
            style={{
                width: 46,
                height: 32,
                backgroundColor: pressed
                    ? isClose ? 'rgba(196,43,28,0.9)' : 'rgba(255,255,255,0.07)'
                    : hovered
                        ? isClose ? 'rgba(196,43,28,1)' : 'rgba(255,255,255,0.09)'
                        : 'transparent',
                color: pressed
                    ? isClose ? 'white' : 'rgba(255,255,255,0.7)'
                    : hovered
                        ? 'white'
                        : 'rgba(255,255,255,0.75)',
            }}
        >
            {icon}
        </button>
    );
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
        updateSize,
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
    const [macButtonsHovered, setMacButtonsHovered] = useState(false);

    if (!windowState) return null;

    const handleMouseDown = () => focusWindow(windowId);

    const handleDragStart = (e: React.MouseEvent) => {
        if (windowState.isMaximized || (e.target as HTMLElement).closest('.window-controls')) return;
        e.preventDefault();
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
                    width: Math.max(320, resizeStart.width + (e.clientX - resizeStart.x)),
                    height: Math.max(240, resizeStart.height + (e.clientY - resizeStart.y)),
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

    const positionStyle = windowState.isMaximized
        ? { top: 0, left: 0, width: '100%', height: '100%' }
        : {
            top: windowState.position.y,
            left: windowState.position.x,
            width: windowState.size.width,
            height: windowState.size.height,
        };

    // ─── macOS window ──────────────────────────────────────────────────────────
    if (isMac) {
        const focused = windowState.isFocused;
        return (
            <motion.div
                ref={windowRef}
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={
                    windowState.isMinimized
                        ? { opacity: 0, scale: 0.4, y: window.innerHeight, transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } }
                        : {
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            ...positionStyle,
                            transition: { type: 'spring', damping: 30, stiffness: 400, mass: 0.8 },
                        }
                }
                onMouseDown={handleMouseDown}
                className="absolute flex flex-col overflow-hidden"
                style={{
                    zIndex: windowState.zIndex,
                    pointerEvents: windowState.isMinimized ? 'none' : 'auto',
                    visibility: windowState.isMinimized ? 'hidden' : 'visible',
                    borderRadius: windowState.isMaximized ? 0 : 10,
                    // macOS window shadow — very distinctive
                    boxShadow: focused
                        ? '0 22px 70px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(0,0,0,0.4), inset 0 0 0 0.5px rgba(255,255,255,0.12)'
                        : '0 8px 30px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(0,0,0,0.3)',
                }}
            >
                {/* macOS Title Bar */}
                <div
                    onMouseDown={handleDragStart}
                    onDoubleClick={() =>
                        windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)
                    }
                    className="flex items-center justify-between select-none cursor-default relative shrink-0"
                    style={{
                        height: 28,
                        paddingLeft: 8,
                        paddingRight: 8,
                        // macOS title bar gradient
                        background: focused
                            ? 'linear-gradient(180deg, rgba(78,78,78,0.95) 0%, rgba(55,55,55,0.92) 100%)'
                            : 'linear-gradient(180deg, rgba(50,50,50,0.9) 0%, rgba(38,38,38,0.88) 100%)',
                        backdropFilter: 'blur(20px) saturate(1.4)',
                        WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                        borderBottom: '0.5px solid rgba(0,0,0,0.5)',
                    }}
                >
                    {/* Traffic lights */}
                    <div
                        className="window-controls flex items-center gap-2"
                        onMouseEnter={() => setMacButtonsHovered(true)}
                        onMouseLeave={() => setMacButtonsHovered(false)}
                        style={{ paddingTop: 1 }}
                    >
                        <MacButton
                            color={focused ? '#ff5f57' : '#5a5a5a'}
                            hoverIcon={
                                <svg width="6" height="6" viewBox="0 0 6 6">
                                    <path d="M1 1l4 4M5 1l-4 4" stroke="rgba(100,0,0,0.8)" strokeWidth="1.2" strokeLinecap="round" />
                                </svg>
                            }
                            onClick={() => { onClose?.(); closeWindow(windowId); }}
                            isHovered={macButtonsHovered}
                        />
                        <MacButton
                            color={focused ? '#febc2e' : '#5a5a5a'}
                            hoverIcon={
                                <svg width="7" height="2" viewBox="0 0 7 2">
                                    <path d="M0.5 1h6" stroke="rgba(80,50,0,0.8)" strokeWidth="1.2" strokeLinecap="round" />
                                </svg>
                            }
                            onClick={() => minimizeWindow(windowId)}
                            isHovered={macButtonsHovered}
                        />
                        <MacButton
                            color={focused ? '#28c840' : '#5a5a5a'}
                            hoverIcon={
                                <svg width="7" height="7" viewBox="0 0 7 7">
                                    <path d="M1.5 3.5h4M3.5 1.5v4" stroke="rgba(0,60,0,0.8)" strokeWidth="1.2" strokeLinecap="round" />
                                </svg>
                            }
                            onClick={() =>
                                windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)
                            }
                            isHovered={macButtonsHovered}
                        />
                    </div>

                    {/* Centered title */}
                    <div
                        className="absolute inset-x-0 flex items-center justify-center gap-1.5 pointer-events-none"
                        style={{ paddingTop: 1 }}
                    >
                        {icon && (
                            <span style={{ fontSize: 12, lineHeight: 1, opacity: focused ? 1 : 0.5 }}>
                                {icon}
                            </span>
                        )}
                        <span
                            style={{
                                fontSize: 12,
                                fontWeight: 500,
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                letterSpacing: '-0.01em',
                                color: focused ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)',
                                textShadow: '0 1px 0 rgba(0,0,0,0.5)',
                            }}
                        >
                            {title}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div
                    className="flex-1 overflow-auto"
                    style={{
                        background: 'rgba(28,28,28,0.96)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                    }}
                >
                    {children}
                </div>

                {/* Resize handle */}
                {!windowState.isMaximized && (
                    <div
                        onMouseDown={handleResizeStart}
                        className="absolute bottom-0 right-0 z-50"
                        style={{
                            width: 16,
                            height: 16,
                            cursor: 'se-resize',
                        }}
                    />
                )}
            </motion.div>
        );
    }

    // ─── Windows Fluent UI v9 window ───────────────────────────────────────────
    const focused = windowState.isFocused;
    return (
        <motion.div
            ref={windowRef}
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={
                windowState.isMinimized
                    ? {
                        opacity: 0,
                        scale: 0.85,
                        y: window.innerHeight,
                        transition: { duration: 0.2, ease: [0.55, 0, 1, 0.45] },
                    }
                    : {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        ...positionStyle,
                        transition: { type: 'spring', damping: 35, stiffness: 500, mass: 0.6 },
                    }
            }
            onMouseDown={handleMouseDown}
            className="absolute flex flex-col overflow-hidden"
            style={{
                zIndex: windowState.zIndex,
                pointerEvents: windowState.isMinimized ? 'none' : 'auto',
                visibility: windowState.isMinimized ? 'hidden' : 'visible',
                borderRadius: windowState.isMaximized ? 0 : 8,
                // Fluent elevation
                boxShadow: focused
                    ? '0 32px 64px rgba(0,0,0,0.42), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.07)'
                    : '0 8px 16px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)',
                // Mica-like background
                background: focused
                    ? 'rgba(32,32,32,0.82)'
                    : 'rgba(28,28,28,0.78)',
                backdropFilter: 'blur(60px) saturate(1.6)',
                WebkitBackdropFilter: 'blur(60px) saturate(1.6)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            {/* Fluent Title Bar */}
            <div
                onMouseDown={handleDragStart}
                onDoubleClick={() =>
                    windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)
                }
                className="flex items-center select-none cursor-default shrink-0"
                style={{ height: 32 }}
            >
                {/* App icon + title */}
                <div className="flex items-center gap-2 flex-1 pl-3 pr-2 overflow-hidden">
                    {icon && (
                        <span
                            style={{
                                fontSize: 14,
                                lineHeight: 1,
                                flexShrink: 0,
                                opacity: focused ? 1 : 0.5,
                            }}
                        >
                            {icon}
                        </span>
                    )}
                    <span
                        style={{
                            fontSize: 12,
                            fontWeight: 400,
                            fontFamily: '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif',
                            letterSpacing: 0,
                            color: focused ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}
                    >
                        {title}
                    </span>
                </div>

                {/* Fluent caption buttons */}
                <div className="window-controls flex items-center h-full">
                    <FluentButton
                        icon={
                            <svg width="10" height="1" viewBox="0 0 10 1">
                                <rect width="10" height="1" rx="0.5" fill="currentColor" />
                            </svg>
                        }
                        onClick={() => minimizeWindow(windowId)}
                    />
                    <FluentButton
                        icon={
                            windowState.isMaximized ? (
                                // Restore icon (two overlapping squares)
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <rect x="3" y="0" width="7" height="7" rx="0.5" stroke="currentColor" strokeWidth="1" />
                                    <path d="M0 3v7h7" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                            ) : (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                    <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" stroke="currentColor" strokeWidth="1" />
                                </svg>
                            )
                        }
                        onClick={() =>
                            windowState.isMaximized ? restoreWindow(windowId) : maximizeWindow(windowId)
                        }
                    />
                    <FluentButton
                        icon={
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                <path
                                    d="M1 1L9 9M9 1L1 9"
                                    stroke="currentColor"
                                    strokeWidth="1.1"
                                    strokeLinecap="round"
                                />
                            </svg>
                        }
                        onClick={() => { onClose?.(); closeWindow(windowId); }}
                        isClose
                    />
                </div>
            </div>

            {/* Subtle separator */}
            <div
                style={{
                    height: '0.5px',
                    background: focused
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(255,255,255,0.03)',
                    flexShrink: 0,
                }}
            />

            {/* Content */}
            <div
                className="flex-1 overflow-auto"
                style={{
                    background: 'rgba(20,20,20,0.6)',
                }}
            >
                {children}
            </div>

            {/* Resize handle */}
            {!windowState.isMaximized && (
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 z-50"
                    style={{ width: 12, height: 12, cursor: 'se-resize' }}
                />
            )}
        </motion.div>
    );
}