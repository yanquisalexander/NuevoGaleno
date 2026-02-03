import { useCallback, useMemo, useState } from 'react';
import {
    Sliders, Shield, Lock, Trash2, RefreshCw,
    Monitor, HardDrive, User, Search, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useConfig } from '@/hooks/useConfig';
import { useSession } from '@/hooks/useSession';
import { ConfigDefinition } from '@/types/config';

// --- Tipos ---
type ConfigEntry = {
    key: string;
    definition: ConfigDefinition;
    value: unknown;
};

type SectionConfig = {
    section: string;
    fields: ConfigEntry[];
};

// --- Helpers de Formato y Estilo ---
const formatLabel = (value: string) =>
    value
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();

// Asignar iconos y colores según el nombre de la sección para dar el toque "Settings"
const getSectionIcon = (sectionName: string) => {
    const lower = sectionName.toLowerCase();
    if (lower.includes('sistema') || lower.includes('general')) return { icon: Monitor, color: 'text-blue-400', bg: 'bg-blue-400/10' };
    if (lower.includes('almacenamiento') || lower.includes('datos')) return { icon: HardDrive, color: 'text-amber-400', bg: 'bg-amber-400/10' };
    if (lower.includes('usuario') || lower.includes('cuenta')) return { icon: User, color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
    if (lower.includes('seguridad')) return { icon: Shield, color: 'text-rose-400', bg: 'bg-rose-400/10' };
    return { icon: Sliders, color: 'text-indigo-400', bg: 'bg-indigo-400/10' };
};

export function ConfigurationApp() {
    const { schema, values, isLoading, setConfigValue, reload } = useConfig();
    const { currentUser, setPin, removePin } = useSession();
    const { openWindow } = useWindowManager();
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [newPin, setNewPin] = useState('');
    const [isSettingPin, setIsSettingPin] = useState(false);

    const isAdmin = currentUser?.role === 'admin';

    const sections = useMemo<SectionConfig[]>(() => {
        if (!schema) return [];
        const map = new Map<string, ConfigEntry[]>();

        Object.entries(schema).forEach(([key, definition]) => {
            if (definition.admin_only && !isAdmin) return;
            const sectionName = definition.ui_section?.trim() || 'General';
            const group = map.get(sectionName) ?? [];
            group.push({ key, definition, value: values[key] });
            map.set(sectionName, group);
        });

        return Array.from(map.entries()).map(([section, fields]) => ({ section, fields }));
    }, [schema, values, isAdmin]);

    const handleSave = useCallback(
        async (key: string, nextValue: unknown) => {
            setSavingKey(key);
            try {
                await setConfigValue(key, nextValue);
                toast.success('Configuración actualizada');
            } catch (error: any) {
                console.error('Error guardando configuración', error);
                toast.error(error?.toString?.() ?? 'No se pudo guardar');
            } finally {
                setSavingKey((current) => (current === key ? null : current));
            }
        },
        [setConfigValue]
    );

    // --- Renderizado de Controles (Inputs, Toggles) ---
    const renderControl = (entry: ConfigEntry) => {
        const effectiveValue = entry.value ?? entry.definition.default;
        const isSaving = savingKey === entry.key;

        // Estilo Toggle Windows 11
        if (entry.definition.type === 'boolean') {
            const boolValue = typeof effectiveValue === 'boolean' ? effectiveValue : Boolean(entry.definition.default);
            return (
                <button
                    type="button"
                    onClick={() => handleSave(entry.key, !boolValue)}
                    disabled={isSaving}
                    className={`
                        relative inline-flex h-6 w-12 items-center rounded-full transition-colors duration-200 border
                        ${boolValue
                            ? 'bg-blue-600 border-blue-600 hover:bg-blue-500'
                            : 'bg-[#333] border-white/10 hover:bg-[#3d3d3d]'
                        }
                        ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                >
                    <span className="sr-only">{boolValue ? 'Activado' : 'Desactivado'}</span>
                    <span
                        className={`
                            h-4 w-4 rounded-full transition-transform duration-200 shadow-sm
                            ${boolValue ? 'translate-x-[26px] bg-white' : 'translate-x-1 bg-white/50'}
                        `}
                    />
                </button>
            );
        }

        // Estilo Select Windows 11
        if (entry.definition.type === 'enum') {
            const selected = String(effectiveValue ?? '');
            return (
                <div className="relative w-48">
                    <select
                        key={`${entry.key}-${selected}`}
                        className="w-full appearance-none rounded-md border border-white/10 bg-[#333] px-3 py-1.5 text-sm text-white placeholder-white/40 focus:border-blue-500 focus:bg-[#2b2b2b] focus:ring-1 focus:ring-blue-500 outline-none transition-all disabled:opacity-50"
                        value={selected}
                        onChange={(event) => handleSave(entry.key, event.target.value)}
                        disabled={isSaving}
                    >
                        {(entry.definition.choices ?? []).map((option) => (
                            <option key={String(option)} value={String(option)} className="bg-[#2d2d2d]">
                                {String(option)}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white/50">
                        <ChevronRight className="h-4 w-4 rotate-90" />
                    </div>
                </div>
            );
        }

        // Estilo Input Texto/Número Windows 11
        const inputType = entry.definition.type === 'integer' || entry.definition.type === 'float' ? 'number' : 'text';
        const displayValue = effectiveValue === undefined || effectiveValue === null ? '' : String(effectiveValue);

        return (
            <div className="w-48">
                <input
                    key={`${entry.key}-${displayValue}`}
                    type={inputType}
                    defaultValue={displayValue}
                    onBlur={(e) => {
                        const val = e.target.value;
                        if (inputType === 'number') {
                            const parsed = val.trim() === '' ? entry.definition.default ?? 0 : Number(val);
                            if (!Number.isNaN(parsed)) handleSave(entry.key, parsed);
                        } else {
                            handleSave(entry.key, val);
                        }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    disabled={isSaving}
                    className="w-full rounded-md border border-white/10 bg-[#333] px-3 py-1.5 text-sm text-white placeholder-white/40 focus:border-blue-500 focus:bg-[#1f1f1f] focus:ring-1 focus:ring-blue-500 outline-none transition-all border-b-2 border-b-white/20 focus:border-b-blue-500"
                />
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-[#202020]">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-500 border-t-transparent" />
                <p className="text-sm font-medium text-white/60">Cargando configuración...</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-[#202020] text-white selection:bg-blue-500/30">
            {/* --- Header Fijo --- */}
            <div className="flex-none px-8 py-8">
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-semibold tracking-tight">Configuración</h1>
                        <p className="text-sm text-white/60">
                            Administra las preferencias del sistema y tu cuenta
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={reload}
                        className="h-9 w-9 rounded-md bg-white/5 hover:bg-white/10 text-white/80"
                        title="Recargar configuración"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                {/* Search Bar simulada (Visual) */}
                <div className="mt-6 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Buscar una configuración"
                        className="w-full h-9 rounded-md bg-[#2d2d2d] border border-white/5 pl-9 pr-4 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 border-b-2 border-b-white/10 focus:border-b-blue-500 transition-colors"
                    />
                </div>
            </div>

            {/* --- Contenido Scrolleable --- */}
            <div className="flex-1 overflow-y-auto px-8 pb-10 custom-scrollbar">
                <div className="mx-auto max-w-4xl space-y-8">

                    {/* Generar Secciones Dinámicas */}
                    {sections.map((section) => {
                        const styleInfo = getSectionIcon(section.section);
                        const Icon = styleInfo.icon;

                        return (
                            <div key={section.section} className="space-y-3">
                                {/* Título de Sección con Icono */}
                                <div className="flex items-center gap-3 px-1 mb-2">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-md ${styleInfo.bg}`}>
                                        <Icon className={`h-5 w-5 ${styleInfo.color}`} />
                                    </div>
                                    <h2 className="text-lg font-semibold">{section.section}</h2>
                                </div>

                                {/* Tarjeta contenedora estilo Windows */}
                                <div className="flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#272727] shadow-sm">
                                    {section.fields.map((field, index) => (
                                        <div
                                            key={field.key}
                                            className={`
                                                group flex min-h-[72px] items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors
                                                ${index !== section.fields.length - 1 ? 'border-b border-white/5' : ''}
                                            `}
                                        >
                                            {/* Columna Izquierda: Texto e Icono opcional */}
                                            <div className="flex items-center gap-4 flex-1">
                                                {/* Indicador visual hover */}
                                                <div className="w-1 h-8 rounded-full bg-blue-500 absolute left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-white/90">
                                                            {formatLabel(field.key)}
                                                        </span>
                                                        {field.definition.admin_only && (
                                                            <span className="inline-flex items-center rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-500 border border-amber-500/20">
                                                                ADMIN
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-white/50 max-w-md">
                                                        {field.definition.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Columna Derecha: Control */}
                                            <div className="flex-none pl-4">
                                                {renderControl(field)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* --- Sección Seguridad (Hardcoded pero estilizada igual) --- */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 px-1 mb-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-400/10">
                                <Lock className="h-5 w-5 text-rose-400" />
                            </div>
                            <h2 className="text-lg font-semibold">Seguridad</h2>
                        </div>

                        <div className="flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[#272727] shadow-sm">
                            <div className="flex items-center justify-between gap-4 px-5 py-5">
                                <div className="space-y-0.5">
                                    <span className="text-sm font-medium text-white/90">PIN de Windows Hello</span>
                                    <p className="text-xs text-white/50">
                                        {currentUser?.pin
                                            ? 'Usa este PIN para iniciar sesión rápidamente.'
                                            : 'Configura un PIN para un acceso más rápido y seguro.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {currentUser?.pin ? (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="bg-white/5 text-white hover:bg-red-500/20 hover:text-red-200 border border-white/10"
                                            onClick={async () => {
                                                if (confirm('¿Eliminar PIN?')) {
                                                    await removePin();
                                                    toast.success("PIN eliminado");
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Quitar
                                        </Button>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="password"
                                                maxLength={6}
                                                placeholder="PIN (4-6)"
                                                value={newPin}
                                                onChange={(e) => {
                                                    const v = e.target.value.replace(/\D/g, '');
                                                    if (v.length <= 6) setNewPin(v);
                                                }}
                                                className="w-24 rounded-md border border-white/10 bg-[#333] px-3 py-1.5 text-sm text-center outline-none focus:border-blue-500 focus:bg-[#1f1f1f] border-b-2 border-b-white/20 focus:border-b-blue-500"
                                            />
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-500 text-white"
                                                disabled={isSettingPin || newPin.length < 4}
                                                onClick={async () => {
                                                    setIsSettingPin(true);
                                                    await setPin(newPin);
                                                    setNewPin('');
                                                    setIsSettingPin(false);
                                                    toast.success("PIN establecido");
                                                }}
                                            >
                                                Configurar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* --- Sección Admin (Hero Card) --- */}
                    {isAdmin && (
                        <div className="mt-8 rounded-xl border border-red-500/20 bg-gradient-to-br from-red-900/10 to-[#272727] p-6 relative overflow-hidden group">
                            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-red-500/5 to-transparent pointer-events-none" />
                            <div className="relative z-10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-red-400" />
                                        Zona Administrativa
                                    </h3>
                                    <p className="text-sm text-white/60 mt-1 max-w-lg">
                                        Acceso a herramientas de mantenimiento de base de datos y logs del sistema.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => openWindow('system-tools')}
                                    className="bg-white/10 hover:bg-white/20 text-white border border-white/10"
                                >
                                    Abrir Herramientas
                                    <ChevronRight className="w-4 h-4 ml-2 opacity-50" />
                                </Button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}