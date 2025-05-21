// src/components/RichTextEditor.js
import React, { useMemo, useCallback, useState } from 'react';
import { createEditor, Transforms, Editor, Text } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { FiBold, FiItalic, FiUnderline, FiList, FiAlignLeft, FiAlignCenter, FiAlignRight } from 'react-icons/fi';

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

  // Define função para verificar se o texto está formatado
  const isFormatActive = useCallback(
    format => {
      const [match] = Editor.nodes(editor, {
        match: n => n[format] === true,
        mode: 'all',
      });
      return !!match;
    },
    [editor]
  );

  // Define função para aplicar formato
  const toggleFormat = useCallback(
    format => {
      const isActive = isFormatActive(format);
      Transforms.setNodes(
        editor,
        { [format]: isActive ? null : true },
        { match: n => Text.isText(n), split: true }
      );
    },
    [editor, isFormatActive]
  );

  // Renderiza os elementos
  const renderElement = useCallback(props => {
    switch (props.element.type) {
      case 'bulleted-list':
        return <ul {...props.attributes}>{props.children}</ul>;
      case 'list-item':
        return <li {...props.attributes}>{props.children}</li>;
      case 'align-left':
        return <div style={{ textAlign: 'left' }} {...props.attributes}>{props.children}</div>;
      case 'align-center':
        return <div style={{ textAlign: 'center' }} {...props.attributes}>{props.children}</div>;
      case 'align-right':
        return <div style={{ textAlign: 'right' }} {...props.attributes}>{props.children}</div>;
      default:
        return <p {...props.attributes}>{props.children}</p>;
    }
  }, []);

  // Renderiza as folhas (texto com formatação)
  const renderLeaf = useCallback(props => {
    let { children } = props;
    
    if (props.leaf.bold) {
      children = <strong>{children}</strong>;
    }
    
    if (props.leaf.italic) {
      children = <em>{children}</em>;
    }
    
    if (props.leaf.underline) {
      children = <u>{children}</u>;
    }
    
    return <span {...props.attributes}>{children}</span>;
  }, []);

  // Componente de botão para formatação
  const FormatButton = ({ format, icon }) => (
    <button
      onMouseDown={event => {
        event.preventDefault();
        toggleFormat(format);
      }}
      className={`p-2 rounded hover:bg-gray-200 ${isFormatActive(format) ? 'bg-gray-200 text-blue-600' : 'text-gray-600'}`}
      title={format.charAt(0).toUpperCase() + format.slice(1)}
    >
      {icon}
    </button>
  );

  return (
    <div className="border border-gray-300 rounded-md">
      <Slate 
        editor={editor} 
        initialValue={editorValue}
        onChange={handleChange}
      >
        <div className="flex border-b p-2 bg-gray-50">
          <FormatButton format="bold" icon={<FiBold />} />
          <FormatButton format="italic" icon={<FiItalic />} />
          <FormatButton format="underline" icon={<FiUnderline />} />
          <div className="border-l mx-2 border-gray-300"></div>
          <FormatButton format="align-left" icon={<FiAlignLeft />} />
          <FormatButton format="align-center" icon={<FiAlignCenter />} />
          <FormatButton format="align-right" icon={<FiAlignRight />} />
          <div className="border-l mx-2 border-gray-300"></div>
          <FormatButton format="bulleted-list" icon={<FiList />} />
        </div>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Digite seu texto aqui..."
          className="p-3 min-h-[200px] focus:outline-none"
        />
      </Slate>
    </div>
  );
};

export default RichTextEditor;