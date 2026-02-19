import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    Search,
    User,
    Calendar,
    FileText,
    Settings,
    Shield,
    X,
    Clock,
    TrendingUp,
    ChevronRight
} from 'lucide-react';
import { useWindowManager } from '../../contexts/WindowManagerContext';
import { useSession } from '../../hooks/useSession';
import { usePatients } from '../../hooks/usePatients';
import { AppIcon } from './AppIcon';

/* ─────────────────────────────────────────────
   Fluent UI v9 Design Tokens (dark theme)
   https://react.fluentui.dev/?path=/docs/theme-colors--page
───────────────────────────────────────────── */
const tokens = {
    // Surfaces
    colorNeutralBackground1: '#292929',   // card / panel
    colorNeutralBackground1Hover: '#333333',
    colorNeutralBackground1Selected: '#383838',
    colorNeutralBackground3: '#1f1f1f',   // backdrop deeper layer
    colorNeutralBackgroundInverted: '#ffffff',

    // Stroke
    colorNeutralStroke2: '#404040',
    colorNeutralStrokeAccessible: '#616161',

    // Text
    colorNeutralForeground1: '#ffffff',
    colorNeutralForeground2: '#d6d6d6',
    colorNeutralForeground3: '#adadad',
    colorNeutralForeground4: '#707070',

    // Brand
    colorBrandBackground: '#0078D4',
    colorBrandBackgroundHover: '#106EBE',
    colorBrandForeground1: '#479ef5',   // brand text on dark

    // Shadow
    shadow16: '0 8px 16px rgba(0,0,0,0.24)',
    shadow28: '0 14px 28px rgba(0,0,0,0.32)',

    // Radius
    borderRadiusMedium: '4px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',

    // Typography
    fontFamilyBase: '"Segoe UI Variable", "Segoe UI", system-ui, sans-serif',
    fontSizeBase200: '11px',
    fontSizeBase300: '12px',
    fontSizeBase400: '14px',
    fontSizeBase500: '16px',
    fontWeightRegular: 400,
    fontWeightSemibold: 600,
};

/* ─── Type badges ─── */
const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
    app: { label: 'Aplicación', color: '#479ef5', bg: 'rgba(71,158,245,0.12)' },
    patient: { label: 'Paciente', color: '#c47ef5', bg: 'rgba(196,126,245,0.12)' },
    manual: { label: 'Manual', color: '#f5a623', bg: 'rgba(245,166,35,0.12)' },
    action: { label: 'Acción rápida', color: '#54b96f', bg: 'rgba(84,185,111,0.12)' },
    recent: { label: 'Reciente', color: '#adadad', bg: 'rgba(255,255,255,0.08)' },
};

/* ─── Interfaces ─── */
interface Patient {
    id: number;
    first_name: string;
    last_name: string;
    document_number: string | null;
    phone: string | null;
    email?: string | null;
}

interface SearchResult {
    id: string;
    type: 'app' | 'patient' | 'recent' | 'action' | 'manual';
    title: string;
    subtitle?: string;
    icon: JSX.Element;
    action: () => void;
}

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
export function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { apps, openWindow } = useWindowManager();
    const manualIndexRef = useRef<any | null>(null);
    const { currentUser } = useSession();
    const isAdmin = currentUser?.role === 'admin';
    const { searchPatients } = usePatients();

    /* Auto-focus */
    useEffect(() => {
        if (isOpen && inputRef.current) inputRef.current.focus();
    }, [isOpen]);

    /* Search */
    useEffect(() => {
        if (!isOpen) return;

        const searchAll = async () => {
            if (query.trim().length === 0) {
                setResults([
                    {
                        id: 'recent-1',
                        type: 'recent',
                        title: 'Pacientes visitados recientemente',
                        icon: <Clock size={16} />,
                        action: () => { openWindow('patients'); onClose(); }
                    },
                    {
                        id: 'recent-2',
                        type: 'recent',
                        title: 'Estadísticas del día',
                        icon: <TrendingUp size={16} />,
                        action: () => { openWindow('dashboard'); onClose(); }
                    }
                ]);
                return;
            }

            setIsLoading(true);
            const allResults: SearchResult[] = [];
            const searchTerm = query.toLowerCase();

            // Apps
            Array.from(apps.values()).forEach(app => {
                if (app.name.toLowerCase().includes(searchTerm) ||
                    app.description?.toLowerCase().includes(searchTerm)) {
                    allResults.push({
                        id: `app-${app.id}`,
                        type: 'app',
                        title: app.name,
                        subtitle: app.description || 'Aplicación',
                        icon: <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={18} />,
                        action: () => { openWindow(app.id); onClose(); }
                    });
                }
            });

            // Manual
            try {
                if (!manualIndexRef.current) {
                    const res = await fetch('/manual/index.json');
                    if (res.ok) manualIndexRef.current = await res.json();
                }
                const manualIndex = manualIndexRef.current;
                if (manualIndex?.categories) {
                    manualIndex.categories.forEach((cat: any) => {
                        cat.items.forEach((item: any) => {
                            const title = (item.title || '').toLowerCase();
                            const catTitle = (cat.title || '').toLowerCase();
                            const keywords: string[] = (item.keywords || []).map((k: string) => k.toLowerCase());
                            const matches = title.includes(searchTerm) || catTitle.includes(searchTerm) ||
                                keywords.some(k => k.includes(searchTerm) || searchTerm.includes(k));
                            if (matches) {
                                allResults.push({
                                    id: `manual-${cat.id}-${item.id}`,
                                    type: 'manual',
                                    title: item.title,
                                    subtitle: cat.title,
                                    icon: <FileText size={16} />,
                                    action: () => {
                                        openWindow('manual-galeno', { path: `${cat.id}/${item.id}` });
                                        onClose();
                                    }
                                });
                            }
                        });
                    });
                }
            } catch (err) {
                console.error('Error loading manual index for search', err);
            }

            // Patients
            try {
                const patients = await searchPatients(searchTerm);
                patients.forEach(patient => {
                    allResults.push({
                        id: `patient-${patient.id}`,
                        type: 'patient',
                        title: `${patient.first_name} ${patient.last_name}`,
                        subtitle: `DNI: ${patient.document_number || 'Sin DNI'} · Tel: ${patient.phone || 'Sin teléfono'}`,
                        icon: <User size={16} />,
                        action: () => { openWindow('patient-record', { patientId: patient.id }); onClose(); }
                    });
                });
            } catch (error) {
                console.error('Error buscando pacientes:', error);
            }

            // Quick actions
            const quickActions = [
                {
                    keywords: ['nuevo', 'agregar', 'crear', 'paciente'],
                    result: {
                        id: 'action-new-patient', type: 'action' as const,
                        title: 'Nuevo Paciente', subtitle: 'Agregar un nuevo paciente al sistema',
                        icon: <User size={16} />,
                        action: () => { openWindow('patients'); onClose(); }
                    }
                },
                {
                    keywords: ['configuración', 'ajustes', 'settings', 'config'],
                    result: {
                        id: 'action-settings', type: 'action' as const,
                        title: 'Configuración', subtitle: 'Abrir configuración del sistema',
                        icon: <Settings size={16} />,
                        action: () => { openWindow('settings'); onClose(); }
                    }
                },
                {
                    keywords: ['agenda', 'cita', 'turnos', 'calendario'],
                    result: {
                        id: 'action-calendar', type: 'action' as const,
                        title: 'Agenda', subtitle: 'Ver agenda y turnos',
                        icon: <Calendar size={16} />,
                        action: () => { openWindow('calendar'); onClose(); }
                    }
                }
            ];

            if (isAdmin) {
                quickActions.push({
                    keywords: ['sistema', 'mantenimiento', 'administración'],
                    result: {
                        id: 'action-system-tools', type: 'action' as const,
                        title: 'Mantenimiento del sistema', subtitle: 'Abrir herramientas críticas del sistema',
                        icon: <Shield size={16} />,
                        action: () => { openWindow('system-tools'); onClose(); }
                    }
                });
            }

            quickActions.forEach(({ keywords, result }) => {
                if (keywords.some(kw => searchTerm.includes(kw))) allResults.push(result);
            });

            setResults(allResults);
            setSelectedIndex(0);
            setIsLoading(false);
        };

        const debounce = setTimeout(searchAll, 200);
        return () => clearTimeout(debounce);
    }, [query, isOpen, apps, openWindow, onClose]);

    /* Keyboard navigation */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;
            switch (e.key) {
                case 'Escape': onClose(); break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, 0));
                    break;
                case 'Enter':
                    e.preventDefault();
                    results[selectedIndex]?.action();
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex, onClose]);

    /* Reset on close */
    useEffect(() => {
        if (!isOpen) { setQuery(''); setResults([]); setSelectedIndex(0); }
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* ── Scrim ── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            zIndex: 60,
                        }}
                    />

                    {/* ── Panel (centrado) ── */}
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 61,
                            pointerEvents: 'none',
                            padding: '20px',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.18, ease: [0.0, 0.0, 0.2, 1] }}
                            style={{
                                position: 'relative',
                                width: 640,
                                maxHeight: 540,
                                background: tokens.colorNeutralBackground1,
                                borderRadius: tokens.borderRadiusXLarge,
                                border: `1px solid ${tokens.colorNeutralStroke2}`,
                                boxShadow: tokens.shadow28,
                                pointerEvents: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                fontFamily: tokens.fontFamilyBase,
                            }}
                        >
                            {/* ── Search bar ── */}
                            <div style={{
                                padding: '12px 16px',
                                borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                            }}>
                                <Search
                                    size={18}
                                    style={{
                                        flexShrink: 0,
                                        color: query.length
                                            ? tokens.colorBrandForeground1
                                            : tokens.colorNeutralForeground3,
                                        transition: 'color 0.1s',
                                    }}
                                />
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Buscar aplicaciones, pacientes, documentos..."
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: tokens.colorNeutralForeground1,
                                        fontSize: tokens.fontSizeBase400,
                                        fontFamily: tokens.fontFamilyBase,
                                        fontWeight: tokens.fontWeightRegular,
                                        lineHeight: '36px',
                                    }}
                                // Placeholder via CSS-in-JS workaround: use a style tag
                                />
                                <AnimatePresence>
                                    {query && (
                                        <motion.button
                                            initial={{ opacity: 0, scale: 0.7 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.7 }}
                                            transition={{ duration: 0.1 }}
                                            onClick={() => setQuery('')}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: 4,
                                                borderRadius: tokens.borderRadiusMedium,
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: tokens.colorNeutralForeground3,
                                            }}
                                            onMouseOver={e => (e.currentTarget.style.background = tokens.colorNeutralBackground1Hover)}
                                            onMouseOut={e => (e.currentTarget.style.background = 'none')}
                                        >
                                            <X size={14} />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                                {isLoading && (
                                    <span style={{
                                        fontSize: tokens.fontSizeBase200,
                                        color: tokens.colorNeutralForeground4,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        Buscando…
                                    </span>
                                )}
                            </div>

                            {/* ── Count bar ── */}
                            {query.length > 0 && !isLoading && (
                                <div style={{
                                    padding: '5px 20px',
                                    fontSize: tokens.fontSizeBase200,
                                    color: tokens.colorNeutralForeground4,
                                    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
                                    background: tokens.colorNeutralBackground3,
                                }}>
                                    {results.length} resultado{results.length !== 1 ? 's' : ''}
                                </div>
                            )}

                            {/* ── Results ── */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>

                                {/* Section label when empty query */}
                                {query.length === 0 && (
                                    <div style={{
                                        padding: '4px 20px 6px',
                                        fontSize: tokens.fontSizeBase200,
                                        fontWeight: tokens.fontWeightSemibold,
                                        color: tokens.colorNeutralForeground4,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.06em',
                                    }}>
                                        Sugerencias
                                    </div>
                                )}

                                {/* Empty state */}
                                {results.length === 0 && query.length > 0 && !isLoading && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: 120,
                                        color: tokens.colorNeutralForeground4,
                                        gap: 6,
                                    }}>
                                        <FileText size={28} style={{ opacity: 0.4 }} />
                                        <span style={{ fontSize: tokens.fontSizeBase300 }}>
                                            No se encontraron resultados
                                        </span>
                                        <span style={{ fontSize: tokens.fontSizeBase200, opacity: 0.6 }}>
                                            Intenta con otros términos
                                        </span>
                                    </div>
                                )}

                                {/* Result items */}
                                {results.map((result, index) => {
                                    const meta = TYPE_META[result.type] ?? TYPE_META.recent;
                                    const isSelected = index === selectedIndex;
                                    return (
                                        <motion.button
                                            key={result.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: Math.min(index * 0.025, 0.15) }}
                                            onClick={result.action}
                                            onMouseEnter={() => setSelectedIndex(index)}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                padding: '7px 20px',
                                                background: isSelected
                                                    ? tokens.colorNeutralBackground1Selected
                                                    : 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'background 0.08s',
                                                outline: isSelected
                                                    ? `1px solid ${tokens.colorBrandBackground}`
                                                    : 'none',
                                                outlineOffset: '-1px',
                                            }}
                                        >
                                            {/* Icon container */}
                                            <div style={{
                                                width: 32,
                                                height: 32,
                                                borderRadius: tokens.borderRadiusMedium,
                                                background: meta.bg,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: meta.color,
                                                flexShrink: 0,
                                            }}>
                                                {result.icon}
                                            </div>

                                            {/* Text */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 8,
                                                }}>
                                                    <span style={{
                                                        fontSize: tokens.fontSizeBase400,
                                                        fontWeight: tokens.fontWeightSemibold,
                                                        color: tokens.colorNeutralForeground1,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {result.title}
                                                    </span>

                                                    {/* Type badge */}
                                                    <span style={{
                                                        fontSize: 10,
                                                        fontWeight: tokens.fontWeightSemibold,
                                                        color: meta.color,
                                                        background: meta.bg,
                                                        padding: '1px 7px',
                                                        borderRadius: tokens.borderRadiusMedium,
                                                        flexShrink: 0,
                                                        letterSpacing: '0.02em',
                                                    }}>
                                                        {meta.label}
                                                    </span>
                                                </div>

                                                {result.subtitle && (
                                                    <span style={{
                                                        fontSize: tokens.fontSizeBase300,
                                                        color: tokens.colorNeutralForeground3,
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        display: 'block',
                                                        marginTop: 1,
                                                    }}>
                                                        {result.subtitle}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Chevron */}
                                            <ChevronRight
                                                size={14}
                                                style={{
                                                    flexShrink: 0,
                                                    color: tokens.colorNeutralForeground3,
                                                    opacity: isSelected ? 1 : 0,
                                                    transition: 'opacity 0.1s',
                                                }}
                                            />
                                        </motion.button>
                                    );
                                })}
                            </div>

                            {/* ── Footer shortcuts ── */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 24,
                                padding: '7px 20px',
                                borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
                                background: tokens.colorNeutralBackground3,
                            }}>
                                {[
                                    { key: '↑↓', label: 'Navegar' },
                                    { key: '↵', label: 'Abrir' },
                                    { key: 'Esc', label: 'Cerrar' },
                                ].map(({ key, label }) => (
                                    <div key={key} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: tokens.fontSizeBase200,
                                        color: tokens.colorNeutralForeground4,
                                    }}>
                                        <kbd style={{
                                            fontFamily: tokens.fontFamilyBase,
                                            fontSize: 10,
                                            padding: '1px 6px',
                                            background: tokens.colorNeutralBackground1,
                                            border: `1px solid ${tokens.colorNeutralStrokeAccessible}`,
                                            borderRadius: tokens.borderRadiusMedium,
                                            color: tokens.colorNeutralForeground2,
                                            lineHeight: '18px',
                                        }}>
                                            {key}
                                        </kbd>
                                        <span>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
}