// src/components/EdicaoInlineControleIndicadorDialog.js - Versão Simplificada e Responsiva
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck, FiSave, FiEdit, FiCalendar, FiAlertCircle, FiInfo, FiRefreshCw } from 'react-icons/fi';

const EdicaoInlineControleIndicadorDialog = ({ 
  onClose, 
  onSuccess, 
  dadosTabela, 
  categorias,
  projetos,
  subcategorias,
  tiposUnidadeIndicador
}) => {
  const [dadosEditaveis, setDadosEditaveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(new Set());
  const [filtroLinha, setFiltroLinha] = useState('');
  const [showOnlyModified, setShowOnlyModified] = useState(false);
  const [errosValidacao, setErrosValidacao] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  // Verificar se é mobile
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inicializar dados editáveis
  useEffect(() => {
    const dadosIniciais = dadosTabela.map(item => ({
      id: item.id,
      projeto_id: item.projeto_id || '',
      indicador: item.indicador || '',
      observacao: item.observacao || '',
      descricao_detalhada: item.descricao_detalhada || '',
      descricao_resumida: item.descricao_resumida || '',
      categoria_id: item.categoria_id || '',
      subcategoria_id: item.subcategoria_id || '',
      tipo_unidade_indicador: item.tipo_unidade_indicador || '',
      prazo_entrega_inicial: item.prazo_entrega_inicial || '',
      recorrencia: item.recorrencia || 'sem recorrencia',
      tempo_recorrencia: item.tempo_recorrencia || '',
      repeticoes: item.repeticoes || '',
      obrigatorio: item.obrigatorio || false
    }));
    
    setDadosEditaveis(dadosIniciais);
  }, [dadosTabela]);

  const handleInputChange = (index, field, value) => {
    setDadosEditaveis(prev => {
      const novoDados = [...prev];
      novoDados[index] = {
        ...novoDados[index],
        [field]: value
      };
      
      if (field === 'recorrencia' && value === 'sem recorrencia') {
        novoDados[index].tempo_recorrencia = '';
        novoDados[index].repeticoes = '';
      }
      
      return novoDados;
    });
    
    setAlteracoesPendentes(prev => new Set([...prev, index]));
    validarCampo(index, field, value);
  };

  const validarCampo = (index, field, value) => {
    setErrosValidacao(prev => {
      const novosErros = { ...prev };
      const chaveErro = `${index}_${field}`;
      
      delete novosErros[chaveErro];
      
      if (['projeto_id', 'categoria_id', 'subcategoria_id', 'tipo_unidade_indicador', 'indicador'].includes(field)) {
        if (!value || value === '' || value.trim() === '') {
          novosErros[chaveErro] = 'Campo obrigatório';
        }
      }
      
      if (field === 'prazo_entrega_inicial' && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        novosErros[chaveErro] = 'Formato de data inválido';
      }
      
      return novosErros;
    });
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return '';
      }
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  const validarDados = () => {
    const erros = [];
    
    dadosEditaveis.forEach((item, index) => {
      const linha = index + 1;
      
      if (!item.indicador || item.indicador.trim() === '') {
        erros.push(`Linha ${linha}: Indicador é obrigatório`);
      }
      
      if (!item.projeto_id || item.projeto_id === '' || item.projeto_id === 'undefined') {
        erros.push(`Linha ${linha}: Projeto é obrigatório`);
      }
      
      if (!item.categoria_id || item.categoria_id === '' || item.categoria_id === 'undefined') {
        erros.push(`Linha ${linha}: Categoria é obrigatória`);
      }
      
      if (!item.subcategoria_id || item.subcategoria_id === '' || item.subcategoria_id === 'undefined') {
        erros.push(`Linha ${linha}: Subcategoria é obrigatória`);
      }
      
      if (!item.tipo_unidade_indicador || item.tipo_unidade_indicador === '' || item.tipo_unidade_indicador === 'undefined') {
        erros.push(`Linha ${linha}: Tipo de Unidade do Indicador é obrigatório`);
      }
      
      if (item.prazo_entrega_inicial && !/^\d{4}-\d{2}-\d{2}$/.test(item.prazo_entrega_inicial)) {
        erros.push(`Linha ${linha}: Prazo inicial deve estar no formato YYYY-MM-DD`);
      }
      
      if (item.recorrencia !== 'sem recorrencia') {
        if (!item.tempo_recorrencia || parseInt(item.tempo_recorrencia) < 1) {
          erros.push(`Linha ${linha}: Tempo de recorrência deve ser um número maior que 0`);
        }
        
        if (!item.repeticoes || parseInt(item.repeticoes) < 1) {
          erros.push(`Linha ${linha}: Número de repetições deve ser um número maior que 0`);
        }
      }
    });
    
    return erros;
  };

  const salvarAlteracoes = async () => {
    try {
      setLoading(true);
      
      const erros = validarDados();
      if (erros.length > 0) {
        toast.error(`${erros.length} erro(s) encontrado(s). Verifique os campos destacados.`);
        console.error('Erros de validação:', erros);
        return;
      }
      
      let sucessos = 0;
      let falhas = 0;
      
      for (const item of dadosEditaveis) {
        try {
          const dadosAtualizacao = {
            projeto_id: item.projeto_id,
            indicador: item.indicador.trim(),
            observacao: item.observacao?.trim() || null,
            descricao_detalhada: item.descricao_detalhada?.trim() || null,
            descricao_resumida: item.descricao_resumida?.trim() || null,
            categoria_id: item.categoria_id,
            subcategoria_id: parseInt(item.subcategoria_id),
            tipo_unidade_indicador: parseInt(item.tipo_unidade_indicador),
            prazo_entrega_inicial: item.prazo_entrega_inicial || null,
            recorrencia: item.recorrencia,
            tempo_recorrencia: item.recorrencia !== 'sem recorrencia' ? parseInt(item.tempo_recorrencia) : null,
            repeticoes: item.recorrencia !== 'sem recorrencia' ? parseInt(item.repeticoes) : 0,
            obrigatorio: item.obrigatorio
          };
          
          const { error } = await supabase
            .from('controle_indicador')
            .update(dadosAtualizacao)
            .eq('id', item.id);
            
          if (error) throw error;
          sucessos++;
          
        } catch (error) {
          console.error(`Erro ao atualizar ID ${item.id}:`, error);
          falhas++;
        }
      }
      
      if (sucessos > 0) {
        toast.success(`${sucessos} registro(s) atualizado(s) com sucesso!`);
      }
      
      if (falhas > 0) {
        toast.error(`${falhas} registro(s) falharam na atualização`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Erro na atualização em massa:', error);
      toast.error('Erro ao executar atualização em massa');
    } finally {
      setLoading(false);
    }
  };

  const resetarAlteracoes = () => {
    const dadosIniciais = dadosTabela.map(item => ({
      id: item.id,
      projeto_id: item.projeto_id || '',
      indicador: item.indicador || '',
      observacao: item.observacao || '',
      descricao_detalhada: item.descricao_detalhada || '',
      descricao_resumida: item.descricao_resumida || '',
      categoria_id: item.categoria_id || '',
      subcategoria_id: item.subcategoria_id || '',
      tipo_unidade_indicador: item.tipo_unidade_indicador || '',
      prazo_entrega_inicial: item.prazo_entrega_inicial || '',
      recorrencia: item.recorrencia || 'sem recorrencia',
      tempo_recorrencia: item.tempo_recorrencia || '',
      repeticoes: item.repeticoes || '',
      obrigatorio: item.obrigatorio || false
    }));
    
    setDadosEditaveis(dadosIniciais);
    setAlteracoesPendentes(new Set());
    setErrosValidacao({});
    toast.success('Alterações resetadas');
  };

  const dadosFiltrados = dadosEditaveis.filter((item, index) => {
    if (showOnlyModified && !alteracoesPendentes.has(index)) {
      return false;
    }
    
    if (filtroLinha.trim()) {
      const searchTerm = filtroLinha.toLowerCase();
      return (
        item.indicador.toLowerCase().includes(searchTerm) ||
        item.id.toString().includes(searchTerm) ||
        (projetos[item.projeto_id] || '').toLowerCase().includes(searchTerm)
      );
    }
    
    return true;
  });

  const getInputClassName = (index, field, baseClass) => {
    const chaveErro = `${index}_${field}`;
    const hasError = errosValidacao[chaveErro];
    
    return `${baseClass} ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 pb-4 border-b">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Edição em Massa - Controles de Indicadores</h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              Editando <span className="font-semibold text-blue-600">{dadosEditaveis.length}</span> registro(s). 
              {alteracoesPendentes.size > 0 && (
                <span className="text-amber-600 font-medium ml-2">
                  {alteracoesPendentes.size} alteração(ões) pendente(s)
                </span>
              )}
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <FiX className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>

        {/* Controles */}
        <div className="mb-4 space-y-3">
          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 p-2 md:p-3 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Filtrar linhas:</label>
              <input
                type="text"
                placeholder="ID, indicador, projeto..."
                value={filtroLinha}
                onChange={(e) => setFiltroLinha(e.target.value)}
                className="w-full px-2 py-1 text-xs md:text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showOnlyModified"
                checked={showOnlyModified}
                onChange={(e) => setShowOnlyModified(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="showOnlyModified" className="text-xs md:text-sm text-gray-700">
                Apenas modificadas ({alteracoesPendentes.size})
              </label>
            </div>

            <button
              onClick={resetarAlteracoes}
              className="flex items-center px-3 py-1 text-xs md:text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              <FiRefreshCw className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Resetar
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
          <div className="min-w-full bg-white" style={{ width: isMobile ? 'max-content' : '100%' }}>
            <table className="min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">ID</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Projeto *</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Indicador *</th>
                  {!isMobile && (
                    <>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Observação</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Desc. Detalhada</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Desc. Resumida</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Categoria *</th>
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Subcategoria *</th>
                  {!isMobile && (
                    <>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Tipo Unidade *</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-36">Prazo Inicial</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Recorrência *</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Tempo</th>
                      <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Rep.</th>
                    </>
                  )}
                  <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Obrig.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dadosFiltrados.map((item, filteredIndex) => {
                  const originalIndex = dadosEditaveis.findIndex(d => d.id === item.id);
                  const isModified = alteracoesPendentes.has(originalIndex);
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`${isModified ? 'bg-yellow-50' : ''} hover:bg-gray-50`}
                    >
                      {/* ID */}
                      <td className="px-2 py-2 text-xs md:text-sm text-gray-900 font-medium">
                        {item.id}
                        {isModified && <span className="ml-1 text-xs text-amber-600">●</span>}
                      </td>
                      
                      {/* Projeto */}
                      <td className="px-2 py-2">
                        <select
                          value={item.projeto_id}
                          onChange={(e) => handleInputChange(originalIndex, 'projeto_id', e.target.value)}
                          className={getInputClassName(originalIndex, 'projeto_id', 'w-full px-1 py-1 text-xs md:text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500')}
                          required
                        >
                          <option value="">Selecione...</option>
                          {Object.entries(projetos).map(([id, nome]) => (
                            <option key={id} value={id}>{nome}</option>
                          ))}
                        </select>
                        {errosValidacao[`${originalIndex}_projeto_id`] && (
                          <p className="text-xs text-red-600 mt-1">{errosValidacao[`${originalIndex}_projeto_id`]}</p>
                        )}
                      </td>
                      
                      {/* Indicador */}
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={item.indicador}
                          onChange={(e) => handleInputChange(originalIndex, 'indicador', e.target.value)}
                          className={getInputClassName(originalIndex, 'indicador', 'w-full px-1 py-1 text-xs md:text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500')}
                          placeholder="Nome do indicador"
                          required
                        />
                        {errosValidacao[`${originalIndex}_indicador`] && (
                          <p className="text-xs text-red-600 mt-1">{errosValidacao[`${originalIndex}_indicador`]}</p>
                        )}
                      </td>
                      
                      {/* Observação (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <textarea
                            value={item.observacao}
                            onChange={(e) => handleInputChange(originalIndex, 'observacao', e.target.value)}
                            className="w-full px-1 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Observação"
                            rows="1"
                          />
                        </td>
                      )}
                      
                      {/* Descrição Detalhada (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <textarea
                            value={item.descricao_detalhada}
                            onChange={(e) => handleInputChange(originalIndex, 'descricao_detalhada', e.target.value)}
                            className="w-full px-1 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Descrição detalhada"
                            rows="1"
                          />
                        </td>
                      )}
                      
                      {/* Descrição Resumida (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <textarea
                            value={item.descricao_resumida}
                            onChange={(e) => handleInputChange(originalIndex, 'descricao_resumida', e.target.value)}
                            className="w-full px-1 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Descrição resumida"
                            rows="1"
                          />
                        </td>
                      )}
                      
                      {/* Categoria */}
                      <td className="px-2 py-2">
                        <select
                          value={item.categoria_id}
                          onChange={(e) => handleInputChange(originalIndex, 'categoria_id', e.target.value)}
                          className={getInputClassName(originalIndex, 'categoria_id', 'w-full px-1 py-1 text-xs md:text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500')}
                          required
                        >
                          <option value="">Selecione...</option>
                          {Object.entries(categorias).map(([id, nome]) => (
                            <option key={id} value={id}>{nome}</option>
                          ))}
                        </select>
                        {errosValidacao[`${originalIndex}_categoria_id`] && (
                          <p className="text-xs text-red-600 mt-1">{errosValidacao[`${originalIndex}_categoria_id`]}</p>
                        )}
                      </td>
                      
                      {/* Subcategoria */}
                      <td className="px-2 py-2">
                        <select
                          value={item.subcategoria_id}
                          onChange={(e) => handleInputChange(originalIndex, 'subcategoria_id', e.target.value)}
                          className={getInputClassName(originalIndex, 'subcategoria_id', 'w-full px-1 py-1 text-xs md:text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500')}
                          required
                        >
                          <option value="">Selecione...</option>
                          {Object.entries(subcategorias).map(([id, nome]) => (
                            <option key={id} value={id}>{nome}</option>
                          ))}
                        </select>
                        {errosValidacao[`${originalIndex}_subcategoria_id`] && (
                          <p className="text-xs text-red-600 mt-1">{errosValidacao[`${originalIndex}_subcategoria_id`]}</p>
                        )}
                      </td>
                      
                      {/* Tipo Unidade (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <select
                            value={item.tipo_unidade_indicador}
                            onChange={(e) => handleInputChange(originalIndex, 'tipo_unidade_indicador', e.target.value)}
                            className={getInputClassName(originalIndex, 'tipo_unidade_indicador', 'w-full px-1 py-1 text-xs md:text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500')}
                            required
                          >
                            <option value="">Selecione...</option>
                            {Object.entries(tiposUnidadeIndicador).map(([id, tipo]) => (
                              <option key={id} value={id}>{tipo}</option>
                            ))}
                          </select>
                          {errosValidacao[`${originalIndex}_tipo_unidade_indicador`] && (
                            <p className="text-xs text-red-600 mt-1">{errosValidacao[`${originalIndex}_tipo_unidade_indicador`]}</p>
                          )}
                        </td>
                      )}
                      
                      {/* Prazo Inicial (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <input
                            type="date"
                            value={formatDateForInput(item.prazo_entrega_inicial)}
                            onChange={(e) => handleInputChange(originalIndex, 'prazo_entrega_inicial', e.target.value)}
                            className={getInputClassName(originalIndex, 'prazo_entrega_inicial', 'w-full px-1 py-1 text-xs md:text-sm rounded focus:outline-none focus:ring-1 focus:ring-blue-500')}
                          />
                          {errosValidacao[`${originalIndex}_prazo_entrega_inicial`] && (
                            <p className="text-xs text-red-600 mt-1">{errosValidacao[`${originalIndex}_prazo_entrega_inicial`]}</p>
                          )}
                        </td>
                      )}
                      
                      {/* Recorrência (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <select
                            value={item.recorrencia}
                            onChange={(e) => handleInputChange(originalIndex, 'recorrencia', e.target.value)}
                            className="w-full px-1 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="sem recorrencia">Sem</option>
                            <option value="dia">Dia</option>
                            <option value="mês">Mês</option>
                            <option value="ano">Ano</option>
                          </select>
                        </td>
                      )}
                      
                      {/* Tempo Recorrência (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="1"
                            value={item.tempo_recorrencia}
                            onChange={(e) => handleInputChange(originalIndex, 'tempo_recorrencia', e.target.value)}
                            className="w-full px-1 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: 1"
                            disabled={item.recorrencia === 'sem recorrencia'}
                          />
                        </td>
                      )}
                      
                      {/* Repetições (apenas desktop) */}
                      {!isMobile && (
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            min="0"
                            value={item.repeticoes}
                            onChange={(e) => handleInputChange(originalIndex, 'repeticoes', e.target.value)}
                            className="w-full px-1 py-1 text-xs md:text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: 3"
                            disabled={item.recorrencia === 'sem recorrencia'}
                          />
                        </td>
                      )}
                      
                      {/* Obrigatório */}
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={item.obrigatorio}
                            onChange={(e) => handleInputChange(originalIndex, 'obrigatorio', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Mensagem quando não há dados */}
            {dadosFiltrados.length === 0 && (
              <div className="text-center py-8 bg-gray-50">
                <FiInfo className="h-6 w-6 md:h-8 md:w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {filtroLinha.trim() || showOnlyModified ? 'Nenhum registro corresponde aos filtros aplicados' : 'Nenhum registro para editar'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Legenda e dicas */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs md:text-sm">
            <div className="space-y-2">
              <p className="font-medium text-gray-700">Legenda:</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="text-red-500">*</span> Campos obrigatórios</p>
                <p><span className="w-3 h-3 bg-yellow-100 border border-yellow-300 inline-block rounded mr-1"></span> Linhas modificadas</p>
                <p><span className="text-amber-600">●</span> Indicador de alteração</p>
                <p><span className="text-red-500 border border-red-500 bg-red-50 px-1 rounded">Campo</span> Com erro de validação</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="font-medium text-gray-700">Dicas:</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p>• Use Ctrl+F para buscar na página</p>
                <p>• Tab para navegar entre campos</p>
                <p>• Validação em tempo real nos campos obrigatórios</p>
                <p>• "Resetar" desfaz todas as alterações</p>
              </div>
            </div>
          </div>
          
          {/* Resumo de alterações */}
          {alteracoesPendentes.size > 0 && (
            <div className="mb-4 p-2 md:p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center">
                <FiAlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-600 mr-2" />
                <div>
                  <p className="text-xs md:text-sm font-medium text-amber-900">
                    {alteracoesPendentes.size} registro(s) com alterações pendentes
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Clique em "Salvar Todas as Alterações" para confirmar as modificações.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Erros de validação */}
          {Object.keys(errosValidacao).length > 0 && (
            <div className="mb-4 p-2 md:p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start">
                <FiAlertCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600 mr-2 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs md:text-sm font-medium text-red-900">
                    {Object.keys(errosValidacao).length} erro(s) de validação encontrado(s)
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Corrija os campos destacados em vermelho antes de salvar.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                disabled={loading}
                className="px-3 py-1 md:px-4 md:py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
              >
                Cancelar
              </button>
              
              <button
                onClick={resetarAlteracoes}
                disabled={loading || alteracoesPendentes.size === 0}
                className="px-3 py-1 md:px-4 md:py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs md:text-sm"
                title="Desfazer todas as alterações"
              >
                <FiRefreshCw className="h-3 w-3 md:h-4 md:w-4 inline mr-1" />
                Resetar ({alteracoesPendentes.size})
              </button>
            </div>
            
            <button
              onClick={salvarAlteracoes}
              disabled={loading || dadosEditaveis.length === 0 || Object.keys(errosValidacao).length > 0}
              className={`px-4 py-2 rounded-md flex items-center transition-colors text-xs md:text-sm ${
                loading || dadosEditaveis.length === 0 || Object.keys(errosValidacao).length > 0
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FiSave className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                  Salvar Todas as Alterações
                  {alteracoesPendentes.size > 0 && (
                    <span className="ml-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {alteracoesPendentes.size}
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdicaoInlineControleIndicadorDialog;