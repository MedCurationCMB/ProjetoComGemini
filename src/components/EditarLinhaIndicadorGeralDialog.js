// src/components/EditarLinhaIndicadorGeralDialog.js - Versão com Período de Referência
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck, FiCalendar } from 'react-icons/fi';

const EditarLinhaIndicadorGeralDialog = ({ 
  controleItem, 
  onClose, 
  onSuccess, 
  categorias, 
  projetos, 
  tiposIndicador, 
  subcategorias, 
  tiposUnidadeIndicador 
}) => {
  const [formData, setFormData] = useState({
    prazo_entrega: '',
    indicador: '',
    observacao: '',
    valor_indicador_apresentado: '',
    tipo_unidade_indicador: '',
    periodo_referencia: '', // ← NOVO CAMPO
    obrigatorio: false
  });
  
  const [loading, setLoading] = useState(false);

  // Carrega os dados iniciais do item de controle
  useEffect(() => {
    if (controleItem) {
      setFormData({
        prazo_entrega: controleItem.prazo_entrega || '',
        indicador: controleItem.indicador || '',
        observacao: controleItem.observacao || '',
        valor_indicador_apresentado: controleItem.valor_indicador_apresentado || '',
        tipo_unidade_indicador: controleItem.tipo_unidade_indicador || '',
        periodo_referencia: controleItem.periodo_referencia || '', // ← NOVO CAMPO
        obrigatorio: controleItem.obrigatorio || false
      });
    }
  }, [controleItem]);

  // Função para lidar com mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Salvar as alterações
  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validar campos obrigatórios
      if (!formData.prazo_entrega) {
        toast.error('Por favor, preencha o prazo de entrega');
        setLoading(false);
        return;
      }
      
      if (!formData.indicador.trim()) {
        toast.error('Por favor, preencha o indicador');
        setLoading(false);
        return;
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao = {
        prazo_entrega: formData.prazo_entrega,
        indicador: formData.indicador.trim(),
        observacao: formData.observacao ? formData.observacao.trim() : null,
        valor_indicador_apresentado: formData.valor_indicador_apresentado ? formData.valor_indicador_apresentado.trim() : null,
        periodo_referencia: formData.periodo_referencia || null, // ← NOVO CAMPO
        obrigatorio: formData.obrigatorio
      };

      // Incluir tipo_unidade_indicador apenas se foi selecionado
      if (formData.tipo_unidade_indicador) {
        dadosAtualizacao.tipo_unidade_indicador = parseInt(formData.tipo_unidade_indicador);
      } else {
        dadosAtualizacao.tipo_unidade_indicador = null;
      }
      
      // Atualizar o item de controle de indicador geral
      const { data, error } = await supabase
        .from('controle_indicador_geral')
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

  // Função para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'Data indisponível';
    
    try {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Editar Item de Controle de Indicador</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Detalhes do Item</h3>
            <p><strong>Projeto:</strong> {projetos[controleItem?.projeto_id] || 'N/A'}</p>
            <p><strong>Categoria:</strong> {categorias[controleItem?.categoria_id] || 'N/A'}</p>
            <p><strong>Tipo Indicador:</strong> {tiposIndicador[controleItem?.tipo_indicador] || 'N/A'}</p>
            <p><strong>Subcategoria:</strong> {subcategorias[controleItem?.subcategoria_id] || 'N/A'}</p>
            <p><strong>ID Base:</strong> {controleItem?.id_controleindicador || 'N/A'}</p>
            <p><strong>Prazo Inicial:</strong> {formatDate(controleItem?.prazo_entrega_inicial)}</p>
            <p><strong>Valor Calculado Atual:</strong> {controleItem?.valor_indicador || '-'}</p>
          </div>
        </div>
        
        <form className="space-y-4">
          {/* Prazo de Entrega */}
          <div>
            <label htmlFor="prazo_entrega" className="block text-sm font-medium text-gray-700 mb-1">
              Prazo de Entrega Atual <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="prazo_entrega"
              name="prazo_entrega"
              value={formData.prazo_entrega}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Período de Referência - NOVO CAMPO */}
          <div>
            <label htmlFor="periodo_referencia" className="block text-sm font-medium text-gray-700 mb-1">
              Período de Referência
            </label>
            <input
              type="date"
              id="periodo_referencia"
              name="periodo_referencia"
              value={formData.periodo_referencia}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Data de referência para o cálculo ou avaliação deste indicador.
            </p>
          </div>
          
          {/* Indicador */}
          <div>
            <label htmlFor="indicador" className="block text-sm font-medium text-gray-700 mb-1">
              Indicador <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="indicador"
              name="indicador"
              value={formData.indicador}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite o nome do indicador"
            />
          </div>
          
          {/* Observação */}
          <div>
            <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-1">
              Observação
            </label>
            <textarea
              id="observacao"
              name="observacao"
              value={formData.observacao}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              rows="3"
              placeholder="Digite observações sobre o indicador"
            />
          </div>
          
          {/* Valor Apresentado */}
          <div>
            <label htmlFor="valor_indicador_apresentado" className="block text-sm font-medium text-gray-700 mb-1">
              Valor Apresentado
            </label>
            <input
              type="text"
              id="valor_indicador_apresentado"
              name="valor_indicador_apresentado"
              value={formData.valor_indicador_apresentado}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Digite o valor apresentado do indicador"
            />
            <p className="mt-1 text-sm text-gray-500">
              Este é o valor que será apresentado para o indicador.
            </p>
          </div>
          
          {/* Tipo de Unidade do Indicador */}
          <div>
            <label htmlFor="tipo_unidade_indicador" className="block text-sm font-medium text-gray-700 mb-1">
              Unidade do Indicador
            </label>
            <select
              id="tipo_unidade_indicador"
              name="tipo_unidade_indicador"
              value={formData.tipo_unidade_indicador}
              onChange={handleInputChange}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione uma unidade</option>
              {Object.entries(tiposUnidadeIndicador).map(([id, tipo]) => (
                <option key={id} value={id}>
                  {tipo}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Selecione a unidade de medida para este indicador.
            </p>
          </div>

          {/* Informação sobre Valor Calculado */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-center">
              <FiCalendar className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Valor Calculado</h4>
                <p className="text-sm text-blue-700">
                  O valor calculado é preenchido automaticamente pelo sistema e não pode ser editado manualmente.
                </p>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  Valor atual: {controleItem?.valor_indicador || 'Não calculado'}
                </p>
              </div>
            </div>
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
          
          {/* Botões de Ação */}
          <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200">
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
              className={`px-4 py-2 rounded-md ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </div>
              ) : (
                'Salvar Alterações'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarLinhaIndicadorGeralDialog;