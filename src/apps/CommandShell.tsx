import { useState, useRef, useEffect } from 'react';
import type { WindowId } from '../types/window-manager';
import { useWindowManager } from '../contexts/WindowManagerContext';
import { useAppRuntime } from '../hooks/useAppRuntime';
import { useSessionContext } from '../contexts/SessionContext';
import { usePatients } from '../hooks/usePatients';
import React from 'react';
import { useCommandRegistry } from '../contexts/CommandContext';

interface CommandHandler {
    description: string;
    run: (
        args: string[],
        allCommands?: Record<string, CommandHandler>
    ) =>
        | string
        | React.ReactNode
        | HistoryLine[]
        | Promise<string | React.ReactNode | HistoryLine[]>;
}

// ── Tipos de línea para coloreo automático ──────────────────────────────────
type LineType = 'input' | 'output' | 'error' | 'success' | 'warning' | 'info' | 'system';

interface HistoryLine {
    text?: string;
    type: LineType;
    component?: React.ReactNode;
}

// Detecta automáticamente el tipo según el contenido del texto
function detectLineType(text: string, isInput = false): LineType {
    if (isInput) return 'input';
    const t = text.toLowerCase();
    if (
        t.startsWith('error') ||
        t.includes('not found') ||
        t.includes('no encontrado') ||
        t.includes('failed') ||
        t.includes('falló') ||
        t.startsWith('err:')
    ) return 'error';
    if (
        t.startsWith('warning') ||
        t.startsWith('warn') ||
        t.includes('advertencia') ||
        t.startsWith('⚠')
    ) return 'warning';
    if (
        t.startsWith('success') ||
        t.startsWith('ok') ||
        t.includes('completado') ||
        t.includes('listo') ||
        t.startsWith('✓') ||
        t.startsWith('done')
    ) return 'success';
    if (
        t.startsWith('info') ||
        t.startsWith('→') ||
        t.startsWith('–') ||
        t.startsWith('[info]')
    ) return 'info';
    return 'output';
}

// Fluent dark tokens
const C = {
    success: '#6ccb5f',
    error: '#f1707b',
    warning: '#fce100',
    info: '#479ef5',
    input: '#ffffff',
    output: 'rgba(255,255,255,0.75)',
    system: 'rgba(255,255,255,0.35)',
    prompt: '#479ef5',
    cursor: '#479ef5',
    bg: '#1a1a1a',
    surface: '#202020',
    border: 'rgba(255,255,255,0.07)',
    scrollbar: 'rgba(255,255,255,0.12)',
};

const LINE_COLORS: Record<LineType, string> = {
    input: C.input,
    output: C.output,
    error: C.error,
    success: C.success,
    warning: C.warning,
    info: C.info,
    system: C.system,
};

// Prefijo visual por tipo
const LINE_PREFIX: Partial<Record<LineType, string>> = {
    error: '✕ ',
    success: '✓ ',
    warning: '⚠ ',
    info: '→ ',
};

const builtInCommands: Record<string, CommandHandler> = {
    help: {
        description: 'Muestra esta ayuda',
        run: (_, commands = builtInCommands) => {
            return Object.entries(commands)
                .map(([cmd, info]) => `  ${cmd.padEnd(12)} ${info.description}`)
                .join('\n');
        }
    },
    clear: {
        description: 'Limpia la pantalla',
        run: () => ''
    },
    echo: {
        description: 'Imprime texto en pantalla',
        run: (args) => args.join(' ')
    },
    exit: {
        description: 'Cierra esta ventana',
        run: () => ''
    }
};

const BANNER: HistoryLine[] = [
    { text: 'Galeno Shell  v1.0.0', type: 'system' },
    { text: 'Escribe "help" para ver los comandos disponibles.', type: 'system' },
    { text: '', type: 'system' },
];

export function CommandShellApp({ windowId, data }: { windowId: WindowId; data?: any }) {
    useAppRuntime('command-shell', 'Shell de Comandos');

    const [history, setHistory] = useState<HistoryLine[]>(BANNER);
    const [input, setInput] = useState('');
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [historyIdx, setHistoryIdx] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const { closeWindow } = useWindowManager();

    const customCommands: Record<string, CommandHandler> = (data?.commands as any) || {};
    const { currentUser } = useSessionContext();
    const { searchPatients, getPatientById } = usePatients();
    const { openWindow } = useWindowManager();
    const registry = useCommandRegistry();

    const dynamicCommands: Record<string, CommandHandler> = {
        whoami: {
            description: 'Muestra el usuario actual',
            run: () => {
                return currentUser ? currentUser.username : 'ningún usuario';
            }
        },
        patients: {
            description: 'Operaciones sobre pacientes (show, search)',
            run: async (args) => {
                const sub = args[0]?.toLowerCase();
                const rest = args.slice(1);
                if (sub === 'show') {
                    const id = Number(rest[0]);
                    if (!id) return 'Uso: patients show <id>';
                    const p = await getPatientById(id);
                    if (!p) return `No se encontró el paciente con ID ${id}`;

                    // Crear componente enriquecido con gradiente y botón
                    const comp = (
                        <div
                            onClick={() => openWindow('patient-record', { patientId: p.id })}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '10px 14px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #0d2137 0%, #0f3058 50%, #0a1e32 100%)',
                                border: '1px solid rgba(71,158,245,0.2)',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                                transition: 'filter 0.15s ease, border-color 0.15s ease',
                                maxWidth: '420px',
                                userSelect: 'none',
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLElement).style.filter = 'brightness(1.15)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(71,158,245,0.45)';
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLElement).style.filter = 'brightness(1)';
                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(71,158,245,0.2)';
                            }}
                        >
                            {/* Avatar con iniciales */}
                            <div style={{
                                flexShrink: 0,
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #0078D4, #2B88D8)',
                                boxShadow: '0 0 10px rgba(0,120,212,0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#fff',
                                fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif",
                                letterSpacing: '0.5px',
                            }}>
                                {p.first_name[0]}{p.last_name[0]}
                            </div>

                            {/* Info */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <span style={{
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: '#fff',
                                    fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif",
                                    lineHeight: '1.3',
                                }}>
                                    {p.first_name} {p.last_name}
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    color: 'rgba(255,255,255,0.45)',
                                    fontFamily: "'Cascadia Code', 'Consolas', monospace",
                                }}>
                                    ID #{p.id}
                                </span>
                            </div>

                            {/* Spacer */}
                            <div style={{ flex: 1 }} />

                            {/* CTA */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '5px',
                                background: 'rgba(71,158,245,0.15)',
                                border: '1px solid rgba(71,158,245,0.25)',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: '#479ef5',
                                fontFamily: "'Segoe UI Variable', 'Segoe UI', sans-serif",
                                letterSpacing: '0.2px',
                            }}>
                                Abrir ficha →
                            </div>
                        </div>
                    );

                    return [{ type: 'info', component: comp }];
                }
                if (sub === 'search') {
                    const q = rest.join(' ');
                    if (!q) return 'Uso: patients search <término>';
                    const list = await searchPatients(q);
                    if (list.length === 0) return 'No se encontraron pacientes';
                    return list
                        .map(p => `${p.id} - ${p.first_name} ${p.last_name}`)
                        .join('\n');
                }
                return 'Uso: patients <show|search> ...';
            }
        }
    };
    const externalCommands = registry.getAll();
    const commands = { ...builtInCommands, ...dynamicCommands, ...externalCommands, ...customCommands };

    useEffect(() => { inputRef.current?.focus(); }, []);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const append = (
        input: string | React.ReactNode | HistoryLine,
        forcedType?: LineType
    ) => {
        if (React.isValidElement(input)) {
            setHistory(h => [...h, { type: forcedType ?? 'output', component: input }]);
            return;
        }

        if (input && typeof input === 'object' && 'type' in input) {
            setHistory(h => [...h, input as HistoryLine]);
            return;
        }

        const text = String(input);
        const lines = text.split('\n');
        setHistory(h => [
            ...h,
            ...lines.map(line => ({
                text: line,
                type: forcedType ?? detectLineType(line),
            }))
        ]);
    };

    const runCommand = async (line: string) => {
        if (!line.trim()) return;

        // Línea de input
        setHistory(h => [...h, { text: line, type: 'input' }]);
        setCmdHistory(prev => [line, ...prev].slice(0, 100));
        setHistoryIdx(-1);

        const parts = line.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (cmd === 'clear') { setHistory([]); return; }
        if (cmd === 'exit') { closeWindow(windowId); return; }

        const handler = commands[cmd];
        if (handler) {
            try {
                const result = await handler.run(args, commands);
                if (result !== undefined && result !== null) {
                    if (Array.isArray(result)) {
                        result.forEach(r => append(r));
                    } else {
                        append(result);
                    }
                }
            } catch (e) {
                append(`Error: ${e}`, 'error');
            }
        } else {
            append(`Comando no encontrado: ${cmd}`, 'error');
        }
    };

    const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            runCommand(input);
            setInput('');
        }
        // Navegación por historial con ↑↓
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const next = Math.min(historyIdx + 1, cmdHistory.length - 1);
            setHistoryIdx(next);
            setInput(cmdHistory[next] ?? '');
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = historyIdx - 1;
            if (next < 0) { setHistoryIdx(-1); setInput(''); }
            else { setHistoryIdx(next); setInput(cmdHistory[next] ?? ''); }
        }
    };

    return (
        <div
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: C.bg,
                fontFamily: "'Cascadia Code', 'Cascadia Mono', 'Consolas', 'Courier New', monospace",
                fontSize: '13px',
                lineHeight: '1.6',
                userSelect: 'text',
            }}
            onClick={() => inputRef.current?.focus()}
        >
            {/* ── Output area ── */}
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 20px 8px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: `${C.scrollbar} transparent`,
                }}
            >
                {history.map((line, idx) => (
                    <div
                        key={idx}
                        style={{
                            display: 'flex',
                            gap: '0',
                            color: LINE_COLORS[line.type],
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            minHeight: line.text === '' ? '0.8em' : undefined,
                            // Input lines tienen prompt
                        }}
                    >
                        {line.type === 'input' ? (
                            <>
                                <span style={{ color: C.prompt, marginRight: '8px', userSelect: 'none' }}>❯</span>
                                <span>{line.text}</span>
                            </>
                        ) : (
                            <>
                                {LINE_PREFIX[line.type] && (
                                    <span style={{ marginRight: '2px', userSelect: 'none' }}>
                                        {LINE_PREFIX[line.type]}
                                    </span>
                                )}
                                {line.component ? (
                                    <>{line.component}</>
                                ) : (
                                    <span>{line.text}</span>
                                )}
                            </>
                        )}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* ── Divider ── */}
            <div style={{ height: '1px', background: C.border, flexShrink: 0 }} />

            {/* ── Input row ── */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: C.surface,
                    flexShrink: 0,
                }}
            >
                <span style={{
                    color: C.prompt,
                    fontSize: '14px',
                    userSelect: 'none',
                    flexShrink: 0,
                }}>
                    ❯
                </span>
                <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: C.input,
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        caretColor: C.cursor,
                    }}
                />
            </div>
        </div>
    );
}