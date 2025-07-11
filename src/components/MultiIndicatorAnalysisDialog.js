import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { FiAward, FiZap, FiCpu, FiBarChart3, FiInfo, FiEye } from 'react-icons/fi';

const MultiIndicatorAnalysisDialog = ({ selectedIndicadores, onClose, onAnalysisComplete }) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPrompts, setFetchingPrompts] = useState(true);
  const [result, setResult] = useState(null);
  const [chaveDisponivel, setChaveDisponivel] = useState(null);
  const [checkingKey, setCheckingKey] = useState(true);
  const [indicadorData, setIndicadorData] = useState(null);
  const [preparingData, setPreparingData] = useState(false);
  const [createdAnalysisId, setCreatedAnalysisId] = useState(null);
  const [showDataPreview, setShowDataPreview] = useState(false);

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
        
        // Primeiro tentar buscar na tabela prompts_indicadores
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

  // Buscar dados de todos os indicadores selecionados
  const fetchIndicadoresData = async () => {
    if (!selectedIndicadores || selectedIndicadores.length === 0) {
      toast.error('Nenhum indicador selecionado');
      return null;
    }

    try {
      setPreparingData(true);
      
      // Buscar informações dos indicadores pai
      const { data: indicadoresPai, error: errorPai } = await supabase
        .from('controle_indicador')
        .select('id, indicador, projeto_id, categoria_id')
        .in('id', selectedIndicadores);

      if (errorPai) throw errorPai;

      if (!indicadoresPai || indicadoresPai.length === 0) {
        toast.error('Não foi possível encontrar os indicadores selecionados');
        return null;
      }

      // Buscar todos os dados filhos de todos os indicadores
      const { data: dadosFilhos, error: errorFilhos } = await supabase
        .from('controle_indicador_geral')
        .select('*')
        .in('id_controleindicador', selectedIndicadores)
        .not('periodo_referencia', 'is', null)
        .order('id_controleindicador, periodo_referencia', { ascending: false });

      if (errorFilhos) throw errorFilhos;

      // Verificar se todos os indicadores possuem dados
      const indicadoresSemDados = selectedIndicadores.filter(id => 
        !dadosFilhos.some(filho => filho.id_controleindicador === id)
      );

      if (indicadoresSemDados.length > 0) {
        toast.error(`${indicadoresSemDados.length} indicador(es) não possuem dados para análise.`);
        return null;
      }

      // Organizar dados por indicador
      const dadosOrganizados = indicadoresPai.map(pai => {
        const filhos = dadosFilhos.filter(filho => filho.id_controleindicador === pai.id);
        return {
          ...pai,
          dados: filhos
        };
      });

      return {
        indicadores: dadosOrganizados,
        totalRegistros: dadosFilhos.length
      };
    } catch (error) {
      console.error('Erro ao buscar dados dos indicadores:', error);
      toast.error('Erro ao preparar os dados dos indicadores selecionados');
      return null;
    } finally {
      setPreparingData(false);
    }
  };

  // Formatar dados para análise (similar ao GeminiIndicatorAnalysisDialog)
  const formatIndicatorsData = (indicadoresData) => {
    if (!indicadoresData || indicadoresData.indicadores.length === 0) {
      return "Nenhum dado disponível para análise.";
    }

    let combinedText = "ANÁLISE MÚLTIPLA DE INDICADORES:\n\n";

    indicadoresData.indicadores.forEach((indicador, index) => {
      combinedText += `\n==== INDICADOR ${index + 1}: ${indicador.indicador} (ID: ${indicador.id}) ====\n\n`;
      
      if (indicador.dados.length === 0) {
        combinedText += "Nenhum dado disponível para este indicador.\n\n";
        return;
      }

      // Agrupar dados por período
      const dadosAgrupados = {};
      indicador.dados.forEach(item => {
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
      combinedText += "Período de Referência | Realizado | Meta\n";
      combinedText += "".padEnd(50, "-") + "\n";
      
      Object.values(dadosAgrupados)
        .sort((a, b) => new Date(a.periodo_referencia) - new Date(b.periodo_referencia))
        .forEach(item => {
          const periodo = new Date(item.periodo_referencia).toLocaleDateString('pt-BR');
          const realizado = item.realizado !== null ? item.realizado : '-';
          const meta = item.meta !== null ? item.meta : '-';
          
          combinedText += `${periodo.padEnd(20)} | ${String(realizado).padEnd(9)} | ${meta}\n`;
        });

      combinedText += "\n";
    });

    return combinedText;
  };

  // Criar registro na tabela de análises múltiplas
  const createMultiAnalysisRecord = async (promptId, indicadoresIds, combinedText) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return null;
      }
      
      // Verificar se a tabela existe, se não, usar a tabela analises com um campo adicional
      const { data, error } = await supabase
        .from('analises_multiplas_indicadores')
        .insert([
          {
            prompt_id: promptId,
            indicadores_selecionados: indicadoresIds,
            texto_indicadores_combinado: combinedText,
            usuario_id: session.user.id,
            data_analise: new Date().toISOString()
          }
        ])
        .select();

      // Se a tabela não existir, usar tabela genérica
      if (error && error.code === '42P01') {
        console.log('Tabela analises_multiplas_indicadores não encontrada, usando tabela analises');
        const fallbackResponse = await supabase
          .from('analises')
          .insert([
            {
              prompt_id: promptId,
              tipo_analise: 'indicadores_multiplos',
              documentos_selecionados: indicadoresIds, // Reutilizar campo
              texto_documentos_selecionados: combinedText, // Reutilizar campo
              usuario_id: session.user.id,
              data_analise: new Date().toISOString()
            }
          ])
          .select();
        
        if (fallbackResponse.error) throw fallbackResponse.error;
        return fallbackResponse.data[0].id;
      } else if (error) {
        throw error;
      }
      
      return data[0].id;
    } catch (error) {
      console.error('Erro ao criar registro de análise:', error);
      toast.error('Erro ao salvar os dados da análise');
      return null;
    }
  };

  // Atualizar registro com o resultado da IA
  const updateAnalysisWithResult = async (analysisId, resultText) => {
    try {
      // Tentar atualizar na tabela específica primeiro
      let { error } = await supabase
        .from('analises_multiplas_indicadores')
        .update({ retorno_ia: resultText })
        .eq('id', analysisId);
      
      // Se a tabela não existir, tentar na tabela genérica
      if (error && error.code === '42P01') {
        const fallbackResponse = await supabase
          .from('analises')
          .update({ retorno_ia: resultText })
          .eq('id', analysisId);
        
        if (fallbackResponse.error) throw fallbackResponse.error;
        return true;
      } else if (error) {
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar registro de análise:', error);
      return false;
    }
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

    try {
      setLoading(true);
      
      // Buscar dados dos indicadores
      const indicadoresData = await fetchIndicadoresData();
      if (!indicadoresData) {
        setLoading(false);
        return;
      }
      
      setIndicadorData(indicadoresData);

      // Formatar dados para análise
      const formattedText = formatIndicatorsData(indicadoresData);

      // Criar registro na tabela de análises
      const analysisId = await createMultiAnalysisRecord(
        selectedPromptId, 
        selectedIndicadores,
        formattedText
      );
      
      if (!analysisId) {
        throw new Error('Não foi possível criar o registro da análise');
      }
      
      setCreatedAnalysisId(analysisId);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Chamar a API de análise (usando a mesma API dos indicadores individuais)
      const response = await fetch('/api/analyze_multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt_id: selectedPromptId,
          text_to_analyze: formattedText
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar análise');
      }
      
      setResult(data.resultado);
      
      // Atualizar o registro com o resultado
      await updateAnalysisWithResult(analysisId, data.resultado);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.resultado, analysisId);
      }
      
      toast.success('Análise múltipla de indicadores concluída com sucesso!');
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error(error.message || 'Erro ao processar análise');
    } finally {
      setLoading(false);
    }
  };

  // Função para mostrar preview dos dados
  const showPreview = () => {
    if (indicadorData) {
      setShowDataPreview(true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <FiCpu className="mr-2 text-blue-600" /> Análise Múltipla de Indicadores com IA Gemini
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
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <div className="flex items-start">
                  <FiBarChart3 className="text-blue-500 mt-1 mr-2 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 mb-1">Indicadores selecionados: {selectedIndicadores.length}</h3>
                    <p className="text-sm text-blue-700">
                      Você selecionou {selectedIndicadores.length} indicador(es) para análise combinada. 
                      A IA analisará todos os dados históricos destes indicadores em conjunto, permitindo uma visão comparativa e insights cruzados.
                    </p>
                    {indicadorData && (
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="text-sm text-blue-600">
                          📊 Total de registros: {indicadorData.totalRegistros}
                        </span>
                        <button
                          onClick={showPreview}
                          className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center"
                        >
                          <FiEye className="mr-1" />
                          Ver preview dos dados
                        </button>
                      </div>
                    )}
                  </div>
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
                  disabled={loading || !selectedPromptId || chaveDisponivel === false || selectedIndicadores.length === 0}
                  className={`w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-white ${
                    loading || !selectedPromptId || chaveDisponivel === false || selectedIndicadores.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {preparingData ? 'Preparando dados dos indicadores...' : 'Processando análise múltipla...'}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">Resultado da Análise Múltipla</h3>
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap bg-white p-4 rounded border text-sm text-gray-900 leading-relaxed">
                    {result}
                  </pre>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setResult(null);
                    setIndicadorData(null);
                    setCreatedAnalysisId(null);
                  }}
                  className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  🔄 Nova Análise
                </button>
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

      {/* Modal de Preview dos Dados */}
      {showDataPreview && indicadorData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[85vh] overflow-hidden mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <FiInfo className="mr-2 text-blue-600" />
                  Preview dos Dados para Análise
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {indicadorData.indicadores.length} indicadores • {indicadorData.totalRegistros} registros
                </p>
              </div>
              <button 
                onClick={() => setShowDataPreview(false)}
                className="text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 p-2 rounded-lg transition-colors border"
              >
                Fechar
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              <div className="space-y-6">
                {indicadorData.indicadores.map((indicador, index) => (
                  <div key={indicador.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <FiBarChart3 className="text-blue-500 mr-2" />
                      <h4 className="font-semibold text-gray-900">
                        {index + 1}. {indicador.indicador}
                      </h4>
                      <span className="ml-auto text-sm text-gray-500">
                        {indicador.dados.length} registros
                      </span>
                    </div>
                    
                    {indicador.dados.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Período
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Tipo
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Valor Apresentado
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Valor Indicador
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {indicador.dados.slice(0, 5).map((dado, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-3 py-2 text-gray-900">
                                  {new Date(dado.periodo_referencia).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-3 py-2 text-gray-600">
                                  {dado.tipo_indicador === 1 ? 'Realizado' : dado.tipo_indicador === 2 ? 'Meta' : 'N/A'}
                                </td>
                                <td className="px-3 py-2 text-gray-900">
                                  {dado.valor_indicador_apresentado || '-'}
                                </td>
                                <td className="px-3 py-2 text-gray-900">
                                  {dado.valor_indicador || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {indicador.dados.length > 5 && (
                          <p className="text-center text-sm text-gray-500 mt-2">
                            ... e mais {indicador.dados.length - 5} registros
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">Nenhum dado encontrado</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MultiIndicatorAnalysisDialog;