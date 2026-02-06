import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

// --- Interfaces (se mantienen igual) ---
interface ManualIndexItem { id: string; title: string; path: string; }
interface ManualCategory { id: string; title: string; items: ManualIndexItem[]; }
interface ManualIndex { title: string; categories: ManualCategory[]; }
interface ManualProps { windowId?: string; data?: any; }

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
                if (firstCat && firstCat.items?.length > 0) {
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
        <div className="flex h-full items-center justify-center bg-[#f3f3f3] text-sm font-medium">
            <div className="animate-pulse">Cargando manual...</div>
        </div>
    );

    return (
        <div className="flex h-full bg-[#f3f3f3] text-[#1a1a1a] font-sans selection:bg-blue-200">
            {/* Sidebar con estilo NavigationPane de Win11 */}
            <aside className="w-72 flex flex-col border-r border-black/5 bg-[#ebebeb]/80 backdrop-blur-xl">
                <header className="p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-black/60">
                        {index.title}
                    </h2>
                </header>

                <nav className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar">
                    {index.categories.map(cat => (
                        <div key={cat.id}>
                            <h3 className="px-3 mb-1 text-[11px] font-bold text-black/50 uppercase">
                                {cat.title}
                            </h3>
                            <ul className="space-y-[2px]">
                                {cat.items.map(item => {
                                    const isSelected = selected?.categoryId === cat.id && selected?.itemId === item.id;
                                    return (
                                        <li key={item.id}>
                                            <button
                                                onClick={() => {
                                                    setSelected({ categoryId: cat.id, itemId: item.id });
                                                    loadMarkdown(item.path);
                                                }}
                                                className={`
                                                    w-full text-left px-3 py-2 text-sm rounded-md transition-all duration-200 group relative
                                                    ${isSelected
                                                        ? 'bg-white shadow-sm text-blue-600 font-medium'
                                                        : 'hover:bg-black/5 text-black/80'}
                                                `}
                                            >
                                                {/* Indicador lateral azul (Win11 Active State) */}
                                                {isSelected && (
                                                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-full" />
                                                )}
                                                {item.title}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Content Area con efecto Elevación */}
            <main className="flex-1 overflow-y-auto bg-white/60 backdrop-blur-sm relative custom-scrollbar">
                {loading && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}

                <div className="max-w-4xl mx-auto p-12">
                    <article className="prose prose-slate prose-headings:font-semibold prose-h1:text-4xl prose-h1:tracking-tight prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-img:rounded-lg">
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
    );
}