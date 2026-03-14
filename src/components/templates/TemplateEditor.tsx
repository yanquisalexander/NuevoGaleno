import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
    Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
    List, ListOrdered, Undo, Redo, Type, Variable
} from 'lucide-react';
import { TemplateVariable } from '@/types/templates'; import './editor-styles.css';

interface TemplateEditorProps {
    content: string;
    onChange: (content: string) => void;
    availableVariables?: TemplateVariable[];
}

const toolbarButtonClass = [
    'inline-flex h-9 items-center justify-center gap-1 rounded-[10px] border px-2.5 text-white/70 transition-colors',
    'border-transparent bg-transparent hover:border-white/[0.08] hover:bg-white/[0.06] hover:text-white',
    'disabled:cursor-not-allowed disabled:opacity-35'
].join(' ');

export function TemplateEditor({ content, onChange, availableVariables = [] }: TemplateEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm max-w-none min-h-[400px] px-4 py-3 focus:outline-none',
            },
        },
    });

    const insertVariable = (variableKey: string) => {
        if (!editor) return;
        editor.chain().focus().insertContent(`{{${variableKey}}}`).run();
    };

    if (!editor) {
        return null;
    }

    return (
        <div className="overflow-hidden bg-transparent">
            <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] bg-[#1f1f1f] px-4 py-3">
                {/* Text Formatting */}
                <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`${toolbarButtonClass} ${editor.isActive('bold') ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`${toolbarButtonClass} ${editor.isActive('italic') ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`${toolbarButtonClass} ${editor.isActive('underline') ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={`${toolbarButtonClass} ${editor.isActive({ textAlign: 'left' }) ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={`${toolbarButtonClass} ${editor.isActive({ textAlign: 'center' }) ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={`${toolbarButtonClass} ${editor.isActive({ textAlign: 'right' }) ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <AlignRight className="w-4 h-4" />
                    </button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`${toolbarButtonClass} ${editor.isActive('bulletList') ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`${toolbarButtonClass} ${editor.isActive('orderedList') ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                </div>

                {/* Headings */}
                <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={`${toolbarButtonClass} ${editor.isActive('heading', { level: 1 }) ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <Type className="w-4 h-4" />
                        <span className="text-xs ml-1">H1</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={`${toolbarButtonClass} ${editor.isActive('heading', { level: 2 }) ? 'border-white/[0.08] bg-white/[0.1] text-white' : ''}`}
                    >
                        <Type className="w-4 h-4" />
                        <span className="text-xs ml-1">H2</span>
                    </button>
                </div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-1 rounded-[12px] border border-white/[0.08] bg-white/[0.03] p-1">
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        className={toolbarButtonClass}
                    >
                        <Undo className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        className={toolbarButtonClass}
                    >
                        <Redo className="w-4 h-4" />
                    </button>
                </div>

                {/* Variables */}
                {availableVariables.length > 0 && (
                    <div className="ml-auto flex items-center gap-2 rounded-[12px] border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
                        <Variable className="w-4 h-4 text-[#7dc2ff]" />
                        <select
                            defaultValue=""
                            onChange={(e) => {
                                if (e.target.value) {
                                    insertVariable(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="min-w-[180px] bg-transparent text-sm text-white/80 outline-none"
                        >
                            <option value="">Insertar Variable...</option>
                            {availableVariables.map((variable) => (
                                <option key={variable.key} value={variable.key} className="bg-[#202020]">
                                    {variable.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Editor Content */}
            <div className="bg-[#efefef] p-5">
                <div className="mx-auto max-w-[820px] overflow-hidden rounded-[14px] border border-black/10 bg-white text-black shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
