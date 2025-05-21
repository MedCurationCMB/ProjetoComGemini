import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { FiSave } from 'react-icons/fi';

const TipTapEditor = ({ initialValue, onChange, onSave }) => {
  // Estado para armazenar o HTML atual
  const [html, setHtml] = useState(initialValue || '<p></p>');

  // Inicializa o editor com StarterKit e conteúdo inicial
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialValue || '<p></p>',
    onUpdate: ({ editor }) => {
      const newHtml = editor.getHTML();
      setHtml(newHtml);
      if (onChange) {
        onChange(newHtml);
      }
    },
  });

  // Função para salvar o conteúdo
  const handleSave = useCallback(() => {
    if (editor && onSave) {
      onSave(editor.getHTML());
    }
  }, [editor, onSave]);

  if (!editor) {
    return <div>Carregando editor...</div>;
  }

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Toolbar */}
      <div className="flex flex-wrap border-b p-2 bg-gray-50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 mr-1 rounded ${
            editor.isActive('bold') ? 'bg-gray-200 text-blue-600' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 mr-1 rounded ${
            editor.isActive('italic') ? 'bg-gray-200 text-blue-600' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`px-3 py-1 mr-1 rounded ${
            editor.isActive('code') ? 'bg-gray-200 text-blue-600' : 'bg-gray-100 text-gray-700'
          }`}
        >
          Code
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 mr-1 rounded ${
            editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 text-blue-600' : 'bg-gray-100 text-gray-700'
          }`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 mr-1 rounded ${
            editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 text-blue-600' : 'bg-gray-100 text-gray-700'
          }`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 mr-1 rounded ${
            editor.isActive('bulletList') ? 'bg-gray-200 text-blue-600' : 'bg-gray-100 text-gray-700'
          }`}
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 mr-1 rounded ${
            editor.isActive('orderedList') ? 'bg-gray-200 text-blue-600' : 'bg-gray-100 text-gray-700'
          }`}
        >
          1. List
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className="p-3 min-h-[250px] focus:outline-none prose prose-sm max-w-none"
      />

      {/* Save Button (if applicable) */}
      {onSave && (
        <div className="border-t border-gray-200 p-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            <FiSave className="mr-2" />
            Salvar
          </button>
        </div>
      )}
    </div>
  );
};

export default TipTapEditor;