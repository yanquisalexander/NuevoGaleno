import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
    Bold, Italic, Underline as UnderlineIcon,
    List, ListOrdered, Undo, Redo, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import '../templates/editor-styles.css';

interface MedicalNotesEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export function MedicalNotesEditor({ content, onChange, placeholder = 'Escribe notas clínicas...' }: MedicalNotesEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm prose-invert max-w-none min-h-[200px] px-4 py-3 focus:outline-none text-white/90',
            },
        },
    });

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
                        title="Negrita (Ctrl+B)"
                    >
                        <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={editor.isActive('italic') ? 'bg-white/10' : ''}
                        title="Cursiva (Ctrl+I)"
                    >
                        <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={editor.isActive('underline') ? 'bg-white/10' : ''}
                        title="Subrayado (Ctrl+U)"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </Button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={editor.isActive('bulletList') ? 'bg-white/10' : ''}
                        title="Lista con viñetas"
                    >
                        <List className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={editor.isActive('orderedList') ? 'bg-white/10' : ''}
                        title="Lista numerada"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </Button>
                </div>

                {/* Headings */}
                <div className="flex items-center gap-0.5 border-r border-white/10 pr-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        className={editor.isActive('heading', { level: 2 }) ? 'bg-white/10' : ''}
                        title="Título"
                    >
                        <Type className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().setParagraph().run()}
                        className={editor.isActive('paragraph') ? 'bg-white/10' : ''}
                        title="Párrafo normal"
                    >
                        <span className="text-xs">P</span>
                    </Button>
                </div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-0.5">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Deshacer (Ctrl+Z)"
                    >
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Rehacer (Ctrl+Y)"
                    >
                        <Redo className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="bg-[#1e1e1e] text-white/90 medical-notes-editor">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}
