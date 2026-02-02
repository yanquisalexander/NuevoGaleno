import { useCallback, useMemo, useState } from 'react';
import { Sliders, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useConfig } from '@/hooks/useConfig';
import { useSession } from '@/hooks/useSession';
import { ConfigDefinition } from '@/types/config';

type ConfigEntry = {
    key: string;
    definition: ConfigDefinition;
    value: unknown;
};

type SectionConfig = {
    section: string;
    fields: ConfigEntry[];
};

const formatLabel = (value: string) =>
    value
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
        .trim();

const isSectionAdmin = (sectionName: string) =>
    sectionName.toLowerCase().includes('sistema');

export function ConfigurationApp() {
    const { schema, values, isLoading, setConfigValue, reload } = useConfig();
    const { currentUser } = useSession();
    const { openWindow } = useWindowManager();
    const [savingKey, setSavingKey] = useState<string | null>(null);

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
                toast.error(error?.toString?.() ?? 'No se pudo guardar la configuración');
            } finally {
                setSavingKey((current) => (current === key ? null : current));
            }
        },
        [setConfigValue]
    );

    const renderControl = (entry: ConfigEntry) => {
        const effectiveValue = entry.value ?? entry.definition.default;
        const isSaving = savingKey === entry.key;

        if (entry.definition.type === 'boolean') {
            const boolValue = typeof effectiveValue === 'boolean' ? effectiveValue : Boolean(entry.definition.default);
            return (
                <button
                    type="button"
                    onClick={() => handleSave(entry.key, !boolValue)}
                    disabled={isSaving}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${boolValue ? 'bg-emerald-400/80' : 'bg-white/10'}`}
                >
                    <span
                        className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${boolValue ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                    <span className="sr-only">{boolValue ? 'Activo' : 'Desactivado'}</span>
                </button>
            );
        }

        if (entry.definition.type === 'enum') {
            const selected = String(effectiveValue ?? '');
            return (
                <select
                    key={`${entry.key}-${selected}`}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:ring-2 focus:ring-blue-400"
                    value={selected}
                    onChange={(event) => handleSave(entry.key, event.target.value)}
                    disabled={isSaving}
                >
                    {(entry.definition.choices ?? []).map((option) => {
                        const optionValue = String(option);
                        return (
                            <option key={optionValue} value={optionValue}>
                                {optionValue}
                            </option>
                        );
                    })}
                </select>
            );
        }

        const inputType =
            entry.definition.type === 'integer' || entry.definition.type === 'float'
                ? 'number'
                : 'text';
        const displayValue =
            effectiveValue === undefined || effectiveValue === null ? '' : String(effectiveValue);

        const handleBlur = (raw: string) => {
            if (entry.definition.type === 'integer' || entry.definition.type === 'float') {
                const parsed = raw.trim() === '' ? entry.definition.default ?? 0 : Number(raw);
                if (Number.isNaN(parsed)) {
                    toast.error('Ingresa un número válido');
                    return;
                }
                handleSave(entry.key, parsed);
                return;
            }

            handleSave(entry.key, raw);
        };

        return (
            <Input
                key={`${entry.key}-${displayValue}`}
                type={inputType}
                defaultValue={displayValue}
                onBlur={(event) => handleBlur(event.target.value)}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.currentTarget.blur();
                    }
                }}
                disabled={isSaving}
            />
        );
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-t-blue-400 border-white/20" />
            </div>
        );
    }

    return (
        <div className="p-6 h-full overflow-y-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-lg font-semibold text-white">Configuración del sistema</p>
                    <p className="text-sm text-white/70">
                        Agrupa los ajustes {
                            isAdmin ? 'generales y del sistema' : 'generales'
                        } en un solo lugar.
                    </p>
                    {!isAdmin && (
                        <p className="text-xs text-amber-300">
                            Algunas secciones solo están disponibles para administradores.
                        </p>
                    )}
                </div>
                <Button variant="outline" onClick={reload}>
                    Recargar
                </Button>
            </div>

            {sections.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
                    No hay ajustes visibles para tu rol en este momento.
                </div>
            )}

            <div className="space-y-4">
                {sections.map((section) => {
                    const Icon = isSectionAdmin(section.section) ? Shield : Sliders;
                    return (
                        <section key={section.section} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                                    <Icon className="h-5 w-5 text-white/80" />
                                </span>
                                <div>
                                    <p className="text-base font-semibold text-white">{section.section}</p>
                                    <p className="text-xs text-white/60">{section.fields.length} ajuste{section.fields.length === 1 ? '' : 's'}</p>
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {section.fields.map((field) => (
                                    <div key={field.key} className="rounded-2xl border border-white/5 bg-black/30 p-4">
                                        <div className="mb-2 flex items-start justify-between gap-3">
                                            <div className="space-y-1">
                                                <p className="text-sm font-semibold text-white">{formatLabel(field.key)}</p>
                                                <p className="text-xs text-white/60">{field.definition.description}</p>
                                            </div>
                                            {field.definition.admin_only && (
                                                <span className="text-xs uppercase tracking-[0.2em] text-amber-300">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            {renderControl(field)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    );
                })}
            </div>

            {isAdmin && (
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/10 to-black/40 p-5">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold text-white">Panel de Sistema</p>
                            <p className="text-xs text-white/60">
                                Accede a las acciones críticas que requieren validación extra.
                            </p>
                        </div>
                        <Button onClick={() => openWindow('system-tools')}>
                            Abrir mantenimiento
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
