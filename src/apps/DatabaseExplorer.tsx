import { useState, useEffect, useRef } from 'react';
import { Search, Play, RotateCcw, Copy, Download, ChevronDown, AlertCircle, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { invoke } from '@tauri-apps/api/core';
import { useWindowManager } from '../contexts/WindowManagerContext';
import type { WindowId } from '../types/window-manager';
import { fluentDarkCompact as F } from '@/consts/fluent-tokens';

interface QueryResult {
    columns: string[];
    rows: any[];
    rowCount: number;
    executionTime: number;
}

interface Table {
    name: string;
    rowCount: number;
}

interface TableSchema {
    table: string;
    columns: Array<{
        name: string;
        type: string;
        nullable: boolean;
        primaryKey: boolean;
    }>;
}

export function DatabaseExplorerApp({ windowId }: { windowId: WindowId; data?: any }) {
    const { closeWindow } = useWindowManager();
    const [query, setQuery] = useState('SELECT * FROM patients LIMIT 10;');
    const [results, setResults] = useState<QueryResult | null>(null);
    const [tables, setTables] = useState<Table[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showTableList, setShowTableList] = useState(true);
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const tableListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadTables();
    }, []);

    const loadTables = async () => {
        try {
            const tables: Table[] = await invoke('db_explorer_list_tables');
            setTables(tables);
        } catch (err) {
            setError(`Error al cargar tablas: ${err}`);
        }
    };

    const loadTableSchema = async (tableName: string) => {
        try {
            const schema: TableSchema = await invoke('db_explorer_get_table_schema', {
                tableName,
            });
            setTableSchema(schema);
            setSelectedTable(tableName);
            setQuery(`SELECT * FROM ${tableName} LIMIT 10;`);
        } catch (err) {
            setError(`Error al cargar schema: ${err}`);
        }
    };

    const executeQuery = async () => {
        if (!query.trim()) {
            setError('Por favor escribe una query');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const result: QueryResult = await invoke('db_explorer_execute_query', {
                query: query.trim(),
            });
            setResults(result);
        } catch (err: any) {
            setError(err instanceof Error ? err.message : String(err));
            setResults(null);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            executeQuery();
        }
    };

    const copyResults = () => {
        if (!results) return;
        const csv = [
            results.columns.join('\t'),
            ...results.rows.map(row =>
                results.columns.map(col => {
                    const val = row[col];
                    return typeof val === 'string' && val.includes('\t')
                        ? `"${val}"`
                        : val;
                }).join('\t')
            ),
        ].join('\n');
        navigator.clipboard.writeText(csv);
    };

    const exportResults = () => {
        if (!results) return;
        const csv = [
            results.columns.join(','),
            ...results.rows.map(row =>
                results.columns.map(col => {
                    const val = row[col];
                    const strVal = String(val ?? '');
                    return strVal.includes(',') || strVal.includes('"')
                        ? `"${strVal.replace(/"/g, '""')}"`
                        : strVal;
                }).join(',')
            ),
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'query-results.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            className="h-full w-full flex"
            style={{
                display: 'flex',
                background: F.bg,
                fontFamily: F.font,
                overflow: 'hidden',
            }}
        >
            {/* Sidebar: Tablas */}
            <AnimatePresence>
                {showTableList && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            borderRight: `1px solid ${F.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        <div style={{ padding: '12px', borderBottom: `1px solid ${F.border}` }}>
                            <div className="text-xs font-semibold mb-2 text-white">
                                TABLAS
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar tablas…"
                                className="w-full px-2 py-1 text-xs bg-white/5 border border-white/10 rounded text-white placeholder-white/50 outline-none"
                                onChange={(e) => {
                                    // Filter tables
                                }}
                            />
                        </div>
                        <div
                            ref={tableListRef}
                            style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '4px',
                            }}
                        >
                            {tables.map((table) => (
                                <motion.button
                                    key={table.name}
                                    onClick={() => loadTableSchema(table.name)}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        background:
                                            selectedTable === table.name
                                                ? 'rgba(0,120,212,0.15)'
                                                : 'transparent',
                                        border: `1px solid ${selectedTable === table.name
                                            ? 'rgba(0,120,212,0.4)'
                                            : 'transparent'
                                            }`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        marginBottom: '2px',
                                        transition: 'all 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedTable !== table.name) {
                                            e.currentTarget.style.background = F.hover;
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedTable !== table.name) {
                                            e.currentTarget.style.background = 'transparent';
                                        }
                                    }}
                                >
                                    <div className="text-sm font-medium text-white">
                                        {table.name}
                                    </div>
                                    <div className="text-xs text-white/70 mt-0.5">
                                        {table.rowCount} rows
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Schema panel */}
                        {tableSchema && (
                            <div
                                style={{
                                    borderTop: `1px solid ${F.border}`,
                                    padding: '12px',
                                    maxHeight: '200px',
                                    overflow: 'auto',
                                    fontSize: '11px',
                                }}
                            >
                                <div className="font-semibold mb-2 text-white">
                                    SCHEMA
                                </div>
                                {tableSchema.columns.map((col) => (
                                    <div
                                        key={col.name}
                                        style={{
                                            marginBottom: '6px',
                                            padding: '4px',
                                            background: F.hover,
                                            borderRadius: '2px',
                                        }}
                                    >
                                        <div className={col.primaryKey ? 'font-medium text-blue-400' : 'font-medium text-white'}>
                                            {col.name}
                                            {col.primaryKey && ' 🔑'}
                                        </div>
                                        <div className="text-xs text-white/70">
                                            {col.type}
                                            {!col.nullable && ' NOT NULL'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Panel */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        padding: '16px',
                        borderBottom: `1px solid ${F.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        justifyContent: 'space-between',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={() => setShowTableList(!showTableList)}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded cursor-pointer text-xs text-white hover:bg-white/10 transition-all"
                        >
                            {showTableList ? '◀' : '▶'}
                        </button>
                        <div className="text-sm font-semibold text-white">
                            🗄️ Database Explorer
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setQuery('')}
                            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded cursor-pointer text-xs text-white flex items-center gap-1 hover:bg-white/10 transition-all"
                        >
                            <RotateCcw size={14} /> Limpiar
                        </button>
                        <button
                            onClick={executeQuery}
                            disabled={loading}
                            className="px-3.5 py-1.5 bg-blue-600 border border-blue-600 rounded cursor-pointer text-xs text-white font-semibold flex items-center gap-1 hover:bg-blue-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader size={14} className="animate-spin" /> : <Play size={14} />}
                            Ejecutar (Ctrl+Enter)
                        </button>
                    </div>
                </div>

                {/* Query Editor */}
                <div style={{ padding: '16px', borderBottom: `1px solid ${F.border}`, flex: '0 0 auto' }}>
                    <textarea
                        ref={editorRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe tu query SQL aquí…"
                        className="w-full h-28 p-3 bg-white/5 border border-white/10 rounded text-white text-xs font-mono outline-none resize-none leading-relaxed placeholder-white/40"
                    />
                </div>

                {/* Error Display */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                            margin: '12px 16px',
                            padding: '12px',
                            background: 'rgba(255,100,100,0.15)',
                            border: '1px solid rgba(255,100,100,0.4)',
                            borderRadius: '4px',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'flex-start',
                            fontSize: '12px',
                            color: '#ff9999',
                        }}
                    >
                        <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>{error}</div>
                    </motion.div>
                )}

                {/* Results Panel */}
                {results && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderTop: `1px solid ${F.border}`,
                        }}
                    >
                        {/* Results Header */}
                        <div
                            style={{
                                padding: '12px 16px',
                                borderBottom: `1px solid ${F.border}`,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '12px',
                            }}
                        >
                            <div className="text-white/80 text-sm">
                                ✓ {results.rowCount} filas • {results.executionTime}ms
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={copyResults}
                                    className="px-2 py-1 bg-white/5 border border-white/10 rounded cursor-pointer text-xs text-white flex items-center gap-1 hover:bg-white/10 transition-all"
                                >
                                    <Copy size={12} /> Copiar
                                </button>
                                <button
                                    onClick={exportResults}
                                    className="px-2 py-1 bg-white/5 border border-white/10 rounded cursor-pointer text-xs text-white flex items-center gap-1 hover:bg-white/10 transition-all"
                                >
                                    <Download size={12} /> CSV
                                </button>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div
                            style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '12px 16px',
                            }}
                        >
                            <table
                                style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '11px',
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            position: 'sticky',
                                            top: 0,
                                            background: 'rgba(255,255,255,0.03)',
                                            borderBottom: `1px solid ${F.border}`,
                                        }}
                                    >
                                        {results.columns.map((col) => (
                                            <th
                                                key={col}
                                                className="px-2 py-2 text-left font-semibold text-blue-400"
                                                style={{
                                                    borderRight: `1px solid ${F.border}`,
                                                }}
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.rows.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            style={{
                                                borderBottom: `1px solid ${F.border}`,
                                                background: idx % 2 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                            }}
                                        >
                                            {results.columns.map((col) => (
                                                <td
                                                    key={`${idx}-${col}`}
                                                    className="px-2 py-2 border-r border-white/10 text-xs break-words"
                                                    style={{
                                                        color: '#ffffff',
                                                        borderRight: `1px solid ${F.border}`,
                                                    }}
                                                    title={String(row[col])}
                                                >
                                                    {row[col] === null ? (
                                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
                                                            NULL
                                                        </span>
                                                    ) : (
                                                        String(row[col]).slice(0, 100)
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* Empty State */}
                {!results && !loading && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/70 text-center p-10">
                        <div className="text-4xl">💾</div>
                        <div className="text-base font-semibold text-white">Ingresa una query y presiona Ejecutar</div>
                        <div className="text-sm max-w-xs">
                            Usa Ctrl+Enter para ejecutar rápidamente. Selecciona una tabla para ver su schema.
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
