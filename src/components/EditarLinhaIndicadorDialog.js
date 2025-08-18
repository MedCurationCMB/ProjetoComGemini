// src/components/EditarLinhaIndicadorDialog.js - Versão Atualizada SEM subcategoria + Tipo de Apresentação + Campos Bloqueados
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiSave, FiLock, FiInfo } from 'react-icons/fi';

const EditarLinhaIndicadorDialog = ({ 
  controleItem, 
  onClose, 
  onSuccess, 
  categorias,
  projetos,
  tiposUnidadeIndicador,
  tiposApresentacao
}) => {
  const [formData, setFormData] = useState({
    projeto_id: '',
    categoria_id: '',
    indicador: '',
    observacao: '',
    descricao_detalhada: '',
    descricao_resumida: '',
    tipo_unidade_indicador: '',
    tipo_apresentacao: '', // ✅ NOVO CAMPO
    obrigatorio: false
    // ✅ REMOVIDOS: subcategoria_id, prazo_entrega_inicial, recorrencia, tempo_recorrencia, repeticoes
  });
  
  // ✅ CAMPOS SOMENTE LEITURA (não editáveis)
  const [camposReadOnly, setCamposReadOnly] = useState({
    prazo_entrega_inicial: '',
    recorrencia: '',
    tempo_recorrencia: '',
    repeticoes: ''
  });
  
  const [loading, setLoading] = useState(false);

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
      console.error('Erro ao formatar data para input:', e);
      return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Não definido';
    
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // ✅ CARREGAR DADOS INICIAIS - Separar campos editáveis dos não editáveis
  useEffect(() => {
    if (controleItem) {
      // Campos editáveis
      setFormData({
        projeto_id: controleItem.projeto_id || '',
        categoria_id: controleItem.categoria_id || '',
        indicador: controleItem.indicador || '',
        observacao: controleItem.observacao || '',
        descricao_detalhada: controleItem.descricao_detalhada || '',
        descricao_resumida: controleItem.descricao_resumida || '',
        tipo_unidade_indicador: controleItem.tipo_unidade_indicador || '',
        tipo_apresentacao: controleItem.tipo_apresentacao || '', // ✅ NOVO CAMPO
        obrigatorio: controleItem.obrigatorio || false
      });

      // ✅ Campos não editáveis (somente leitura)
      setCamposReadOnly({
        prazo_entrega_inicial: controleItem.prazo_entrega_inicial || '',
        recorrencia: controleItem.recorrencia || 'sem recorrencia',
        tempo_recorrencia: controleItem.tempo_recorrencia || '',
        repeticoes: controleItem.repeticoes || ''
      });
    }
  }, [controleItem]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // ✅ VALIDAÇÃO ATUALIZADA: Remover subcategoria_id, adicionar tipo_apresentacao
      if (!formData.projeto_id || !formData.categoria_id || !formData.indicador || 
          !formData.tipo_unidade_indicador || !formData.tipo_apresentacao) {
        toast.error('Por favor, preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }
      
      // ✅ PREPARAR DADOS PARA ATUALIZAÇÃO: Incluir apenas campos editáveis + subcategoria_id como null
      const dadosAtualizacao = {
        projeto_id: formData.projeto_id,
        categoria_id: formData.categoria_id,
        indicador: formData.indicador.trim(),
        observacao: formData.observacao.trim() || null,
        descricao_detalhada: formData.descricao_detalhada.trim() || null,
        descricao_resumida: formData.descricao_resumida.trim() || null,
        subcategoria_id: null, // ✅ SEMPRE NULL
        tipo_unidade_indicador: parseInt(formData.tipo_unidade_indicador),
        tipo_apresentacao: parseInt(formData.tipo_apresentacao), // ✅ NOVO CAMPO
        obrigatorio: formData.obrigatorio
        // ✅ NÃO INCLUIR: prazo_entrega_inicial, recorrencia, tempo_recorrencia, repeticoes
      };
      
      const { data, error } = await supabase
        .from('controle_indicador')
        .update(dadosAtualizacao)
        .eq('id', controleItem.id)
        .select();
        
      if (error) throw error;
      
      toast.success('Item atualizado com sucesso!');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast.error(error.message || 'Erro ao salvar alterações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Editar Linha Base de Indicador</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {/* Informações do item (apenas leitura) */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-700 mb-2">Informações do Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
            <p><strong>ID:</strong> {controleItem?.id}</p>
            <p><strong>Projeto Atual:</strong> {projetos[controleItem?.projeto_id] || 'N/A'}</p>
            <p><strong>Categoria Atual:</strong> {categorias[controleItem?.categoria_id] || 'N/A'}</p>
            {controleItem?.created_at && (
              <p><strong>Criado em:</strong> {formatDate(controleItem.created_at)}</p>
            )}
          </div>
          
          <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-1">Linhas Relacionadas</h4>
            <p className="text-sm text-blue-700">
              Este indicador possui linhas automaticamente geradas na tabela de controle geral.
              Campos de recorrência não podem ser editados após a criação.
            </p>
          </div>
        </div>

        {/* ✅ AVISO SOBRE CAMPOS NÃO EDITÁVEIS */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <FiLock className="h-5 w-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                Campos Não Editáveis
              </h4>
              <p className="text-sm text-yellow-700 mb-2">
                Os seguintes campos não podem ser modificados após a criação do indicador:
              </p>
              <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                <li>Prazo de Entrega Inicial</li>
                <li>Recorrência</li>
                <li>Tempo de Recorrência</li>
                <li>Número de Repetições</li>
              </ul>
              <p className="text-sm text-yellow-600 mt-2">
                Estes campos estão exibidos abaixo apenas para visualização.
              </p>
            </div>
          </div>
        </div>
        
        <form className="space-y-4">
          {/* ===== CAMPOS EDITÁVEIS ===== */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Campos Editáveis
            </h3>

            {/* Primeira linha: Projeto e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projeto <span className="text-red-500">*</span>
                </label>
                <select
                  name="projeto_id"
                  value={formData.projeto_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione um projeto</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <select
                  name="categoria_id"
                  value={formData.categoria_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione uma categoria</option>
                  {Object.entries(categorias).map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Indicador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Indicador <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="indicador"
                value={formData.indicador}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite o nome do indicador"
                required
              />
            </div>
            
            {/* Segunda linha: Tipo de Unidade e Tipo de Apresentação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Unidade <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipo_unidade_indicador"
                  value={formData.tipo_unidade_indicador}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o tipo de unidade</option>
                  {Object.entries(tiposUnidadeIndicador).map(([id, tipo]) => (
                    <option key={id} value={id}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* ✅ NOVO CAMPO: Tipo de Apresentação */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Apresentação <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipo_apresentacao"
                  value={formData.tipo_apresentacao}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Selecione o tipo de apresentação</option>
                  {Object.entries(tiposApresentacao).map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Observação */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observação <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <textarea
                name="observacao"
                value={formData.observacao}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
                placeholder="Digite observações sobre o indicador"
              />
            </div>
            
            {/* Descrição Detalhada */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Detalhada <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <textarea
                name="descricao_detalhada"
                value={formData.descricao_detalhada}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="4"
                placeholder="Digite uma descrição detalhada do indicador, sua finalidade e metodologia"
              />
            </div>
            
            {/* Descrição Resumida */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição Resumida <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <textarea
                name="descricao_resumida"
                value={formData.descricao_resumida}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                placeholder="Digite uma descrição resumida do indicador"
              />
            </div>
            
            {/* Obrigatório */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="obrigatorio"
                name="obrigatorio"
                checked={formData.obrigatorio}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="obrigatorio" className="ml-2 block text-sm text-gray-700">
                Obrigatório
              </label>
            </div>
          </div>

          {/* ===== CAMPOS NÃO EDITÁVEIS (SOMENTE LEITURA) ===== */}
          <div className="space-y-4 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <FiLock className="h-5 w-5 text-gray-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-700">
                Campos Não Editáveis
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prazo inicial - Apenas visualização */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Prazo Inicial (não editável)
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                  {formatDate(camposReadOnly.prazo_entrega_inicial)}
                </div>
              </div>

              {/* Recorrência - Apenas visualização */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Recorrência (não editável)
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                  {camposReadOnly.recorrencia || 'sem recorrencia'}
                </div>
              </div>

              {/* Tempo de Recorrência - Apenas visualização */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Tempo de Recorrência (não editável)
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                  {camposReadOnly.tempo_recorrencia || 'Não definido'}
                </div>
              </div>

              {/* Número de Repetições - Apenas visualização */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Número de Repetições (não editável)
                </label>
                <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600">
                  {camposReadOnly.repeticoes || '0'}
                </div>
              </div>
            </div>

            {/* Informação adicional */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex items-start">
                <FiInfo className="h-4 w-4 text-gray-500 mr-2 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  Estes campos são definidos apenas na criação do indicador e não podem ser alterados posteriormente 
                  para manter a integridade das linhas já geradas no sistema.
                </p>
              </div>
            </div>
          </div>
          
          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className={`px-4 py-2 rounded-md flex items-center ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FiSave className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarLinhaIndicadorDialog;