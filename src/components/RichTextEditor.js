// src/components/RichTextEditor.js
import React, { useCallback, useMemo, useState } from 'react';
import isHotkey from 'is-hotkey';
import { Editor, Element as SlateElement, Transforms, createEditor } from 'slate';
import { withHistory } from 'slate-history';
import { Editable, Slate, useSlate, withReact } from 'slate-react';
import { 
  FiBold, 
  FiItalic, 
  FiUnderline, 
  FiAlignLeft, 
  FiAlignCenter, 
  FiAlignRight, 
  FiAlignJustify,
  FiList,
  FiCode,
  FiType,
  FiHash,
  FiCornerUpRight
} from 'react-icons/fi';

// Configurações de atalho
const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};

// Tipos de lista e alinhamento
const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

// Valor inicial padrão (em conformidade com o seu sistema)
const DEFAULT_VALUE = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

const RichTextEditor = ({ value, onChange }) => {
  // Criar um editor Slate
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Usar o valor fornecido como prop ou o valor padrão
  const initialValue = useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
    return DEFAULT_VALUE;
  }, [value]);

  // Callbacks para renderização
  const renderElement = useCallback(props => <Element {...props} />, []);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);

  return (
    <div className="border border-gray-300 rounded-md">
      <Slate 
        editor={editor} 
        initialValue={initialValue}
        onChange={onChange}
      >
        <Toolbar>
          <MarkButton format="bold" icon={<FiBold />} />
          <MarkButton format="italic" icon={<FiItalic />} />
          <MarkButton format="underline" icon={<FiUnderline />} />
          <MarkButton format="code" icon={<FiCode />} />
          <div className="border-l mx-2 border-gray-300"></div>
          <BlockButton format="heading-one" icon={<FiType className="h-5 w-5" />} />
          <BlockButton format="heading-two" icon={<FiHash className="h-5 w-5" />} />
          <BlockButton format="block-quote" icon={<FiCornerUpRight className="h-5 w-5" />} />
          <div className="border-l mx-2 border-gray-300"></div>
          <BlockButton format="numbered-list" icon={<span className="font-bold">1.</span>} />
          <BlockButton format="bulleted-list" icon={<FiList />} />
          <div className="border-l mx-2 border-gray-300"></div>
          <BlockButton format="left" icon={<FiAlignLeft />} />
          <BlockButton format="center" icon={<FiAlignCenter />} />
          <BlockButton format="right" icon={<FiAlignRight />} />
          <BlockButton format="justify" icon={<FiAlignJustify />} />
        </Toolbar>
        <Editable
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder="Digite seu texto aqui..."
          className="p-3 min-h-[250px] focus:outline-none"
          spellCheck={false}
          onKeyDown={event => {
            // Adicionar suporte para teclas de atalho
            for (const hotkey in HOTKEYS) {
              if (isHotkey(hotkey, event)) {
                event.preventDefault();
                toggleMark(editor, HOTKEYS[hotkey]);
              }
            }
          }}
        />
      </Slate>
    </div>
  );
};

// Componente de barra de ferramentas
const Toolbar = ({ children }) => {
  return (
    <div className="flex flex-wrap border-b p-2 bg-gray-50">
      {children}
    </div>
  );
};

// Utilitários de formatação
const toggleBlock = (editor, format) => {
  const isActive = isBlockActive(
    editor,
    format,
    TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type'
  );
  const isList = LIST_TYPES.includes(format);

  Transforms.unwrapNodes(editor, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      LIST_TYPES.includes(n.type) &&
      !TEXT_ALIGN_TYPES.includes(format),
    split: true,
  });

  let newProps = TEXT_ALIGN_TYPES.includes(format)
    ? { align: isActive ? undefined : format }
    : { type: isActive ? 'paragraph' : isList ? 'list-item' : format };

  Transforms.setNodes(editor, newProps);

  if (!isActive && isList) {
    Transforms.wrapNodes(editor, { type: format, children: [] });
  }
};

const toggleMark = (editor, format) => {
  const isActive = isMarkActive(editor, format);
  isActive ? Editor.removeMark(editor, format) : Editor.addMark(editor, format, true);
};

const isBlockActive = (editor, format, blockType = 'type') => {
  const { selection } = editor;
  if (!selection) return false;
  
  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n => {
        if (!Editor.isEditor(n) && SlateElement.isElement(n)) {
          return blockType === 'align'
            ? n.align === format
            : n.type === format;
        }
        return false;
      },
    })
  );
  
  return !!match;
};

const isMarkActive = (editor, format) => {
  const marks = Editor.marks(editor);
  return marks ? marks[format] === true : false;
};

// Componentes de renderização
const Element = ({ attributes, children, element }) => {
  const style = element.align ? { textAlign: element.align } : {};
  
  switch (element.type) {
    case 'block-quote':
      return <blockquote className="border-l-4 border-gray-400 pl-4 italic text-gray-700" style={style} {...attributes}>{children}</blockquote>;
    case 'bulleted-list':
      return <ul className="list-disc pl-10" style={style} {...attributes}>{children}</ul>;
    case 'numbered-list':
      return <ol className="list-decimal pl-10" style={style} {...attributes}>{children}</ol>;
    case 'heading-one':
      return <h1 className="text-2xl font-bold my-3" style={style} {...attributes}>{children}</h1>;
    case 'heading-two':
      return <h2 className="text-xl font-bold my-2" style={style} {...attributes}>{children}</h2>;
    case 'list-item':
      return <li style={style} {...attributes}>{children}</li>;
    default:
      return <p className="my-2" style={style} {...attributes}>{children}</p>;
  }
};

const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};

// Botões para formatação
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

export default RichTextEditor;