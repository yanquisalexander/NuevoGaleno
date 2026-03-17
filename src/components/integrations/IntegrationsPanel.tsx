import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Blocks, Clock3, FileCode2, ListChecks } from 'lucide-react';
import { BlocklyFlowEditor } from '@/components/integrations/BlocklyFlowEditor';

const BLOCKLY_FLUENT_PALETTE = {
    trigger: '#0078d4',
    network: '#d86a00',
    control: '#c19c00',
    notify: '#13834b',
    procedure: '#8a3ffc',
    workspaceBackground: '#1b1b1b',
};

type EventType = 'patient:create' | 'appointment:create';

type IntegrationCommand = {
    command: string;
    config: Record<string, unknown>;
};

type IntegrationFlow = {
    id: number;
    name: string;
    event_type: EventType;
    enabled: boolean;
    commands: IntegrationCommand[];
    updated_at: string;
};

type IntegrationProcedure = {
    id: number;
    name: string;
    description?: string;
    version: number;
    commands: IntegrationCommand[];
    updated_at: string;
};

type IntegrationRun = {
    id: number;
    flow_id: number;
    event_type: EventType;
    status: 'running' | 'success' | 'failed';
    error?: string;
    started_at: string;
    finished_at?: string;
};

type FlowDraft = {
    eventType: EventType;
    commands: IntegrationCommand[];
    errors: string[];
};

const ROOT_NOTE = 'Bloque principal: onTriggered(event)';

function defaultWebhookCommand(): IntegrationCommand {
    return {
        command: 'http.request',
        config: {
            method: 'POST',
            url: 'https://example.com/webhook',
            headers: { 'Content-Type': 'application/json' },
            body: { source: 'nuevogaleno', event: '{{event}}' },
            timeoutMs: 15000,
        },
    };
}

export function IntegrationsPanel() {
    const [flows, setFlows] = useState<IntegrationFlow[]>([]);
    const [procedures, setProcedures] = useState<IntegrationProcedure[]>([]);
    const [runs, setRuns] = useState<IntegrationRun[]>([]);

    const [flowName, setFlowName] = useState('');
    const [flowEnabled, setFlowEnabled] = useState(true);
    const [composerOpen, setComposerOpen] = useState(false);
    const [editingFlowId, setEditingFlowId] = useState<number | null>(null);
    const [editorSeed, setEditorSeed] = useState(0);
    const [initialFlow, setInitialFlow] = useState<{ eventType: EventType; commands: IntegrationCommand[] } | undefined>(undefined);
    const [flowDraft, setFlowDraft] = useState<FlowDraft>({
        eventType: 'patient:create',
        commands: [defaultWebhookCommand()],
        errors: [],
    });

    const loadAll = useCallback(async () => {
        try {
            const [nextFlows, nextProcedures, nextRuns] = await Promise.all([
                invoke<IntegrationFlow[]>('integration_list_flows'),
                invoke<IntegrationProcedure[]>('integration_list_procedures'),
                invoke<IntegrationRun[]>('integration_list_runs', { limit: 80 }),
            ]);
            setFlows(nextFlows);
            setProcedures(nextProcedures);
            setRuns(nextRuns);
        } catch (error) {
            console.error(error);
            toast.error('No se pudo cargar Integraciones');
        }
    }, []);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const eventCounts = useMemo(() => {
        return {
            patient: flows.filter((f) => f.event_type === 'patient:create').length,
            appointment: flows.filter((f) => f.event_type === 'appointment:create').length,
        };
    }, [flows]);

    const onDraftChange = useCallback((draft: FlowDraft) => {
        setFlowDraft(draft);
    }, []);

    async function createFlow() {
        if (!flowName.trim()) {
            toast.error('Nombre de flow requerido');
            return;
        }

        try {
            const input = {
                name: flowName.trim(),
                event_type: flowDraft.eventType,
                enabled: flowEnabled,
                commands: flowDraft.commands,
            };

            if (editingFlowId) {
                await invoke('integration_update_flow', { id: editingFlowId, input });
                toast.success('Flow actualizado');
            } else {
                await invoke('integration_create_flow', { input });
                toast.success('Flow creado desde Blockly');
            }

            setFlowName('');
            setFlowEnabled(true);
            setEditingFlowId(null);
            setInitialFlow(undefined);
            setComposerOpen(false);
            await loadAll();
        } catch (error) {
            console.error(error);
            toast.error('Error creando flow');
        }
    }

    function startNewFlow() {
        setEditingFlowId(null);
        setFlowName('');
        setFlowEnabled(true);
        setInitialFlow(undefined);
        setEditorSeed((prev) => prev + 1);
        setComposerOpen(true);
    }

    function startEditFlow(flow: IntegrationFlow) {
        setEditingFlowId(flow.id);
        setFlowName(flow.name);
        setFlowEnabled(flow.enabled);
        setInitialFlow({ eventType: flow.event_type, commands: flow.commands });
        setEditorSeed((prev) => prev + 1);
        setComposerOpen(true);
    }

    function cancelComposer() {
        setComposerOpen(false);
        setEditingFlowId(null);
        setInitialFlow(undefined);
        setFlowName('');
        setFlowEnabled(true);
    }

    const saveProcedureToBackpack = useCallback(async (payload: {
        commands: IntegrationCommand[];
        suggestedName: string;
    }) => {
        if (!payload.commands.length) {
            toast.error('No hay comandos para guardar en Backpack');
            return;
        }

        const name = window.prompt('Nombre de la Procedure (Backpack):', payload.suggestedName)?.trim();
        if (!name) return;

        try {
            await invoke('integration_create_procedure', {
                input: {
                    name,
                    description: 'Guardada desde Blockly Backpack',
                    commands: payload.commands,
                },
            });
            toast.success('Procedure guardada en Backpack');
            await loadAll();
        } catch (error) {
            console.error(error);
            toast.error('No se pudo guardar la Procedure');
        }
    }, [loadAll]);

    async function toggleFlowEnabled(flow: IntegrationFlow) {
        try {
            await invoke('integration_update_flow', {
                id: flow.id,
                input: {
                    name: flow.name,
                    event_type: flow.event_type,
                    enabled: !flow.enabled,
                    commands: flow.commands,
                },
            });
            await loadAll();
        } catch (error) {
            console.error(error);
            toast.error('No se pudo actualizar el flow');
        }
    }

    async function deleteFlow(flowId: number, flowName: string) {
        const confirmed = window.confirm(`Eliminar flow "${flowName}"? Esta accion no se puede deshacer.`);
        if (!confirmed) return;

        try {
            await invoke('integration_delete_flow', { id: flowId });
            toast.success('Flow eliminado');
            await loadAll();
        } catch (error) {
            console.error(error);
            toast.error('No se pudo eliminar el flow');
        }
    }

    async function deleteProcedure(procedureId: number, procedureName: string) {
        const confirmed = window.confirm(
            `Eliminar procedure "${procedureName}"? Esta accion no se puede deshacer.`
        );
        if (!confirmed) return;

        try {
            await invoke('integration_delete_procedure', { id: procedureId });
            toast.success('Procedure eliminada');
            await loadAll();
        } catch (error) {
            console.error(error);
            toast.error('No se pudo eliminar la Procedure');
        }
    }

    async function testEvent(eventType: EventType) {
        try {
            const executedRuns = await invoke<number>('integration_trigger_event', {
                input: {
                    event_type: eventType,
                    payload: {
                        eventType,
                        test: true,
                        emittedAt: new Date().toISOString(),
                    },
                },
            });
            toast.success(`Evento disparado. Runs ejecutados: ${executedRuns}`);
            await loadAll();
        } catch (error) {
            console.error(error);
            toast.error('No se pudo disparar el evento de prueba');
        }
    }

    return (
        <div className="relative w-full h-full text-[#e4e4e4]">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#1a1a1a_0%,#202020_50%,#252525_100%)] pointer-events-none" />
            <div className="relative grid gap-4">
                <section className="rounded-lg border border-white/[0.10] bg-[#1f1f1f]/70 backdrop-blur-xl p-4">
                    <div className="flex items-center gap-2 text-[18px] font-semibold text-white/90">
                        <Blocks size={18} /> Integraciones
                    </div>
                    <p className="mt-1 text-[12px] text-white/50">
                        {ROOT_NOTE}. Eventos predefinidos y comandos reutilizables.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 text-[12px] rounded bg-[#0078d4] hover:bg-[#106ebe]" onClick={() => void testEvent('patient:create')}>
                            Test patient:create ({eventCounts.patient})
                        </button>
                        <button className="px-3 py-1.5 text-[12px] rounded bg-[#2d2d2d] hover:bg-[#363636]" onClick={() => void testEvent('appointment:create')}>
                            Test appointment:create ({eventCounts.appointment})
                        </button>
                        {!composerOpen ? (
                            <button className="px-3 py-1.5 text-[12px] rounded bg-[#0f4f8c] hover:bg-[#0f5ea9]" onClick={startNewFlow}>
                                + Nuevo Workflow
                            </button>
                        ) : (
                            <button className="px-3 py-1.5 text-[12px] rounded bg-[#353535] hover:bg-[#444]" onClick={cancelComposer}>
                                Ocultar editor
                            </button>
                        )}
                    </div>
                </section>

                {composerOpen && (
                    <div className="grid grid-cols-1 gap-4">
                        <section className="rounded-lg border border-white/[0.10] bg-[#1f1f1f]/70 backdrop-blur-xl p-4">
                            <h3 className="text-[16px] font-semibold text-white/90">
                                {editingFlowId ? 'Editar Workflow (Blockly)' : 'Nuevo Workflow (Blockly)'}
                            </h3>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                                <input
                                    value={flowName}
                                    onChange={(e) => setFlowName(e.target.value)}
                                    placeholder="Nombre del flow"
                                    className="h-9 rounded border border-white/[0.14] bg-[#171717] px-3 text-[13px]"
                                />
                                <label className="inline-flex items-center gap-2 rounded border border-white/[0.14] bg-[#171717] px-3 text-[12px]">
                                    <input type="checkbox" checked={flowEnabled} onChange={(e) => setFlowEnabled(e.target.checked)} />
                                    Activo
                                </label>
                            </div>

                            <div className="mt-3">
                                <BlocklyFlowEditor
                                    key={editorSeed}
                                    onDraftChange={onDraftChange}
                                    onSaveToBackpack={saveProcedureToBackpack}
                                    initialFlow={initialFlow}
                                    palette={BLOCKLY_FLUENT_PALETTE}
                                />
                            </div>

                            {flowDraft.errors.length > 0 && (
                                <div className="mt-3 rounded border border-[#ffb4b4]/40 bg-[#3a1f1f] px-3 py-2 text-[12px] text-[#ffb4b4]">
                                    {flowDraft.errors[0]}
                                </div>
                            )}

                            <div className="mt-3 flex items-center gap-2">
                                <button className="px-3 py-2 text-[13px] rounded bg-[#0078d4] hover:bg-[#106ebe]" onClick={() => void createFlow()}>
                                    {editingFlowId ? 'Guardar cambios' : 'Guardar Flow'}
                                </button>
                                <button className="px-3 py-2 text-[13px] rounded bg-[#2d2d2d] hover:bg-[#363636]" onClick={cancelComposer}>
                                    Cancelar
                                </button>
                            </div>
                        </section>
                    </div>
                )}

                <section className="rounded-lg border border-white/[0.10] bg-[#1f1f1f]/70 backdrop-blur-xl p-4">
                    <div className="flex items-center gap-2 text-[15px] font-semibold text-white/90"><FileCode2 size={16} /> Flows</div>
                    <p className="mt-1 text-[12px] text-white/50">Activa, desactiva o elimina flows existentes.</p>
                    <div className="mt-3 grid gap-2">
                        {flows.map((flow) => (
                            <div key={flow.id} className="rounded border border-white/[0.10] bg-[#171717] p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-[13px] text-white/90">{flow.name}</div>
                                        <div className="text-[12px] text-white/50">
                                            {flow.event_type} · comandos: {flow.commands.length}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="px-2 py-1 text-[12px] rounded bg-[#2d2d2d] hover:bg-[#363636]" onClick={() => void toggleFlowEnabled(flow)}>{flow.enabled ? 'Desactivar' : 'Activar'}</button>
                                        <button className="px-2 py-1 text-[12px] rounded bg-[#0f4f8c] hover:bg-[#0f5ea9]" onClick={() => startEditFlow(flow)}>Editar</button>
                                        <button className="px-2 py-1 text-[12px] rounded bg-[#5a1f1f] hover:bg-[#6d2525] text-[#ffcdcd]" onClick={() => void deleteFlow(flow.id, flow.name)}>Eliminar</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {flows.length === 0 && <div className="text-[12px] text-white/50">Sin flows creados.</div>}
                    </div>
                </section>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <section className="rounded-lg border border-white/[0.10] bg-[#1f1f1f]/70 backdrop-blur-xl p-4">
                        <div className="flex items-center gap-2 text-[15px] font-semibold text-white/90"><ListChecks size={16} /> Procedures</div>
                        <p className="mt-1 text-[12px] text-white/50">Se crean desde Blockly: click derecho sobre una cadena de bloques y guardar en Backpack.</p>
                        <div className="mt-3 grid gap-2">
                            {procedures.map((procedure) => (
                                <div key={procedure.id} className="rounded border border-white/[0.10] bg-[#171717] p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <div className="text-[13px] text-white/90">{procedure.name} (v{procedure.version})</div>
                                            <div className="text-[12px] text-white/50">
                                                {procedure.description || 'Sin descripcion'} · comandos: {procedure.commands.length}
                                            </div>
                                        </div>
                                        <button
                                            className="px-2 py-1 text-[12px] rounded bg-[#5a1f1f] hover:bg-[#6d2525] text-[#ffcdcd]"
                                            onClick={() => void deleteProcedure(procedure.id, procedure.name)}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {procedures.length === 0 && <div className="text-[12px] text-white/50">Sin procedures creadas.</div>}
                        </div>
                    </section>

                    <section className="rounded-lg border border-white/[0.10] bg-[#1f1f1f]/70 backdrop-blur-xl p-4">
                        <div className="flex items-center gap-2 text-[15px] font-semibold text-white/90"><Clock3 size={16} /> Historial de Runs</div>
                        <div className="mt-3 grid gap-1">
                            {runs.map((run) => (
                                <div key={run.id} className="grid grid-cols-[70px_160px_1fr] gap-2 text-[12px] rounded border border-white/[0.08] bg-[#171717] px-2 py-1.5">
                                    <span>#{run.id}</span>
                                    <span>{run.event_type}</span>
                                    <span className={run.status === 'failed' ? 'text-[#ffb4b4]' : 'text-white/80'}>
                                        {run.status}{run.error ? ` · ${run.error}` : ''}
                                    </span>
                                </div>
                            ))}
                            {runs.length === 0 && <div className="text-[12px] text-white/50">Sin ejecuciones.</div>}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
