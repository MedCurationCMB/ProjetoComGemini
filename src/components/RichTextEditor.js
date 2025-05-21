// src/components/RichTextEditor.js
import React, { useCallback, useMemo } from 'react';
import isHotkey from 'is-hotkey';
import { createEditor, Transforms, Editor, Text } from 'slate';
import { Slate, Editable, withReact, useSlate } from 'slate-react';
import { withHistory } from 'slate-history';
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

// Configurações
const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code'
};

const LIST_TYPES = ['numbered-list', 'bulleted-list'];
const TEXT_ALIGN_TYPES = ['left', 'center', 'right', 'justify'];

// Valor inicial padrão
const DEFAULT_VALUE = [
  {
    type: 'paragraph',
    children: [{ text: '' }],
  },
];

// Função simplificada para HTML -> Slate
const htmlToSlate = (html) => {
  try {
    // Se vazio, retorna valor padrão
    if (!html || typeof html !== 'string' || html.trim() === '') {
      return DEFAULT_VALUE;
    }

    // Estamos usando uma abordagem simplificada para extrair o texto
    // Isso não preservará toda a formatação, mas é muito mais robusta
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Extrai texto e estrutura básica
    const extractTextStructure = (node) => {
      // Se for texto simples, retorna o objeto de texto
      if (node.nodeType === Node.TEXT_NODE) {
        return { text: node.textContent || '' };
      }

      // Para elementos, processa de acordo com a tag
      if (node.nodeType === Node.ELEMENT_NODE) {
        const children = Array.from(node.childNodes).flatMap(extractTextStructure);
        
        // Se não houver filhos, adiciona um texto vazio
        if (children.length === 0) {
          children.push({ text: '' });
        }
        
        // Mapeia tags HTML para tipos Slate
        switch (node.nodeName.toLowerCase()) {
          case 'h1':
            return [{ type: 'heading-one', children }];
          case 'h2':
            return [{ type: 'heading-two', children }];
          case 'blockquote':
            return [{ type: 'block-quote', children }];
          case 'ul':
            return [{ type: 'bulleted-list', children }];
          case 'ol':
            return [{ type: 'numbered-list', children }];
          case 'li':
            return [{ type: 'list-item', children }];
          case 'p':
            return [{ type: 'paragraph', children }];
          case 'strong':
          case 'b':
            return children.map(child => 
              Text.isText(child) ? { ...child, bold: true } : child
            );
          case 'em':
          case 'i':
            return children.map(child => 
              Text.isText(child) ? { ...child, italic: true } : child
            );
          case 'u':
            return children.map(child => 
              Text.isText(child) ? { ...child, underline: true } : child
            );
          case 'code':
            return children.map(child => 
              Text.isText(child) ? { ...child, code: true } : child
            );
          default: 
            // Para outras tags, apenas retorna os filhos
            return children;
        }
      }
      
      // Para outros tipos de nó, retorna um array vazio
      return [];
    };
    
    // Processa o documento e obtém a estrutura
    const nodes = extractTextStructure(tempDiv).filter(node => node !== null && node !== undefined);
    
    // Se não houver nós válidos, retorna valor padrão
    if (nodes.length === 0) {
      return DEFAULT_VALUE;
    }
    
    return nodes;
  } catch (error) {
    console.error('Erro ao converter HTML para Slate:', error);
    return DEFAULT_VALUE;
  }
};

// Função simples para Slate -> HTML
const slateToHtml = (nodes) => {
  try {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return '';
    }
    
    // Função recursiva para converter nós em HTML
    const nodeToHtml = (node) => {
      // Se for texto, processa marcas de formatação
      if (Text.isText(node)) {
        let text = node.text || '';
        
        // Escape HTML entities
        text = text.replace(/&/g, '&amp;')
                   .replace(/</g, '&lt;')
                   .replace(/>/g, '&gt;')
                   .replace(/"/g, '&quot;')
                   .replace(/'/g, '&#039;');
        
        // Aplicar formatação
        if (node.bold) {
          text = `<strong>${text}</strong>`;
        }
        if (node.italic) {
          text = `<em>${text}</em>`;
        }
        if (node.underline) {
          text = `<u>${text}</u>`;
        }
        if (node.code) {
          text = `<code>${text}</code>`;
        }
        return text;
      }
      
      // Se não tiver filhos, retorna string vazia
      if (!node.children || !Array.isArray(node.children)) {
        return '';
      }
      
      // Processa os filhos em HTML
      const childrenHtml = node.children.map(nodeToHtml).join('');
      
      // Cria o atributo de estilo para alinhamento, se presente
      const style = node.align ? ` style="text-align: ${node.align}"` : '';
      
      // Mapeia tipos Slate para tags HTML
      switch (node.type) {
        case 'heading-one':
          return `<h1${style}>${childrenHtml}</h1>`;
        case 'heading-two':
          return `<h2${style}>${childrenHtml}</h2>`;
        case 'block-quote':
          return `<blockquote${style}>${childrenHtml}</blockquote>`;
        case 'bulleted-list':
          return `<ul${style}>${childrenHtml}</ul>`;
        case 'numbered-list':
          return `<ol${style}>${childrenHtml}</ol>`;
        case 'list-item':
          return `<li${style}>${childrenHtml}</li>`;
        case 'paragraph':
        default:
          return `<p${style}>${childrenHtml}</p>`;
      }
    };
    
    // Converte cada nó e junta em uma string HTML
    return nodes.map(nodeToHtml).join('');
  } catch (error) {
    console.error('Erro ao converter Slate para HTML:', error);
    return '';
  }
};

// Componente principal
const RichTextEditor = ({ value, onChange }) => {
  // Criar editor
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  
  // Determinar valor inicial
  const initialValue = useMemo(() => {
    try {
      if (typeof value === 'string') {
        return htmlToSlate(value);
      }
      
      if (Array.isArray(value) && value.length > 0) {
        return value;
      }
      
      return DEFAULT_VALUE;
    } catch (error) {
      console.error('Erro ao determinar valor inicial:', error);
      return DEFAULT_VALUE;
    }
  }, [value]);
  
  // Funções de renderização
  const renderElement = useCallback(props => <Element {...props} />, []);
  const renderLeaf = useCallback(props => <Leaf {...props} />, []);
  
  // Função para lidar com mudanças no editor
  const handleChange = value => {
    try {
      if (onChange && typeof onChange === 'function') {
        const html = slateToHtml(value);
        onChange(html);
      }
    } catch (error) {
      console.error('Erro ao processar mudança:', error);
    }
  };
  
  return (
    <div className="border border-gray-300 rounded-md">
      <Slate 
        editor={editor} 
        initialValue={initialValue}
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
            try {
              for (const hotkey in HOTKEYS) {
                if (isHotkey(hotkey, event)) {
                  event.preventDefault();
                  toggleMark(editor, HOTKEYS[hotkey]);
                }
              }
            } catch (error) {
              console.error('Erro no manipulador de teclado:', error);
            }
          }}
        />
      </Slate>
    </div>
  );
};

// Componentes auxiliares
const Toolbar = ({ children }) => {
  return (
    <div className="flex flex-wrap border-b p-2 bg-gray-50">
      {children}
    </div>
  );
};

// Utilitários de formatação
const toggleBlock = (editor, format) => {
  try {
    const isActive = isBlockActive(editor, format, TEXT_ALIGN_TYPES.includes(format) ? 'align' : 'type');
    const isList = LIST_TYPES.includes(format);

    Transforms.unwrapNodes(editor, {
      match: n => !Editor.isEditor(n) && LIST_TYPES.includes(n.type) && !TEXT_ALIGN_TYPES.includes(format),
      split: true,
    });

    const newProps = TEXT_ALIGN_TYPES.includes(format)
      ? { align: isActive ? undefined : format }
      : { type: isActive ? 'paragraph' : isList ? 'list-item' : format };

    Transforms.setNodes(editor, newProps);

    if (!isActive && isList) {
      Transforms.wrapNodes(editor, { type: format, children: [] });
    }
  } catch (error) {
    console.error('Erro ao alternar bloco:', error);
  }
};

const toggleMark = (editor, format) => {
  try {
    const isActive = isMarkActive(editor, format);
    if (isActive) {
      Editor.removeMark(editor, format);
    } else {
      Editor.addMark(editor, format, true);
    }
  } catch (error) {
    console.error('Erro ao alternar marca:', error);
  }
};

const isBlockActive = (editor, format, blockType = 'type') => {
  try {
    const { selection } = editor;
    if (!selection) return false;

    const [match] = Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: n => !Editor.isEditor(n) && n[blockType] === format,
    });

    return !!match;
  } catch (error) {
    console.error('Erro ao verificar bloco ativo:', error);
    return false;
  }
};

const isMarkActive = (editor, format) => {
  try {
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  } catch (error) {
    console.error('Erro ao verificar marca ativa:', error);
    return false;
  }
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

export default RichTextEditor