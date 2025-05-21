import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

// Estilização para os elementos do editor
import './TipTapEditor.css'; // Vamos criar este arquivo CSS para estilização adicional

const TipTapEditor = ({ initialValue, onChange, onSave }) => {
  // Inicializa o editor com StarterKit e conteúdo inicial
  const editor = useEditor({
    extensions: [StarterKit],
    content: initialValue || '<p></p>',
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: 'tiptap-editor-content p-3 min-h-[250px] focus:outline-none prose prose-sm max-w-none',
      },
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
    <div className="border border-gray-300 rounded-md tiptap-editor">
      {/* Toolbar exatamente como no projeto de teste */}
      <div className="flex flex-wrap border-b p-2 bg-gray-50 space-x-1">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1 rounded border ${
            editor.isActive('bold') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
          }`}
        >
          Bold
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1 rounded border ${
            editor.isActive('italic') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
          }`}
        >
          Italic
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`px-3 py-1 rounded border ${
            editor.isActive('code') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
          }`}
        >
          Code
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-3 py-1 rounded border ${
            editor.isActive('heading', { level: 1 }) ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
          }`}
        >
          H1
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-1 rounded border ${
            editor.isActive('heading', { level: 2 }) ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
          }`}
        >
          H2
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1 rounded border ${
            editor.isActive('bulletList') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
          }`}
        >
          • List
        </button>
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1 rounded border ${
            editor.isActive('orderedList') ? 'bg-blue-100 border-blue-500' : 'bg-white border-gray-300'
          }`}
        >
          1. List
        </button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Save Button (if applicable) */}
      {onSave && (
        <div className="border-t border-gray-200 p-2 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Salvar
          </button>
        </div>
      )}
    </div>
  );
};

export default TipTapEditor;