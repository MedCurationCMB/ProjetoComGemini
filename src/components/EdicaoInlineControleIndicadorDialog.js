// src/components/EdicaoInlineControleIndicadorDialog.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck, FiSave, FiEdit, FiCalendar } from 'react-icons/fi';

const EdicaoInlineControleIndicadorDialog = ({ 
  onClose, 
  onSuccess, 
  dadosTabela, // Os dados que estão sendo exibidos na tabela (com filtros aplicados)
  categorias,
  projetos,
  subcategorias,
  tiposUnidadeIndicador
}) => {
  const [dadosEditaveis, setDadosEditaveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(new Set());

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
  }, [dadosTabela, projetos, categorias, subcategorias]);

  // Função para lidar com mudanças nos campos
  const handleInputChange = (index, field, value) => {
    setDadosEditaveis(prev => {
      const novoDados = [...prev];
      novoDados[index] = {
        ...novoDados[index],
        [field]: value
      };
      return novoDados;
    });
    
    // Marcar este item como tendo alterações pendentes
    setAlteracoesPendentes(prev => new Set([...prev, index]));
  };

  // Função para formatar data para input
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

  // Função para validar dados antes de salvar
  const validarDados = () => {
    const erros = [];
    
    dadosEditaveis.forEach((item, index) => {
      // Validar indicador obrigatório
      if (!item.indicador || item.indicador.trim() === '') {
        erros.push(`Linha ${index + 1}: Indicador é obrigatório`);
      }
      
      // Validar projeto obrigatório (UUID)
      if (!item.projeto_id || item.projeto_id === '' || item.projeto_id === 'undefined') {
        erros.push(`Linha ${index + 1}: Projeto é obrigatório`);
      }
      
      // Validar categoria obrigatória (UUID)
      if (!item.categoria_id || item.categoria_id === '' || item.categoria_id === 'undefined') {
        erros.push(`Linha ${index + 1}: Categoria é obrigatória`);
      }
      
      // Validar subcategoria obrigatória
      if (!item.subcategoria_id || item.subcategoria_id === '' || item.subcategoria_id === 'undefined') {
        erros.push(`Linha ${index + 1}: Subcategoria é obrigatória`);
      }
      
      // Validar tipo de unidade obrigatório
      if (!item.tipo_unidade_indicador || item.tipo_unidade_indicador === '' || item.tipo_unidade_indicador === 'undefined') {
        erros.push(`Linha ${index + 1}: Tipo de Unidade do Indicador é obrigatório`);
      }
      
      // Validar data se preenchida
      if (item.prazo_entrega_inicial && !/^\d{4}-\d{2}-\d{2}$/.test(item.prazo_entrega_inicial)) {
        erros.push(`Linha ${index + 1}: Prazo inicial deve estar no formato YYYY-MM-DD`);
      }
      
      // Validar campos de recorrência se não for "sem recorrencia"
      if (item.recorrencia !== 'sem recorrencia') {
        if (!item.tempo_recorrencia || parseInt(item.tempo_recorrencia) < 1) {
          erros.push(`Linha ${index + 1}: Tempo de recorrência deve ser um número maior que 0`);
        }
        
        if (!item.repeticoes || parseInt(item.repeticoes) < 1) {
          erros.push(`Linha ${index + 1}: Número de repetições deve ser um número maior que 0`);
        }
      }
    });
    
    return erros;
  };

  // Função para salvar todas as alterações
  const salvarAlteracoes = async () => {
    try {
      setLoading(true);
      
      // Validar dados
      const erros = validarDados();
      if (erros.length > 0) {
        toast.error(`${erros.length} erro(s) encontrado(s). Verifique os campos.`);
        console.error('Erros de validação:', erros);
        return;
      }
      
      let sucessos = 0;
      let falhas = 0;
      
      // Atualizar apenas os itens que foram modificados
      for (const item of dadosEditaveis) {
        try {
          // Preparar dados para atualização
          const dadosAtualizacao = {
            projeto_id: item.projeto_id, // UUID - não converte para int
            indicador: item.indicador.trim(),
            observacao: item.observacao?.trim() || null,
            descricao_detalhada: item.descricao_detalhada?.trim() || null,
            descricao_resumida: item.descricao_resumida?.trim() || null,
            categoria_id: item.categoria_id, // UUID - não converte para int
            subcategoria_id: parseInt(item.subcategoria_id), // Se for integer, mantém parseInt
            tipo_unidade_indicador: parseInt(item.tipo_unidade_indicador), // Se for integer, mantém parseInt
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold">Editar Controles de Indicadores</h2>
            <p className="text-gray-600 mt-1">
              Editando {dadosEditaveis.length} registro(s). Modifique os campos desejados e clique em "Salvar Todas as Alterações".
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Estatísticas */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            <FiEdit className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Total de registros: {dadosEditaveis.length}
              </p>
              <p className="text-sm text-blue-700">
                Campos editáveis: Projeto, Indicador, Observação, Descrições, Categoria, Subcategoria, Tipo Unidade, Prazo, Recorrência, Obrigatório
              </p>
              <p className="text-sm text-blue-700">
                <strong>⚠️ Campos não editáveis:</strong> ID apenas
              </p>
            </div>
          </div>
        </div>

        {/* Tabela editável */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Projeto *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Indicador *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Observação</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Desc. Detalhada</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Desc. Resumida</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Categoria *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Subcategoria *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Tipo Unidade *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-36">Prazo Inicial</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Recorrência *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Tempo Rec.</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Repetições</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Obrigatório</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dadosEditaveis.map((item, index) => (
                <tr key={item.id} className={alteracoesPendentes.has(index) ? 'bg-yellow-50' : ''}>
                  {/* ID (não editável) */}
                  <td className="px-3 py-2 text-sm text-gray-900 font-medium">{item.id}</td>
                  
                  {/* Projeto (editável) */}
                  <td className="px-3 py-2">
                    <select
                      value={item.projeto_id}
                      onChange={(e) => handleInputChange(index, 'projeto_id', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Indicador (editável) */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.indicador}
                      onChange={(e) => handleInputChange(index, 'indicador', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome do indicador"
                      required
                    />
                  </td>
                  
                  {/* Observação (editável) */}
                  <td className="px-3 py-2">
                    <textarea
                      value={item.observacao}
                      onChange={(e) => handleInputChange(index, 'observacao', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Observação"
                      rows="2"
                    />
                  </td>
                  
                  {/* Descrição Detalhada (editável) */}
                  <td className="px-3 py-2">
                    <textarea
                      value={item.descricao_detalhada}
                      onChange={(e) => handleInputChange(index, 'descricao_detalhada', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descrição detalhada"
                      rows="3"
                    />
                  </td>
                  
                  {/* Descrição Resumida (editável) */}
                  <td className="px-3 py-2">
                    <textarea
                      value={item.descricao_resumida}
                      onChange={(e) => handleInputChange(index, 'descricao_resumida', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Descrição resumida"
                      rows="2"
                    />
                  </td>
                  
                  {/* Categoria (editável) */}
                  <td className="px-3 py-2">
                    <select
                      value={item.categoria_id}
                      onChange={(e) => handleInputChange(index, 'categoria_id', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Subcategoria (editável) */}
                  <td className="px-3 py-2">
                    <select
                      value={item.subcategoria_id}
                      onChange={(e) => handleInputChange(index, 'subcategoria_id', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(subcategorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Tipo Unidade (editável) */}
                  <td className="px-3 py-2">
                    <select
                      value={item.tipo_unidade_indicador}
                      onChange={(e) => handleInputChange(index, 'tipo_unidade_indicador', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione...</option>
                      {Object.entries(tiposUnidadeIndicador).map(([id, tipo]) => (
                        <option key={id} value={id}>{tipo}</option>
                      ))}
                    </select>
                  </td>
                  
                  {/* Prazo Inicial (editável) */}
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={formatDateForInput(item.prazo_entrega_inicial)}
                      onChange={(e) => handleInputChange(index, 'prazo_entrega_inicial', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  
                  {/* Recorrência (editável) */}
                  <td className="px-3 py-2">
                    <select
                      value={item.recorrencia}
                      onChange={(e) => handleInputChange(index, 'recorrencia', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sem recorrencia">Sem recorrência</option>
                      <option value="dia">Dia</option>
                      <option value="mês">Mês</option>
                      <option value="ano">Ano</option>
                    </select>
                  </td>
                  
                  {/* Tempo Recorrência (editável) */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="1"
                      value={item.tempo_recorrencia}
                      onChange={(e) => handleInputChange(index, 'tempo_recorrencia', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 1"
                      disabled={item.recorrencia === 'sem recorrencia'}
                    />
                  </td>
                  
                  {/* Repetições (editável) */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={item.repeticoes}
                      onChange={(e) => handleInputChange(index, 'repeticoes', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: 3"
                      disabled={item.recorrencia === 'sem recorrencia'}
                    />
                  </td>
                  
                  {/* Obrigatório (editável) */}
                  <td className="px-3 py-2">
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={item.obrigatorio}
                        onChange={(e) => handleInputChange(index, 'obrigatorio', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé com informações e botões */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          {/* Legenda */}
          <div className="mb-4 text-sm text-gray-600">
            <p><span className="text-red-500">*</span> Campos obrigatórios marcados com asterisco</p>
            <p className="mt-1">💡 Linhas com fundo amarelo possuem alterações pendentes</p>
            <p className="mt-1">🔒 <strong>Campo protegido:</strong> ID não pode ser alterado</p>
          </div>
          
          {/* Botões */}
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            
            <button
              onClick={salvarAlteracoes}
              disabled={loading || dadosEditaveis.length === 0}
              className={`px-6 py-2 rounded-md flex items-center ${
                loading || dadosEditaveis.length === 0
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FiSave className="mr-2" />
                  Salvar Todas as Alterações ({dadosEditaveis.length})
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