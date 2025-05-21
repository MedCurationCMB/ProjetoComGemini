// src/components/RichTextEditor.js
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import isHotkey from 'is-hotkey';
import { Editor, Element as SlateElement, Transforms, createEditor, Node, Text } from 'slate';
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

// Valor inicial padrão
const DEFAULT_VALUE = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

// Funções para serializar de Slate para HTML
const serialize = nodes => {
  return nodes.map(node => serializeNode(node)).join('');
};

const serializeNode = node => {
  // Verificar se é um nó de texto
  if (Text.isText(node)) {
    let string = node.text;
    
    // Aplicar formatações no texto
    if (node.bold) {
      string = `<strong>${string}</strong>`;
    }
    if (node.italic) {
      string = `<em>${string}</em>`;
    }
    if (node.underline) {
      string = `<u>${string}</u>`;
    }
    if (node.code) {
      string = `<code>${string}</code>`;
    }
    
    return string;
  }

  // Serializar os filhos do nó
  const children = node.children ? node.children.map(n => serializeNode(n)).join('') : '';

  // Aplicar tags baseadas no tipo do nó
  switch (node.type) {
    case 'block-quote':
      return `<blockquote>${children}</blockquote>`;
    case 'paragraph':
      if (node.align) {
        return `<p style="text-align: ${node.align}">${children}</p>`;
      }
      return `<p>${children}</p>`;
    case 'heading-one':
      if (node.align) {
        return `<h1 style="text-align: ${node.align}">${children}</h1>`;
      }
      return `<h1>${children}</h1>`;
    case 'heading-two':
      if (node.align) {
        return `<h2 style="text-align: ${node.align}">${children}</h2>`;
      }
      return `<h2>${children}</h2>`;
    case 'list-item':
      return `<li>${children}</li>`;
    case 'numbered-list':
      return `<ol>${children}</ol>`;
    case 'bulleted-list':
      return `<ul>${children}</ul>`;
    default:
      return children;
  }
};

// Funções para deserializar de HTML para Slate
const deserialize = html => {
  if (!html || html.trim() === '') {
    return DEFAULT_VALUE;
  }

  // Criar um elemento temporário para analisar o HTML
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const body = doc.body;

  // Função recursiva para converter elementos DOM para objetos Slate
  const deserializeNodes = el => {
    // Texto simples
    if (el.nodeType === 3) {
      return { text: el.textContent };
    }
    
    // Elemento ignorado
    if (el.nodeType !== 1) {
      return null;
    }

    // Processar elementos de formatação inline
    if (el.nodeName === 'STRONG' || el.nodeName === 'B') {
      return el.childNodes.length === 0
        ? { text: '', bold: true }
        : Array.from(el.childNodes).map(child => {
            const node = deserializeNodes(child);
            if (Text.isText(node)) {
              return { ...node, bold: true };
            }
            // Para elementos aninhados, preservamos a estrutura
            return node;
          });
    }

    if (el.nodeName === 'EM' || el.nodeName === 'I') {
      return el.childNodes.length === 0
        ? { text: '', italic: true }
        : Array.from(el.childNodes).map(child => {
            const node = deserializeNodes(child);
            if (Text.isText(node)) {
              return { ...node, italic: true };
            }
            return node;
          });
    }

    if (el.nodeName === 'U') {
      return el.childNodes.length === 0
        ? { text: '', underline: true }
        : Array.from(el.childNodes).map(child => {
            const node = deserializeNodes(child);
            if (Text.isText(node)) {
              return { ...node, underline: true };
            }
            return node;
          });
    }

    if (el.nodeName === 'CODE') {
      return el.childNodes.length === 0
        ? { text: '', code: true }
        : Array.from(el.childNodes).map(child => {
            const node = deserializeNodes(child);
            if (Text.isText(node)) {
              return { ...node, code: true };
            }
            return node;
          });
    }

    // Obter alinhamento do elemento
    let align;
    const style = el.getAttribute('style') || '';
    const alignMatch = style.match(/text-align:\s*([a-z]+)/i);
    if (alignMatch && alignMatch[1]) {
      align = alignMatch[1].toLowerCase();
    }

    // Processar elementos de bloco
    const children = Array.from(el.childNodes)
      .map(deserializeNodes)
      .flat()
      .filter(node => node !== null);

    switch (el.nodeName) {
      case 'BLOCKQUOTE':
        return {
          type: 'block-quote',
          align,
          children: children.length > 0 ? children : [{ text: '' }],
        };
      case 'P':
        return {
          type: 'paragraph',
          align,
          children: children.length > 0 ? children : [{ text: '' }],
        };
      case 'H1':
        return {
          type: 'heading-one',
          align,
          children: children.length > 0 ? children : [{ text: '' }],
        };
      case 'H2':
        return {
          type: 'heading-two',
          align,
          children: children.length > 0 ? children : [{ text: '' }],
        };
      case 'LI':
        return {
          type: 'list-item',
          align,
          children: children.length > 0 ? children : [{ text: '' }],
        };
      case 'OL':
        return {
          type: 'numbered-list',
          align,
          children: children.length > 0 ? children : [{ type: 'list-item', children: [{ text: '' }] }],
        };
      case 'UL':
        return {
          type: 'bulleted-list',
          align,
          children: children.length > 0 ? children : [{ type: 'list-item', children: [{ text: '' }] }],
        };
      case 'DIV':
      case 'BODY':
        // Processar divs e o corpo como containers transparentes
        return children;
      default:
        // Para outros elementos, tentar processar como texto
        return children.length === 0 ? { text: el.textContent } : children;
    }
  };

  // Iniciar o processamento do corpo
  const nodes = deserializeNodes(body);
  
  // Garantir que temos um array de nós
  const result = Array.isArray(nodes) ? nodes : [nodes];
  
  // Se não tiver nenhum nó, retornar valor padrão
  if (result.length === 0) {
    return DEFAULT_VALUE;
  }
  
  // Verificar se os nós estão no formato correto
  const validNodes = result.filter(node => node && (node.type || Text.isText(node)));
  
  return validNodes.length > 0 ? validNodes : DEFAULT_VALUE;
};

// Componente principal
const RichTextEditor = ({ value, onChange }) => {
  // Criar um editor Slate
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Estado para controlar o conteúdo do editor
  const [editorContent, setEditorContent] = useState(() => {
    // Se o valor for HTML, converter para formato Slate
    if (typeof value === 'string') {
      return deserialize(value);
    }
    
    // Se for array válido de nós Slate, usar diretamente
    if (Array.isArray(value) && value.length > 0) {
      return value;
    }
    
    // Caso contrário, usar valor padrão
    return DEFAULT_VALUE;
  });
  
  // Atualizar o conteúdo quando a prop value mudar
  useEffect(() => {
    if (typeof value === 'string' && value !== serialize(editorContent)) {
      setEditorContent(deserialize(value));
    }
  }, [value]);

  // Callbacks para renderização
  const renderElement = useCallback(props => <Element {...props} />, []);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);

  // Função para lidar com mudanças no editor
  const handleChange = newValue => {
    setEditorContent(newValue);
    
    // Chamar o callback onChange com o HTML serializado
    if (onChange) {
      const html = serialize(newValue);
      onChange(html);
    }
  };

  return (
    <div className="border border-gray-300 rounded-md">
      <Slate 
        editor={editor} 
        value={editorContent}
        onChange={handleChange}
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