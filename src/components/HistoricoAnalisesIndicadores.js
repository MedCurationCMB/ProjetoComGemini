import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { FiHistory, FiCalendar, FiClock, FiX, FiChevronDown, FiChevronUp } from 'react-icons/fi';

const HistoricoAnalisesIndicadores = ({ indicadorId, onClose }) => {
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState(new Set());

  // Função para formatar data no formato DD-MM-AAAA
  const formatarData = (dataString) => {
    if (!dataString) return '';
    
    try {
      const data = new Date(dataString);
      
      // Ajustar para fuso horário do Brasil (UTC-3)
      const dataLocal = new Date(data.getTime() - (3 * 60 * 60 * 1000));
      
      const dia = dataLocal.getDate().toString().padStart(2, '0');
      const mes = (dataLocal.getMonth() + 1).toString().padStart(2, '0');
      const ano = dataLocal.getFullYear();
      
      return `${dia}-${mes}-${ano}`;
    } catch (e) {
      console.error('Erro ao formatar data:', e);
      return '';
    }
  };

  // Função para formatar hora
  const formatarHora = (dataString) => {
    if (!dataString) return '';
    
    try {
      const data = new Date(dataString);
      
      // Ajustar para fuso horário do Brasil (UTC-3)
      const dataLocal = new Date(data.getTime() - (3 * 60 * 60 * 1000));
      
      const horas = dataLocal.getHours().toString().padStart(2, '0');
      const minutos = dataLocal.getMinutes().toString().padStart(2, '0');
      
      return `${horas}:${minutos}`;
    } catch (e) {
      console.error('Erro ao formatar hora:', e);
      return '';
    }
  };

  // Carregar histórico de análises
  useEffect(() => {
    const carregarHistorico = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('historico_analises_indicador')
          .select('*')
          .eq('indicador_id', indicadorId)
          .order('data_analise', { ascending: false });

        if (error) throw error;

        setHistorico(data || []);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        toast.error('Erro ao carregar histórico de análises');
      } finally {
        setLoading(false);
      }
    };

    if (indicadorId) {
      carregarHistorico();
    }
  }, [indicadorId]);

  // Função para expandir/recolher item
  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  // Função para truncar texto
  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold flex items-center text-gray-900">
            <FiHistory className="mr-3 text-blue-600" />
            Histórico de Análises
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 bg-gray-100 p-2 rounded transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              <span>Carregando histórico...</span>
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8">
              <FiHistory className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma análise encontrada
              </h3>
              <p className="text-gray-500">
                Este indicador ainda não possui análises realizadas.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {historico.map((item, index) => (
                <div key={item.id} className="bg-gray-50 rounded-lg border border-gray-200">
                  {/* Header do item */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleExpanded(item.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4 mb-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <FiCalendar className="w-4 h-4 mr-1" />
                            {formatarData(item.data_analise)}
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <FiClock className="w-4 h-4 mr-1" />
                            {formatarHora(item.data_analise)}
                          </div>
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                            Análise #{historico.length - index}
                          </span>
                        </div>
                        
                        {/* Preview do resultado */}
                        <div className="text-sm text-gray-700">
                          <strong>Resultado:</strong> {truncateText(item.resultado_analise)}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex-shrink-0">
                        {expandedItems.has(item.id) ? (
                          <FiChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Conteúdo expandido */}
                  {expandedItems.has(item.id) && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-white">
                      <div className="space-y-4 pt-4">
                        {/* Resultado completo */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Resultado da Análise:
                          </h4>
                          <div className="bg-gray-50 p-3 rounded border text-sm text-gray-700 leading-relaxed max-h-60 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-sans">
                              {item.resultado_analise}
                            </pre>
                          </div>
                        </div>

                        {/* Prompt utilizado */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">
                            Prompt Utilizado:
                          </h4>
                          <div className="bg-gray-50 p-3 rounded border text-sm text-gray-600 leading-relaxed max-h-40 overflow-y-auto">
                            <pre className="whitespace-pre-wrap font-sans">
                              {item.prompt_utilizado}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricoAnalisesIndicadores;