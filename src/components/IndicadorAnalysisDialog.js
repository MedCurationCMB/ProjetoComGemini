import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { FiAward, FiZap, FiCpu, FiX } from 'react-icons/fi';

const IndicadorAnalysisDialog = ({ dadosTabela, nomeIndicador, indicadorId, analiseExistente, onClose, onAnalysisComplete }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPrompts, setFetchingPrompts] = useState(true);
  const [result, setResult] = useState(analiseExistente?.resultado_analise || null);
  const [chaveDisponivel, setChaveDisponivel] = useState(null);
  const [checkingKey, setCheckingKey] = useState(true);

  // Estado para controlar se deve mostrar análise anterior ou fazer nova
  const [showExistingAnalysis, setShowExistingAnalysis] = useState(!!analiseExistente?.resultado_analise);

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
        const { data, error } = await supabase
          .from('prompts_indicadores')
          .select('*')
          .order('nome_prompt', { ascending: true });

        if (error) throw error;
        
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
  const formatarDadosTabela = () => {
    if (!dadosTabela || dadosTabela.length === 0) {
      return 'Nenhum dado disponível para análise.';
    }

    let dadosFormatados = `DADOS DO INDICADOR: ${nomeIndicador}\n\n`;
    dadosFormatados += 'PERÍODOS DE REFERÊNCIA E VALORES:\n';
    dadosFormatados += '='.repeat(50) + '\n\n';

    dadosTabela.forEach((linha, index) => {
      const data = new Date(linha.periodo_referencia).toLocaleDateString('pt-BR');
      const realizado = linha.valor_apresentado_realizado || 'N/A';
      const meta = linha.valor_apresentado_meta || 'N/A';
      
      dadosFormatados += `${index + 1}. Período: ${data}\n`;
      dadosFormatados += `   Realizado: ${realizado}\n`;
      dadosFormatados += `   Meta: ${meta}\n\n`;
    });

    return dadosFormatados;
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

    if (!dadosTabela || dadosTabela.length === 0) {
      toast.error('Não há dados disponíveis para análise');
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

      // Buscar o prompt selecionado
      const { data: promptData, error: promptError } = await supabase
        .from('prompts_indicadores')
        .select('texto_prompt')
        .eq('id', selectedPromptId)
        .single();

      if (promptError) throw promptError;

      // Preparar dados para envio
      const dadosFormatados = formatarDadosTabela();
      const promptTexto = promptData.texto_prompt;
      
      // Montar o prompt final
      const promptFinal = `${dadosFormatados}\n\nPROMPT PARA ANÁLISE:\n${promptTexto}`;
      
      // Chamar a API de análise
      const response = await fetch('/api/analyze_indicador_with_gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          dados_indicador: dadosFormatados,
          prompt_texto: promptTexto,
          nome_indicador: nomeIndicador,
          prompt_id: selectedPromptId,
          indicador_id: indicadorId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar análise');
      }
      
      setResult(data.resultado);
      setShowExistingAnalysis(false); // Garantir que mostra o novo resultado
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <FiCpu className="mr-2 text-blue-600" /> Análise de Indicador com IA Gemini
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5" />
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
              {/* Mostrar análise existente se houver */}
              {analiseExistente?.resultado_analise && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-yellow-800">Análise Anterior Encontrada</h3>
                    <button
                      onClick={() => {
                        setResult(analiseExistente.resultado_analise);
                        setShowExistingAnalysis(true);
                      }}
                      className="text-yellow-700 hover:text-yellow-900 text-sm underline"
                    >
                      Ver análise anterior
                    </button>
                  </div>
                  <p className="text-xs text-yellow-700">
                    Prompt usado: {analiseExistente.prompt_utilizado?.substring(0, 100)}...
                  </p>
                </div>
              )}

              {chaveDisponivel === false && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-red-800 font-medium">
                    Não há chave API configurada para o Gemini. Entre em contato com o administrador para configurar a chave.
                  </p>
                </div>
              )}

              {/* Preview dos dados */}
              <div className="bg-gray-50 p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Dados que serão analisados</h3>
                <div className="bg-white p-3 rounded border text-sm">
                  <p className="font-medium mb-2">Indicador: {nomeIndicador}</p>
                  <p className="text-gray-600">Total de períodos: {dadosTabela?.length || 0}</p>
                  {dadosTabela && dadosTabela.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">Exemplo dos dados:</p>
                      <p className="text-xs font-mono">
                        {new Date(dadosTabela[0].periodo_referencia).toLocaleDateString('pt-BR')} - 
                        Realizado: {dadosTabela[0].valor_apresentado_realizado || 'N/A'}, 
                        Meta: {dadosTabela[0].valor_apresentado_meta || 'N/A'}
                      </p>
                    </div>
                  )}
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
                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm font-medium text-blue-800">Prompt selecionado:</p>
                    <p className="text-sm text-blue-700 mt-1">
                      {prompts.find(p => p.id === selectedPromptId)?.texto_prompt || 'Sem descrição'}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="pt-4">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !selectedPromptId || chaveDisponivel === false || !dadosTabela?.length}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white font-medium ${
                    loading || !selectedPromptId || chaveDisponivel === false || !dadosTabela?.length
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Analisando dados...
                    </>
                  ) : (
                    <>
                      <FiZap className="mr-2" /> Analisar Indicador com IA
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {showExistingAnalysis ? 'Análise Anterior' : 'Resultado da Análise'}
                  </h3>
                  {showExistingAnalysis && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Análise Salva
                    </span>
                  )}
                </div>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap bg-white p-4 rounded border text-sm leading-relaxed">
                    {result}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                {showExistingAnalysis && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setShowExistingAnalysis(false);
                    }}
                    className="py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Nova Análise
                  </button>
                )}
                {!showExistingAnalysis && (
                  <button
                    onClick={() => {
                      setResult(null);
                      setShowExistingAnalysis(false);
                    }}
                    className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Nova Análise
                  </button>
                )}
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
    </div>
  );
};

export default IndicadorAnalysisDialog;