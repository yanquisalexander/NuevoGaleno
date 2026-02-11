import { useCallback, useMemo, useState } from 'react';
import {
    Monitor, HardDrive, User, Shield, Sliders,
    Search, ChevronRight, Download, FileText,
    Wifi, Bluetooth, LayoutGrid, Battery,
    Volume2, Bell, Focus, MousePointer2,
    Globe, Gamepad2, Accessibility, RefreshCcw,
    Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useConfig } from '@/hooks/useConfig';
import { useSession } from '@/hooks/useSession';
import { useWallpaper, WallpaperProviderType } from '@/hooks/useWallpaper';
import { ConfigDefinition } from '@/types/config';
import { TemplateManager } from '@/components/templates';

// --- Tipos ---
type ConfigEntry = {
    key: string;
    definition: ConfigDefinition;
    value: unknown;
};

type SectionConfig = {
    section: string;
    id: string; // ID seguro para URL/Selección
    fields: ConfigEntry[];
};

// --- Helpers de Estilo ---
const fluentCard = "bg-[#2c2c2c] border border-[#383838] rounded-lg overflow-hidden mb-4 shadow-sm";
const fluentInput = "bg-[#333333] border border-[#454545] border-b-[#888] hover:bg-[#3a3a3a] focus:bg-[#1f1f1f] focus:border-b-blue-400 text-white text-sm rounded-md px-3 py-1.5 outline-none transition-colors w-full";
const fluentSelect = "appearance-none bg-[#333333] border border-[#454545] hover:bg-[#3a3a3a] text-white text-sm rounded-md pl-3 pr-8 py-1.5 outline-none transition-colors w-full cursor-pointer";

// Mapeo de iconos estilo Windows 11 Sidebar
const getSectionIcon = (sectionName: string) => {
    const lower = sectionName.toLowerCase();
    if (lower.includes('sistema') || lower.includes('general')) return Monitor;
    if (lower.includes('red') || lower.includes('internet')) return Wifi;
    if (lower.includes('bluetooth') || lower.includes('dispositivos')) return Bluetooth;
    if (lower.includes('personalización') || lower.includes('apariencia')) return LayoutGrid;
    if (lower.includes('aplicaciones')) return LayoutGrid;
    if (lower.includes('cuentas') || lower.includes('usuario')) return User;
    if (lower.includes('hora') || lower.includes('idioma')) return Globe;
    if (lower.includes('juegos')) return Gamepad2;
    if (lower.includes('accesibilidad')) return Accessibility;
    if (lower.includes('seguridad') || lower.includes('privacidad')) return Shield;
    if (lower.includes('update') || lower.includes('actualización')) return RefreshCcw;
    return Sliders; // Default
};

// Iconos decorativos para los items dentro de las tarjetas (simulación)
const getFieldIcon = (key: string) => {
    const lower = key.toLowerCase();
    if (lower.includes('wallpaper') || lower.includes('fondo')) return ImageIcon;
    if (lower.includes('pantalla') || lower.includes('brillo')) return Monitor;
    if (lower.includes('sonido') || lower.includes('volumen')) return Volume2;
    if (lower.includes('notific')) return Bell;
    if (lower.includes('batería') || lower.includes('energía')) return Battery;
    if (lower.includes('almacenamiento')) return HardDrive;
    if (lower.includes('mouse') || lower.includes('cursor')) return MousePointer2;
    if (lower.includes('concentración')) return Focus;
    return Sliders;
};

// Formateo de texto (CamelCase a Texto Legible)
const formatLabel = (value: string) =>
    value
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();

export function ConfigurationApp() {
    const { schema, values, isLoading, setConfigValue, reload } = useConfig();
    const { currentUser, updatePreferences, getUserPreferences } = useSession();
    const { openWindow } = useWindowManager();
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);

    // Obtener el proveedor de wallpaper actual
    const userPrefs = getUserPreferences();
    const currentWallpaperProvider = (userPrefs.wallpaper_provider as WallpaperProviderType) || 'chromecast';
    
    // Usar el hook para obtener las imágenes del proveedor actual
    const { wallpapers, isLoading: wallpapersLoading } = useWallpaper(currentWallpaperProvider);

    // Estado para la navegación lateral (Fluent Sidebar)
    const [activeSectionId, setActiveSectionId] = useState<string>('sistema');
    const [searchQuery, setSearchQuery] = useState('');

    const isAdmin = currentUser?.role === 'admin';

    // Procesar secciones
    const sections = useMemo<SectionConfig[]>(() => {
        if (!schema) return [];
        const map = new Map<string, ConfigEntry[]>();

        Object.entries(schema).forEach(([key, definition]) => {
            if (definition.admin_only && !isAdmin) return;
            const sectionName = definition.ui_section?.trim() || 'Sistema';
            const group = map.get(sectionName) ?? [];

            // Para configuraciones por usuario, obtener el valor de las preferences del usuario
            let value = values[key];
            if (definition.user_preference) {
                const userPrefs = getUserPreferences();
                // Convertir key a snake_case para las preferences
                const prefKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                value = userPrefs[prefKey] ?? definition.default;
            }

            group.push({ key, definition, value });
            map.set(sectionName, group);
        });

        // Aseguramos que siempre haya una sección "Sistema" o la primera disponible
        const list = Array.from(map.entries()).map(([section, fields]) => ({
            section,
            id: section.toLowerCase().replace(/\s+/g, '-'),
            fields
        }));

        // Ordenar: Sistema primero si existe
        list.sort((a, b) => (a.id === 'sistema' ? -1 : 1));
        return list;
    }, [schema, values, isAdmin, getUserPreferences]);

    // Efecto para seleccionar la primera sección por defecto si la actual no existe
    useMemo(() => {
        if (sections.length > 0 && !sections.find(s => s.id === activeSectionId)) {
            setActiveSectionId(sections[0].id);
        }
    }, [sections, activeSectionId]);

    const handleSave = useCallback(
        async (key: string, nextValue: unknown) => {
            setSavingKey(key);
            try {
                const definition = schema?.[key];
                if (definition?.user_preference) {
                    // Guardar en preferences del usuario
                    const prefKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
                    await updatePreferences({ [prefKey]: nextValue });
                } else {
                    // Guardar en configuración global
                    await setConfigValue(key, nextValue);
                }
                toast.success('Configuración guardada');
            } catch (error: any) {
                console.error(error);
                toast.error('Error al guardar');
            } finally {
                setSavingKey(null);
            }
        },
        [schema, setConfigValue, updatePreferences]
    );

    // --- Renderizado de Controles Fluent ---
    const renderControl = (entry: ConfigEntry) => {
        const effectiveValue = entry.value ?? entry.definition.default;
        const isSaving = savingKey === entry.key;

        // Toggle Switch estilo Windows 11
        if (entry.definition.type === 'boolean') {
            const boolValue = typeof effectiveValue === 'boolean' ? effectiveValue : Boolean(entry.definition.default);
            return (
                <button
                    onClick={() => handleSave(entry.key, !boolValue)}
                    disabled={isSaving}
                    className={`
                        relative inline-flex h-5 w-10 items-center rounded-full transition-colors duration-200 border border-transparent
                        ${boolValue ? 'bg-[#0078d4] hover:bg-[#006cc1]' : 'bg-[#5c5c5c] hover:bg-[#6e6e6e] border-[#707070]'}
                        ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <span
                        className={`
                            inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200
                            ${boolValue ? 'translate-x-6' : 'translate-x-1'}
                            ${boolValue ? 'shadow-sm' : ''}
                        `}
                    />
                </button>
            );
        }

        // Select estilo Windows 11
        if (entry.definition.type === 'enum') {
            const selected = String(effectiveValue ?? '');
            return (
                <div className="relative w-48">
                    <select
                        value={selected}
                        onChange={(e) => handleSave(entry.key, e.target.value)}
                        disabled={isSaving}
                        className={fluentSelect}
                    >
                        {(entry.definition.choices ?? []).map((option) => (
                            <option key={String(option)} value={String(option)}>
                                {String(option)}
                            </option>
                        ))}
                    </select>
                    <ChevronRight className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/50 rotate-90" />
                </div>
            );
        }

        // Input Texto/Numérico estilo Windows 11
        const inputType = entry.definition.type === 'integer' || entry.definition.type === 'float' ? 'number' : 'text';
        return (
            <div className="w-48">
                <input
                    type={inputType}
                    defaultValue={String(effectiveValue ?? '')}
                    onBlur={(e) => {
                        const val = e.target.value;
                        if (inputType === 'number') {
                            const parsed = Number(val);
                            if (!Number.isNaN(parsed)) handleSave(entry.key, parsed);
                        } else {
                            handleSave(entry.key, val);
                        }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    disabled={isSaving}
                    className={fluentInput}
                />
            </div>
        );
    };

    if (isLoading) return <div className="flex h-full items-center justify-center text-white">Cargando...</div>;
    if (showTemplates) return <TemplateManager onBack={() => setShowTemplates(false)} />;

    const currentSection = sections.find(s => s.id === activeSectionId);
    const isPersonalization = activeSectionId.includes('personalización') || activeSectionId.includes('apariencia');

    return (
        <div className="flex h-full w-full bg-[#202020] text-white overflow-hidden font-segoe select-none">

            {/* --- SIDEBAR (Navegación) --- */}
            <div className="w-[280px] flex-none flex flex-col pt-8 pb-4 px-2 bg-[#202020]/95 backdrop-blur-xl border-r border-white/5">
                {/* Search Box estilo Sidebar */}
                <div className="px-4 mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                        <input
                            type="text"
                            placeholder="Buscar una configuración"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[#2d2d2d] border border-b border-transparent focus:border-b-[#0078d4] border-white/5 rounded-md py-1.5 pl-9 pr-3 text-sm text-white placeholder-white/40 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Lista de Secciones */}
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar px-2">
                    {/* Botón de Perfil (Pseudo-Header del Sidebar) */}
                    <div className="mb-4 px-2 flex items-center gap-3 py-2 hover:bg-white/5 rounded-md cursor-pointer transition-colors group">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold overflow-hidden border border-white/10">
                            {currentUser?.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                currentUser?.name?.substring(0, 1)
                            )}
                        </div>
                        <div className="flex flex-col text-left">
                            <span className="text-sm font-semibold text-white/90">{currentUser?.name}</span>
                            <span className="text-xs text-white/50">{currentUser?.email || currentUser?.username}</span>
                        </div>
                    </div>

                    {sections.map((section) => {
                        const Icon = getSectionIcon(section.section);
                        const isActive = activeSectionId === section.id;
                        return (
                            <button
                                key={section.id}
                                onClick={() => setActiveSectionId(section.id)}
                                className={`
                                    relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                                    ${isActive ? 'bg-[#353535] text-white' : 'text-white/70 hover:bg-[#2d2d2d] hover:text-white/90'}
                                `}
                            >
                                {/* Indicador activo (Pill lateral) */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-[#0078d4] rounded-r-full" />
                                )}
                                <Icon className={`h-4 w-4 ${isActive ? 'text-[#0078d4]' : ''}`} />
                                {section.section}
                            </button>
                        );
                    })}

                    {/* Links especiales hardcodeados para parecer Windows */}
                    <div className="pt-4 mt-2 border-t border-white/5">
                        {isAdmin && (
                            <button onClick={() => openWindow('system-tools')} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/70 hover:bg-[#2d2d2d]">
                                <Shield className="h-4 w-4 text-red-400" />
                                Herramientas Admin
                            </button>
                        )}
                        <button onClick={() => openWindow('galeno-update')} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/70 hover:bg-[#2d2d2d]">
                            <Download className="h-4 w-4 text-blue-400" />
                            Galeno Update
                        </button>
                        <button onClick={() => setShowTemplates(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/70 hover:bg-[#2d2d2d]">
                            <FileText className="h-4 w-4 text-purple-400" />
                            Plantillas
                        </button>
                    </div>
                </div>
            </div>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="flex-1 flex flex-col bg-[#202020] overflow-hidden relative">

                {/* Header (Breadcrumb + Titulo) */}
                <div className="flex-none pt-8 pb-6 px-8">
                    {/* Hero específico si es la sección "Sistema" */}
                    {activeSectionId === 'sistema' ? (
                        <div className="flex items-start gap-6 mb-6">
                            <div className="w-32 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg flex items-center justify-center shrink-0">
                                <Monitor className="h-8 w-8 text-white/90" />
                            </div>
                            <div className="space-y-1 pt-1">
                                <h1 className="text-2xl font-semibold tracking-tight uppercase">{currentUser?.name?.split(' ')[0]}</h1>
                                <p className="text-sm text-white/60">
                                    Nuevo Galeno OS
                                </p>
                                <button className="text-sm text-[#4cc2ff] hover:underline mt-1">Cambiar nombre</button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6">
                            <p className="text-xs text-white/50 mb-1">Sistema &gt; Configuración</p>
                            <h1 className="text-2xl font-semibold">{currentSection?.section}</h1>
                        </div>
                    )}
                </div>

                {/* Scroll Area */}
                <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
                    <div className="max-w-4xl space-y-1">

                        {/* --- PREVIEW DE WALLPAPER (Estilo OS) --- */}
                        {isPersonalization && (
                            <div className="mb-8 flex justify-center">
                                <div className="relative aspect-video w-full max-w-[480px] rounded-xl border-8 border-[#1a1a1a] shadow-2xl overflow-hidden bg-black group">
                                    <img
                                        src={String(values['wallpaper'] || '/api/placeholder/800/450')}
                                        className="w-full h-full object-cover"
                                        alt="Fondo actual"
                                    />
                                    {/* Superposición que simula la UI de Windows */}
                                    <div className="absolute inset-0 bg-black/10" />
                                    <div className="absolute bottom-4 right-4 w-24 h-16 bg-white/10 backdrop-blur-md rounded border border-white/20 p-2 pointer-events-none">
                                        <div className="w-full h-1.5 bg-white/40 rounded-full mb-1.5" />
                                        <div className="w-2/3 h-1 bg-white/20 rounded-full mb-4" />
                                        <div className="absolute bottom-2 right-2 w-3 h-3 bg-blue-500 rounded-sm" />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={fluentCard}>
                            {currentSection?.fields.map((field, index) => {
                                const FieldIcon = getFieldIcon(field.key);
                                const isLast = index === currentSection.fields.length - 1;
                                const isWallpaperField = field.key.toLowerCase().includes('wallpaper');

                                return (
                                    <div key={field.key} className={`flex flex-col ${!isLast ? 'border-b border-[#383838]' : ''}`}>
                                        <div
                                            className="group flex items-center justify-between p-4 pl-5 hover:bg-[#323232] transition-colors cursor-default"
                                        >
                                            <div className="flex items-center gap-4 overflow-hidden">
                                                <div className="flex-none text-white/40 group-hover:text-white/80 transition-colors">
                                                    <FieldIcon className="h-5 w-5" strokeWidth={1.5} />
                                                </div>

                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[15px] text-white/90 font-normal truncate">
                                                        {formatLabel(field.key)}
                                                    </span>
                                                    {field.definition.description && (
                                                        <span className="text-xs text-white/50 truncate max-w-lg block">
                                                            {field.definition.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex-none pl-6 flex items-center gap-4">
                                                {field.definition.admin_only && (
                                                    <Shield className="h-3 w-3 text-amber-500" title="Requiere Admin" />
                                                )}
                                                {renderControl(field)}
                                            </div>
                                        </div>

                                        {/* Grid de imágenes del proveedor actual si es el campo de Wallpaper */}
                                        {isWallpaperField && isPersonalization && (
                                            <div className="px-5 pb-5 pt-2">
                                                <p className="text-xs font-medium text-white/60 mb-3">
                                                    Con este proveedor tendrás imágenes como estas
                                                </p>
                                                {wallpapersLoading ? (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {[1, 2, 3, 4, 5].map((i) => (
                                                            <div
                                                                key={i}
                                                                className="aspect-video rounded-md bg-white/5 animate-pulse"
                                                            />
                                                        ))}
                                                    </div>
                                                ) : wallpapers.length > 0 ? (
                                                    <div className="grid grid-cols-5 gap-2">
                                                        {wallpapers.slice(0, 5).map((wallpaper, index) => (
                                                            <div
                                                                key={index}
                                                                className="aspect-video rounded-md overflow-hidden border border-white/5 hover:border-blue-500 cursor-pointer transition-all active:scale-95 group relative"
                                                            >
                                                                <img
                                                                    src={wallpaper.url}
                                                                    className="w-full h-full object-cover"
                                                                    alt={wallpaper.name}
                                                                    loading="lazy"
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <p className="text-xs text-white font-medium truncate">
                                                                        {wallpaper.location}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-white/40 text-center py-4">
                                                        No se pudieron cargar las imágenes de ejemplo
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Banner de ayuda al final */}
                        <div className="mt-8 flex items-center gap-2 text-sm text-white/40 hover:text-white/60 cursor-pointer w-fit transition-colors">
                            <span className="underline decoration-dotted">Obtener ayuda</span>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}