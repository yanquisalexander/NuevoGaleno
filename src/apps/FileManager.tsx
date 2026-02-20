import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../hooks/useFileSystem';
import type { FileEntry } from '../types/filesystem';

// ─── Fluent UI v9 Dark Tokens (WinUI / Windows 11 Explorer) ─────────────────
const t = {
    // Backgrounds — layered system
    bg0: '#1c1c1c',   // app frame / outermost
    bg1: '#202020',   // sidebar, panels
    bg2: '#2b2b2b',   // content pane
    bg3: '#323232',   // toolbar, header rows
    bgHover: '#ffffff14',
    bgSelected: '#60cdff26',
    bgPressed: '#ffffff08',
    bgInputHover: '#ffffff0a',
    bgSubtle: '#ffffff08',

    // Foregrounds
    fg1: '#ffffff',
    fg2: '#ffffffc8',
    fg3: '#ffffff8a',
    fg4: '#ffffff55',
    fgDisabled: '#ffffff3d',
    fgAccent: '#60cdff',
    fgDanger: '#ff99a4',

    // Strokes
    stroke1: '#ffffff14',
    stroke2: '#ffffff0f',
    strokeFocus: '#60cdff',
    strokeDivider: '#ffffff15',

    // Accent
    accent: '#0078d4',
    accentHover: '#1a86e0',
    accentPressed: '#006cbf',
    accentLight: '#60cdff',

    // Status
    dangerBg: 'rgba(255,80,80,0.12)',
    dangerBorder: 'rgba(255,99,99,0.5)',
    dangerFg: '#ff99a4',

    // Colors
    folderColor: '#dcb67a',
    fileColor: '#60cdff',

    // Typography
    font: "'Segoe UI Variable Text', 'Segoe UI', -apple-system, sans-serif",
    fs12: '12px',
    fs13: '13px',
    fs14: '14px',
    fwRegular: 400,
    fwMedium: 500,
    fwSemibold: 600,

    // Radii
    r4: '4px',
    r6: '6px',
    r8: '8px',

    // Motion
    dur: '150ms',
};

// ─── Icons ───────────────────────────────────────────────────────────────────
const Icons = {
    Back: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.47 2.97a.75.75 0 0 1 1.06 1.06L4.56 7h8.19a.75.75 0 0 1 0 1.5H4.56l2.97 2.97a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25Z" />
        </svg>
    ),
    Forward: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M9.53 2.97a.75.75 0 0 0-1.06 1.06L11.44 7H3.25a.75.75 0 0 0 0 1.5h8.19l-2.97 2.97a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06L9.53 2.97Z" />
        </svg>
    ),
    Up: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2.25a.75.75 0 0 1 .53.22l4.25 4.25a.75.75 0 1 1-1.06 1.06L8 4.06 4.28 7.78a.75.75 0 0 1-1.06-1.06L7.47 2.47A.75.75 0 0 1 8 2.25Z" />
        </svg>
    ),
    Search: () => (
        <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
            <path d="M7 1a6 6 0 1 0 3.745 10.805l2.225 2.225a.75.75 0 1 0 1.06-1.06l-2.225-2.225A6 6 0 0 0 7 1ZM2.5 7a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" />
        </svg>
    ),
    NewFolder: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M.5 3A1.5 1.5 0 0 1 2 1.5h4.086a1.5 1.5 0 0 1 1.06.44l.915.914c.14.14.331.22.53.22H14A1.5 1.5 0 0 1 15.5 4.5V5h-15V3ZM.5 6h15v7A1.5 1.5 0 0 1 14 14.5H2A1.5 1.5 0 0 1 .5 13V6Zm7.25 1.75a.75.75 0 0 0-1.5 0v1.5h-1.5a.75.75 0 0 0 0 1.5h1.5v1.5a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5v-1.5Z" />
        </svg>
    ),
    Upload: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.75.75 0 0 1 .53.22l3.25 3.25a.75.75 0 1 1-1.06 1.06L8.75 3.56V11a.75.75 0 0 1-1.5 0V3.56L5.28 5.53a.75.75 0 0 1-1.06-1.06L7.47 1.22A.75.75 0 0 1 8 1ZM2.5 13.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Z" />
        </svg>
    ),
    Delete: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5ZM5 2.5v-1A1.5 1.5 0 0 1 6.5 0h3A1.5 1.5 0 0 1 11 1.5v1h2.5a.75.75 0 0 1 0 1.5H14v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5V4.5h-.5a.75.75 0 0 1 0-1.5H5Zm1.5 3a.75.75 0 0 0-.75.75v6.5a.75.75 0 0 0 1.5 0v-6.5A.75.75 0 0 0 6.5 5.5Zm3 0a.75.75 0 0 0-.75.75v6.5a.75.75 0 0 0 1.5 0v-6.5A.75.75 0 0 0 9.5 5.5Z" />
        </svg>
    ),
    Rename: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.609Zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086ZM11.189 6.25 9.75 4.81l-6.286 6.287a.25.25 0 0 0-.064.108l-.558 1.953 1.953-.558a.249.249 0 0 0 .108-.064L11.189 6.25Z" />
        </svg>
    ),
    Copy: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75A2.75 2.75 0 0 1 2.75 4h6.5A2.75 2.75 0 0 1 12 6.75v6.5A2.75 2.75 0 0 1 9.25 16h-6.5A2.75 2.75 0 0 1 0 13.25v-6.5Zm2.75-1.25c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25h-6.5ZM4 2.75A2.75 2.75 0 0 1 6.75 0h6.5A2.75 2.75 0 0 1 16 2.75v6.5A2.75 2.75 0 0 1 13.25 12H12.5v-1.5h.75c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25h-6.5c-.69 0-1.25.56-1.25 1.25v.75H4V2.75Z" />
        </svg>
    ),
    Paste: () => (
        <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor">
            <path d="M5.75 1a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5ZM4 3.25a.75.75 0 0 1 .75-.75h6.5c.414 0 .75.336.75.75V4.5H4V3.25ZM2.5 5A1.5 1.5 0 0 0 1 6.5v7A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 5h-11ZM2.5 6.5h11v7h-11v-7Z" />
        </svg>
    ),
    Sort: () => (
        <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm3 3.5A.75.75 0 0 1 5.75 7.5h4.5a.75.75 0 0 1 0 1.5h-4.5A.75.75 0 0 1 5 8.25ZM8 11a.75.75 0 0 0 0 1.5h.5a.75.75 0 0 0 0-1.5H8Z" />
        </svg>
    ),
    Home: () => (
        <svg width={14} height={14} viewBox="0 0 16 16" fill={t.fgAccent}>
            <path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6-.896.897A.5.5 0 0 0 1.5 9h.5v5.5A1.5 1.5 0 0 0 3.5 16H6v-4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V16h2.5a1.5 1.5 0 0 0 1.5-1.5V9h.5a.5.5 0 0 0 .354-.857l-.896-.897-6-6Z" />
        </svg>
    ),
    PC: ({ color }: { color?: string }) => (
        <svg width={14} height={14} viewBox="0 0 16 16" fill={color || t.fgAccent}>
            <path d="M0 4.5A2.5 2.5 0 0 1 2.5 2h11A2.5 2.5 0 0 1 16 4.5v6A2.5 2.5 0 0 1 13.5 13H9v1h2.25a.75.75 0 0 1 0 1.5h-6.5a.75.75 0 0 1 0-1.5H7v-1H2.5A2.5 2.5 0 0 1 0 10.5v-6Zm2.5-1C1.672 3.5 1 4.172 1 5v5.5c0 .828.672 1.5 1.5 1.5h11c.828 0 1.5-.672 1.5-1.5V5c0-.828-.672-1.5-1.5-1.5h-11Z" />
        </svg>
    ),
    Folder: ({ size = 16, color }: { size?: number; color?: string }) => (
        <svg width={size} height={size} viewBox="0 0 20 20" fill={color || t.folderColor}>
            <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3h3.086a1.5 1.5 0 0 1 1.06.44l.915.914c.14.14.331.22.53.22H15.5A2.5 2.5 0 0 1 18 7v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 15V5.5Z" />
        </svg>
    ),
    File: ({ size = 16 }: { size?: number }) => (
        <svg width={size} height={size} viewBox="0 0 20 20" fill={t.fileColor}>
            <path d="M4 4a2 2 0 0 1 2-2h5.586a1.5 1.5 0 0 1 1.06.44l2.915 2.914A1.5 1.5 0 0 1 16 6.414V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm7-.5V6.5a.5.5 0 0 0 .5.5h2.5L11 3.5Z" />
        </svg>
    ),
    Error: () => (
        <svg width={14} height={14} viewBox="0 0 16 16" fill={t.dangerFg}>
            <path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1ZM8 4a.75.75 0 0 0-.75.75v3.5a.75.75 0 0 0 1.5 0v-3.5A.75.75 0 0 0 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
        </svg>
    ),
};

// ─── Primitives ───────────────────────────────────────────────────────────────

const Btn = ({ icon, children, onClick, disabled = false, danger = false, compact = false }: {
    icon?: React.ReactNode; children?: React.ReactNode; onClick?: () => void;
    disabled?: boolean; danger?: boolean; compact?: boolean;
}) => {
    const [hov, setHov] = useState(false);
    const [prs, setPrs] = useState(false);
    return (
        <button
            onClick={!disabled ? onClick : undefined}
            onMouseEnter={() => !disabled && setHov(true)}
            onMouseLeave={() => { setHov(false); setPrs(false); }}
            onMouseDown={() => !disabled && setPrs(true)}
            onMouseUp={() => setPrs(false)}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontFamily: t.font, fontSize: t.fs13, fontWeight: t.fwMedium,
                color: disabled ? t.fgDisabled : danger && hov ? t.dangerFg : t.fg1,
                background: disabled ? 'transparent'
                    : prs ? t.bgPressed
                        : hov ? (danger ? 'rgba(255,80,80,0.15)' : t.bgHover)
                            : 'transparent',
                border: `1px solid ${hov && !disabled ? t.stroke1 : 'transparent'}`,
                borderRadius: t.r4,
                padding: compact ? '3px 7px' : '4px 10px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: `background ${t.dur}, border-color ${t.dur}, color ${t.dur}`,
                userSelect: 'none', whiteSpace: 'nowrap', outline: 'none', flexShrink: 0,
            }}
        >
            {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
            {children}
        </button>
    );
};

const NavBtn = ({ icon, onClick, disabled = false, title }: { icon: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) => {
    const [hov, setHov] = useState(false);
    return (
        <button
            onClick={!disabled ? onClick : undefined} title={title}
            onMouseEnter={() => !disabled && setHov(true)} onMouseLeave={() => setHov(false)}
            style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, background: hov ? t.bgHover : 'transparent',
                border: 'none', borderRadius: t.r4,
                color: disabled ? t.fgDisabled : t.fg2,
                cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0, outline: 'none',
                transition: `background ${t.dur}`,
            }}
        >{icon}</button>
    );
};

const VertDivider = () => (
    <div style={{ width: 1, height: 18, background: t.strokeDivider, margin: '0 3px', flexShrink: 0 }} />
);

const SideItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => {
    const [hov, setHov] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px 4px 14px', borderRadius: t.r4, margin: '1px 5px',
                background: active ? t.bgSelected : hov ? t.bgHover : 'transparent',
                cursor: 'pointer', userSelect: 'none', transition: `background ${t.dur}`,
            }}
        >
            <span style={{ display: 'flex', flexShrink: 0 }}>{icon}</span>
            <span style={{ fontFamily: t.font, fontSize: t.fs13, color: active ? t.fgAccent : t.fg2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {label}
            </span>
        </div>
    );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
export const FileManagerApp: React.FC = () => {
    const [currentPath, setCurrentPath] = useState('G:\\');
    const [history, setHistory] = useState<string[]>(['G:\\']);
    const [histIdx, setHistIdx] = useState(0);
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [hoveredPath, setHoveredPath] = useState<string | null>(null);
    const [searchFocused, setSearchFocused] = useState(false);

    const fileSystem = useFileSystem();

    useEffect(() => { loadDir(currentPath); }, [currentPath]);

    const loadDir = async (path: string) => {
        setLoading(true); setError(null);
        try {
            const r = await fileSystem.listDirectory(path);
            setEntries(r.entries);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al cargar el directorio');
            setEntries([

            ]);
        } finally { setLoading(false); }
    };

    const navigate = (path: string) => {
        const nh = [...history.slice(0, histIdx + 1), path];
        setHistory(nh); setHistIdx(nh.length - 1);
        setCurrentPath(path); setSelected(new Set());
    };

    const goBack = () => { if (histIdx > 0) { const p = history[histIdx - 1]; setHistIdx(histIdx - 1); setCurrentPath(p); setSelected(new Set()); } };
    const goForward = () => { if (histIdx < history.length - 1) { const p = history[histIdx + 1]; setHistIdx(histIdx + 1); setCurrentPath(p); setSelected(new Set()); } };
    const goUp = () => { const pts = currentPath.split('\\').filter(Boolean); if (pts.length > 1) { pts.pop(); navigate(pts.join('\\') + '\\'); } };

    const handleNewFolder = async () => {
        const name = prompt('Nombre de la nueva carpeta:');
        if (!name) return;
        try { await fileSystem.createFolder(currentPath, name); await loadDir(currentPath); }
        catch (err) { setError(err instanceof Error ? err.message : 'Error al crear carpeta'); }
    };

    const handleUpload = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.multiple = true;
        inp.onchange = async (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (!files) return;
            for (let i = 0; i < files.length; i++) {
                try { await fileSystem.uploadFile(currentPath, files[i]); }
                catch (err) { setError(err instanceof Error ? err.message : 'Error al subir'); }
            }
            await loadDir(currentPath);
        };
        inp.click();
    };

    const handleDelete = async () => {
        if (!selected.size) return;
        if (!confirm(`¿Eliminar ${selected.size} elemento(s)?`)) return;
        for (const p of selected) {
            try { await fileSystem.moveToTrash(p); }
            catch (err) { setError(err instanceof Error ? err.message : 'Error al eliminar'); }
        }
        setSelected(new Set()); await loadDir(currentPath);
    };

    const handleRename = async () => {
        if (selected.size !== 1) return;
        const path = [...selected][0];
        const entry = entries.find(e => e.virtualPath === path);
        if (!entry) return;
        const name = prompt('Nuevo nombre:', entry.name);
        if (!name || name === entry.name) return;
        try { await fileSystem.renameEntry(path, name); setSelected(new Set()); await loadDir(currentPath); }
        catch (err) { setError(err instanceof Error ? err.message : 'Error al renombrar'); }
    };

    const selectEntry = (entry: FileEntry, multi: boolean) => {
        const s = new Set(selected);
        if (multi) { s.has(entry.virtualPath) ? s.delete(entry.virtualPath) : s.add(entry.virtualPath); }
        else { s.clear(); s.add(entry.virtualPath); }
        setSelected(s);
    };

    const fmtSize = (b: number) => {
        if (!b) return '';
        const k = 1024, ss = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k));
        return `${+(b / Math.pow(k, i)).toFixed(i ? 1 : 0)} ${ss[i]}`;
    };

    const fmtDate = (d: string) => {
        const dt = new Date(d);
        return dt.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' })
            + '  ' + dt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    };

    const getFileType = (entry: FileEntry) => {
        if (entry.entryType === 'folder') return 'Carpeta de archivos';
        const ext = entry.name.split('.').pop()?.toUpperCase();
        return ext ? `Archivo ${ext}` : 'Archivo';
    };

    const segments = currentPath.split('\\').filter(Boolean);
    const filtered = entries.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));

    // sort: folders first
    const sorted = [...filtered].sort((a, b) => {
        if (a.entryType === b.entryType) return a.name.localeCompare(b.name);
        return a.entryType === 'folder' ? -1 : 1;
    });

    const sideItems = [
        { icon: <Icons.Home />, label: 'Inicio', path: 'G:\\' },
        { icon: <Icons.Folder size={14} color="#dcb67a" />, label: 'Escritorio', path: 'G:\\Users\\admin\\Escritorio' },
        { icon: <Icons.Folder size={14} color="#dcb67a" />, label: 'Documentos', path: 'G:\\Users\\admin\\Documentos' },
        { icon: <Icons.Folder size={14} color="#dcb67a" />, label: 'Descargas', path: 'G:\\Users\\admin\\Descargas' },
        { icon: <Icons.Folder size={14} color="#dcb67a" />, label: 'Imágenes', path: 'G:\\Users\\admin\\Imágenes' },
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: t.bg0, fontFamily: t.font, color: t.fg1, overflow: 'hidden' }}>

            {/* ── Toolbar ─────────────────────────────────────────────────────── */}
            <div style={{ background: t.bg1, borderBottom: `1px solid ${t.stroke1}`, flexShrink: 0 }}>

                {/* Row 1: navigation + breadcrumb + search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 8px 3px' }}>
                    <NavBtn icon={<Icons.Back />} onClick={goBack} disabled={histIdx === 0} title="Atrás (Alt+←)" />
                    <NavBtn icon={<Icons.Forward />} onClick={goForward} disabled={histIdx >= history.length - 1} title="Adelante (Alt+→)" />
                    <NavBtn icon={<Icons.Up />} onClick={goUp} disabled={segments.length <= 1} title="Subir" />
                    <VertDivider />

                    {/* Breadcrumb pill */}
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 1,
                        background: t.bgSubtle, border: `1px solid ${t.stroke2}`,
                        borderRadius: t.r4, padding: '3px 10px', overflow: 'hidden', minWidth: 0,
                    }}>
                        <span style={{ display: 'flex', marginRight: 6, flexShrink: 0 }}><Icons.PC /></span>
                        {segments.map((seg, i) => (
                            <React.Fragment key={i}>
                                {i > 0 && <span style={{ color: t.fg4, padding: '0 3px', flexShrink: 0, fontSize: 13 }}>›</span>}
                                <span
                                    onClick={() => i < segments.length - 1 && navigate(segments.slice(0, i + 1).join('\\') + '\\')}
                                    style={{
                                        fontFamily: t.font, fontSize: t.fs13,
                                        color: i === segments.length - 1 ? t.fg1 : t.fgAccent,
                                        cursor: i < segments.length - 1 ? 'pointer' : 'default',
                                        fontWeight: i === segments.length - 1 ? t.fwMedium : t.fwRegular,
                                        whiteSpace: 'nowrap',
                                        overflow: i === segments.length - 1 ? 'hidden' : 'visible',
                                        textOverflow: 'ellipsis', flexShrink: i === segments.length - 1 ? 1 : 0,
                                    }}
                                >{seg}</span>
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Search */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: searchFocused ? '#ffffff0d' : t.bgSubtle,
                        border: `1px solid ${searchFocused ? t.strokeFocus : t.stroke1}`,
                        borderRadius: 16, padding: '3px 10px', width: 220,
                        transition: `border-color ${t.dur}, background ${t.dur}`,
                        flexShrink: 0,
                    }}>
                        <span style={{ color: t.fg3, display: 'flex', flexShrink: 0 }}><Icons.Search /></span>
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar"
                            onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: t.font, fontSize: t.fs13, color: t.fg1, flex: 1, minWidth: 0 }}
                        />
                    </div>
                </div>

                {/* Row 2: action buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 6px 5px' }}>
                    <Btn icon={<Icons.NewFolder />} onClick={handleNewFolder}>Nueva carpeta</Btn>
                    <Btn icon={<Icons.Upload />} onClick={handleUpload}>Cargar</Btn>
                    <VertDivider />
                    <Btn icon={<Icons.Copy />} disabled={selected.size === 0} compact>Copiar</Btn>
                    <Btn icon={<Icons.Paste />} compact>Pegar</Btn>
                    <VertDivider />
                    <Btn icon={<Icons.Rename />} onClick={handleRename} disabled={selected.size !== 1} compact>Renombrar</Btn>
                    <Btn icon={<Icons.Delete />} onClick={handleDelete} disabled={selected.size === 0} danger compact>Eliminar</Btn>
                    <div style={{ flex: 1 }} />
                    <Btn icon={<Icons.Sort />} compact><span style={{ color: t.fg3 }}>Ordenar</span></Btn>
                </div>
            </div>

            {/* ── Error bar ───────────────────────────────────────────────────── */}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 14px', background: t.dangerBg,
                    borderBottom: `1px solid ${t.dangerBorder}`, flexShrink: 0,
                }}>
                    <Icons.Error />
                    <span style={{ fontFamily: t.font, fontSize: t.fs13, color: t.dangerFg, flex: 1 }}>{error}</span>
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: t.fg3, cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1, transition: `color ${t.dur}` }}>×</button>
                </div>
            )}

            {/* ── Body ────────────────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* Sidebar */}
                <div style={{ width: 196, flexShrink: 0, background: t.bg1, borderRight: `1px solid ${t.stroke1}`, overflowY: 'auto', padding: '10px 0' }}>
                    <div style={{ padding: '2px 14px 4px', fontFamily: t.font, fontSize: 11, color: t.fg4, fontWeight: t.fwSemibold, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Acceso rápido
                    </div>
                    {sideItems.map(item => (
                        <SideItem key={item.path} icon={item.icon} label={item.label}
                            active={currentPath === item.path}
                            onClick={() => navigate(item.path)} />
                    ))}

                    <div style={{ margin: '10px 10px', height: 1, background: t.stroke1 }} />
                    <div style={{ padding: '2px 14px 4px', fontFamily: t.font, fontSize: 11, color: t.fg4, fontWeight: t.fwSemibold, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Este equipo
                    </div>
                    <SideItem icon={<Icons.PC color={t.fgAccent} />} label="Galeno (G:)" active={currentPath === 'G:\\'} onClick={() => navigate('G:\\')} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bg2 }}>

                    {/* Column headers */}
                    <div style={{
                        display: 'flex', alignItems: 'center',
                        padding: '2px 8px',
                        borderBottom: `1px solid ${t.strokeDivider}`,
                        background: t.bg2, flexShrink: 0,
                    }}>
                        {[
                            { label: 'Nombre', flex: 3 },
                            { label: 'Fecha de modificación', flex: 2 },
                            { label: 'Tipo', flex: 1.4 },
                            { label: 'Tamaño', flex: 0.8 },
                        ].map(col => {
                            const [hov, setHov] = useState(false);
                            return (
                                <div key={col.label}
                                    onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
                                    style={{
                                        flex: col.flex, display: 'flex', alignItems: 'center',
                                        padding: '5px 8px', borderRadius: t.r4,
                                        background: hov ? t.bgHover : 'transparent',
                                        cursor: 'pointer', transition: `background ${t.dur}`, userSelect: 'none',
                                        fontFamily: t.font, fontSize: t.fs12, fontWeight: t.fwSemibold, color: t.fg3,
                                    }}
                                >{col.label}</div>
                            );
                        })}
                    </div>

                    {/* Rows */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                                <svg width={24} height={24} viewBox="0 0 24 24" style={{ animation: 'fmspin 1.2s linear infinite' }}>
                                    <style>{`@keyframes fmspin{to{transform:rotate(360deg)}}`}</style>
                                    <circle cx="12" cy="12" r="9" fill="none" stroke={t.stroke1} strokeWidth="2" />
                                    <path d="M12 3A9 9 0 0 1 21 12" fill="none" stroke={t.accentLight} strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                <span style={{ fontFamily: t.font, fontSize: t.fs13, color: t.fg3 }}>Cargando…</span>
                            </div>
                        ) : sorted.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, opacity: 0.45 }}>
                                <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
                                    <rect x="4" y="8" width="40" height="32" rx="3" stroke={t.fg3} strokeWidth="1.5" />
                                    <path d="M4 18h40" stroke={t.fg3} strokeWidth="1.2" />
                                    <path d="M14 13h8M26 13h8" stroke={t.fg4} strokeWidth="1.2" strokeLinecap="round" />
                                </svg>
                                <span style={{ fontFamily: t.font, fontSize: t.fs14, color: t.fg3 }}>
                                    {search ? 'Sin resultados' : 'Esta carpeta está vacía'}
                                </span>
                            </div>
                        ) : (
                            sorted.map(entry => {
                                const isSel = selected.has(entry.virtualPath);
                                const isHov = hoveredPath === entry.virtualPath;
                                return (
                                    <div
                                        key={entry.id}
                                        onClick={e => { e.detail === 1 ? selectEntry(entry, e.ctrlKey || e.metaKey) : e.detail === 2 && entry.entryType === 'folder' && navigate(entry.virtualPath); }}
                                        onMouseEnter={() => setHoveredPath(entry.virtualPath)}
                                        onMouseLeave={() => setHoveredPath(null)}
                                        style={{
                                            display: 'flex', alignItems: 'center',
                                            padding: '0 8px', borderRadius: t.r4, margin: '1px 6px',
                                            background: isSel ? t.bgSelected : isHov ? t.bgHover : 'transparent',
                                            outline: isSel ? `1px solid ${t.strokeFocus}33` : 'none',
                                            cursor: 'default', userSelect: 'none',
                                            transition: `background ${t.dur}`,
                                        }}
                                    >
                                        {/* Name */}
                                        <div style={{ flex: 3, display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', overflow: 'hidden' }}>
                                            {entry.entryType === 'folder' ? <Icons.Folder size={18} /> : <Icons.File size={18} />}
                                            <span style={{ fontFamily: t.font, fontSize: t.fs13, color: t.fg1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {entry.name}
                                            </span>
                                        </div>
                                        {/* Date */}
                                        <div style={{ flex: 2, padding: '5px 8px' }}>
                                            <span style={{ fontFamily: t.font, fontSize: t.fs12, color: t.fg3 }}>{fmtDate(entry.modifiedAt)}</span>
                                        </div>
                                        {/* Type */}
                                        <div style={{ flex: 1.4, padding: '5px 8px', overflow: 'hidden' }}>
                                            <span style={{ fontFamily: t.font, fontSize: t.fs12, color: t.fg3, whiteSpace: 'nowrap' }}>{getFileType(entry)}</span>
                                        </div>
                                        {/* Size */}
                                        <div style={{ flex: 0.8, padding: '5px 8px', textAlign: 'right' }}>
                                            <span style={{ fontFamily: t.font, fontSize: t.fs12, color: t.fg3 }}>{fmtSize(entry.size)}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* ── Status Bar ──────────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '4px 16px', background: t.bg1,
                borderTop: `1px solid ${t.stroke1}`, flexShrink: 0,
            }}>
                <span style={{ fontFamily: t.font, fontSize: t.fs12, color: t.fg3 }}>
                    {sorted.length} elemento{sorted.length !== 1 ? 's' : ''}
                    {selected.size > 0 && (
                        <span style={{ color: t.fgAccent }}> · {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}</span>
                    )}
                </span>
                <span style={{ fontFamily: t.font, fontSize: t.fs12, color: t.fg4, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width={10} height={10} viewBox="0 0 10 10">
                        <circle cx="5" cy="5" r="4" fill="none" stroke={t.fgAccent} strokeWidth="1.2" />
                        <path d="M3 5l1.5 1.5L7 3.5" stroke={t.fgAccent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Galeno Filesystem
                </span>
            </div>
        </div>
    );
};