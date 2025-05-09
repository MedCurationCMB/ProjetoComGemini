import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiSend, FiBrain, FiX, FiLoader } from 'react-icons/fi';
import { supabase } from '../utils/supabaseClient';

const AIAnalysisModal = ({ isOpen, onClose, documentId, documentName = 'Documento', onAnalysisComplete }) => {
  // Verificar se recebemos um ID válido
  if (!documentId) {
    console.error('AIAnalysisModal: documentId não fornecido');
    return null;
  }

  const [apiKey, setApiKey] = useState('');
  const [promptId, setPromptId] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [error, setError] = useState(null);
  
  // Carregar prompts e verificar se já existe análise 
  useEffect(() => {
    if (isOpen && documentId) {
      const fetchData = async () => {
        setInitialLoad(true);
        setError(null);
        
        try {
          // Buscar prompts disponíveis
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            setError('Você precisa estar logado para esta ação');
            toast.error('Você precisa estar logado para esta ação');
            return;
          }
          
          // Buscar os prompts disponíveis
          try {
            const promptsResponse = await fetch('/api/get_prompts', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (!promptsResponse.ok) {
              const errorData = await promptsResponse.json();
              throw new Error(errorData.error || 'Erro ao buscar prompts');
            }
            
            const promptsData = await promptsResponse.json();
            setPrompts(promptsData.prompts || []);
          } catch (promptError) {
            console.error('Erro ao buscar prompts:', promptError);
            setError('Falha ao carregar prompts disponíveis');
            toast.error('Falha ao carregar prompts disponíveis');
          }
          
          // Verificar se já existe análise para este documento
          try {
            const { data, error } = await supabase
              .from('base_dados_conteudo')
              .select('retorno_IA')
              .eq('id', documentId)
              .single();
              
            if (error) {
              console.error('Erro ao buscar retorno da IA:', error);
            } else if (data && data.retorno_IA) {
              setAnalysis(data.retorno_IA);
            }
          } catch (analysisError) {
            console.error('Erro ao verificar análise existente:', analysisError);
            // Não exibe erro ao usuário aqui, pois é apenas uma verificação preliminar
          }
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
          setError('Erro ao carregar dados necessários');
          toast.error('Erro ao carregar dados necessários');
        } finally {
          setInitialLoad(false);
        }
      };
      
      fetchData();
    }
  }, [isOpen, documentId]);
  
  // Função para enviar o texto para análise
  const handleAnalyze = async () => {
    if (!apiKey.trim()) {
      toast.error('Por favor, insira a chave de API do Google Gemini');
      return;
    }
    
    if (!promptId) {
      toast.error('Por favor, selecione um prompt');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Obter a sessão atual do usuário
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Você precisa estar logado para esta ação');
        toast.error('Você precisa estar logado para esta ação');
        setLoading(false);
        return;
      }
      
      // Verificar se o documentId ainda é válido
      if (!documentId) {
        setError('ID do documento inválido');
        toast.error('ID do documento inválido');
        setLoading(false);
        return;
      }
      
      // Enviar para a API de análise
      const response = await fetch('/api/gemini_analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          document_id: documentId,
          api_key: apiKey,
          prompt_id: promptId
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao analisar documento');
      }
      
      const data = await response.json();
      setAnalysis(data.response);
      
      toast.success('Análise concluída com sucesso!');
      
      // Notificar componente pai sobre a conclusão
      if (onAnalysisComplete && typeof onAnalysisComplete === 'function') {
        onAnalysisComplete(data.response);
      }
      
    } catch (error) {
      console.error('Erro na análise da IA:', error);
      setError(error.message || 'Falha ao processar análise');
      toast.error(error.message || 'Falha ao processar análise');
    } finally {
      setLoading(false);
    }
  };
  
  // Se o modal não estiver aberto, não renderizar nada
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <FiBrain className="mr-2 text-purple-600" />
            Análise de IA: {documentName || 'Documento'}
          </h2>
          <button 
            onClick={onClose}
            className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
          >
            <FiX />
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700">
            <p>{error}</p>
          </div>
        )}
        
        {initialLoad ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Carregando...</span>
          </div>
        ) : analysis ? (
          // Se já existe uma análise, mostrar o resultado
          <div className="mb-6">
            <div className="bg-purple-50 border border-purple-100 rounded-md p-4">
              <h3 className="text-purple-800 font-semibold mb-2">Resultado da Análise</h3>
              <div className="whitespace-pre-wrap bg-white p-4 border border-gray-200 rounded text-gray-800 max-h-[50vh] overflow-y-auto">
                {analysis}
              </div>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setAnalysis('');
                  setApiKey('');
                  setPromptId('');
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded mr-2"
              >
                Nova Análise
              </button>
              <button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                Fechar
              </button>
            </div>
          </div>
        ) : (
          // Se não existe análise, mostrar formulário para envio
          <div>
            <div className="mb-4">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
                Chave de API do Google Gemini
              </label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Insira sua chave de API do Google Gemini"
              />
              <p className="text-xs text-gray-500 mt-1">
                Sua chave será usada apenas para esta solicitação e não será armazenada.
              </p>
            </div>
            
            <div className="mb-6">
              <label htmlFor="promptId" className="block text-sm font-medium text-gray-700 mb-1">
                Selecione um Prompt
              </label>
              <select
                id="promptId"
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Selecione um prompt...</option>
                {Array.isArray(prompts) && prompts.length > 0 ? (
                  prompts.map(prompt => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.nome}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Nenhum prompt disponível</option>
                )}
              </select>
              {prompts.length === 0 && !initialLoad && (
                <p className="text-xs text-red-500 mt-1">
                  Nenhum prompt encontrado. Verifique se a tabela 'prompts' no Supabase contém registros.
                </p>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded mr-2"
              >
                Cancelar
              </button>
              <button
                onClick={handleAnalyze}
                disabled={loading || !apiKey.trim() || !promptId}
                className={`flex items-center px-4 py-2 rounded ${
                  loading || !apiKey.trim() || !promptId
                    ? 'bg-purple-300 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <FiLoader className="animate-spin mr-2" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <FiSend className="mr-2" />
                    Analisar
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAnalysisModal;