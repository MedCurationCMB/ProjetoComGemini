import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { FiAward, FiZap, FiCpu } from 'react-icons/fi';

const GeminiIndicatorAnalysisDialog = ({ indicadorData, onClose, onAnalysisComplete }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPrompts, setFetchingPrompts] = useState(true);
  const [result, setResult] = useState(null);
  const [chaveDisponivel, setChaveDisponivel] = useState(null);
  const [checkingKey, setCheckingKey] = useState(true);

  // Verificar se existe uma chave configurada
  useEffect(() => {
    const verificarChave = async () => {
      try {
        setCheckingKey(true);
        const { count, error } = await supabase
          .from('configuracoes_gemini')
          .select('*', { count: 'exact', head: true })
          .eq('vigente', true);
        
        if (error) throw error;
        
        const hasKey = count > 0;
        setChaveDisponivel(hasKey);
        
        if (!hasKey) {
          toast.error('Não há chave API configurada para o Gemini. Entre em contato com o administrador.');
        }
      } catch (error) {
        console.error('Erro ao verificar chave API:', error);
        setChaveDisponivel(false);
        toast.error('Erro ao verificar configuração da API Gemini');
      } finally {
        setCheckingKey(false);
      }
    };
    
    verificarChave();
  }, []);

  // Buscar prompts disponíveis para indicadores
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        setFetchingPrompts(true);
        
        // Primeiro tentar buscar na tabela 1s
        let { data, error } = await supabase
          .from('prompts_indicadores')
          .select('*')
          .order('nome_prompt', { ascending: true });

        // Se a tabela não existir, tentar na tabela prompts
        if (error && error.code === '42P01') {
          console.log('Tabela prompts_indicadores não encontrada, usando tabela prompts');
          const fallbackResponse = await supabase
            .from('prompts')
            .select('*')
            .order('nome_prompt', { ascending: true });
          
          if (fallbackResponse.error) throw fallbackResponse.error;
          data = fallbackResponse.data;
        } else if (error) {
          throw error;
        }
        
        setPrompts(data || []);
      } catch (error) {
        console.error('Erro ao carregar prompts:', error);
        toast.error('Não foi possível carregar os prompts disponíveis');
      } finally {
        setFetchingPrompts(false);
      }
    };

    fetchPrompts();
  }, []);

  // Função para formatar os dados da tabela para envio
  const formatTableData = () => {
    if (!indicadorData || indicadorData.length === 0) {
      return "Nenhum dado disponível para análise.";
    }

    // Agrupar dados por período
    const dadosAgrupados = {};
    indicadorData.forEach(item => {
      const periodo = item.periodo_referencia;
      
      if (!dadosAgrupados[periodo]) {
        dadosAgrupados[periodo] = {
          periodo_referencia: periodo,
          realizado: null,
          meta: null
        };
      }
      
      if (item.tipo_indicador === 1) { // Realizado
        dadosAgrupados[periodo].realizado = item.valor_indicador_apresentado;
      } else if (item.tipo_indicador === 2) { // Meta
        dadosAgrupados[periodo].meta = item.valor_indicador_apresentado;
      }
    });

    // Converter para texto formatado
    let tableText = "DADOS DOS INDICADORES:\n\n";
    tableText += "Período de Referência | Realizado | Meta\n";
    tableText += "".padEnd(50, "-") + "\n";
    
    Object.values(dadosAgrupados)
      .sort((a, b) => new Date(a.periodo_referencia) - new Date(b.periodo_referencia))
      .forEach(item => {
        const periodo = new Date(item.periodo_referencia).toLocaleDateString('pt-BR');
        const realizado = item.realizado !== null ? item.realizado : '-';
        const meta = item.meta !== null ? item.meta : '-';
        
        tableText += `${periodo.padEnd(20)} | ${String(realizado).padEnd(9)} | ${meta}\n`;
      });

    return tableText;
  };

  // Função para executar a análise
  const handleAnalyze = async () => {
    if (!chaveDisponivel) {
      toast.error('Não há chave API configurada para o Gemini. Entre em contato com o administrador.');
      return;
    }

    if (!selectedPromptId) {
      toast.error('Por favor, selecione um prompt');
      return;
    }

    if (!indicadorData || indicadorData.length === 0) {
      toast.error('Não há dados de indicadores para analisar');
      return;
    }

    try {
      setLoading(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }

      // Formatar os dados da tabela
      const tableData = formatTableData();
      
      // Chamar a API de análise específica para indicadores
      const response = await fetch('/api/analyze_indicators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt_id: selectedPromptId,
          text_to_analyze: tableData
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar análise');
      }
      
      setResult(data.resultado);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.resultado);
      }
      
      toast.success('Análise concluída com sucesso!');
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error(error.message || 'Erro ao processar análise');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center">
            <FiCpu className="mr-2 text-blue-600" /> Análise de Indicadores com IA Gemini
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded"
          >
            Fechar
          </button>
        </div>
        
        {/* Verificação e carregamento */}
        {checkingKey ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
            <span>Verificando configuração da API...</span>
          </div>
        ) : !result ? (
          <div className="space-y-6">
            {chaveDisponivel === false && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 font-medium">
                  Não há chave API configurada para o Gemini. Entre em contato com o administrador para configurar a chave.
                </p>
              </div>
            )}

            {/* Preview dos dados que serão analisados */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Dados que serão analisados:
              </h3>
              <div className="max-h-40 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                  {formatTableData()}
                </pre>
              </div>
            </div>
            
            <div>
              <label htmlFor="promptSelect" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                <FiAward className="mr-2" /> Selecione o Prompt para Análise
              </label>
              
              {fetchingPrompts ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-gray-500">Carregando prompts...</span>
                </div>
              ) : (
                <select
                  id="promptSelect"
                  value={selectedPromptId}
                  onChange={(e) => setSelectedPromptId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um prompt</option>
                  {prompts.map((prompt) => (
                    <option key={prompt.id} value={prompt.id}>
                      {prompt.nome_prompt}
                    </option>
                  ))}
                </select>
              )}
              
              {selectedPromptId && prompts.length > 0 && (
                <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">Descrição do prompt:</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {prompts.find(p => p.id === selectedPromptId)?.texto_prompt || 'Sem descrição'}
                  </p>
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <button
                onClick={handleAnalyze}
                disabled={loading || !selectedPromptId || chaveDisponivel === false}
                className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white ${
                  loading || !selectedPromptId || chaveDisponivel === false
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analisando indicadores...
                  </>
                ) : (
                  <>
                    <FiZap className="mr-2" /> Analisar Indicadores com IA
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Resultado da Análise</h3>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap bg-white p-4 rounded border text-sm">
                  {result}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4">
              <button
                onClick={onClose}
                className="py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiIndicatorAnalysisDialog;