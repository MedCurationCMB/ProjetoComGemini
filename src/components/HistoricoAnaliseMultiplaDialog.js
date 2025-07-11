// src/components/HistoricoAnaliseMultiplaDialog.js
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { FiBookOpen, FiEye, FiCalendar, FiClock, FiX, FiUsers, FiTrash2 } from 'react-icons/fi';

const HistoricoAnaliseMultiplaDialog = ({ onClose }) => {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalise, setSelectedAnalise] = useState(null);
  const [showAnaliseModal, setShowAnaliseModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Carregar histórico de análises múltiplas
  useEffect(() => {
    const fetchHistorico = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('analises_multiplas_indicadores')
          .select('*')
          .order('data_analise', { ascending: false }); // Mais recente primeiro
        
        if (error) throw error;
        
        setHistorico(data || []);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        toast.error('Erro ao carregar histórico de análises múltiplas');
      } finally {
        setLoading(false);
      }
    };

    fetchHistorico();
  }, []);

  // Função para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '-';
    }
  };

  // Função para gerar prévia do resultado (primeiros 100 caracteres)
  const getPreview = (text) => {
    if (!text) return '-';
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  };

  // Função para visualizar análise completa
  const visualizarAnalise = (analise) => {
    setSelectedAnalise(analise);
    setShowAnaliseModal(true);
  };

  // Função para deletar análise
  const deletarAnalise = async (analiseId) => {
    if (!confirm('Tem certeza que deseja deletar esta análise? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setDeletingId(analiseId);
      
      const { error } = await supabase
        .from('analises_multiplas_indicadores')
        .delete()
        .eq('id', analiseId);
      
      if (error) throw error;
      
      // Remover da lista local
      setHistorico(prev => prev.filter(item => item.id !== analiseId));
      toast.success('Análise deletada com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar análise:', error);
      toast.error('Erro ao deletar análise');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* Modal Principal - Histórico */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden mx-4">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold flex items-center text-gray-900">
              <FiBookOpen className="mr-3 text-blue-600" /> 
              Histórico de Análises Múltiplas
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          
          {/* Conteúdo */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                <span className="text-gray-600">Carregando histórico...</span>
              </div>
            ) : historico.length === 0 ? (
              <div className="text-center py-12">
                <FiBookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Nenhuma análise múltipla encontrada
                </h3>
                <p className="text-gray-500">
                  Você ainda não realizou análises comparativas de múltiplos indicadores.
                </p>
              </div>
            ) : (
              <>
                {/* Estatísticas */}
                <div className="mb-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-blue-800 font-medium">
                    📊 Total de análises múltiplas realizadas: <span className="font-bold">{historico.length}</span>
                  </p>
                  {historico.length > 0 && (
                    <p className="text-blue-700 text-sm mt-1">
                      Última análise: {formatDate(historico[0].data_analise)}
                    </p>
                  )}
                </div>

                {/* Tabela Desktop */}
                <div className="hidden lg:block">
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data da Análise
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Indicadores Analisados
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prévia do Resultado
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historico.map((analise, index) => (
                          <tr key={analise.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FiCalendar className="w-4 h-4 text-gray-400 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatDate(analise.data_analise)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {analise.id ? String(analise.id).substring(0, 8) + '...' : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <FiUsers className="w-4 h-4 text-blue-500 mr-2" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {analise.indicadores_ids?.length || 0} indicadores
                                  </div>
                                  <div className="text-xs text-gray-500 max-w-xs truncate">
                                    {analise.nomes_indicadores?.join(', ') || 'Nomes não disponíveis'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-md">
                                {getPreview(analise.resultado_analise)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => visualizarAnalise(analise)}
                                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                                >
                                  <FiEye className="w-3 h-3 mr-1" />
                                  Visualizar
                                </button>
                                <button
                                  onClick={() => deletarAnalise(analise.id)}
                                  disabled={deletingId === analise.id}
                                  className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    deletingId === analise.id
                                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                      : 'bg-red-600 text-white hover:bg-red-700'
                                  }`}
                                >
                                  {deletingId === analise.id ? (
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  ) : (
                                    <FiTrash2 className="w-3 h-3 mr-1" />
                                  )}
                                  {deletingId === analise.id ? 'Deletando...' : 'Deletar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cards Mobile */}
                <div className="lg:hidden space-y-4">
                  {historico.map((analise, index) => (
                    <div key={analise.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center text-sm text-gray-600">
                          <FiClock className="w-4 h-4 mr-2" />
                          {formatDate(analise.data_analise)}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => visualizarAnalise(analise)}
                            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 transition-colors"
                          >
                            <FiEye className="w-3 h-3 mr-1" />
                            Ver
                          </button>
                          <button
                            onClick={() => deletarAnalise(analise.id)}
                            disabled={deletingId === analise.id}
                            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                              deletingId === analise.id
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            {deletingId === analise.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                            ) : (
                              <FiTrash2 className="w-3 h-3 mr-1" />
                            )}
                            {deletingId === analise.id ? '...' : 'Del'}
                          </button>
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center text-sm font-medium text-gray-900 mb-1">
                          <FiUsers className="w-4 h-4 text-blue-500 mr-2" />
                          {analise.indicadores_ids?.length || 0} indicadores analisados
                        </div>
                        <div className="text-xs text-gray-600">
                          {analise.nomes_indicadores?.join(', ') || 'Nomes não disponíveis'}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-700">
                        <strong>Prévia:</strong> {getPreview(analise.resultado_analise)}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        ID: {analise.id ? String(analise.id).substring(0, 8) + '...' : 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Secundário - Visualizar Análise Completa */}
      {showAnaliseModal && selectedAnalise && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[85vh] overflow-hidden mx-4">
            {/* Header do Modal de Análise */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <FiEye className="mr-2 text-blue-600" />
                  Análise Múltipla Completa
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Realizada em: {formatDate(selectedAnalise.data_analise)}
                </p>
              </div>
              <button 
                onClick={() => setShowAnaliseModal(false)}
                className="text-gray-500 hover:text-gray-700 bg-white hover:bg-gray-100 p-2 rounded-lg transition-colors border"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            {/* Conteúdo da Análise */}
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              {/* Informações dos Indicadores */}
              <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center">
                  <FiUsers className="w-4 h-4 mr-2" />
                  Indicadores Analisados ({selectedAnalise.indicadores_ids?.length || 0})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedAnalise.nomes_indicadores?.map((nome, index) => (
                    <div key={index} className="bg-white p-2 rounded border text-sm">
                      <strong>{index + 1}.</strong> {nome}
                    </div>
                  )) || <p className="text-blue-700 text-sm">Nomes dos indicadores não disponíveis</p>}
                </div>
              </div>

              {/* Resultado da Análise */}
              <div className="prose max-w-none">
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Resultado da Análise:</h4>
                  <div className="bg-white p-6 rounded border border-gray-300">
                    <div className="text-sm text-gray-900 leading-relaxed font-sans whitespace-pre-wrap">
                      {selectedAnalise.resultado_analise}
                    </div>
                  </div>
                </div>
                
                {selectedAnalise.prompt_utilizado && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-3">Prompt Utilizado:</h4>
                    <div className="bg-white p-4 rounded border border-blue-300">
                      <div className="text-xs text-blue-900 leading-relaxed font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {selectedAnalise.prompt_utilizado}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer do Modal de Análise */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowAnaliseModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HistoricoAnaliseMultiplaDialog;