import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useIntelliSense } from '@/contexts/IntelliSenseContext';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import { useSession } from '@/hooks/useSession';
import { APP_DEFINITIONS } from '@/apps';
import { AppIcon } from '@/components/kiosk/AppIcon';
import type { SuggestionItem, ParsedWorkflow } from '@/types/intellisense';
import { WorkflowBuilder } from "./WorkflowBuilder";

interface Props {
    visible: boolean;
    onClose: () => void;
}

const REASON_LABEL: Record<SuggestionItem['reason'], string> = {
    frequent: 'Frecuente',
    time_based: 'Para esta hora',
    sequence: 'Siguiente paso',
    recent_patient: 'Reciente',
};

const REASON_COLOR: Record<SuggestionItem['reason'], string> = {
    frequent: 'rgba(71,158,245,0.25)',
    time_based: 'rgba(84,185,111,0.25)',
    sequence: 'rgba(245,166,35,0.25)',
    recent_patient: 'rgba(196,126,245,0.25)',
};

const REASON_TEXT_COLOR: Record<SuggestionItem['reason'], string> = {
    frequent: '#79c0ff',
    time_based: '#6ee7a0',
    sequence: '#fcd34d',
    recent_patient: '#c084fc',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
    const h = new Date().getHours();
    if (h >= 6 && h < 12) return 'Buenos días';
    if (h >= 12 && h < 18) return 'Buenas tardes';
    return 'Buenas noches';
}

function getAppDef(appId: string) {
    return APP_DEFINITIONS.find(a => a.id === appId);
}

// ─── Small reusable card ──────────────────────────────────────────────────────

function SuggestedAppCard({
    item,
    onOpen,
}: {
    item: SuggestionItem;
    onOpen: (appId: string) => void;
}) {
    const def = getAppDef(item.targetId);
    if (!def) return null;

    return (
        <motion.button
            whileHover={{ scale: 1.03, background: 'rgba(255,255,255,0.09)' }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onOpen(item.targetId)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                transition: 'background 0.15s',
            }}
        >
            <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AppIcon iconComponent={def.iconComponent} icon={def.icon} size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {def.name}
                </div>
            </div>
            <span style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: 6,
                background: REASON_COLOR[item.reason],
                color: REASON_TEXT_COLOR[item.reason],
                whiteSpace: 'nowrap',
                flexShrink: 0,
            }}>
                {REASON_LABEL[item.reason]}
            </span>
        </motion.button>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(255,255,255,0.35)', marginBottom: 8, paddingLeft: 2, textTransform: 'uppercase' }}>
                {title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {children}
            </div>
        </div>
    );
}

// ─── Workflow row ─────────────────────────────────────────────────────────────

function WorkflowRow({ workflow, onLaunch, onDelete }: { workflow: ParsedWorkflow; onLaunch: () => void; onDelete: () => void }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 10,
            background: 'rgba(255,255,255,0.05)',
        }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{workflow.icon ?? '⚡'}</span>
            <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {workflow.name}
            </span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginRight: 4 }}>
                {workflow.appIds.length} apps
            </span>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onLaunch} style={{ ...btnStyle, background: 'rgba(71,158,245,0.2)', color: '#79c0ff' }}>
                ▶
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={onDelete} style={{ ...btnStyle, background: 'rgba(255,80,80,0.15)', color: '#f87171' }}>
                <Trash2 size={12} />
            </motion.button>
        </div>
    );
}

const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 12, flexShrink: 0,
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export function IntelliSensePanel({ visible, onClose }: Props) {
    const { suggestions, workflows, deleteWorkflow, focusedAppId } = useIntelliSense();
    const { openWindow } = useWindowManager();
    const { currentUser } = useSession();
    const [showBuilder, setShowBuilder] = useState(false);

    const handleOpen = (appId: string) => {
        openWindow(appId);
    };

    const handleLaunchWorkflow = (workflow: ParsedWorkflow) => {
        workflow.appIds.forEach((id, i) => {
            setTimeout(() => openWindow(id), i * 120);
        });
    };

    // Split suggestions into time-based and rest
    const timeSuggestions = suggestions.filter(s => s.reason === 'time_based' || s.reason === 'sequence').slice(0, 3);
    const frequentSuggestions = suggestions.filter(s => !timeSuggestions.find(t => t.targetId === s.targetId)).slice(0, 4);

    const greeting = getGreeting();
    const name = currentUser?.name?.split(' ')[0] ?? 'Doctor';

    return (
        <>
            <AnimatePresence>
                {visible && (
                    <motion.div
                        key="ils-panel"
                        initial={{ x: 320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 320, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                        style={{
                            position: 'fixed',
                            right: 12,
                            bottom: 60,
                            width: 320,
                            maxHeight: 'calc(100vh - 90px)',
                            overflowY: 'auto',
                            borderRadius: 16,
                            background: 'rgba(20,20,28,0.85)',
                            backdropFilter: 'blur(32px) saturate(1.4)',
                            WebkitBackdropFilter: 'blur(32px) saturate(1.4)',
                            border: '1px solid rgba(255,255,255,0.10)',
                            boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
                            zIndex: 9500,
                            padding: '16px 14px 14px',
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.92)' }}>
                                    ✦ Intellisense
                                </div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 1 }}>
                                    {greeting}, {name}
                                </div>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={onClose}
                                style={{
                                    width: 28, height: 28, borderRadius: 8, border: 'none',
                                    background: 'rgba(255,255,255,0.07)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.5)',
                                }}
                            >
                                <X size={14} />
                            </motion.button>
                        </div>

                        {/* Sugerido para ahora */}
                        {timeSuggestions.length > 0 && (
                            <Section title={focusedAppId ? 'Siguiente paso' : 'Para esta hora'}>
                                {timeSuggestions.map(s => (
                                    <SuggestedAppCard key={s.id} item={s} onOpen={handleOpen} />
                                ))}
                            </Section>
                        )}

                        {/* Apps frecuentes */}
                        {frequentSuggestions.length > 0 && (
                            <Section title="Apps frecuentes">
                                {frequentSuggestions.map(s => (
                                    <SuggestedAppCard key={s.id} item={s} onOpen={handleOpen} />
                                ))}
                            </Section>
                        )}

                        {/* Sugerencias vacías */}
                        {suggestions.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 12, padding: '24px 0' }}>
                                Sigue usando Galeno para ver sugerencias personalizadas
                            </div>
                        )}

                        {/* Flujos de trabajo */}
                        <Section title="Flujos de trabajo">
                            {workflows.map(wf => (
                                <WorkflowRow
                                    key={wf.id}
                                    workflow={wf}
                                    onLaunch={() => handleLaunchWorkflow(wf)}
                                    onDelete={() => deleteWorkflow(wf.id)}
                                />
                            ))}
                            <motion.button
                                whileHover={{ background: 'rgba(71,158,245,0.12)' }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setShowBuilder(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    padding: '7px 10px', borderRadius: 10,
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px dashed rgba(255,255,255,0.12)',
                                    cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
                                    fontSize: 12, width: '100%', transition: 'background 0.15s',
                                }}
                            >
                                <Plus size={14} /> Nuevo flujo de trabajo
                            </motion.button>
                        </Section>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Workflow Builder modal */}
            {showBuilder && <WorkflowBuilder onClose={() => setShowBuilder(false)} />}
        </>
    );
}
