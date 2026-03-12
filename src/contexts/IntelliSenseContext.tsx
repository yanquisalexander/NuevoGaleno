import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    useCallback,
} from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSession } from '@/hooks/useSession';
import { useWindowManager } from '@/contexts/WindowManagerContext';
import {
    buildPatterns,
    computeSuggestions,
    getRecentPatientIds,
    shouldShowBriefing,
    markBriefingShown,
} from '@/lib/IntelliSenseEngine';
import type {
    IntelliSenseEvent,
    SuggestionItem,
    ParsedWorkflow,
    CreateWorkflowInput as WorkflowInput,
} from '@/types/intellisense';

// ─── Context type ─────────────────────────────────────────────────────────────

interface IntelliSenseContextType {
    /** Sugerencias de apps ordenadas por puntaje */
    suggestions: SuggestionItem[];
    /** IDs de pacientes vistos recientemente */
    recentPatientIds: number[];
    /** Flujos de trabajo guardados */
    workflows: ParsedWorkflow[];
    isLoading: boolean;

    /** Registra un evento de apertura de app (llamado automáticamente vía WindowManager) */
    recordAppOpen: (appId: string) => void;
    /** Registra que el doctor visitó un paciente */
    recordPatientViewed: (patientId: number) => void;
    /** Guarda un nuevo flujo de trabajo */
    saveWorkflow: (input: Omit<WorkflowInput, 'user_id'>) => Promise<void>;
    /** Elimina un flujo de trabajo */
    deleteWorkflow: (id: number) => Promise<void>;
    /** Indica si debe mostrarse el briefing matutino hoy */
    shouldBrief: boolean;
    /** Marca el briefing como mostrado (persiste hasta medianoche) */
    markBriefingDone: () => void;
    /** ID del app actualmente enfocado (para sugerencias de secuencia) */
    focusedAppId: string | undefined;
}

const IntelliSenseContext = createContext<IntelliSenseContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

const EVENT_LIMIT = 500;

export function IntelliSenseProvider({ children }: { children: React.ReactNode }) {
    const { currentUser } = useSession();
    const { windows } = useWindowManager();

    const [events, setEvents] = useState<IntelliSenseEvent[]>([]);
    const [workflows, setWorkflows] = useState<ParsedWorkflow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [shouldBrief, setShouldBrief] = useState(false);

    const prevWindowIdsRef = useRef<Set<string>>(new Set());
    const userId = currentUser ? String(currentUser.id) : null;

    // ── Load events and workflows from DB when user changes ───────────────────
    useEffect(() => {
        if (!userId) {
            setEvents([]);
            setWorkflows([]);
            setShouldBrief(false);
            return;
        }

        setIsLoading(true);

        Promise.all([
            invoke<IntelliSenseEvent[]>('intellisense_get_events', { userId, limit: EVENT_LIMIT }),
            invoke<{ id: number; user_id: string; name: string; app_ids: string; icon: string | null; created_at: string }[]>(
                'intellisense_get_workflows', { userId }
            ),
            invoke<void>('intellisense_prune_events', { userId }),
        ])
            .then(([evs, wfs]) => {
                setEvents(evs);
                setWorkflows(
                    wfs.map(w => ({
                        id: w.id,
                        name: w.name,
                        appIds: safeParseJson(w.app_ids, []),
                        icon: w.icon,
                        createdAt: w.created_at,
                    }))
                );
                setShouldBrief(shouldShowBriefing(userId));
            })
            .catch(err => console.error('[IntelliSense] load error:', err))
            .finally(() => setIsLoading(false));
    }, [userId]);

    // ── Track window opens via diff ───────────────────────────────────────────
    useEffect(() => {
        if (!userId) return;

        const currentIds = new Set(windows.map(w => w.id));
        const prev = prevWindowIdsRef.current;

        // Find newly added windows
        for (const w of windows) {
            if (!prev.has(w.id)) {
                // new window opened
                persistEvent(userId, 'app:open', JSON.stringify({ appId: w.appId }));
            }
        }

        prevWindowIdsRef.current = currentIds;
    }, [windows, userId]);

    // ── Derive focused app ────────────────────────────────────────────────────
    const focusedWindow = windows.find(w => w.isFocused);
    const focusedAppId = focusedWindow?.appId;

    // ── Persist event to DB and update local state ────────────────────────────
    const persistEvent = useCallback(
        async (uid: string, eventType: string, payload: string | null) => {
            const now = new Date();
            try {
                const id = await invoke<number>('intellisense_create_event', {
                    input: {
                        user_id: uid,
                        event_type: eventType,
                        payload,
                        hour: now.getHours(),
                        day_of_week: now.getDay(),
                    },
                });
                const newEv: IntelliSenseEvent = {
                    id,
                    user_id: uid,
                    event_type: eventType as IntelliSenseEvent['event_type'],
                    payload,
                    hour: now.getHours(),
                    day_of_week: now.getDay(),
                    created_at: now.toISOString(),
                };
                setEvents(prev => [newEv, ...prev].slice(0, EVENT_LIMIT));
            } catch (err) {
                console.error('[IntelliSense] persistEvent error:', err);
            }
        },
        []
    );

    const recordAppOpen = useCallback(
        (appId: string) => {
            if (!userId) return;
            persistEvent(userId, 'app:open', JSON.stringify({ appId }));
        },
        [userId, persistEvent]
    );

    const recordPatientViewed = useCallback(
        (patientId: number) => {
            if (!userId) return;
            persistEvent(userId, 'patient:viewed', JSON.stringify({ patientId }));
        },
        [userId, persistEvent]
    );

    // ── Workflow management ───────────────────────────────────────────────────
    const saveWorkflow = useCallback(
        async (input: Omit<WorkflowInput, 'user_id'>) => {
            if (!userId) return;
            const id = await invoke<number>('intellisense_create_workflow', {
                input: { ...input, user_id: userId },
            });
            setWorkflows(prev => [
                ...prev,
                {
                    id,
                    name: input.name,
                    appIds: safeParseJson(input.app_ids, []),
                    icon: input.icon ?? null,
                    createdAt: new Date().toISOString(),
                },
            ]);
        },
        [userId]
    );

    const deleteWorkflow = useCallback(
        async (id: number) => {
            if (!userId) return;
            await invoke<void>('intellisense_delete_workflow', { id, userId });
            setWorkflows(prev => prev.filter(w => w.id !== id));
        },
        [userId]
    );

    const markBriefingDone = useCallback(() => {
        if (!userId) return;
        markBriefingShown(userId);
        setShouldBrief(false);
    }, [userId]);

    // ── Compute suggestions ───────────────────────────────────────────────────
    const patterns = buildPatterns(events);
    const suggestions = computeSuggestions(patterns, {
        currentAppId: focusedAppId,
        now: new Date(),
        limit: 8,
    });
    const recentPatientIds = getRecentPatientIds(events, 5);

    return (
        <IntelliSenseContext.Provider
            value={{
                suggestions,
                recentPatientIds,
                workflows,
                isLoading,
                recordAppOpen,
                recordPatientViewed,
                saveWorkflow,
                deleteWorkflow,
                shouldBrief,
                markBriefingDone,
                focusedAppId,
            }}
        >
            {children}
        </IntelliSenseContext.Provider>
    );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson<T>(str: string, fallback: T): T {
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useIntelliSense(): IntelliSenseContextType {
    const ctx = useContext(IntelliSenseContext);
    if (!ctx) throw new Error('useIntelliSense must be used within IntelliSenseProvider');
    return ctx;
}
