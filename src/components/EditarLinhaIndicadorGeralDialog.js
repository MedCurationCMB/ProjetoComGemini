// src/components/EditarLinhaIndicadorGeralDialog.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck, FiCalendar } from 'react-icons/fi';

const EditarLinhaIndicadorGeralDialog = ({ controleItem, onClose, onSuccess, categorias, projetos, tiposIndicador, subcategorias }) => {
  const [formData, setFormData] = useState({
    prazo_entrega: '',
    indicador: '',
    observacao: '',
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
      
      // Atualizar o item de controle de indicador geral
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({
          prazo_entrega: formData.prazo_entrega,
          indicador: formData.indicador.trim(),
          observacao: formData.observacao.trim() || null,
          obrigatorio: formData.obrigatorio
        })
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
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
              {loading ? 'Processando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarLinhaIndicadorGeralDialog;