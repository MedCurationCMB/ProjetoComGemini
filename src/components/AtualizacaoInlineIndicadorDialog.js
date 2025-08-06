// src/components/AtualizacaoInlineIndicadorDialog.js - SEM SUBCATEGORIA
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck, FiSave, FiEdit, FiCalendar } from 'react-icons/fi';

const AtualizacaoInlineIndicadorDialog = ({ 
  onClose, 
  onSuccess, 
  dadosTabela, // Os dados que estão sendo exibidos na tabela (com filtros aplicados)
  categorias,
  projetos,
  tiposIndicador,
  tiposUnidadeIndicador // ✅ REMOVIDO: subcategorias prop
}) => {

  const formatarValorIndicador = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    
    const num = parseFloat(valor);
    if (isNaN(num)) return valor;
    
    return num.toLocaleString('pt-BR');
  };
  const [dadosEditaveis, setDadosEditaveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(new Set());

  // Inicializar dados editáveis - SEM INDICADOR nos campos editáveis
  useEffect(() => {
    const dadosIniciais = dadosTabela.map(item => ({
      id: item.id,
      observacao: item.observacao || '',
      prazo_entrega: item.prazo_entrega || '',
      periodo_referencia: item.periodo_referencia || '',
      valor_indicador_apresentado: item.valor_indicador_apresentado || '',
      obrigatorio: item.obrigatorio || false,
      // Campos não editáveis para exibição
      indicador: item.indicador || '', // ✅ MOVIDO para não editável
      projeto_nome: projetos[item.projeto_id] || 'N/A',
      categoria_nome: categorias[item.categoria_id] || 'N/A',
      descricao_resumida: item.descricao_resumida || ''
      // ✅ REMOVIDO: subcategoria_nome
    }));
    
    setDadosEditaveis(dadosIniciais);
  }, [dadosTabela, projetos, categorias]); // ✅ REMOVIDO: subcategorias dependency

  // Função para lidar com mudanças nos campos - SEM INDICADOR
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
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  // Função para validar dados antes de salvar - SEM INDICADOR
  const validarDados = () => {
    const erros = [];
    
    dadosEditaveis.forEach((item, index) => {
      // ✅ REMOVIDO: Validação do indicador (não é mais editável)
      
      // Validar valor se preenchido
      if (item.valor_indicador_apresentado && item.valor_indicador_apresentado !== '') {
        const valor = parseFloat(item.valor_indicador_apresentado);
        if (isNaN(valor)) {
          erros.push(`Linha ${index + 1}: Valor apresentado deve ser um número válido`);
        }
      }
      
      // Validar datas se preenchidas
      if (item.prazo_entrega && !/^\d{4}-\d{2}-\d{2}$/.test(item.prazo_entrega)) {
        erros.push(`Linha ${index + 1}: Prazo de entrega deve estar no formato YYYY-MM-DD`);
      }
      
      if (item.periodo_referencia && !/^\d{4}-\d{2}-\d{2}$/.test(item.periodo_referencia)) {
        erros.push(`Linha ${index + 1}: Período de referência deve estar no formato YYYY-MM-DD`);
      }
    });
    
    return erros;
  };

  // Função para salvar todas as alterações - SEM INDICADOR
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
          // Preparar dados para atualização - SEM INDICADOR
          const dadosAtualizacao = {
            observacao: item.observacao?.trim() || null,
            prazo_entrega: item.prazo_entrega || null,
            periodo_referencia: item.periodo_referencia || null,
            valor_indicador_apresentado: item.valor_indicador_apresentado 
              ? parseFloat(item.valor_indicador_apresentado) 
              : null,
            obrigatorio: item.obrigatorio
          };
          
          const { error } = await supabase
            .from('controle_indicador_geral')
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
            <h2 className="text-xl font-bold">Atualizar Informações em Massa</h2>
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
                Campos editáveis: Observação, Prazo Entrega, Período Referência, Valor Apresentado, Tipo Unidade, Obrigatório
              </p>
              <p className="text-sm text-blue-700">
                <strong>⚠️ Campos não editáveis:</strong> ID, Projeto, Categoria, Indicador
              </p>
            </div>
          </div>
        </div>

        {/* ✅ TABELA EDITÁVEL SEM SUBCATEGORIA */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-16">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Projeto</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Categoria</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Descrição Resumida</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-48">Indicador</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-40">Observação *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-36">Prazo Entrega *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-36">Período Ref. *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">Valor *</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase w-24">Obrigatório *</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dadosEditaveis.map((item, index) => (
                <tr key={item.id} className={alteracoesPendentes.has(index) ? 'bg-yellow-50' : ''}>
                  {/* ID (não editável) */}
                  <td className="px-3 py-2 text-sm text-gray-900 font-medium">{item.id}</td>
                  
                  {/* Projeto (não editável) */}
                  <td className="px-3 py-2 text-sm text-gray-600" title={item.projeto_nome}>
                    <div className="truncate">{item.projeto_nome}</div>
                  </td>
                  
                  {/* Categoria (não editável) */}
                  <td className="px-3 py-2 text-sm text-gray-600" title={item.categoria_nome}>
                    <div className="truncate">{item.categoria_nome}</div>
                  </td>

                  {/* Descrição Resumida (não editável) */}
                  <td className="px-3 py-2 text-sm text-gray-600" title={item.descricao_resumida}>
                    <div className="truncate bg-gray-100 px-2 py-1 rounded">
                      {item.descricao_resumida || '-'}
                    </div>
                  </td>
                  
                  {/* ✅ INDICADOR (NÃO EDITÁVEL) */}
                  <td className="px-3 py-2 text-sm text-gray-600" title={item.indicador}>
                    <div className="truncate bg-gray-100 px-2 py-1 rounded">
                      {item.indicador}
                    </div>
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
                  
                  {/* Prazo Entrega (editável) */}
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={formatDateForInput(item.prazo_entrega)}
                      onChange={(e) => handleInputChange(index, 'prazo_entrega', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  
                  {/* Período Referência (editável) */}
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={formatDateForInput(item.periodo_referencia)}
                      onChange={(e) => handleInputChange(index, 'periodo_referencia', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  
                  {/* Valor Apresentado (editável) */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.valor_indicador_apresentado}
                      onChange={(e) => handleInputChange(index, 'valor_indicador_apresentado', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                    {/* ✅ ADICIONAR PREVIEW FORMATADO ABAIXO DO INPUT */}
                    {item.valor_indicador_apresentado && (
                      <div className="text-xs text-gray-500 mt-1">
                        Preview: {formatarValorIndicador(item.valor_indicador_apresentado)}
                      </div>
                    )}
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
            <p><span className="text-red-500">*</span> Campos editáveis marcados com asterisco</p>
            <p className="mt-1">💡 Linhas com fundo amarelo possuem alterações pendentes</p>
            <p className="mt-1">🔒 <strong>Campos protegidos:</strong> ID, Projeto, Categoria e Indicador não podem ser alterados</p>
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

export default AtualizacaoInlineIndicadorDialog;