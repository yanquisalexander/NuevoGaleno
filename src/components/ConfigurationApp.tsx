import { useCallback, useMemo, useState, useRef } from 'react';
import {
    Monitor, HardDrive, User, Shield, Sliders,
    Search, ChevronRight,
    Wifi, Bluetooth, LayoutGrid, Battery,
    Volume2, Bell, MousePointer2,
    Globe, Accessibility, RefreshCcw,
    Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useConfig } from '@/hooks/useConfig';
import { useSession } from '@/hooks/useSession';
import { useWallpaperContext } from '@/contexts/WallpaperContext';
import { ConfigDefinition } from '@/types/config';
import { TemplateManager } from '@/components/templates';
import { GalenoUpdateApp } from '@/apps/GalenoUpdate';

// ─── Types ──────────────────────────────────────────────────────────────────

type ConfigEntry = {
    key: string;
    definition: ConfigDefinition;
    value: unknown;
};

type SectionConfig = {
    section: string;
    id: string;
    fields: ConfigEntry[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── i18n Labels ─────────────────────────────────────────────────────────────

/** Traducciones de claves del schema → etiqueta visible. Ampliar según nuevas keys. */
const FIELD_LABELS: Record<string, string> = {
    showAccountSelector: 'Mostrar selector de cuentas',
    layoutStyle: 'Estilo de interfaz',
    enforceSystemPasswordForImports: 'Contraseña para importaciones masivas',
    wallpaperProvider: 'Proveedor de fondo de pantalla',
    soundTheme: 'Tema de sonidos',
    playBootSound: 'Sonido de arranque',
};

/** Traducciones de ui_section del schema → nombre visible en sidebar. */
const SECTION_LABELS: Record<string, string> = {
    system: 'Sistema',
    general: 'General',
    customization: 'Personalización',
    security: 'Seguridad',
    network: 'Red',
    accounts: 'Cuentas',
    accessibility: 'Accesibilidad',
    updates: 'Actualizaciones',
};

const SECTION_ICONS: Record<string, React.ElementType> = {
    // Español
    sistema: Monitor,
    general: Monitor,
    red: Wifi,
    internet: Wifi,
    bluetooth: Bluetooth,
    dispositivos: Bluetooth,
    'personalización': LayoutGrid,
    apariencia: LayoutGrid,
    aplicaciones: LayoutGrid,
    cuentas: User,
    usuario: User,
    hora: Globe,
    idioma: Globe,
    accesibilidad: Accessibility,
    seguridad: Shield,
    privacidad: Shield,
    update: RefreshCcw,
    actualizaciones: RefreshCcw,
    // English (schema values)
    system: Monitor,
    customization: LayoutGrid,
    network: Wifi,
    accounts: User,
    accessibility: Accessibility,
    security: Shield,
    updates: RefreshCcw,
};

const FIELD_ICONS: Record<string, React.ElementType> = {
    wallpaper: ImageIcon,
    fondo: ImageIcon,
    pantalla: Monitor,
    brillo: Monitor,
    sonido: Volume2,
    volumen: Volume2,
    notific: Bell,
    batería: Battery,
    energía: Battery,
    almacenamiento: HardDrive,
    mouse: MousePointer2,
    cursor: MousePointer2,
};

const getSectionIcon = (name: string): React.ElementType => {
    const lower = name.toLowerCase();
    for (const [key, icon] of Object.entries(SECTION_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return Sliders;
};

const getFieldIcon = (key: string): React.ElementType => {
    const lower = key.toLowerCase();
    for (const [k, icon] of Object.entries(FIELD_ICONS)) {
        if (lower.includes(k)) return icon;
    }
    return Sliders;
};

const formatLabel = (value: string) =>
    FIELD_LABELS[value] ??
    value.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase()).trim();

// ─── Sub-components ───────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) => (
    <button
        onClick={onChange}
        disabled={disabled}
        style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            width: '44px',
            height: '26px',
            borderRadius: '13px',
            background: checked ? '#2997FF' : 'rgba(120,120,128,0.36)',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'background 0.25s cubic-bezier(0.4,0,0.2,1)',
            opacity: disabled ? 0.5 : 1,
            outline: 'none',
            flexShrink: 0,
            boxShadow: checked ? '0 0 0 0 rgba(41,151,255,0)' : 'none',
        }}
    >
        <span style={{
            position: 'absolute',
            left: checked ? '20px' : '2px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            transition: 'left 0.22s cubic-bezier(0.34,1.56,0.64,1)',
        }} />
    </button>
);

const SidebarItem = ({
    section,
    isActive,
    onClick,
    style,
}: {
    section: SectionConfig | { id: string; section: string };
    isActive: boolean;
    onClick: () => void;
    style?: React.CSSProperties;
}) => {
    const Icon = getSectionIcon(section.section);
    return (
        <button
            onClick={onClick}
            style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                fontFamily: "-apple-system, 'SF Pro Text', sans-serif",
                textAlign: 'left',
                transition: 'background 0.15s ease, color 0.15s ease',
                backdropFilter: isActive ? 'blur(8px)' : 'none',
                boxShadow: isActive ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                ...style,
            }}
            onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
        >
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '7px',
                background: isActive
                    ? 'linear-gradient(145deg,#3a7bd5,#2563eb)'
                    : 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background 0.15s ease',
            }}>
                <Icon size={14} color={isActive ? '#fff' : 'rgba(255,255,255,0.6)'} />
            </div>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {section.section}
            </span>
        </button>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConfigurationApp({ data }: { data?: { section?: string }; windowId?: string } = {}) {
    const { schema, values, isLoading, setConfigValue } = useConfig();
    const { currentUser, updatePreferences, getUserPreferences } = useSession();
    const { openWindow } = useWindowManager();
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const [activeSectionId, setActiveSectionId] = useState<string>(data?.section ?? 'system');
    const [searchQuery, setSearchQuery] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    const { wallpapers, isLoading: wallpapersLoading, currentWallpaper } = useWallpaperContext();
    const isAdmin = currentUser?.role === 'admin';

    // ── Derived data ──────────────────────────────────────────────────────────

    const sections = useMemo<SectionConfig[]>(() => {
        if (!schema) return [];
        const map = new Map<string, ConfigEntry[]>();
        const userPrefs = getUserPreferences();

        Object.entries(schema).forEach(([key, definition]) => {
            if (definition.admin_only && !isAdmin) return;
            const sectionName = definition.ui_section?.trim() ?? 'Sistema';
            const prefKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            const value = definition.user_preference
                ? (userPrefs[prefKey] ?? definition.default)
                : values[key];
            const group = map.get(sectionName) ?? [];
            group.push({ key, definition, value });
            map.set(sectionName, group);
        });

        return Array.from(map.entries())
            .map(([section, fields]) => ({
                section: SECTION_LABELS[section.toLowerCase()] ?? section,
                id: section.toLowerCase().replace(/\s+/g, '-'),
                fields,
            }))
            .sort((a) => (a.id === 'sistema' || a.id === 'system' ? -1 : 0));
    }, [schema, values, isAdmin, getUserPreferences]);

    const filteredSections = useMemo(() => {
        if (!searchQuery.trim()) return sections;
        const q = searchQuery.toLowerCase();
        return sections.filter(s =>
            s.section.toLowerCase().includes(q) ||
            s.fields.some(f =>
                f.key.toLowerCase().includes(q) ||
                formatLabel(f.key).toLowerCase().includes(q)
            )
        );
    }, [sections, searchQuery]);

    const currentSection = useMemo(
        () => sections.find(s => s.id === activeSectionId),
        [sections, activeSectionId]
    );

    const isPersonalization = activeSectionId.includes('personalización') || activeSectionId.includes('apariencia') || activeSectionId === 'customization';
    const showUpdates = activeSectionId === 'actualizaciones';

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSave = useCallback(async (key: string, nextValue: unknown) => {
        setSavingKey(key);
        try {
            const definition = schema?.[key];
            if (definition?.user_preference) {
                const prefKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                await updatePreferences({ [prefKey]: nextValue });
            } else {
                await setConfigValue(key, nextValue);
            }
            toast.success('Guardado');
        } catch {
            toast.error('Error al guardar');
        } finally {
            setSavingKey(null);
        }
    }, [schema, setConfigValue, updatePreferences]);

    const handleSectionChange = useCallback((id: string) => {
        setShowTemplates(false);
        setActiveSectionId(id);
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // ── Controls ──────────────────────────────────────────────────────────────

    const renderControl = useCallback((entry: ConfigEntry) => {
        const effectiveValue = entry.value ?? entry.definition.default;
        const isSaving = savingKey === entry.key;

        if (entry.definition.type === 'boolean') {
            return (
                <Toggle
                    checked={Boolean(effectiveValue)}
                    onChange={() => handleSave(entry.key, !effectiveValue)}
                    disabled={isSaving}
                />
            );
        }

        if (entry.definition.type === 'enum') {
            return (
                <div style={{ position: 'relative', width: '180px' }}>
                    <select
                        value={String(effectiveValue ?? '')}
                        onChange={e => handleSave(entry.key, e.target.value)}
                        disabled={isSaving}
                        style={{
                            appearance: 'none',
                            width: '100%',
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            fontFamily: "-apple-system, 'SF Pro Text', sans-serif",
                            padding: '5px 28px 5px 10px',
                            outline: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        {(entry.definition.choices ?? []).map(o => (
                            <option key={String(o)} value={String(o)}>{String(o)}</option>
                        ))}
                    </select>
                    <ChevronRight size={12} style={{
                        position: 'absolute', right: '8px', top: '50%',
                        transform: 'translateY(-50%) rotate(90deg)',
                        color: 'rgba(255,255,255,0.4)', pointerEvents: 'none',
                    }} />
                </div>
            );
        }

        return (
            <input
                type={entry.definition.type === 'integer' || entry.definition.type === 'float' ? 'number' : 'text'}
                defaultValue={String(effectiveValue ?? '')}
                onBlur={e => {
                    const v = e.target.value;
                    if (entry.definition.type === 'integer' || entry.definition.type === 'float') {
                        const n = Number(v);
                        if (!isNaN(n)) handleSave(entry.key, n);
                    } else {
                        handleSave(entry.key, v);
                    }
                }}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
                disabled={isSaving}
                style={{
                    width: '180px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderBottom: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: "-apple-system, 'SF Pro Text', sans-serif",
                    padding: '5px 10px',
                    outline: 'none',
                }}
            />
        );
    }, [savingKey, handleSave]);

    // ── Render ────────────────────────────────────────────────────────────────

    if (isLoading) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1c1c1e', color: 'rgba(255,255,255,0.5)', fontFamily: "-apple-system, sans-serif", fontSize: '13px' }}>
                Cargando configuración…
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            height: '100%',
            background: '#1c1c1e',
            fontFamily: "-apple-system, 'SF Pro Text', 'Helvetica Neue', sans-serif",
            color: '#fff',
            overflow: 'hidden',
        }}>

            {/* ── SIDEBAR ─────────────────────────────────────────────────── */}
            <div style={{
                width: '260px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(28,28,30,0.95)',
                backdropFilter: 'blur(40px) saturate(180%)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '16px',
            }}>

                {/* Search */}
                <div style={{ padding: '0 12px 12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={13} style={{
                            position: 'absolute', left: '10px', top: '50%',
                            transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.35)',
                        }} />
                        <input
                            type="text"
                            placeholder="Buscar"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '10px',
                                color: '#fff',
                                fontSize: '13px',
                                padding: '6px 10px 6px 30px',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>
                </div>

                {/* User profile */}
                <div style={{
                    margin: '0 12px 12px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: 'linear-gradient(135deg,#3b82f6,#6366f1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 600, color: '#fff', flexShrink: 0,
                        overflow: 'hidden',
                    }}>
                        {currentUser?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentUser?.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {currentUser?.username}
                        </div>
                    </div>
                </div>

                {/* Sections list */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '0 8px',
                    scrollbarWidth: 'none',
                }}>
                    {filteredSections.map(section => (
                        <SidebarItem
                            key={section.id}
                            section={section}
                            isActive={!showTemplates && activeSectionId === section.id}
                            onClick={() => handleSectionChange(section.id)}
                        />
                    ))}

                    {/* Fixed bottom items */}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '8px', paddingTop: '8px' }}>
                        {isAdmin && (
                            <SidebarItem
                                section={{ id: 'admin', section: 'Herramientas Admin' }}
                                isActive={false}
                                onClick={() => openWindow('system-tools')}
                            />
                        )}
                        <SidebarItem
                            section={{ id: 'actualizaciones', section: 'Actualizaciones' }}
                            isActive={!showTemplates && activeSectionId === 'actualizaciones'}
                            onClick={() => handleSectionChange('actualizaciones')}
                        />
                        <SidebarItem
                            section={{ id: 'plantillas', section: 'Plantillas' }}
                            isActive={showTemplates}
                            onClick={() => {
                                setShowTemplates(true);
                                contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* ── CONTENT ─────────────────────────────────────────────────── */}
            <div ref={contentRef} style={{
                flex: 1, overflowY: 'auto',
                background: '#1c1c1e',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(255,255,255,0.12) transparent',
            }}>

                {showTemplates ? (
                    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '32px 24px 48px' }}>
                        <TemplateManager onBack={() => setShowTemplates(false)} />
                    </div>
                ) : showUpdates ? (
                    <GalenoUpdateApp />
                ) : (
                    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '32px 24px 48px' }}>

                        {/* Page title */}
                        <h1 style={{
                            fontSize: '22px',
                            fontWeight: 600,
                            letterSpacing: '-0.3px',
                            color: '#fff',
                            marginBottom: '24px',
                        }}>
                            {SECTION_LABELS[currentSection?.id ?? ''] ?? currentSection?.section ?? 'Configuración'}
                        </h1>

                        {/* Wallpaper preview */}
                        {isPersonalization && (
                            <div style={{
                                borderRadius: '16px',
                                overflow: 'hidden',
                                aspectRatio: '16/9',
                                marginBottom: '24px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: '#000',
                                position: 'relative',
                            }}>
                                <img
                                    src={String(currentWallpaper || values['wallpaper'] || '')}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    alt="Fondo actual"
                                />
                            </div>
                        )}

                        {/* Fields card */}
                        {currentSection && (
                            <div style={{
                                borderRadius: '14px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255,255,255,0.08)',
                                background: 'rgba(255,255,255,0.04)',
                            }}>
                                {currentSection.fields.map((field, idx) => {
                                    const FieldIcon = getFieldIcon(field.key);
                                    const isLast = idx === currentSection.fields.length - 1;
                                    const isWallpaper = field.key.toLowerCase().includes('wallpaper') && isPersonalization;

                                    return (
                                        <div key={field.key}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '13px 16px',
                                                borderBottom: isLast && !isWallpaper ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                                gap: '12px',
                                                transition: 'background 0.12s ease',
                                            }}
                                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'}
                                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                                                    <div style={{
                                                        width: '30px', height: '30px', borderRadius: '7px',
                                                        background: 'rgba(255,255,255,0.07)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        <FieldIcon size={15} color="rgba(255,255,255,0.55)" />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {formatLabel(field.key)}
                                                        </div>
                                                        {field.definition.description && (
                                                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.38)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {field.definition.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    {field.definition.admin_only && <Shield size={12} color="#f59e0b" />}
                                                    {renderControl(field)}
                                                </div>
                                            </div>

                                            {/* Wallpaper grid */}
                                            {isWallpaper && (
                                                <div style={{ padding: '12px 16px 16px', borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
                                                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>
                                                        Vista previa del proveedor
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                                                        {wallpapersLoading
                                                            ? Array.from({ length: 5 }).map((_, i) => (
                                                                <div key={i} style={{ aspectRatio: '16/9', borderRadius: '6px', background: 'rgba(255,255,255,0.05)' }} />
                                                            ))
                                                            : wallpapers.slice(0, 5).map((w, i) => (
                                                                <div key={i} style={{
                                                                    aspectRatio: '16/9', borderRadius: '6px', overflow: 'hidden',
                                                                    border: '1px solid rgba(255,255,255,0.06)',
                                                                    cursor: 'pointer',
                                                                    transition: 'transform 0.15s ease, border-color 0.15s ease',
                                                                }}
                                                                    onMouseEnter={e => {
                                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1.04)';
                                                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(41,151,255,0.5)';
                                                                    }}
                                                                    onMouseLeave={e => {
                                                                        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
                                                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                                                                    }}
                                                                >
                                                                    <img src={w.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={w.name} loading="lazy" />
                                                                </div>
                                                            ))
                                                        }
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Empty state for search */}
                        {filteredSections.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                                No se encontraron resultados para "{searchQuery}"
                            </div>
                        )}

                    </div>
                )}
            </div>
        </div>
    );
}