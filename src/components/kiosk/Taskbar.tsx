import { useState, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search, Battery, BatteryCharging, Wifi, Volume2, User, Power,
    LayoutGrid, Bell, RefreshCcwIcon, Lock, ChevronDown, FileText,
    Settings, X, ChevronRight, Smartphone,
} from 'lucide-react';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useSession } from '@/hooks/useSession';
import { useNotifications } from '@/contexts/NotificationContext';
import { useShell } from '@/contexts/ShellContext';
import { LicenseStatusIndicator } from '../LicenseStatusIndicator';
import { Clock } from './Clock';
import { RemoteConnectionIndicator } from './RemoteConnectionIndicator';
import { TaskbarContextMenu } from './TaskbarContextMenu';
import { AppIcon } from './AppIcon';
import { GalenoCompanionPanel } from './GalenoCompanionPanel';
import { useNotImplemented } from '@/utils/system/NotImplemented';
import { useGalenoClient } from '@/hooks/useGalenoClient';
import { usePatients } from '@/hooks/usePatients';

// ─── Fluent UI v9 tokens ──────────────────────────────────────────────────────
const tokens = {
    colorNeutralBackground1: '#1c1c1c',
    colorNeutralBackground2: '#242424',
    colorNeutralBackground3: '#2e2e2e',
    colorNeutralBackground4: '#383838',
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: 'rgba(255,255,255,0.72)',
    colorNeutralForeground3: 'rgba(255,255,255,0.48)',
    colorNeutralForeground4: 'rgba(255,255,255,0.28)',
    colorNeutralStroke1: 'rgba(255,255,255,0.10)',
    colorNeutralStroke2: 'rgba(255,255,255,0.06)',
    colorBrandBackground: '#0078d4',
    colorBrandBackgroundHover: '#106ebe',
    colorBrandForeground: '#4da6ff',
    colorPaletteGreenForeground: '#73c765',
    colorPaletteRedForeground: '#f1707a',
    colorPaletteRedBackground: 'rgba(232,17,35,0.15)',
    colorPaletteYellowForeground: '#ffb900',
    borderRadiusMedium: '6px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',
    durationNormal: '150ms',
    curveEasyEase: 'cubic-bezier(0.33,0,0.67,1)',
} as const;

interface StartSearchResult {
    id: string;
    type: 'app' | 'manual' | 'patient' | 'action';
    title: string;
    subtitle?: string;
    icon: ReactNode;
    action: () => void;
}

interface SystemInfo {
    batteryLevel: number;
    isCharging: boolean;
    batteryAvailable: boolean;
}

// ─── Taskbar icon button ──────────────────────────────────────────────────────
function TBButton({
    onClick, active, title, children,
}: {
    onClick?: () => void;
    active?: boolean;
    title?: string;
    children: React.ReactNode;
}) {
    return (
        <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onClick}
            title={title}
            style={{
                position: 'relative',
                width: 44, height: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: tokens.borderRadiusMedium,
                border: 'none', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: tokens.colorNeutralForeground2,
                transition: `background ${tokens.durationNormal}`,
                flexShrink: 0,
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
            {children}
        </motion.button>
    );
}

// ─── Taskbar ──────────────────────────────────────────────────────────────────
export function Taskbar() {
    const { windows, apps, openWindow, focusWindow } = useWindowManager();
    const { currentUser, lockScreen, logout } = useSession();
    const { notifications } = useNotifications();
    const {
        showStartMenu, setShowStartMenu,
        showNotifications, setShowNotifications,
        toggleStartMenu, setShowSearch,
        setShowCalendar, showCalendar,
        setShowPowerMenu, updateAvailable,

        // Companion panel (estado independiente)
        showCompanion, setShowCompanion, toggleCompanion,
    } = useShell();
    const client = useGalenoClient();

    const [systemInfo, setSystemInfo] = useState<SystemInfo>({
        batteryLevel: 100, isCharging: false, batteryAvailable: false,
    });
    const [taskbarContextMenu, setTaskbarContextMenu] = useState<{ x: number; y: number } | null>(null);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [startQuery, setStartQuery] = useState('');
    const [startResults, setStartResults] = useState<StartSearchResult[]>([]);
    const [startSelected, setStartSelected] = useState(0);
    const [isStartLoading, setIsStartLoading] = useState(false);

    const manualIndexRef = useRef<any | null>(null);
    const openWindowRef = useRef(openWindow);
    const searchPatientsRef = useRef<any>(null);
    const { searchPatients } = usePatients();

    useEffect(() => { openWindowRef.current = openWindow; }, [openWindow]);
    useEffect(() => { searchPatientsRef.current = searchPatients; }, [searchPatients]);

    const notImplemented = useNotImplemented();

    const TYPE_COLORS: Record<string, string> = {
        app: tokens.colorBrandForeground,
        manual: '#fb923c',
        patient: '#a78bfa',
        action: tokens.colorPaletteYellowForeground,
    };

    // ── Close user menu on outside click ──────────────────────────────────────
    useEffect(() => {
        if (!showUserMenu) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            if (!t.closest('.user-menu-button') && !t.closest('.user-menu-dropdown')) {
                setShowUserMenu(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showUserMenu]);

    // ── Start menu search ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!showStartMenu) {
            setStartQuery(''); setStartResults([]); setStartSelected(0); setIsStartLoading(false);
            return;
        }
        if (!startQuery.trim()) {
            setStartResults([]); setStartSelected(0); setIsStartLoading(false);
            return;
        }
        setIsStartLoading(true);
        const timer = setTimeout(async () => {
            const q = startQuery.trim().toLowerCase();
            const results: StartSearchResult[] = [];

            // Apps
            Array.from(apps.values()).forEach(app => {
                if ((app.name || '').toLowerCase().includes(q) || ((app as any).description || '').toLowerCase().includes(q)) {
                    results.push({
                        id: `app-${app.id}`, type: 'app', title: app.name,
                        subtitle: (app as any).description || 'Aplicación',
                        icon: <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={18} />,
                        action: () => { openWindowRef.current?.(app.id); setShowStartMenu(false); },
                    });
                }
            });

            // Manual
            try {
                if (!manualIndexRef.current) {
                    const res = await fetch('/manual/index.json');
                    if (res.ok) manualIndexRef.current = await res.json();
                }
                manualIndexRef.current?.categories?.forEach((cat: any) => {
                    cat.items.forEach((item: any) => {
                        const kw: string[] = (item.keywords || []).map((k: string) => k.toLowerCase());
                        if (
                            (item.title || '').toLowerCase().includes(q) ||
                            (cat.title || '').toLowerCase().includes(q) ||
                            kw.some((k: string) => k.includes(q))
                        ) {
                            results.push({
                                id: `manual-${cat.id}-${item.id}`, type: 'manual',
                                title: item.title, subtitle: cat.title,
                                icon: <FileText style={{ width: 18, height: 18, color: '#fb923c' }} />,
                                action: () => { openWindowRef.current?.('manual-galeno', { path: `${cat.id}/${item.id}` }); setShowStartMenu(false); },
                            });
                        }
                    });
                });
            } catch { /* noop */ }

            // Patients
            try {
                const pats = await (searchPatientsRef.current?.(q) ?? Promise.resolve([]));
                pats.forEach((p: any) => results.push({
                    id: `patient-${p.id}`, type: 'patient',
                    title: `${p.first_name} ${p.last_name}`,
                    subtitle: `DNI: ${p.document_number || 'Sin DNI'}`,
                    icon: <User style={{ width: 18, height: 18, color: '#a78bfa' }} />,
                    action: () => { openWindowRef.current?.('patient-record', { patientId: p.id }); setShowStartMenu(false); },
                }));
            } catch { /* noop */ }

            // Admin actions
            if (currentUser?.role === 'admin' && ['system-tools', 'mantenimiento', 'admin'].some(t => t.includes(q))) {
                results.push({
                    id: 'action-system-tools', type: 'action',
                    title: 'Mantenimiento del sistema', subtitle: 'Herramientas del sistema',
                    icon: <Settings style={{ width: 18, height: 18, color: tokens.colorPaletteYellowForeground }} />,
                    action: () => { openWindowRef.current?.('system-tools'); setShowStartMenu(false); },
                });
            }

            setStartResults(results);
            setStartSelected(0);
            setIsStartLoading(false);
        }, 200);
        return () => clearTimeout(timer);
    }, [startQuery, apps, currentUser?.role, showStartMenu]);



    // ── Battery ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!('getBattery' in navigator)) return;
        (navigator as any).getBattery().then((battery: any) => {
            const sync = () => setSystemInfo({
                batteryLevel: Math.round(battery.level * 100),
                isCharging: battery.charging,
                batteryAvailable: true,
            });
            sync();
            battery.addEventListener('levelchange', sync);
            battery.addEventListener('chargingchange', sync);
        }).catch(() => { });
    }, []);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Taskbar bar ── */}
            <div
                style={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, height: 48,
                    background: 'rgba(28,28,28,0.97)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
                    boxShadow: '0 -1px 0 rgba(0,0,0,0.3)',
                    zIndex: 40,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0 6px',
                }}
                onContextMenu={e => { e.preventDefault(); setTaskbarContextMenu({ x: e.clientX, y: e.clientY }); }}
            >
                {/* Left */}
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
                    <TBButton onClick={toggleStartMenu} active={showStartMenu} title="Inicio">
                        <LayoutGrid style={{
                            width: 20, height: 20, color: '#00a4ef',
                            transition: 'transform 300ms',
                            transform: showStartMenu ? 'rotate(45deg)' : 'none',
                        }} />
                    </TBButton>

                    <TBButton onClick={() => setShowSearch(true)} title="Buscar">
                        <Search style={{ width: 20, height: 20 }} />
                    </TBButton>

                    <TBButton onClick={lockScreen} title="Bloquear pantalla">
                        <Lock style={{ width: 20, height: 20 }} />
                    </TBButton>

                    <div style={{ width: 1, height: 20, background: tokens.colorNeutralStroke1, margin: '0 4px' }} />

                    {/* Open windows */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: '100%' }}>
                        <AnimatePresence mode="popLayout">
                            {windows.map(win => {
                                const app = apps.get(win.appId);
                                if (!app) return null;
                                const isFocused = win.isFocused && !win.isMinimized;
                                return (
                                    <motion.button
                                        key={win.id}
                                        layout
                                        initial={{ scale: 0, opacity: 0, y: 12 }}
                                        animate={{ scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 400, damping: 28 } }}
                                        exit={{ scale: 0, opacity: 0, transition: { duration: 0.18 } }}
                                        whileHover={{ y: -1 }}
                                        whileTap={{ scale: 0.85 }}
                                        onClick={() => focusWindow(win.id)}
                                        style={{
                                            position: 'relative', width: 44, height: 44,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            borderRadius: tokens.borderRadiusMedium,
                                            border: 'none', cursor: 'pointer',
                                            background: isFocused ? 'rgba(255,255,255,0.10)' : 'transparent',
                                            transition: `background ${tokens.durationNormal}`,
                                            flexShrink: 0,
                                        }}
                                        onMouseEnter={e => { if (!isFocused) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
                                        onMouseLeave={e => { if (!isFocused) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                                    >
                                        <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={24} />
                                        <motion.div
                                            style={{
                                                position: 'absolute', bottom: 4,
                                                left: 0, right: 0,
                                                marginLeft: 'auto', marginRight: 'auto',
                                                height: 3, borderRadius: 2,
                                                background: tokens.colorBrandForeground,
                                                opacity: win.isMinimized ? 0.4 : 1,
                                            }}
                                            animate={{ width: isFocused ? 16 : 4 }}
                                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                        />
                                    </motion.button>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right / System tray */}
                <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
                    <AnimatePresence>
                        {updateAvailable && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                            >
                                <TBButton onClick={() => openWindow('galeno-update')} title="Actualización disponible">
                                    <RefreshCcwIcon style={{ width: 20, height: 20, color: tokens.colorBrandForeground }} />
                                    <div style={{
                                        position: 'absolute', top: 8, right: 8,
                                        width: 7, height: 7, borderRadius: '50%',
                                        background: tokens.colorBrandForeground,
                                        boxShadow: '0 0 6px rgba(77,166,255,0.8)',
                                    }} />
                                </TBButton>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <TBButton
                        onClick={() => setShowNotifications(!showNotifications)}
                        active={showNotifications}
                        title="Centro de notificaciones"
                    >
                        <Bell style={{ width: 20, height: 20 }} />
                        <AnimatePresence>
                            {notifications.length > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                                    style={{
                                        position: 'absolute', top: 8, right: 8,
                                        minWidth: 15, height: 15, borderRadius: 8,
                                        background: tokens.colorPaletteRedForeground,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '0 3px',
                                    }}
                                >
                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>
                                        {notifications.length > 9 ? '9+' : notifications.length}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </TBButton>

                    {/* System tray cluster */}
                    <motion.div
                        whileHover={{ background: 'rgba(255,255,255,0.07)' }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '0 6px', height: 36,
                            borderRadius: tokens.borderRadiusMedium,
                            cursor: 'default',
                            transition: `background ${tokens.durationNormal}`,
                        }}
                    >
                        <RemoteConnectionIndicator variant="windows" />
                        <LicenseStatusIndicator />
                        <div style={{ width: 1, height: 14, background: tokens.colorNeutralStroke1 }} />

                        {/* Companion toggle (tray) — small icon like Wifi/Volume */}
                        <button
                            onClick={toggleCompanion}
                            title="Galeno Companion"
                            style={{
                                background: 'transparent', border: 'none', padding: 6,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: tokens.borderRadiusMedium, cursor: 'pointer', flexShrink: 0,
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = showCompanion ? 'rgba(77,166,255,0.06)' : 'rgba(255,255,255,0.03)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <Smartphone style={{ width: 15, height: 15, color: showCompanion ? tokens.colorBrandForeground : tokens.colorNeutralForeground2 }} />
                        </button>

                        <Wifi style={{ width: 15, height: 15, color: tokens.colorNeutralForeground2 }} />
                        <Volume2 style={{ width: 15, height: 15, color: tokens.colorNeutralForeground2 }} />
                        {systemInfo.batteryAvailable && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                {systemInfo.isCharging
                                    ? <BatteryCharging style={{ width: 15, height: 15, color: tokens.colorPaletteGreenForeground }} />
                                    : <Battery style={{ width: 15, height: 15, color: tokens.colorNeutralForeground2 }} />
                                }
                                <span style={{ fontSize: 11, color: tokens.colorNeutralForeground2, fontWeight: 500 }}>
                                    {systemInfo.batteryLevel}%
                                </span>
                            </div>
                        )}
                    </motion.div>

                    <Clock showCalendar={showCalendar} onClick={() => setShowCalendar(!showCalendar)} />
                </div>
            </div>

            {/* ── Start menu (portal) ── */}
            {createPortal(
                <AnimatePresence>
                    {(showStartMenu || showCompanion) && (
                        <>
                            {/* Backdrop: cierra Start y/o Companion al hacer click fuera */}
                            <div
                                style={{ position: 'fixed', inset: 0, zIndex: 48 }}
                                onClick={() => { setShowStartMenu(false); setShowCompanion(false); }}
                            />

                            {/* Start + Companion wrapper */}
                            <div style={{
                                position: 'fixed', bottom: 48, left: 6, zIndex: 49,
                                display: 'flex', gap: 12, alignItems: 'flex-start',
                            }}>
                                {/* ── Start menu panel ── */}
                                {showStartMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 20, scale: 0.97 }}
                                        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                                        style={{
                                            width: 520, height: 620,
                                            background: 'rgba(36,36,36,0.92)',
                                            backdropFilter: 'blur(32px)',
                                            WebkitBackdropFilter: 'blur(32px)',
                                            borderRadius: tokens.borderRadiusXLarge,
                                            border: `1px solid ${tokens.colorNeutralStroke1}`,
                                            boxShadow: '0 24px 56px rgba(0,0,0,0.55)',
                                            display: 'flex', flexDirection: 'column',
                                            overflow: 'hidden',
                                        }}>

                                        {/* Search bar */}
                                        <div style={{ padding: '20px 20px 12px' }}>
                                            <div style={{ position: 'relative' }}>
                                                <Search style={{
                                                    position: 'absolute', left: 10, top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    width: 16, height: 16, color: tokens.colorNeutralForeground4,
                                                    pointerEvents: 'none',
                                                }} />
                                                <input
                                                    type="text"
                                                    value={startQuery}
                                                    onChange={e => setStartQuery(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'ArrowDown') { e.preventDefault(); setStartSelected(p => Math.min(p + 1, startResults.length - 1)); }
                                                        else if (e.key === 'ArrowUp') { e.preventDefault(); setStartSelected(p => Math.max(p - 1, 0)); }
                                                        else if (e.key === 'Enter') { e.preventDefault(); startResults[startSelected]?.action(); }
                                                        else if (e.key === 'Escape') setStartQuery('');
                                                    }}
                                                    placeholder="Buscar aplicaciones, documentos y pacientes"
                                                    autoFocus
                                                    style={{
                                                        width: '100%', height: 36, boxSizing: 'border-box',
                                                        paddingLeft: 32, paddingRight: startQuery ? 32 : 12,
                                                        background: 'rgba(0,0,0,0.25)',
                                                        border: `1px solid ${tokens.colorNeutralStroke1}`,
                                                        borderRadius: tokens.borderRadiusMedium,
                                                        fontSize: 12, color: tokens.colorNeutralForeground1,
                                                        outline: 'none', fontFamily: 'inherit',
                                                        transition: `border-color ${tokens.durationNormal}`,
                                                    }}
                                                    onFocus={e => (e.target.style.borderColor = tokens.colorBrandForeground)}
                                                    onBlur={e => (e.target.style.borderColor = tokens.colorNeutralStroke1)}
                                                />
                                                {startQuery && (
                                                    <button
                                                        onClick={() => setStartQuery('')}
                                                        style={{
                                                            position: 'absolute', right: 8, top: '50%',
                                                            transform: 'translateY(-50%)',
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            padding: 2, color: tokens.colorNeutralForeground3, borderRadius: 4,
                                                        }}
                                                    >
                                                        <X style={{ width: 13, height: 13 }} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                                            {startQuery.trim().length > 0 ? (
                                                // ── Search results ──
                                                <div>
                                                    <div style={{
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'space-between', marginBottom: 10,
                                                    }}>
                                                        <span style={{ fontSize: 11, color: tokens.colorNeutralForeground4 }}>
                                                            {isStartLoading ? 'Buscando...' : `${startResults.length} resultado${startResults.length !== 1 ? 's' : ''}`}
                                                        </span>
                                                        <button
                                                            onClick={() => { setStartQuery(''); setStartResults([]); }}
                                                            style={{ fontSize: 11, color: tokens.colorNeutralForeground4, background: 'none', border: 'none', cursor: 'pointer' }}
                                                        >
                                                            Borrar
                                                        </button>
                                                    </div>

                                                    {!isStartLoading && startResults.length === 0 && (
                                                        <div style={{
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                            justifyContent: 'center', height: 120, textAlign: 'center',
                                                            color: tokens.colorNeutralForeground4,
                                                        }}>
                                                            <FileText style={{ width: 32, height: 32, marginBottom: 8, opacity: 0.4 }} />
                                                            <p style={{ fontSize: 13, margin: '0 0 4px' }}>Sin resultados</p>
                                                            <p style={{ fontSize: 11, margin: 0 }}>Prueba con otro término</p>
                                                        </div>
                                                    )}

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                        {startResults.map((r, idx) => (
                                                            <button
                                                                key={r.id}
                                                                onClick={() => { r.action(); setShowStartMenu(false); }}
                                                                onMouseEnter={() => setStartSelected(idx)}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: 12,
                                                                    padding: '8px 10px', textAlign: 'left',
                                                                    border: 'none', cursor: 'pointer',
                                                                    borderRadius: tokens.borderRadiusLarge,
                                                                    background: idx === startSelected ? 'rgba(255,255,255,0.09)' : 'transparent',
                                                                    transition: `background ${tokens.durationNormal}`,
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: 36, height: 36, flexShrink: 0,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    borderRadius: tokens.borderRadiusMedium,
                                                                    background: idx === startSelected ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.05)',
                                                                }}>
                                                                    {r.icon}
                                                                </div>
                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                    <p style={{
                                                                        fontSize: 12, fontWeight: 500,
                                                                        color: tokens.colorNeutralForeground1,
                                                                        margin: 0, overflow: 'hidden',
                                                                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                    }}>
                                                                        {r.title}
                                                                    </p>
                                                                    {r.subtitle && (
                                                                        <p style={{
                                                                            fontSize: 11, color: tokens.colorNeutralForeground4,
                                                                            margin: 0, overflow: 'hidden',
                                                                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                        }}>
                                                                            {r.subtitle}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <span style={{
                                                                    fontSize: 9, fontWeight: 700, padding: '1px 6px',
                                                                    borderRadius: 10, textTransform: 'uppercase',
                                                                    letterSpacing: '0.06em',
                                                                    background: 'rgba(255,255,255,0.06)',
                                                                    color: TYPE_COLORS[r.type] ?? tokens.colorNeutralForeground4,
                                                                }}>
                                                                    {r.type === 'app' ? 'App' : r.type === 'manual' ? 'Manual' : r.type === 'patient' ? 'Paciente' : 'Acción'}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                // ── Default app grid ──
                                                <>
                                                    <div style={{
                                                        display: 'flex', justifyContent: 'space-between',
                                                        alignItems: 'center', marginBottom: 16,
                                                    }}>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                                                            Anclado
                                                        </span>
                                                        <button style={{
                                                            display: 'flex', alignItems: 'center', gap: 4,
                                                            fontSize: 11, color: tokens.colorNeutralForeground3,
                                                            background: 'rgba(255,255,255,0.05)',
                                                            border: `1px solid ${tokens.colorNeutralStroke2}`,
                                                            borderRadius: tokens.borderRadiusMedium,
                                                            padding: '3px 8px', cursor: 'pointer',
                                                        }}>
                                                            Todas las aplicaciones
                                                            <ChevronRight style={{ width: 11, height: 11 }} />
                                                        </button>
                                                    </div>

                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(6, 1fr)',
                                                        gap: '20px 8px', marginBottom: 28,
                                                    }}>
                                                        {Array.from(apps.values())
                                                            .filter(app => app.showOnDesktop !== false)
                                                            .map(app => (
                                                                <motion.button
                                                                    key={app.id}
                                                                    whileHover={{ scale: 1.08 }}
                                                                    whileTap={{ scale: 0.92 }}
                                                                    onClick={() => { openWindow(app.id); setShowStartMenu(false); }}
                                                                    style={{
                                                                        display: 'flex', flexDirection: 'column',
                                                                        alignItems: 'center', gap: 6,
                                                                        background: 'none', border: 'none',
                                                                        cursor: 'pointer', padding: 4,
                                                                        borderRadius: tokens.borderRadiusLarge,
                                                                    }}
                                                                >
                                                                    <div style={{
                                                                        width: 40, height: 40,
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    }}>
                                                                        <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={30} />
                                                                    </div>
                                                                    <span style={{
                                                                        fontSize: 10, color: tokens.colorNeutralForeground2,
                                                                        textAlign: 'center', lineHeight: 1.3,
                                                                        overflow: 'hidden',
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: 2,
                                                                        WebkitBoxOrient: 'vertical' as const,
                                                                        width: 60,
                                                                    }}>
                                                                        {app.name}
                                                                    </span>
                                                                </motion.button>
                                                            ))}
                                                    </div>

                                                    {/* Recommended */}
                                                    <div>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: tokens.colorNeutralForeground2 }}>
                                                            Recomendado
                                                        </span>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 10 }}>
                                                            {[
                                                                { icon: '📄', name: 'Manual_Galeno.pdf', sub: 'Reciente' },
                                                                { icon: '📊', name: 'Estadísticas_V1', sub: 'Ayer, 14:00' },
                                                            ].map(item => (
                                                                <button
                                                                    key={item.name}
                                                                    onClick={notImplemented}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                                        padding: '8px 10px', textAlign: 'left',
                                                                        background: 'transparent', border: 'none',
                                                                        cursor: 'pointer',
                                                                        borderRadius: tokens.borderRadiusMedium,
                                                                        transition: `background ${tokens.durationNormal}`,
                                                                    }}
                                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}
                                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                                                >
                                                                    <div style={{
                                                                        width: 32, height: 32, flexShrink: 0,
                                                                        background: 'rgba(255,255,255,0.06)',
                                                                        borderRadius: tokens.borderRadiusMedium,
                                                                        display: 'flex', alignItems: 'center',
                                                                        justifyContent: 'center', fontSize: 16,
                                                                    }}>
                                                                        {item.icon}
                                                                    </div>
                                                                    <div>
                                                                        <p style={{ fontSize: 11, color: tokens.colorNeutralForeground2, margin: 0 }}>{item.name}</p>
                                                                        <p style={{ fontSize: 10, color: tokens.colorNeutralForeground4, margin: 0 }}>{item.sub}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div style={{
                                            height: 60, flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '0 20px',
                                            background: 'rgba(0,0,0,0.20)',
                                            borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
                                            position: 'relative',
                                        }}>
                                            {/* User button */}
                                            <div>
                                                <motion.button
                                                    whileHover={{ background: 'rgba(255,255,255,0.07)' }}
                                                    onClick={() => setShowUserMenu(v => !v)}
                                                    className="user-menu-button"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 10,
                                                        padding: '5px 8px',
                                                        borderRadius: tokens.borderRadiusLarge,
                                                        border: 'none', cursor: 'pointer', background: 'transparent',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 30, height: 30, borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #0078d4, #00b4ef)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        border: '1px solid rgba(255,255,255,0.15)',
                                                        flexShrink: 0,
                                                    }}>
                                                        <User style={{ width: 14, height: 14, color: '#fff' }} />
                                                    </div>
                                                    <span style={{ fontSize: 12, fontWeight: 500, color: tokens.colorNeutralForeground2 }}>
                                                        {currentUser?.name || 'Usuario'}
                                                    </span>
                                                    <ChevronDown style={{
                                                        width: 12, height: 12, color: tokens.colorNeutralForeground3,
                                                        transition: `transform ${tokens.durationNormal}`,
                                                        transform: showUserMenu ? 'rotate(180deg)' : 'none',
                                                    }} />
                                                </motion.button>

                                                {/* User dropdown */}
                                                <AnimatePresence>
                                                    {showUserMenu && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: 6, scale: 0.96 }}
                                                            transition={{ duration: 0.14 }}
                                                            className="user-menu-dropdown"
                                                            style={{
                                                                position: 'absolute', bottom: '100%', left: 16, marginBottom: 6,
                                                                width: 180,
                                                                background: 'rgba(36,36,36,0.96)',
                                                                backdropFilter: 'blur(20px)',
                                                                WebkitBackdropFilter: 'blur(20px)',
                                                                border: `1px solid ${tokens.colorNeutralStroke1}`,
                                                                borderRadius: tokens.borderRadiusLarge,
                                                                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                                                zIndex: 50, overflow: 'hidden', padding: 4,
                                                            }}
                                                        >
                                                            {[
                                                                { icon: <Lock style={{ width: 14, height: 14 }} />, label: 'Bloquear pantalla', action: () => { lockScreen(); setShowUserMenu(false); } },
                                                                { icon: <Power style={{ width: 14, height: 14 }} />, label: 'Cerrar sesión', action: () => { logout(client); setShowUserMenu(false); } },
                                                            ].map(item => (
                                                                <button
                                                                    key={item.label}
                                                                    onClick={item.action}
                                                                    style={{
                                                                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                                                        padding: '7px 10px', fontSize: 12,
                                                                        color: tokens.colorNeutralForeground2,
                                                                        background: 'transparent', border: 'none',
                                                                        cursor: 'pointer',
                                                                        borderRadius: tokens.borderRadiusMedium,
                                                                        textAlign: 'left',
                                                                        transition: `background ${tokens.durationNormal}`,
                                                                    }}
                                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'}
                                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                                                >
                                                                    {item.icon}
                                                                    {item.label}
                                                                </button>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            <TBButton onClick={() => setShowPowerMenu(true)} title="Energía">
                                                <Power style={{ width: 16, height: 16 }} />
                                            </TBButton>
                                        </div>
                                    </motion.div>
                                )}

                            </div>
                        </>
                    )}

                    {/* Companion panel — anchored a la tray (derecha) */}
                    <GalenoCompanionPanel visible={showCompanion} placement="tray" right={12} />
                </AnimatePresence>,
                document.body
            )}

            {/* Context menu */}
            {taskbarContextMenu && (
                <TaskbarContextMenu
                    x={taskbarContextMenu.x}
                    y={taskbarContextMenu.y}
                    onClose={() => setTaskbarContextMenu(null)}
                />
            )}
        </>
    );
}