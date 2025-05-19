// Componente EditorConteudoModal.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiSave, FiX } from 'react-icons/fi';

/**
 * Componente modal para edição de conteúdo (texto extraído ou retorno de IA)
 * @param {Object} props - Propriedades do componente
 * @param {Object} props.documento - Documento sendo editado
 * @param {string} props.tipo - Tipo de conteúdo ('conteudo' ou 'retorno_ia')
 * @param {function} props.onClose - Função para fechar o modal
 * @param {function} props.onSave - Função chamada após salvar com sucesso
 */
const EditorConteudoModal = ({ documento, tipo, onClose, onSave }) => {
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Configurar título baseado no tipo
  const titulo = tipo === 'conteudo' 
    ? (documento.conteudo && documento.conteudo.trim() !== '' ? 'Editar Texto Extraído' : 'Adicionar Texto Extraído')
    : 'Editar Análise de IA';
  
  // Carregar texto atual
  useEffect(() => {
    if (documento) {
      const conteudoAtual = tipo === 'conteudo' ? documento.conteudo : documento.retorno_ia;
      setTexto(conteudoAtual || '');
      setLoading(false);
    }
  }, [documento, tipo]);
  
  // Salvar alterações no Supabase
  const salvarAlteracoes = async () => {
    if (!texto.trim()) {
      toast.error(`Por favor, insira o ${tipo === 'conteudo' ? 'texto extraído' : 'texto da análise'} antes de salvar`);
      return;
    }
    
    try {
      setSalvando(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setSalvando(false);
        return;
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao = {};
      dadosAtualizacao[tipo] = texto;
      
      // Atualizar no Supabase
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update(dadosAtualizacao)
        .eq('id', documento.id)
        .select();
      
      if (error) throw error;
      
      toast.success(`${tipo === 'conteudo' ? 'Texto extraído' : 'Análise de IA'} atualizado com sucesso!`);
      
      // Chamar callback de sucesso
      if (onSave) {
        onSave(data[0]);
      }
      
      // Fechar o modal
      onClose();
      
    } catch (error) {
      console.error(`Erro ao atualizar ${tipo}:`, error);
      toast.error(`Erro ao salvar ${tipo === 'conteudo' ? 'texto extraído' : 'análise de IA'}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{titulo}</h2>
          <button 
            onClick={onClose}
            className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
          >
            Fechar
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {tipo === 'conteudo' && !documento.conteudo && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-yellow-800 font-medium mb-2">Texto não disponível para extração</p>
                <p className="text-yellow-700">
                  Para extrair o texto deste documento, por favor, utilize esta ferramenta:
                </p>
                <a 
                  href="https://testedoctr.streamlit.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded"
                >
                  Acessar Ferramenta de Extração de Texto
                </a>
                <p className="mt-3 text-sm text-gray-600">
                  1. Na ferramenta, faça upload do documento PDF<br/>
                  2. Extraia o texto e copie-o<br/>
                  3. Cole o texto no campo abaixo e salve as alterações
                </p>
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="textoEditor" className="block text-sm font-medium text-gray-700 mb-1">
                {tipo === 'conteudo' 
                  ? (documento.conteudo ? "Texto extraído:" : "Cole o texto extraído aqui:")
                  : "Análise de IA:"
                }
              </label>
              <textarea
                id="textoEditor"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={15}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder={tipo === 'conteudo' 
                  ? "Cole aqui o texto extraído do documento..." 
                  : "Edite aqui a análise de IA..."}
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={salvarAlteracoes}
                disabled={salvando || !texto.trim()}
                className={`flex items-center px-4 py-2 rounded ${
                  salvando || !texto.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EditorConteudoModal;