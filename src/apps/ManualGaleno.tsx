import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// --- Interfaces ---
interface ManualIndexItem { id: string; title: string; path: string; }
interface ManualCategory { id: string; title: string; items: ManualIndexItem[]; }
interface ManualIndex { title: string; categories: ManualCategory[]; }
interface ManualProps { windowId?: string; data?: any; }

// ─────────────────────────────────────────────
// Fluent UI v9 design tokens (inline, no deps)
// ─────────────────────────────────────────────
const tokens = {
    // Neutral backgrounds (light theme)
    colorNeutralBackground1: '#ffffff',
    colorNeutralBackground2: '#f5f5f5',
    colorNeutralBackground3: '#ebebeb',
    colorNeutralBackground1Hover: '#f5f5f5',
    colorNeutralBackground1Pressed: '#e0e0e0',

    // Stroke
    colorNeutralStroke1: '#d1d1d1',
    colorNeutralStroke2: '#e0e0e0',

    // Text
    colorNeutralForeground1: '#242424',
    colorNeutralForeground2: '#424242',
    colorNeutralForeground3: '#616161',
    colorNeutralForegroundDisabled: '#bdbdbd',

    // Brand / Accent (Fluent blue)
    colorBrandBackground: '#0f6cbd',
    colorBrandBackground2: '#cfe4fa',
    colorBrandForeground1: '#0f6cbd',
    colorBrandForeground2: '#115ea3',
    colorBrandStroke1: '#0f6cbd',

    // Shadows (Fluent elevation)
    shadow2: '0 1px 2px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)',
    shadow4: '0 2px 4px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)',
    shadow8: '0 4px 8px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)',
    shadow16: '0 8px 16px rgba(0,0,0,.14), 0 0 2px rgba(0,0,0,.12)',

    // Typography (Fluent v9 type ramp)
    fontFamilyBase: '"Segoe UI", "Segoe UI Variable", system-ui, sans-serif',
    fontSizeBase100: '10px',
    fontSizeBase200: '12px',
    fontSizeBase300: '14px',   // body
    fontSizeBase400: '16px',
    fontSizeBase500: '20px',
    fontSizeBase600: '24px',
    fontWeightRegular: '400',
    fontWeightMedium: '500',
    fontWeightSemibold: '600',
    fontWeightBold: '700',
    lineHeightBase300: '20px',
    lineHeightBase400: '22px',

    // Radii
    borderRadiusMedium: '4px',
    borderRadiusLarge: '8px',
    borderRadiusXLarge: '12px',

    // Spacing
    spacingHorizontalXS: '4px',
    spacingHorizontalS: '8px',
    spacingHorizontalM: '12px',
    spacingHorizontalL: '16px',
    spacingHorizontalXL: '20px',
    spacingHorizontalXXL: '24px',
    spacingVerticalXS: '4px',
    spacingVerticalS: '8px',
    spacingVerticalM: '12px',
    spacingVerticalL: '16px',
    spacingVerticalXL: '20px',
    spacingVerticalXXL: '24px',
};

// ─────────────────────────────────────────────
// Tiny style helpers
// ─────────────────────────────────────────────
const css = (styles: React.CSSProperties): React.CSSProperties => styles;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function Spinner() {
    return (
        <div style={css({
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)',
            zIndex: 10,
        })}>
            <style>{`
        @keyframes fluent-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .fluent-spinner {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 3px solid ${tokens.colorNeutralStroke2};
          border-top-color: ${tokens.colorBrandBackground};
          animation: fluent-spin 0.8s cubic-bezier(.53,.21,.29,.67) infinite;
        }
      `}</style>
            <div className="fluent-spinner" />
        </div>
    );
}

interface NavItemProps {
    label: string;
    selected: boolean;
    onClick: () => void;
}

function NavItem({ label, selected, onClick }: NavItemProps) {
    const [hovered, setHovered] = React.useState(false);
    const [pressed, setPressed] = React.useState(false);

    const bg = pressed
        ? tokens.colorNeutralBackground1Pressed
        : selected
            ? tokens.colorNeutralBackground1
            : hovered
                ? tokens.colorNeutralBackground1Hover
                : 'transparent';

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => { setHovered(false); setPressed(false); }}
            onMouseDown={() => setPressed(true)}
            onMouseUp={() => setPressed(false)}
            style={css({
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacingHorizontalS,
                padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
                background: bg,
                border: 'none',
                borderRadius: tokens.borderRadiusMedium,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: tokens.fontFamilyBase,
                fontSize: tokens.fontSizeBase300,
                lineHeight: tokens.lineHeightBase300,
                fontWeight: selected ? tokens.fontWeightSemibold : tokens.fontWeightRegular,
                color: selected ? tokens.colorBrandForeground1 : tokens.colorNeutralForeground1,
                boxShadow: selected ? tokens.shadow2 : 'none',
                transition: 'background 0.1s ease, box-shadow 0.1s ease, color 0.1s ease',
                position: 'relative',
                overflow: 'hidden',
            })}
        >
            {/* Fluent v9 active indicator pill */}
            {selected && (
                <span style={css({
                    position: 'absolute',
                    left: 0, top: '50%',
                    transform: 'translateY(-50%)',
                    width: '3px',
                    height: '16px',
                    borderRadius: '0 2px 2px 0',
                    background: tokens.colorBrandBackground,
                })} />
            )}
            <span style={{ paddingLeft: selected ? tokens.spacingHorizontalXS : undefined }}>
                {label}
            </span>
        </button>
    );
}

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────

export function ManualGalenoApp({ data }: ManualProps) {
    const [index, setIndex] = useState<ManualIndex | null>(null);
    const [selected, setSelected] = useState<{ categoryId: string; itemId: string } | null>(null);
    const [contentMd, setContentMd] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const initialPath = (() => {
        if (!data) return null;
        if (typeof data === 'string') return data;
        if (data && typeof data.path === 'string') return data.path;
        return null;
    })();

    useEffect(() => {
        fetch('/manual/index.json')
            .then(res => res.json())
            .then((json: ManualIndex) => {
                setIndex(json);
                if (initialPath) {
                    const parts = initialPath.split('/').filter(Boolean);
                    if (parts.length >= 2) {
                        const [catId, itemId] = parts;
                        const cat = json.categories.find(c => c.id === catId);
                        if (cat) {
                            const item = cat.items.find(i => i.id === itemId);
                            if (item) {
                                setSelected({ categoryId: catId, itemId });
                                loadMarkdown(item.path);
                                return;
                            }
                        }
                    }
                }
                const firstCat = json.categories[0];
                if (firstCat?.items?.length > 0) {
                    setSelected({ categoryId: firstCat.id, itemId: firstCat.items[0].id });
                    loadMarkdown(firstCat.items[0].path);
                }
            })
            .catch(err => console.error('Failed to load manual index', err));
    }, []);

    const loadMarkdown = (path: string) => {
        setLoading(true);
        fetch(`/manual/${path}`)
            .then(res => res.ok ? res.text() : Promise.reject(`HTTP ${res.status}`))
            .then(md => setContentMd(md))
            .catch(err => setContentMd(`# Error\n\n${err}`))
            .finally(() => setLoading(false));
    };

    if (!index) return (
        <div style={css({
            display: 'flex', height: '100%',
            alignItems: 'center', justifyContent: 'center',
            background: tokens.colorNeutralBackground2,
            fontFamily: tokens.fontFamilyBase,
            fontSize: tokens.fontSizeBase300,
            color: tokens.colorNeutralForeground3,
        })}>
            <Spinner />
        </div>
    );

    return (
        <>
            {/* Global styles: scrollbar, prose */}
            <style>{`
        .fluent-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .fluent-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .fluent-scrollbar::-webkit-scrollbar-thumb {
          background: ${tokens.colorNeutralStroke1};
          border-radius: 3px;
        }
        .fluent-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #adadad;
        }

        /* Fluent-style prose */
        .fluent-prose {
          font-family: ${tokens.fontFamilyBase};
          font-size: ${tokens.fontSizeBase300};
          line-height: 1.6;
          color: ${tokens.colorNeutralForeground1};
        }
        .fluent-prose h1 {
          font-size: 28px;
          font-weight: ${tokens.fontWeightSemibold};
          line-height: 36px;
          color: ${tokens.colorNeutralForeground1};
          margin: 0 0 16px;
          border-bottom: 1px solid ${tokens.colorNeutralStroke2};
          padding-bottom: 12px;
        }
        .fluent-prose h2 {
          font-size: 20px;
          font-weight: ${tokens.fontWeightSemibold};
          color: ${tokens.colorNeutralForeground1};
          margin: 28px 0 8px;
        }
        .fluent-prose h3 {
          font-size: 16px;
          font-weight: ${tokens.fontWeightSemibold};
          color: ${tokens.colorNeutralForeground2};
          margin: 20px 0 6px;
        }
        .fluent-prose p { margin: 0 0 12px; }
        .fluent-prose a {
          color: ${tokens.colorBrandForeground1};
          text-decoration: none;
        }
        .fluent-prose a:hover {
          color: ${tokens.colorBrandForeground2};
          text-decoration: underline;
        }
        .fluent-prose ul, .fluent-prose ol {
          margin: 0 0 12px;
          padding-left: 24px;
        }
        .fluent-prose li { margin-bottom: 4px; }
        .fluent-prose code {
          font-family: "Cascadia Code", "Cascadia Mono", Consolas, monospace;
          font-size: 13px;
          background: ${tokens.colorNeutralBackground2};
          border: 1px solid ${tokens.colorNeutralStroke2};
          border-radius: ${tokens.borderRadiusMedium};
          padding: 1px 5px;
        }
        .fluent-prose pre {
          background: ${tokens.colorNeutralBackground2};
          border: 1px solid ${tokens.colorNeutralStroke2};
          border-radius: ${tokens.borderRadiusLarge};
          padding: 16px;
          overflow-x: auto;
          margin: 0 0 16px;
        }
        .fluent-prose pre code {
          background: transparent;
          border: none;
          padding: 0;
        }
        .fluent-prose blockquote {
          margin: 0 0 12px;
          padding: 8px 16px;
          border-left: 3px solid ${tokens.colorBrandStroke1};
          background: ${tokens.colorBrandBackground2};
          border-radius: 0 ${tokens.borderRadiusMedium} ${tokens.borderRadiusMedium} 0;
          color: ${tokens.colorNeutralForeground2};
        }
        .fluent-prose table {
          width: 100%;
          border-collapse: collapse;
          font-size: ${tokens.fontSizeBase300};
          margin-bottom: 16px;
        }
        .fluent-prose th {
          background: ${tokens.colorNeutralBackground3};
          font-weight: ${tokens.fontWeightSemibold};
          padding: 8px 12px;
          text-align: left;
          border-bottom: 2px solid ${tokens.colorNeutralStroke1};
          color: ${tokens.colorNeutralForeground1};
        }
        .fluent-prose td {
          padding: 8px 12px;
          border-bottom: 1px solid ${tokens.colorNeutralStroke2};
          color: ${tokens.colorNeutralForeground2};
        }
        .fluent-prose tr:hover td {
          background: ${tokens.colorNeutralBackground2};
        }
        .fluent-prose img {
          max-width: 100%;
          border-radius: ${tokens.borderRadiusLarge};
          box-shadow: ${tokens.shadow4};
        }
        .fluent-prose hr {
          border: none;
          border-top: 1px solid ${tokens.colorNeutralStroke2};
          margin: 24px 0;
        }
      `}</style>

            <div style={css({
                display: 'flex',
                height: '100%',
                fontFamily: tokens.fontFamilyBase,
                background: tokens.colorNeutralBackground2,
                color: tokens.colorNeutralForeground1,
            })}>

                {/* ── Sidebar / NavigationPane ── */}
                <aside style={css({
                    width: '280px',
                    minWidth: '280px',
                    display: 'flex',
                    flexDirection: 'column',
                    background: tokens.colorNeutralBackground3,
                    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
                    overflow: 'hidden',
                })}>

                    {/* App title header */}
                    <header style={css({
                        padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalL}`,
                        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
                    })}>
                        <div style={css({
                            display: 'flex',
                            alignItems: 'center',
                            gap: tokens.spacingHorizontalS,
                        })}>
                            {/* Fluent-style icon badge */}
                            <div style={css({
                                width: '28px', height: '28px',
                                borderRadius: tokens.borderRadiusMedium,
                                background: tokens.colorBrandBackground,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            })}>
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M2 3h12v1.5H2V3zm0 4h8v1.5H2V7zm0 4h10v1.5H2V11z" fill="white" />
                                </svg>
                            </div>
                            <span style={css({
                                fontSize: tokens.fontSizeBase400,
                                fontWeight: tokens.fontWeightSemibold,
                                color: tokens.colorNeutralForeground1,
                                lineHeight: '22px',
                            })}>
                                {index.title}
                            </span>
                        </div>
                    </header>

                    {/* Nav items */}
                    <nav
                        className="fluent-scrollbar"
                        style={css({
                            flex: 1,
                            overflowY: 'auto',
                            padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalS}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: tokens.spacingVerticalXL,
                        })}
                    >
                        {index.categories.map(cat => (
                            <div key={cat.id}>
                                {/* Category label */}
                                <div style={css({
                                    padding: `0 ${tokens.spacingHorizontalM} ${tokens.spacingVerticalXS}`,
                                    fontSize: tokens.fontSizeBase200,
                                    fontWeight: tokens.fontWeightSemibold,
                                    color: tokens.colorNeutralForeground3,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                })}>
                                    {cat.title}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {cat.items.map(item => {
                                        const isSelected = selected?.categoryId === cat.id && selected?.itemId === item.id;
                                        return (
                                            <NavItem
                                                key={item.id}
                                                label={item.title}
                                                selected={isSelected}
                                                onClick={() => {
                                                    setSelected({ categoryId: cat.id, itemId: item.id });
                                                    loadMarkdown(item.path);
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* ── Content area ── */}
                <main
                    className="fluent-scrollbar"
                    style={css({
                        flex: 1,
                        overflowY: 'auto',
                        background: tokens.colorNeutralBackground1,
                        position: 'relative',
                    })}
                >
                    {loading && <Spinner />}

                    {/* Content card with Fluent elevation */}
                    <div style={css({
                        maxWidth: '860px',
                        margin: '0 auto',
                        padding: '40px 48px 64px',
                    })}>
                        <article className="fluent-prose">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                            >
                                {contentMd}
                            </ReactMarkdown>
                        </article>
                    </div>
                </main>

            </div>
        </>
    );
}