import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiList, 
  FiCode, 
  FiType, 
  FiHash 
} from 'react-icons/fi';

const TipTapEditor = ({ initialValue, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialValue || '<p></p>',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  if (!editor) {
    return <div>Carregando editor...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-md">
      <div className="flex flex-wrap border-b p-2 bg-gray-50">
        {/* Formatação de texto básica */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Negrito"
        >
          <FiBold />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Itálico"
        >
          <FiItalic />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('code') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Código"
        >
          <FiCode />
        </button>
        
        <div className="border-l mx-2 border-gray-300"></div>

        {/* Cabeçalhos */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Título 1"
        >
          <FiType />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Título 2"
        >
          <FiHash />
        </button>
        
        <div className="border-l mx-2 border-gray-300"></div>

        {/* Listas */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Lista com marcadores"
        >
          <FiList />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 flex items-center justify-center rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Lista numerada"
        >
          <span className="font-bold text-sm">1.</span>
        </button>
        
        <div className="border-l mx-2 border-gray-300"></div>

        {/* Parágrafo */}
        <button
          onClick={() => editor.chain().focus().setParagraph().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('paragraph') && !editor.isActive('bulletList') && !editor.isActive('orderedList') 
              ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Parágrafo"
        >
          <span className="font-bold">¶</span>
        </button>
        
        {/* Desfazer/Refazer */}
        <div className="border-l mx-2 border-gray-300"></div>
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`p-2 rounded hover:bg-gray-200 ${
            !editor.can().undo() ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
          }`}
          title="Desfazer"
        >
          <span className="font-bold">↩</span>
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`p-2 rounded hover:bg-gray-200 ${
            !editor.can().redo() ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'
          }`}
          title="Refazer"
        >
          <span className="font-bold">↪</span>
        </button>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="p-3 min-h-[250px] focus:outline-none prose prose-sm max-w-none"
        style={{ height: '300px', overflowY: 'auto' }}
      />
    </div>
  );
};

export default TipTapEditor;