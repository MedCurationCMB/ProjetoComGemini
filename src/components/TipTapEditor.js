import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState } from 'react';

const TipTapEditor = ({ initialValue, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: initialValue || '<p></p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (onChange) {
        onChange(html);
      }
    },
  });

  if (!editor) {
    return <div>Carregando editor...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-md">
      <div className="flex flex-wrap border-b p-2 bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Negrito"
        >
          B
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Itálico"
        >
          I
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Lista com marcadores"
        >
          • Lista
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Lista numerada"
        >
          1. Lista
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 rounded hover:bg-gray-200 ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
          }`}
          title="Título"
        >
          H2
        </button>
      </div>
      <EditorContent editor={editor} className="p-3 min-h-[250px] focus:outline-none" />
    </div>
  );
};

export default TipTapEditor;