// src/components/MultipleIndicatorAnalysisDialog.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { FiAward, FiZap, FiCpu, FiX, FiEye, FiChevronDown, FiChevronUp, FiSave, FiCheckCircle } from 'react-icons/fi';

const MultipleIndicatorAnalysisDialog = ({ 
  indicadoresSelecionados = [], 
  onClose, 
  onAnalysisComplete 
}) => {
  const [prompts, setPrompts] = useState([]);
  const [selectedPromptId, setSelectedPromptId] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingPrompts, setFetchingPrompts] = useState(true);
  const [fetchingData, setFetchingData] = useState(true);
  const [result, setResult] = useState(null);
  const [chaveDisponivel, setChaveDisponivel] = useState(null);
  const [checkingKey, setCheckingKey] = useState(true);
  
  // Estados para dados dos indicadores
  const [dadosIndicadores, setDadosIndicadores] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewText, setPreviewText] = useState('');

  // ✅ NOVOS ESTADOS para salvamento
  const [analiseInfo, setAnaliseInfo] = useState(null); // Info sobre salvamento
  const [indicadoresInfo, setIndicadoresInfo] = useState([]); // Info para enviar para API

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

  // Buscar prompts disponíveis
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
        
        // Debug: Log dos prompts encontrados
        console.log('Prompts carregados para análise múltipla:', data);
        
      } catch (error) {
        console.error('Erro ao carregar prompts:', error);
        toast.error('Não foi possível carregar os prompts disponíveis');
        
        // Tentar buscar prompts da tabela principal como fallback
        try {
          console.log('Tentando fallback para tabela prompts...');
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('prompts')
            .select('*')
            .order('nome_prompt', { ascending: true });
            
          if (fallbackError) throw fallbackError;
          
          setPrompts(fallbackData || []);
          console.log('Prompts carregados via fallback:', fallbackData);
          
        } catch (fallbackError) {
          console.error('Erro no fallback de prompts:', fallbackError);
          toast.error('Erro crítico: Não foi possível carregar nenhum prompt');
        }
      } finally {
        setFetchingPrompts(false);
      }
    };

    fetchPrompts();
  }, []);

  // Carregar dados dos indicadores selecionados
  useEffect(() => {
    const fetchDadosIndicadores = async () => {
      if (!indicadoresSelecionados || indicadoresSelecionados.length === 0) {
        setFetchingData(false);
        return;
      }

      try {
        setFetchingData(true);
        
        // Primeiro buscar informações básicas dos indicadores
        const { data: infoIndicadores, error: errorInfo } = await supabase
          .from('controle_indicador')
          .select('id, indicador')
          .in('id', indicadoresSelecionados);

        if (errorInfo) throw errorInfo;

        // ✅ NOVO: Preparar informações dos indicadores para envio
        const indicadoresInfoArray = infoIndicadores.map(info => ({
          id: info.id,
          nome: info.indicador
        }));
        setIndicadoresInfo(indicadoresInfoArray);

        // Depois buscar todos os dados detalhados
        const { data: dadosDetalhados, error: errorDetalhes } = await supabase
          .from('controle_indicador_geral')
          .select('*')
          .in('id_controleindicador', indicadoresSelecionados)
          .not('periodo_referencia', 'is', null)
          .order('id_controleindicador')
          .order('periodo_referencia', { ascending: true });

        if (errorDetalhes) throw errorDetalhes;

        // Agrupar dados por indicador
        const dadosAgrupados = [];
        
        infoIndicadores.forEach(info => {
          const dadosDoIndicador = dadosDetalhados.filter(
            d => d.id_controleindicador === info.id
          );
          
          if (dadosDoIndicador.length > 0) {
            dadosAgrupados.push({
              id: info.id,
              nome: info.indicador,
              dados: dadosDoIndicador
            });
          }
        });

        setDadosIndicadores(dadosAgrupados);
        
        // Gerar preview do texto que será enviado para IA
        const textoPreview = formatarDadosParaIA(dadosAgrupados);
        setPreviewText(textoPreview);
        
      } catch (error) {
        console.error('Erro ao carregar dados dos indicadores:', error);
        toast.error('Erro ao carregar dados dos indicadores selecionados');
      } finally {
        setFetchingData(false);
      }
    };

    fetchDadosIndicadores();
  }, [indicadoresSelecionados]);

  // Função para formatar os dados para envio à IA
  const formatarDadosParaIA = (dadosAgrupados) => {
    if (!dadosAgrupados || dadosAgrupados.length === 0) {
      return "Nenhum dado disponível para análise.";
    }

    let textoCompleto = "ANÁLISE COMPARATIVA DE INDICADORES:\n\n";

    dadosAgrupados.forEach(indicador => {
      textoCompleto += `=== INDICADOR: ${indicador.nome} ===\n`;
      
      // Agrupar dados por período
      const dadosPorPeriodo = {};
      
      indicador.dados.forEach(item => {
        const periodo = item.periodo_referencia;
        
        if (!dadosPorPeriodo[periodo]) {
          dadosPorPeriodo[periodo] = {
            periodo_referencia: periodo,
            realizado: null,
            meta: null
          };
        }
        
        if (item.tipo_indicador === 1) { // Realizado
          dadosPorPeriodo[periodo].realizado = item.valor_indicador_apresentado;
        } else if (item.tipo_indicador === 2) { // Meta
          dadosPorPeriodo[periodo].meta = item.valor_indicador_apresentado;
        }
      });

      // Formatar tabela para este indicador
      textoCompleto += "Período de Referência | Realizado | Meta\n";
      textoCompleto += "".padEnd(50, "-") + "\n";
      
      Object.values(dadosPorPeriodo)
        .sort((a, b) => new Date(a.periodo_referencia) - new Date(b.periodo_referencia))
        .forEach(item => {
          const periodo = new Date(item.periodo_referencia).toLocaleDateString('pt-BR');
          const realizado = item.realizado !== null ? item.realizado : '-';
          const meta = item.meta !== null ? item.meta : '-';
          
          textoCompleto += `${periodo.padEnd(20)} | ${String(realizado).padEnd(9)} | ${meta}\n`;
        });
      
      textoCompleto += "\n";
    });

    return textoCompleto;
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

    if (!dadosIndicadores || dadosIndicadores.length === 0) {
      toast.error('Não há dados de indicadores para analisar');
      return;
    }

    try {
      setLoading(true);
      
      // Debug: Log do prompt selecionado
      console.log('Prompt selecionado:', selectedPromptId);
      console.log('Prompts disponíveis:', prompts);
      
      // Verificar se o prompt selecionado existe
      const promptSelecionado = prompts.find(p => p.id === selectedPromptId);
      if (!promptSelecionado) {
        throw new Error(`Prompt com ID ${selectedPromptId} não encontrado na lista de prompts disponíveis`);
      }
      
      console.log('Dados do prompt selecionado:', promptSelecionado);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }

      // Formatar os dados para análise
      const textToAnalyze = formatarDadosParaIA(dadosIndicadores);
      
      console.log('Dados para análise:', textToAnalyze.substring(0, 200) + '...');
      console.log('Informações dos indicadores:', indicadoresInfo);
      
      // ✅ ATUALIZADO: Chamar a nova API com informações dos indicadores
      const response = await fetch('/api/analyze_multiple_indicators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          prompt_id: selectedPromptId,
          text_to_analyze: textToAnalyze,
          indicadores_info: indicadoresInfo // ✅ NOVO: Enviar info dos indicadores
        })
      });
      
      const data = await response.json();
      
      console.log('Resposta da API:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar análise');
      }
      
      setResult(data.resultado);
      
      // ✅ NOVO: Armazenar informações sobre o salvamento
      setAnaliseInfo({
        salva: data.analise_salva,
        id: data.analise_id,
        indicadores_analisados: data.indicadores_analisados,
        timestamp: data.timestamp
      });
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.resultado);
      }
      
      // ✅ MENSAGEM MELHORADA: Incluir info sobre salvamento
      if (data.analise_salva) {
        toast.success('✅ Análise comparativa concluída e salva no histórico!');
      } else {
        toast.success('⚠️ Análise concluída, mas não foi possível salvar no histórico');
      }
    } catch (error) {
      console.error('Erro na análise:', error);
      toast.error(error.message || 'Erro ao processar análise');
    } finally {
      setLoading(false);
    }
  };

  // Função para nova análise
  const startNewAnalysis = () => {
    setResult(null);
    setAnaliseInfo(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold flex items-center">
            <FiCpu className="mr-2 text-blue-600" /> 
            Análise Comparativa com IA Gemini
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Loading states */}
          {(checkingKey || fetchingData) && (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              <span>
                {checkingKey && 'Verificando configuração da API...'}
                {fetchingData && 'Carregando dados dos indicadores...'}
              </span>
            </div>
          )}

          {/* Erro se chave não disponível */}
          {!checkingKey && chaveDisponivel === false && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-red-800 font-medium">
                Não há chave API configurada para o Gemini. Entre em contato com o administrador para configurar a chave.
              </p>
            </div>
          )}

          {/* Interface principal */}
          {!checkingKey && !fetchingData && chaveDisponivel && !result && (
            <div className="space-y-6">
              {/* Resumo dos indicadores selecionados */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-medium text-blue-900 mb-2">
                  📊 Indicadores Selecionados para Análise
                </h3>
                <p className="text-blue-700 text-sm mb-3">
                  {dadosIndicadores.length} indicadores serão analisados comparativamente e <strong>salvos no histórico</strong>:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {dadosIndicadores.map((indicador, index) => (
                    <div key={indicador.id} className="bg-white p-2 rounded border text-sm">
                      <strong>{index + 1}.</strong> {indicador.nome} 
                      <span className="text-gray-500 ml-2">
                        ({indicador.dados.length} registros)
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview dos dados */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <h3 className="text-lg font-medium text-gray-900">
                    Preview dos Dados que serão Analisados
                  </h3>
                  {showPreview ? (
                    <FiChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                
                {showPreview && (
                  <div className="mt-3 max-h-60 overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                      {previewText}
                    </pre>
                  </div>
                )}
              </div>
              
              {/* Seleção de prompt */}
              <div>
                <label htmlFor="promptSelect" className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <FiAward className="mr-2" /> Selecione o Prompt para Análise Comparativa
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
              
              {/* ✅ NOVO: Aviso sobre salvamento */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <FiSave className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="text-sm font-medium text-green-800">Salvamento Automático</h4>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Esta análise comparativa será automaticamente salva no seu histórico pessoal para consultas futuras.
                </p>
              </div>
              
              {/* Botão de análise */}
              <div className="pt-4">
                <button
                  onClick={handleAnalyze}
                  disabled={loading || !selectedPromptId || dadosIndicadores.length === 0}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-white font-medium ${
                    loading || !selectedPromptId || dadosIndicadores.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Analisando {dadosIndicadores.length} indicadores...
                    </>
                  ) : (
                    <>
                      <FiZap className="mr-2" /> 
                      Analisar {dadosIndicadores.length} Indicadores com IA
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Resultado da análise */}
          {result && (
            <div className="space-y-6">
              {/* ✅ NOVO: Status do salvamento */}
              {analiseInfo && (
                <div className={`p-4 rounded-lg border ${
                  analiseInfo.salva 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    {analiseInfo.salva ? (
                      <FiCheckCircle className="w-5 h-5 text-green-600 mr-2" />
                    ) : (
                      <FiX className="w-5 h-5 text-yellow-600 mr-2" />
                    )}
                    <h3 className={`text-lg font-medium ${
                      analiseInfo.salva ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      {analiseInfo.salva 
                        ? '✅ Análise Comparativa Salva com Sucesso!' 
                        : '⚠️ Análise Concluída (Erro no Salvamento)'
                      }
                    </h3>
                  </div>
                  <div className={`text-sm mt-1 ${
                    analiseInfo.salva ? 'text-green-700' : 'text-yellow-700'
                  }`}>
                    {analiseInfo.salva ? (
                      <>
                        <p>A análise de <strong>{analiseInfo.indicadores_analisados} indicadores</strong> foi salva no seu histórico pessoal.</p>
                        {analiseInfo.id && (
                          <p className="text-xs mt-1 opacity-75">ID da análise: {analiseInfo.id}</p>
                        )}
                      </>
                    ) : (
                      <p>A análise foi concluída, mas houve um problema ao salvar no histórico. O resultado ainda está disponível abaixo.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Resultado da Análise Comparativa</h3>
                <div className="prose max-w-none">
                  <div className="bg-white p-6 rounded border border-gray-300 max-h-96 overflow-y-auto">
                    <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {result}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* ✅ NOVO: Informações adicionais sobre a análise */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📋 Detalhes da Análise</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
                  <div>
                    <span className="font-medium">Indicadores:</span> {dadosIndicadores.length}
                  </div>
                  <div>
                    <span className="font-medium">Prompt:</span> {prompts.find(p => p.id === selectedPromptId)?.nome_prompt || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Data:</span> {analiseInfo?.timestamp ? new Date(analiseInfo.timestamp).toLocaleString('pt-BR') : 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={startNewAnalysis}
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
    </div>
  );
};

export default MultipleIndicatorAnalysisDialog;