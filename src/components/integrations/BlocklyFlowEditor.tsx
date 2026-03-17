import { useEffect, useMemo, useRef } from 'react';
import * as Blockly from 'blockly';

type EventType = 'patient:create' | 'appointment:create';

type IntegrationCommand = {
    command: string;
    config: Record<string, unknown>;
};

type FlowDraft = {
    eventType: EventType;
    commands: IntegrationCommand[];
    errors: string[];
};

type BlocklyFlowEditorProps = {
    className?: string;
    onDraftChange: (draft: FlowDraft) => void;
    onSaveToBackpack?: (payload: { commands: IntegrationCommand[]; suggestedName: string }) => void;
    initialFlow?: { eventType: EventType; commands: IntegrationCommand[] };
    palette?: {
        trigger: string;
        network: string;
        control: string;
        notify: string;
        procedure: string;
        workspaceBackground: string;
    };
};

const TOOLBOX = {
    kind: 'categoryToolbox',
    contents: [
        {
            kind: 'category',
            name: 'Network',
            colour: '#d86a00',
            contents: [{ kind: 'block', type: 'integration_http_request' }],
        },
        {
            kind: 'category',
            name: 'Control',
            colour: '#c19c00',
            contents: [{ kind: 'block', type: 'integration_delay' }],
        },
        {
            kind: 'category',
            name: 'UI',
            colour: '#13834b',
            contents: [{ kind: 'block', type: 'integration_notify' }],
        },
        {
            kind: 'category',
            name: 'Procedures',
            colour: '#8a3ffc',
            contents: [{ kind: 'block', type: 'integration_procedure_call' }],
        },
    ],
};

function registerBlocks() {
    if ((Blockly as any).Blocks.integration_on_triggered) {
        return;
    }

    Blockly.common.defineBlocksWithJsonArray([
        {
            type: 'integration_on_triggered',
            message0: 'onTriggered %1',
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'EVENT',
                    options: [
                        ['patient:create', 'patient:create'],
                        ['appointment:create', 'appointment:create'],
                    ],
                },
            ],
            nextStatement: null,
            colour: 210,
            tooltip: 'Bloque raiz obligatorio del flujo.',
        },
        {
            type: 'integration_http_request',
            message0: 'http.request %1 url %2',
            args0: [
                {
                    type: 'field_dropdown',
                    name: 'METHOD',
                    options: [
                        ['POST', 'POST'],
                        ['GET', 'GET'],
                        ['PUT', 'PUT'],
                        ['PATCH', 'PATCH'],
                        ['DELETE', 'DELETE'],
                    ],
                },
                {
                    type: 'field_input',
                    name: 'URL',
                    text: 'https://example.com/webhook',
                },
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 20,
            tooltip: 'Llamada HTTP.',
        },
        {
            type: 'integration_delay',
            message0: 'delay %1 ms',
            args0: [
                {
                    type: 'field_number',
                    name: 'MS',
                    value: 250,
                    min: 0,
                    precision: 1,
                },
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 45,
            tooltip: 'Pausa la ejecucion.',
        },
        {
            type: 'integration_notify',
            message0: 'notify.ui mensaje %1',
            args0: [
                {
                    type: 'field_input',
                    name: 'MESSAGE',
                    text: 'Flow ejecutado',
                },
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 120,
            tooltip: 'Notificacion local.',
        },
        {
            type: 'integration_procedure_call',
            message0: 'procedure.call nombre %1',
            args0: [
                {
                    type: 'field_input',
                    name: 'PROCEDURE_NAME',
                    text: 'mi_procedure',
                },
            ],
            previousStatement: null,
            nextStatement: null,
            colour: 300,
            tooltip: 'Ejecuta una procedure existente.',
        },
    ]);
}

function buildCommandFromBlock(block: Blockly.BlockSvg): {
    command: IntegrationCommand | null;
    error: string | null;
} {
    switch (block.type) {
        case 'integration_http_request': {
            const method = block.getFieldValue('METHOD') || 'POST';
            const url = (block.getFieldValue('URL') || '').trim();
            if (!url) {
                return { command: null, error: 'http.request requiere URL' };
            }
            return {
                command: {
                    command: 'http.request',
                    config: {
                        method,
                        url,
                        headers: { 'Content-Type': 'application/json' },
                        body: { source: 'nuevogaleno', event: '{{event}}' },
                        timeoutMs: 15000,
                    },
                },
                error: null,
            };
        }
        case 'integration_delay': {
            const ms = Number(block.getFieldValue('MS') || 0);
            return { command: { command: 'delay', config: { ms } }, error: null };
        }
        case 'integration_notify': {
            const message = block.getFieldValue('MESSAGE') || 'Flow ejecutado';
            return { command: { command: 'notify.ui', config: { message } }, error: null };
        }
        case 'integration_procedure_call': {
            const procedureName = String(block.getFieldValue('PROCEDURE_NAME') || '').trim();
            if (!procedureName) {
                return { command: null, error: 'procedure.call requiere nombre de procedure' };
            }
            return {
                command: { command: 'procedure.call', config: { procedureName } },
                error: null,
            };
        }
        default:
            return { command: null, error: `Bloque no soportado: ${block.type}` };
    }
}

function buildCommandsFromChain(startBlock: Blockly.BlockSvg | null): {
    commands: IntegrationCommand[];
    errors: string[];
} {
    const commands: IntegrationCommand[] = [];
    const errors: string[] = [];
    let current = startBlock;

    while (current) {
        const result = buildCommandFromBlock(current);
        if (result.error) {
            errors.push(result.error);
        }
        if (result.command) {
            commands.push(result.command);
        }
        current = current.getNextBlock() as Blockly.BlockSvg | null;
    }

    return { commands, errors };
}

function parseDraft(workspace: Blockly.WorkspaceSvg): FlowDraft {
    const topBlocks = workspace.getTopBlocks(true);
    const roots = topBlocks.filter((block) => block.type === 'integration_on_triggered');
    const root = roots[0];

    if (roots.length > 1) {
        return {
            eventType: 'patient:create',
            commands: [],
            errors: ['Solo puede existir un bloque raiz onTriggered.'],
        };
    }

    if (!root) {
        return {
            eventType: 'patient:create',
            commands: [],
            errors: ['Falta bloque raiz onTriggered.'],
        };
    }

    const eventType = (root.getFieldValue('EVENT') as EventType) || 'patient:create';
    const { commands, errors } = buildCommandsFromChain(root.getNextBlock() as Blockly.BlockSvg | null);

    return {
        eventType,
        commands,
        errors,
    };
}

function applyBlockColor(block: Blockly.BlockSvg, palette: NonNullable<BlocklyFlowEditorProps['palette']>) {
    if (block.type === 'integration_on_triggered') block.setColour(palette.trigger);
    if (block.type === 'integration_http_request') block.setColour(palette.network);
    if (block.type === 'integration_delay') block.setColour(palette.control);
    if (block.type === 'integration_notify') block.setColour(palette.notify);
    if (block.type === 'integration_procedure_call') block.setColour(palette.procedure);
}

function createBlockFromCommand(workspace: Blockly.WorkspaceSvg, command: IntegrationCommand): Blockly.BlockSvg | null {
    if (command.command === 'http.request') {
        const block = workspace.newBlock('integration_http_request');
        const method = String(command.config.method || 'POST');
        const url = String(command.config.url || 'https://example.com/webhook');
        block.setFieldValue(method, 'METHOD');
        block.setFieldValue(url, 'URL');
        return block;
    }
    if (command.command === 'delay') {
        const block = workspace.newBlock('integration_delay');
        const ms = Number(command.config.ms || 250);
        block.setFieldValue(String(ms), 'MS');
        return block;
    }
    if (command.command === 'notify.ui') {
        const block = workspace.newBlock('integration_notify');
        const message = String(command.config.message || 'Flow ejecutado');
        block.setFieldValue(message, 'MESSAGE');
        return block;
    }
    if (command.command === 'procedure.call') {
        const block = workspace.newBlock('integration_procedure_call');
        const procedureName = String(
            command.config.procedureName || command.config.procedureId || 'mi_procedure'
        );
        block.setFieldValue(procedureName, 'PROCEDURE_NAME');
        return block;
    }
    return null;
}

export function BlocklyFlowEditor({
    className,
    onDraftChange,
    onSaveToBackpack,
    initialFlow,
    palette,
}: BlocklyFlowEditorProps) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);

    const resolvedPalette = useMemo(
        () =>
            palette || {
                trigger: '#0078d4',
                network: '#d86a00',
                control: '#c19c00',
                notify: '#13834b',
                procedure: '#8a3ffc',
                workspaceBackground: '#1b1b1b',
            },
        [palette]
    );

    const baseClassName = useMemo(
        () =>
            className || 'h-[620px] w-full overflow-hidden rounded-[8px] border border-white/[0.10]',
        [className]
    );

    useEffect(() => {
        registerBlocks();

        if (!hostRef.current) {
            return;
        }

        const workspace = Blockly.inject(hostRef.current, {
            toolbox: TOOLBOX as any,
            move: {
                scrollbars: true,
                drag: true,
                wheel: true,
            },
            zoom: {
                controls: true,
                wheel: true,
                startScale: 0.95,
                maxScale: 1.8,
                minScale: 0.4,
                scaleSpeed: 1.08,
            },
            trashcan: true,
            theme: Blockly.Themes.Zelos,
        });

        workspaceRef.current = workspace;
        (workspace as any).integrationSaveToBackpack = onSaveToBackpack;

        const attachBackpackContextMenu = (block: Blockly.BlockSvg) => {
            block.customContextMenu = (options: any[]) => {
                const start =
                    block.type === 'integration_on_triggered'
                        ? (block.getNextBlock() as Blockly.BlockSvg | null)
                        : block;

                const { commands, errors } = buildCommandsFromChain(start);
                const disabled = commands.length === 0 || errors.length > 0;

                options.push({
                    text:
                        block.type === 'integration_on_triggered'
                            ? 'Guardar flow como Procedure en Backpack'
                            : 'Guardar desde aqui en Backpack',
                    enabled: !disabled,
                    callback: () => {
                        const saveFn = (workspace as any).integrationSaveToBackpack as
                            | ((payload: { commands: IntegrationCommand[]; suggestedName: string }) => void)
                            | undefined;

                        if (!saveFn) return;

                        const suggestedName =
                            block.type === 'integration_on_triggered'
                                ? 'procedure_from_flow'
                                : `procedure_from_${block.type}`;

                        saveFn({ commands, suggestedName });
                    },
                });
            };
        };

        const root = workspace.newBlock('integration_on_triggered');
        root.initSvg();
        root.render();
        root.setMovable(false);
        root.setDeletable(false);
        root.setFieldValue(initialFlow?.eventType || 'patient:create', 'EVENT');
        applyBlockColor(root, resolvedPalette);
        root.moveBy(30, 30);
        attachBackpackContextMenu(root);

        const commandsToLoad =
            initialFlow && initialFlow.commands.length > 0
                ? initialFlow.commands
                : [
                    {
                        command: 'http.request',
                        config: { method: 'POST', url: 'https://example.com/webhook' },
                    },
                ];

        let previous = root;
        let yOffset = 100;
        commandsToLoad.forEach((command) => {
            const block = createBlockFromCommand(workspace, command);
            if (!block) return;
            block.initSvg();
            block.render();
            block.moveBy(30, yOffset);
            yOffset += 68;
            applyBlockColor(block, resolvedPalette);
            attachBackpackContextMenu(block);
            previous.nextConnection?.connect(block.previousConnection);
            previous = block;
        });

        const emitDraft = () => {
            onDraftChange(parseDraft(workspace));
        };

        const listener = () => {
            const roots = workspace.getTopBlocks(true).filter((block) => block.type === 'integration_on_triggered');
            if (roots.length === 0) {
                const newRoot = workspace.newBlock('integration_on_triggered');
                newRoot.initSvg();
                newRoot.render();
                newRoot.setMovable(false);
                newRoot.setDeletable(false);
                newRoot.moveBy(30, 30);
                applyBlockColor(newRoot, resolvedPalette);
                attachBackpackContextMenu(newRoot);
            } else if (roots.length > 1) {
                // Keep first root and remove extras to preserve invariant.
                roots.slice(1).forEach((block) => block.dispose(true));
            }
            workspace.getAllBlocks(false).forEach((block) => {
                applyBlockColor(block as Blockly.BlockSvg, resolvedPalette);
                attachBackpackContextMenu(block as Blockly.BlockSvg);
            });
            emitDraft();
        };
        workspace.addChangeListener(listener);
        emitDraft();

        const onResize = () => Blockly.svgResize(workspace);
        window.addEventListener('resize', onResize);

        return () => {
            window.removeEventListener('resize', onResize);
            workspace.removeChangeListener(listener);
            workspace.dispose();
            workspaceRef.current = null;
        };
    }, [onDraftChange, onSaveToBackpack, initialFlow, resolvedPalette]);

    return <div ref={hostRef} className={baseClassName} style={{ background: resolvedPalette.workspaceBackground }} />;
}
