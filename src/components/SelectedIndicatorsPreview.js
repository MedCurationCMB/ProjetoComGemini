// src/components/SelectedIndicatorsPreview.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { FiEye, FiChevronDown, FiChevronUp, FiBarChart2, FiCalendar, FiTrendingUp, FiTarget } from 'react-icons/fi';

const SelectedIndicatorsPreview = ({ indicadoresSelecionados = [], categorias = {}, projetos = {} }) => {
  const [dadosIndicadores, setDadosIndicadores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false); // ✅ NOVO: Controla visibilidade dos indicadores
  const [expandedIndicators, setExpandedIndicators] = useState(new Set());

  // Carregar dados dos indicadores selecionados
  useEffect(() => {
    const fetchDadosIndicadores = async () => {
      if (!indicadoresSelecionados || indicadoresSelecionados.length === 0) {
        setDadosIndicadores([]);
        return;
      }

      try {
        setLoading(true);
        
        // Primeiro buscar informações básicas dos indicadores
        const { data: infoIndicadores, error: errorInfo } = await supabase
          .from('controle_indicador')
          .select('id, indicador, projeto_id, categoria_id')
          .in('id', indicadoresSelecionados);

        if (errorInfo) throw errorInfo;

        // Depois buscar todos os dados detalhados
        const { data: dadosDetalhados, error: errorDetalhes } = await supabase
          .from('controle_indicador_geral')
          .select('*')
          .in('id_controleindicador', indicadoresSelecionados)
          .not('periodo_referencia', 'is', null)
          .order('id_controleindicador')
          .order('periodo_referencia', { ascending: true });

        if (errorDetalhes) throw errorDetalhes;

        // Agrupar dados por indicador e calcular estatísticas
        const dadosAgrupados = [];
        
        infoIndicadores.forEach(info => {
          const dadosDoIndicador = dadosDetalhados.filter(
            d => d.id_controleindicador === info.id
          );
          
          if (dadosDoIndicador.length > 0) {
            // Separar por tipo
            const realizados = dadosDoIndicador.filter(d => d.tipo_indicador === 1);
            const metas = dadosDoIndicador.filter(d => d.tipo_indicador === 2);
            
            // Calcular estatísticas
            const valoresRealizados = realizados.map(r => parseFloat(r.valor_indicador_apresentado) || 0);
            const valoresMetas = metas.map(m => parseFloat(m.valor_indicador_apresentado) || 0);
            
            const somaRealizados = valoresRealizados.reduce((acc, val) => acc + val, 0);
            const somaMetas = valoresMetas.reduce((acc, val) => acc + val, 0);
            const mediaRealizados = valoresRealizados.length > 0 ? somaRealizados / valoresRealizados.length : 0;
            const mediaMetas = valoresMetas.length > 0 ? somaMetas / valoresMetas.length : 0;
            
            // Períodos únicos
            const periodosUnicos = [...new Set(dadosDoIndicador.map(d => d.periodo_referencia))]
              .sort((a, b) => new Date(a) - new Date(b));

            dadosAgrupados.push({
              id: info.id,
              nome: info.indicador,
              projeto_id: info.projeto_id,
              categoria_id: info.categoria_id,
              dados: dadosDoIndicador,
              estatisticas: {
                totalRegistros: dadosDoIndicador.length,
                totalRealizados: realizados.length,
                totalMetas: metas.length,
                periodosUnicos: periodosUnicos.length,
                somaRealizados,
                somaMetas,
                mediaRealizados,
                mediaMetas,
                primeiraData: periodosUnicos[0],
                ultimaData: periodosUnicos[periodosUnicos.length - 1]
              }
            });
          }
        });

        setDadosIndicadores(dadosAgrupados);
        
      } catch (error) {
        console.error('Erro ao carregar dados dos indicadores:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDadosIndicadores();
  }, [indicadoresSelecionados]);

  // Função para formatar valores
  const formatValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  };

  // Função para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (e) {
      return '';
    }
  };

  // ✅ FUNÇÃO CORRIGIDA: Alternar expansão de indicador
  const toggleExpanded = (indicadorId, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const newExpanded = new Set(expandedIndicators);
    if (newExpanded.has(indicadorId)) {
      newExpanded.delete(indicadorId);
    } else {
      newExpanded.add(indicadorId);
    }
    setExpandedIndicators(newExpanded);
    
    // Debug para verificar funcionamento
    console.log('Toggle expandido para indicador:', indicadorId, 'Novo estado:', newExpanded.has(indicadorId) ? 'expandido' : 'recolhido');
  };

  // ✅ FUNÇÃO ATUALIZADA: Toggle para mostrar/ocultar indicadores
  const toggleShowIndicators = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    setShowIndicators(!showIndicators);
  };

  // Calcular totais gerais
  const totaisGerais = dadosIndicadores.reduce((acc, ind) => {
    acc.totalIndicadores += 1;
    acc.totalRegistros += ind.estatisticas.totalRegistros;
    acc.totalRealizados += ind.estatisticas.totalRealizados;
    acc.totalMetas += ind.estatisticas.totalMetas;
    acc.somaGeralRealizados += ind.estatisticas.somaRealizados;
    acc.somaGeralMetas += ind.estatisticas.somaMetas;
    return acc;
  }, {
    totalIndicadores: 0,
    totalRegistros: 0,
    totalRealizados: 0,
    totalMetas: 0,
    somaGeralRealizados: 0,
    somaGeralMetas: 0
  });

  if (indicadoresSelecionados.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <FiBarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Selecione indicadores para ver o preview</p>
        <p className="text-gray-400 text-sm mt-1">
          Escolha pelo menos 2 indicadores para fazer uma análise comparativa
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* ✅ HEADER CORRIGIDO */}
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FiEye className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-900">
              Preview dos Indicadores Selecionados
            </h3>
          </div>
          <button
            onClick={toggleShowIndicators}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <span className="mr-1 text-sm font-medium">
              {showIndicators ? 'Ocultar' : 'Ver'} Detalhes
            </span>
            {showIndicators ? (
              <FiChevronUp className="w-4 h-4" />
            ) : (
              <FiChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Resumo Geral */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totaisGerais.totalIndicadores}</div>
            <div className="text-sm text-gray-600">Indicadores</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totaisGerais.totalRegistros}</div>
            <div className="text-sm text-gray-600">Total Registros</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{totaisGerais.totalRealizados}</div>
            <div className="text-sm text-gray-600">Realizados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{totaisGerais.totalMetas}</div>
            <div className="text-sm text-gray-600">Metas</div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-600">Carregando dados dos indicadores...</p>
        </div>
      )}

      {/* ✅ LISTA DE INDICADORES - VISIBILIDADE CONTROLADA PELO BOTÃO */}
      {!loading && showIndicators && (
        <div className="divide-y divide-gray-200">
          {dadosIndicadores.map((indicador, index) => (
            <div key={indicador.id} className="px-6 py-4">
              {/* ✅ CABEÇALHO DO INDICADOR CORRIGIDO */}
              <div 
                className="flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                onClick={(e) => toggleExpanded(indicador.id, e)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-gray-500 mr-3">
                      #{index + 1}
                    </span>
                    <h4 className="text-lg font-semibold text-gray-900 truncate">
                      {indicador.nome}
                    </h4>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    {indicador.projeto_id && (
                      <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        {projetos[indicador.projeto_id] || 'Projeto N/A'}
                      </span>
                    )}
                    {indicador.categoria_id && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {categorias[indicador.categoria_id] || 'Categoria N/A'}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <FiBarChart2 className="w-4 h-4 mr-1" />
                      {indicador.estatisticas.totalRegistros} registros
                    </div>
                    <div className="flex items-center">
                      <FiCalendar className="w-4 h-4 mr-1" />
                      {indicador.estatisticas.periodosUnicos} períodos
                    </div>
                    <div className="flex items-center">
                      <FiTrendingUp className="w-4 h-4 mr-1" />
                      {formatValue(indicador.estatisticas.mediaRealizados)} (média)
                    </div>
                    <div className="flex items-center">
                      <FiTarget className="w-4 h-4 mr-1" />
                      {formatValue(indicador.estatisticas.mediaMetas)} (meta)
                    </div>
                  </div>
                </div>
                
                <div className="ml-4 flex-shrink-0">
                  {expandedIndicators.has(indicador.id) ? (
                    <FiChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <FiChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* ✅ DETALHES EXPANDIDOS CORRIGIDOS */}
              {expandedIndicators.has(indicador.id) && (
                <div className="mt-4 pl-8 border-l-2 border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Estatísticas Detalhadas */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Estatísticas</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Soma Realizados:</span>
                          <span className="font-medium">{formatValue(indicador.estatisticas.somaRealizados)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Soma Metas:</span>
                          <span className="font-medium">{formatValue(indicador.estatisticas.somaMetas)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Primeira Data:</span>
                          <span className="font-medium">{formatDate(indicador.estatisticas.primeiraData)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Última Data:</span>
                          <span className="font-medium">{formatDate(indicador.estatisticas.ultimaData)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Últimos Registros */}
                    <div>
                      <h5 className="font-medium text-gray-900 mb-3">Últimos 3 Registros</h5>
                      <div className="space-y-2">
                        {indicador.dados
                          .sort((a, b) => new Date(b.periodo_referencia) - new Date(a.periodo_referencia))
                          .slice(0, 3)
                          .map((registro, idx) => (
                            <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">
                                  {formatDate(registro.periodo_referencia)}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  registro.tipo_indicador === 1 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {registro.tipo_indicador === 1 ? 'Realizado' : 'Meta'}
                                </span>
                              </div>
                              <div className="mt-1 font-semibold">
                                {formatValue(registro.valor_indicador_apresentado)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ✅ FOOTER - VISIBILIDADE CONTROLADA PELO BOTÃO */}
      {!loading && dadosIndicadores.length > 0 && showIndicators && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Estes dados serão combinados e enviados para análise comparativa com IA
            </div>
            <div className="font-medium">
              Total: {formatValue(totaisGerais.somaGeralRealizados)} (realizados) | {formatValue(totaisGerais.somaGeralMetas)} (metas)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectedIndicatorsPreview;