// src/components/RichTextEditor.js
import React, { useMemo, useCallback } from 'react';
import { createEditor, Transforms, Editor, Text } from 'slate';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import { withHistory } from 'slate-history';

// Define elementos personalizados para diferentes tipos de blocos
const Element = ({ attributes, children, element }) => {
  switch (element.type) {
    case 'block-quote':
      return <blockquote {...attributes} className="border-l-4 border-gray-300 pl-4 italic">{children}</blockquote>;
    case 'bulleted-list':
      return <ul {...attributes} className="list-disc pl-5">{children}</ul>;
    case 'heading-one':
      return <h1 {...attributes} className="text-2xl font-bold my-2">{children}</h1>;
    case 'heading-two':
      return <h2 {...attributes} className="text-xl font-bold my-2">{children}</h2>;
    case 'list-item':
      return <li {...attributes}>{children}</li>;
    case 'numbered-list':
      return <ol {...attributes} className="list-decimal pl-5">{children}</ol>;
    default:
      return <p {...attributes} className="my-1">{children}</p>;
  }
};

// Define o estilo para texto com marcação (negrito, itálico, etc.)
const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.code) {
    children = <code className="bg-gray-200 px-1 rounded">{children}</code>;
  }

  return <span {...attributes}>{children}</span>;
};

// Botão da barra de ferramentas
const ToolbarButton = ({ format, icon, isBlock = false }) => {
  const editor = useSlate();
  
  const isBlockActive = (editor, format) => {
    const [match] = Editor.nodes(editor, {
      match: n => n.type === format,
    });
    return !!match;
  };

  const isMarkActive = (editor, format) => {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  };

  const toggleBlock = (editor, format) => {
    const isActive = isBlockActive(editor, format);
    const isList = format === 'bulleted-list' || format === 'numbered-list';

    Transforms.unwrapNodes(editor, {
      match: n => 
        ['bulleted-list', 'numbered-list'].includes(n.type),
      split: true,
    });

    Transforms.setNodes(editor, {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    });

    if (!isActive && isList) {
      Transforms.wrapNodes(editor, { type: format, children: [] });
    }
  };

  const toggleMark = (editor, format) => {
    const isActive = isMarkActive(editor, format);
    
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  };

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        if (isBlock) {
          toggleBlock(editor, format);
        } else {
          toggleMark(editor, format);
        }
      }}
      className={`p-2 rounded ${
        isBlock
          ? isBlockActive(editor, format) ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'
          : isMarkActive(editor, format) ? 'bg-gray-300' : 'bg-gray-100 hover:bg-gray-200'
      }`}
    >
      {icon}
    </button>
  );
};

// Toolbar com botões de formatação
const Toolbar = () => {
  return (
    <div className="flex space-x-1 mb-2 p-1 bg-gray-100 rounded border">
      <ToolbarButton format="bold" icon="B" />
      <ToolbarButton format="italic" icon="I" />
      <ToolbarButton format="underline" icon="U" />
      <div className="border-l border-gray-300 mx-1"></div>
      <ToolbarButton format="heading-one" icon="H1" isBlock />
      <ToolbarButton format="heading-two" icon="H2" isBlock />
      <div className="border-l border-gray-300 mx-1"></div>
      <ToolbarButton format="bulleted-list" icon="• Lista" isBlock />
      <ToolbarButton format="numbered-list" icon="1. Lista" isBlock />
      <div className="border-l border-gray-300 mx-1"></div>
      <ToolbarButton format="block-quote" icon='"' isBlock />
      <ToolbarButton format="code" icon="<>" />
    </div>
  );
};

// Conversor para transformar o HTML salvo em um formato que o Slate entenda
const deserialize = html => {
  if (!html) return [{ type: 'paragraph', children: [{ text: '' }] }];
  
  try {
    // Se for JSON (Slate armazena seus dados em JSON)
    return JSON.parse(html);
  } catch (error) {
    // Se for HTML normal (ou texto), crie um parágrafo simples
    return [{ 
      type: 'paragraph', 
      children: [{ text: html.replace(/<[^>]*>/g, '') }] 
    }];
  }
};

// Componente principal do editor
const RichTextEditor = ({ value, onChange }) => {
  // Criar o editor com plugins para histórico e compatibilidade com React
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Inicializar com o valor atual ou um parágrafo vazio
  const initialValue = useMemo(() => deserialize(value), [value]);

  const renderElement = useCallback(props => <Element {...props} />, []);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      <Slate
        editor={editor}
        value={initialValue}
        onChange={newValue => {
          const isAstChange = editor.operations.some(
            op => 'set_selection' !== op.type
          );
          if (isAstChange) {
            // Salvar como JSON para preservar todas as formatações
            onChange(JSON.stringify(newValue));
          }
        }}
      >
        <Toolbar />
        <div className="px-3 py-2 bg-white">
          <Editable
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            placeholder="Adicione seu texto análise aqui..."
            className="min-h-[250px] focus:outline-none"
          />
        </div>
      </Slate>
    </div>
  );
};

export default RichTextEditor;