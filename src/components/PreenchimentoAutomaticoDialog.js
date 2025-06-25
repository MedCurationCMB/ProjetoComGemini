// src/components/PreenchimentoAutomaticoDialog.js
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCalendar, FiCheck, FiAlertCircle } from 'react-icons/fi';

const PreenchimentoAutomaticoDialog = ({ onClose, onSuccess, dadosTabela }) => {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  // Função para calcular o período de referência baseado na recorrência
  const calcularPeriodoReferencia = (prazoAtual, recorrencia, tempoRecorrencia) => {
    if (!prazoAtual || !recorrencia || recorrencia === 'sem recorrencia' || !tempoRecorrencia) {
      return null;
    }

    try {
      // ✅ CORREÇÃO: Criar data sem problemas de fuso horário
      // Se a data está no formato YYYY-MM-DD, criar manualmente
      let dataPrazo;
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(prazoAtual)) {
        // Formato YYYY-MM-DD - criar data manual para evitar fuso horário
        const [year, month, day] = prazoAtual.split('-');
        dataPrazo = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Outros formatos
        dataPrazo = new Date(prazoAtual);
      }
      
      // ✅ CORREÇÃO: Usar nova instância para não modificar a original
      let dataReferencia = new Date(dataPrazo.getFullYear(), dataPrazo.getMonth(), dataPrazo.getDate());
      
      // Calcular data de referência baseada na recorrência
      if (recorrencia === 'dia') {
        dataReferencia.setDate(dataReferencia.getDate() - tempoRecorrencia);
      } else if (recorrencia === 'mês') {
        dataReferencia.setMonth(dataReferencia.getMonth() - tempoRecorrencia);
      } else if (recorrencia === 'ano') {
        dataReferencia.setFullYear(dataReferencia.getFullYear() - tempoRecorrencia);
      } else {
        return null; // Tipo de recorrência não reconhecido
      }
      
      // ✅ CORREÇÃO: Retornar no formato YYYY-MM-DD sem problemas de fuso
      const ano = dataReferencia.getFullYear();
      const mes = String(dataReferencia.getMonth() + 1).padStart(2, '0');
      const dia = String(dataReferencia.getDate()).padStart(2, '0');
      
      return `${ano}-${mes}-${dia}`;
    } catch (error) {
      console.error('Erro ao calcular período de referência:', error);
      return null;
    }
  };

  // Função para gerar preview dos dados que serão atualizados
  const gerarPreview = () => {
    const itensParaAtualizar = dadosTabela.filter(item => {
      // Filtrar apenas itens que:
      // 1. Não possuem período de referência (NULL ou vazio)
      // 2. Possuem prazo atual válido
      // 3. Possuem recorrência válida
      return (
        (!item.periodo_referencia || item.periodo_referencia === '') &&
        item.prazo_entrega &&
        item.recorrencia &&
        item.recorrencia !== 'sem recorrencia' &&
        item.tempo_recorrencia
      );
    });

    const preview = itensParaAtualizar.map(item => {
      const novoPeriodoReferencia = calcularPeriodoReferencia(
        item.prazo_entrega,
        item.recorrencia,
        item.tempo_recorrencia
      );

      return {
        id: item.id,
        indicador: item.indicador,
        prazo_entrega: item.prazo_entrega,
        recorrencia: item.recorrencia,
        tempo_recorrencia: item.tempo_recorrencia,
        periodo_referencia_atual: item.periodo_referencia || 'Vazio',
        periodo_referencia_novo: novoPeriodoReferencia
      };
    });

    setPreviewData(preview);
    setShowPreview(true);
  };

  // Função para executar o preenchimento automático
  const executarPreenchimento = async () => {
    try {
      setLoading(true);

      // Se não tem preview, gerar primeiro
      let dadosParaProcessar = previewData;
      
      if (dadosParaProcessar.length === 0) {
        const itensParaAtualizar = dadosTabela.filter(item => (
          (!item.periodo_referencia || item.periodo_referencia === '') &&
          item.prazo_entrega &&
          item.recorrencia &&
          item.recorrencia !== 'sem recorrencia' &&
          item.tempo_recorrencia
        ));

        dadosParaProcessar = itensParaAtualizar.map(item => ({
          id: item.id,
          periodo_referencia_novo: calcularPeriodoReferencia(
            item.prazo_entrega,
            item.recorrencia,
            item.tempo_recorrencia
          )
        }));
      }

      let sucessos = 0;
      let falhas = 0;

      for (const item of dadosParaProcessar) {
        try {
          if (item.periodo_referencia_novo) {
            const { error } = await supabase
              .from('controle_indicador_geral')
              .update({
                periodo_referencia: item.periodo_referencia_novo
              })
              .eq('id', item.id);

            if (error) throw error;
            sucessos++;
          }
        } catch (error) {
          console.error(`Erro ao atualizar ID ${item.id}:`, error);
          falhas++;
        }
      }

      if (sucessos > 0) {
        toast.success(`${sucessos} período(s) de referência preenchido(s) automaticamente!`);
      }

      if (falhas > 0) {
        toast.error(`${falhas} registro(s) falharam na atualização`);
      }

      if (onSuccess) {
        onSuccess();
      }

      onClose();

    } catch (error) {
      console.error('Erro no preenchimento automático:', error);
      toast.error('Erro ao executar preenchimento automático');
    } finally {
      setLoading(false);
    }
  };

  // Função para formatar data para exibição
  const formatarData = (dateString) => {
    if (!dateString || dateString === 'Vazio') return dateString;
    
    try {
      // ✅ CORREÇÃO: Tratar especificamente datas no formato YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        // Criar data manual para evitar problemas de fuso horário
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        // Formatação manual para garantir consistência
        const diaFormatado = String(date.getDate()).padStart(2, '0');
        const mesFormatado = String(date.getMonth() + 1).padStart(2, '0');
        const anoFormatado = date.getFullYear();
        
        return `${diaFormatado}/${mesFormatado}/${anoFormatado}`;
      }
      
      // Para outros formatos, tentar parsing normal
      const date = new Date(dateString);
      const diaFormatado = String(date.getDate()).padStart(2, '0');
      const mesFormatado = String(date.getMonth() + 1).padStart(2, '0');
      const anoFormatado = date.getFullYear();
      
      return `${diaFormatado}/${mesFormatado}/${anoFormatado}`;
    } catch (e) {
      console.error('Erro ao formatar data:', e, 'Data recebida:', dateString);
      return dateString;
    }
  };

  // Contar quantos itens serão atualizados
  const itensElegiveis = dadosTabela.filter(item => (
    (!item.periodo_referencia || item.periodo_referencia === '') &&
    item.prazo_entrega &&
    item.recorrencia &&
    item.recorrencia !== 'sem recorrencia' &&
    item.tempo_recorrencia
  ));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Preencher Automático Período de Referência</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {!showPreview ? (
          <>
            {/* Explicação da funcionalidade */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <FiCalendar className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-900">Como funciona o Preenchimento Automático</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Esta funcionalidade irá calcular automaticamente o período de referência para indicadores que ainda não possuem essa informação.
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• <strong>Fórmula:</strong> Período de Referência = Prazo Atual - Tempo de Recorrência</li>
                    <li>• <strong>Exemplo 1:</strong> Se o prazo é 15/01/2024 e a recorrência é 3 dias → Período de Referência = 12/01/2024</li>
                    <li>• <strong>Exemplo 2:</strong> Se o prazo é 15/03/2024 e a recorrência é 2 meses → Período de Referência = 15/01/2024</li>
                    <li>• <strong>Critério:</strong> Apenas indicadores com período de referência vazio e que possuem recorrência definida</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Análise dos Dados</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-600">Total de Indicadores</div>
                  <div className="text-lg font-semibold text-gray-900">{dadosTabela.length}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-600">Elegíveis para Preenchimento</div>
                  <div className="text-lg font-semibold text-green-600">{itensElegiveis.length}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-600">Já Possuem Período</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {dadosTabela.filter(item => item.periodo_referencia && item.periodo_referencia !== '').length}
                  </div>
                </div>
              </div>
            </div>

            {/* Alertas */}
            {itensElegiveis.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <FiAlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Nenhum item elegível encontrado</h3>
                    <p className="text-sm text-yellow-700 mt-1">
                      Todos os indicadores já possuem período de referência definido ou não possuem recorrência configurada.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <FiCheck className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-green-900">Pronto para executar</h3>
                    <p className="text-sm text-green-700 mt-1">
                      {itensElegiveis.length} indicador(es) será(ão) atualizado(s) com o período de referência calculado automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <div className="flex space-x-3">
                {itensElegiveis.length > 0 && (
                  <button
                    onClick={gerarPreview}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                  >
                    Visualizar Preview
                  </button>
                )}
                
                <button
                  onClick={executarPreenchimento}
                  disabled={itensElegiveis.length === 0 || loading}
                  className={`px-4 py-2 rounded-md ${
                    itensElegiveis.length === 0 || loading
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {loading ? 'Processando...' : 'Confirmar Preenchimento'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Preview dos dados */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Preview das Alterações ({previewData.length} registros)
              </h3>
              
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Indicador</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prazo Atual</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorrência</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Período Atual</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Período Novo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.id}</td>
                        <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={item.indicador}>
                          {item.indicador}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">{formatarData(item.prazo_entrega)}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {item.tempo_recorrencia} {item.recorrencia}(s)
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {formatarData(item.periodo_referencia_atual)}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-green-600">
                          {formatarData(item.periodo_referencia_novo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botões do Preview */}
            <div className="flex justify-between">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              
              <button
                onClick={executarPreenchimento}
                disabled={loading}
                className={`px-4 py-2 rounded-md ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {loading ? 'Executando...' : 'Confirmar e Executar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PreenchimentoAutomaticoDialog;