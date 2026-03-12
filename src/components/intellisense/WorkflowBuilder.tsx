import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { APP_DEFINITIONS } from '@/apps';
import { AppIcon } from '@/components/kiosk/AppIcon';
import { useIntelliSense } from '@/contexts/IntelliSenseContext';

interface Props {
    onClose: () => void;
}

const ICON_OPTIONS = ['⚡', '🏥', '📋', '🦷', '📅', '💊', '🔬', '📊', '🩺', '✅'];

// Apps relevantes para flujos (excluir apps de sistema/configuración)
const WORKFLOW_APPS = APP_DEFINITIONS.filter(
    a => !['initial-setup', 'back-to-windows', 'import-review', 'dev-tools', 'system-tools', 'task-manager'].includes(a.id)
);

export function WorkflowBuilder({ onClose }: Props) {
    const { saveWorkflow } = useIntelliSense();
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('⚡');
    const [selectedApps, setSelectedApps] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleApp = (appId: string) => {
        setSelectedApps(prev =>
            prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
        );
    };

    const handleSave = async () => {
        if (!name.trim()) { setError('Ingresa un nombre para el flujo'); return; }
        if (selectedApps.length < 2) { setError('Selecciona al menos 2 apps'); return; }
        setError(null);
        setSaving(true);
        try {
            await saveWorkflow({
                name: name.trim(),
                app_ids: JSON.stringify(selectedApps),
                icon: selectedIcon,
            });
            onClose();
        } catch (e) {
            setError('Error al guardar el flujo');
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                }}
                onClick={e => { if (e.target === e.currentTarget) onClose(); }}
            >
                <motion.div
                    initial={{ scale: 0.92, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    style={{
                        width: 420,
                        background: 'rgba(22,22,32,0.95)',
                        backdropFilter: 'blur(32px)',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.10)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
                        padding: 24,
                        color: 'rgba(255,255,255,0.88)',
                    }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ flex: 1, fontSize: 16, fontWeight: 700 }}>Nuevo flujo de trabajo</div>
                        <motion.button whileTap={{ scale: 0.88 }} onClick={onClose} style={closeBtnStyle}>
                            <X size={14} />
                        </motion.button>
                    </div>

                    {/* Nombre */}
                    <label style={labelStyle}>Nombre</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Ej: Atención completa"
                        maxLength={40}
                        style={inputStyle}
                    />

                    {/* Icono */}
                    <label style={{ ...labelStyle, marginTop: 14 }}>Ícono</label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                        {ICON_OPTIONS.map(ic => (
                            <motion.button
                                key={ic}
                                whileTap={{ scale: 0.85 }}
                                onClick={() => setSelectedIcon(ic)}
                                style={{
                                    width: 36, height: 36, borderRadius: 8, border: 'none',
                                    fontSize: 18, cursor: 'pointer',
                                    background: selectedIcon === ic ? 'rgba(71,158,245,0.25)' : 'rgba(255,255,255,0.06)',
                                    outline: selectedIcon === ic ? '2px solid rgba(71,158,245,0.7)' : 'none',
                                    transition: 'background 0.15s',
                                }}
                            >
                                {ic}
                            </motion.button>
                        ))}
                    </div>

                    {/* Apps */}
                    <label style={labelStyle}>Apps a abrir ({selectedApps.length} seleccionadas)</label>
                    <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
                        {WORKFLOW_APPS.map(app => {
                            const isSelected = selectedApps.includes(app.id);
                            return (
                                <motion.button
                                    key={app.id}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => toggleApp(app.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '8px 10px', borderRadius: 10, border: 'none',
                                        background: isSelected ? 'rgba(71,158,245,0.14)' : 'rgba(255,255,255,0.04)',
                                        cursor: 'pointer', textAlign: 'left',
                                        outline: isSelected ? '1px solid rgba(71,158,245,0.45)' : 'none',
                                        transition: 'background 0.12s',
                                    }}
                                >
                                    <div style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <AppIcon iconComponent={app.iconComponent} icon={app.icon} size={18} />
                                    </div>
                                    <span style={{ flex: 1, fontSize: 13, color: isSelected ? '#79c0ff' : 'rgba(255,255,255,0.70)' }}>
                                        {app.name}
                                    </span>
                                    {isSelected && (
                                        <div style={{ width: 18, height: 18, borderRadius: 4, background: 'rgba(71,158,245,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Check size={11} color="white" />
                                        </div>
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>

                    {error && (
                        <div style={{ fontSize: 12, color: '#f87171', marginBottom: 10 }}>{error}</div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <motion.button whileTap={{ scale: 0.96 }} onClick={onClose} style={cancelBtnStyle}>
                            Cancelar
                        </motion.button>
                        <motion.button whileTap={{ scale: 0.96 }} onClick={handleSave} disabled={saving} style={saveBtnStyle(saving)}>
                            {saving ? 'Guardando…' : 'Guardar flujo'}
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.06em', color: 'rgba(255,255,255,0.4)',
    textTransform: 'uppercase', marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 10,
    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
    color: 'rgba(255,255,255,0.88)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
};

const closeBtnStyle: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 8, border: 'none',
    background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'rgba(255,255,255,0.5)',
};

const cancelBtnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)',
    background: 'transparent', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 13,
};

const saveBtnStyle = (disabled: boolean): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: 9, border: 'none',
    background: disabled ? 'rgba(71,158,245,0.3)' : 'rgba(71,158,245,0.85)',
    color: 'white', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600,
});
