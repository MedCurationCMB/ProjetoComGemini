// src/components/RichTextEditor.js
import React, { useMemo, useCallback, useState } from 'react';
import { createEditor, Transforms, Editor, Text, Element as SlateElement } from 'slate';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import { withHistory } from 'slate-history';
import { FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';

// Constantes para tipos de listas e alinhamentos
const LIST_TYPES = ['bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right'];

// Valor inicial padrão
const DEFAULT_VALUE = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const RichTextEditor = ({ value, onChange }) => {
  // Criar um editor Slate que é usável no ambiente React
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Usar estado interno para gerenciar o valor do editor
  const [editorValue, setEditorValue] = useState(() => {
    try {
      // Tente usar o valor passado, se for válido
      if (Array.isArray(value) && value.length > 0) {
        return value;
      }
      // Se não for um array válido, use o valor padrão
      return DEFAULT_VALUE;
    } catch (error) {
      console.error("Erro ao inicializar valor do editor:", error);
      return DEFAULT_VALUE;
    }
  });

  // Função para lidar com mudanças no editor
  const handleChange = newValue => {
    setEditorValue(newValue);
    if (onChange && typeof onChange === 'function') {
      onChange(newValue);
    }
  };

  // Renderiza os elementos
  const renderElement = useCallback(props => {
    const { attributes, children, element } = props;
    
    // Aplicar estilo de alinhamento
    const style = { textAlign: element.align };

    switch (element.type) {
      case 'bulleted-list':
        return (
          <ul style={style} {...attributes}>
            {children}
          </ul>
        );
      case 'list-item':
        return (
          <li style={style} {...attributes}>
            {children}
          </li>
        );
      default:
        return (
          <p style={style} {...attributes}>
            {children}
          </p>
        );
    }
  }, []);

  // Renderiza as folhas (texto com formatação)
  const renderLeaf = useCallback(props => {
    const { attributes, children, leaf } = props;
    let textWithFormatting = children;
    
    if (leaf.bold) {
      textWithFormatting = <strong>{textWithFormatting}</strong>;
    }
    
    if (leaf.italic) {
      textWithFormatting = <em>{textWithFormatting}</em>;
    }
    
    if (leaf.underline) {
      textWithFormatting = <u>{textWithFormatting}</u>;
    }
    
    return <span {...attributes}>{textWithFormatting}</span>;
  }, []);

  return (
    <div className="border border-gray-300 rounded-md">
      <Slate 
        editor={editor} 
        initialValue={editorValue}
        onChange={handleChange}
      >
        <Toolbar>
          <MarkButton format="bold" icon={<FiBold />} />
          <MarkButton format="italic" icon={<FiItalic />} />
          <MarkButton format="underline" icon={<FiUnderline />} />
          <div className="border-l mx-2 border-gray-300"></div>
          <BlockButton format="left" icon={<FiAlignLeft />} />
          <BlockButton format="center" icon={<FiAlignCenter />} />
          <BlockButton format="right" icon={<FiAlignRight />} />
          <div className="border-l mx-2 border-gray-300"></div>
          <BlockButton format="bulleted-list" icon={<FiList />} />
        </Toolbar>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Digite seu texto aqui..."
          className="p-3 min-h-[200px] focus:outline-none"
          spellCheck={false}
        />
      </Slate>
    </div>
  );
};

// Componente de barra de ferramentas
const Toolbar = ({ children }) => {
  return (
    <div className="flex border-b p-2 bg-gray-50">
      {children}
    </div>
  );
};

// Verifica se um formato de marca está ativo
const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

// Verifica se um formato de bloco está ativo
const isBlockActive = (editor, format, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        (blockType === 'type' ? n.type === format : n.align === format),
    })
  );

  return !!match;
};

// Alterna uma marca (negrito, itálico, sublinhado)
const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);

  if (isActive) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

// Alterna um formato de bloco (lista, alinhamento)
const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  );
  const isList = LIST_TYPES.includes(format);

  // Primeiro, desembrulha qualquer nó de lista
  if (isList) {
    Transforms.unwrapNodes(editor, {
      match: n =>
        !Editor.isEditor(n) &&
        SlateElement.isElement(n) &&
        LIST_TYPES.includes(n.type),
      split: true,
    });
  }

  let newProperties;
  if (TEXT_ALIGN_TYPES.includes(format)) {
    // Alinhamento
    newProperties = {
      align: isActive ? undefined : format,
    };
  } else {
    // Tipo de bloco
    newProperties = {
      type: isActive ? 'paragraph' : isList ? 'list-item' : format,
    };
  }

  // Define novos tipos de nós
  Transforms.setNodes(editor, newProperties);

  // Embrulha em nós de lista, se necessário
  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor, block);
  }
};

// Botão para formatos de marca (negrito, itálico, sublinhado)
const MarkButton = ({ format, icon }) => {
  const editor = useSlate();
  
  return (
    <button
      className={`p-2 rounded hover:bg-gray-200 ${
        isMarkActive(editor, format) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'
      }`}
      onMouseDown={event => {
        event.preventDefault();
        toggleMark(editor, format);
      }}
      title={format.charAt(0).toUpperCase() + format.slice(1)}
    >
      {icon}
    </button>
  );
};

// Botão para formatos de bloco (lista, alinhamento)
const BlockButton = ({ format, icon }) => {
  const editor = useSlate();
  const isAlign = TEXT_ALIGN_TYPES.includes(format);
  
  return (
    <button
      className={`p-2 rounded hover:bg-gray-200 ${
        isBlockActive(editor, format, isAlign ? 'align' : 'type')
          ? 'bg-gray-200 text-blue-600'
          : 'text-gray-600'
      }`}
      onMouseDown={event => {
        event.preventDefault();
        toggleBlock(editor, format);
      }}
      title={format.charAt(0).toUpperCase() + format.slice(1)}
    >
      {icon}
    </button>
  );
};

export default RichTextEditor;