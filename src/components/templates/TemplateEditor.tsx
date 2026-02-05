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
import { Button } from '@/components/ui/button';
import { TemplateVariable } from '@/types/templates'; import './editor-styles.css';
interface TemplateEditorProps {
    content: string;
    onChange: (content: string) => void;
    availableVariables?: TemplateVariable[];
}

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
        <div className="border border-white/10 rounded-lg overflow-hidden bg-[#1e1e1e]">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-white/10 bg-[#252525]">
                {/* Text Formatting */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={editor.isActive('bold') ? 'bg-white/10' : ''}
                    >
                        <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={editor.isActive('italic') ? 'bg-white/10' : ''}
                    >
                        <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={editor.isActive('underline') ? 'bg-white/10' : ''}
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </Button>
                </div>

                {/* Alignment */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={editor.isActive({ textAlign: 'left' }) ? 'bg-white/10' : ''}
                    >
                        <AlignLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={editor.isActive({ textAlign: 'center' }) ? 'bg-white/10' : ''}
                    >
                        <AlignCenter className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={editor.isActive({ textAlign: 'right' }) ? 'bg-white/10' : ''}
                    >
                        <AlignRight className="w-4 h-4" />
                    </Button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={editor.isActive('bulletList') ? 'bg-white/10' : ''}
                    >
                        <List className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={editor.isActive('orderedList') ? 'bg-white/10' : ''}
                    >
                        <ListOrdered className="w-4 h-4" />
                    </Button>
                </div>

                {/* Headings */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        className={editor.isActive('heading', { level: 1 }) ? 'bg-white/10' : ''}
                    >
                        <Type className="w-4 h-4" />
                        <span className="text-xs ml-1">H1</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={editor.isActive('heading', { level: 2 }) ? 'bg-white/10' : ''}
                    >
                        <Type className="w-4 h-4" />
                        <span className="text-xs ml-1">H2</span>
                    </Button>
                </div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                    >
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                    >
                        <Redo className="w-4 h-4" />
                    </Button>
                </div>

                {/* Variables */}
                {availableVariables.length > 0 && (
                    <div className="flex items-center gap-1">
                        <Variable className="w-4 h-4 text-blue-400" />
                        <select
                            onChange={(e) => {
                                if (e.target.value) {
                                    insertVariable(e.target.value);
                                    e.target.value = '';
                                }
                            }}
                            className="bg-[#1e1e1e] border border-white/10 rounded px-2 py-1 text-sm"
                        >
                            <option value="">Insertar Variable...</option>
                            {availableVariables.map((variable) => (
                                <option key={variable.key} value={variable.key}>
                                    {variable.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Editor Content */}
            <div className="bg-white text-black">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
