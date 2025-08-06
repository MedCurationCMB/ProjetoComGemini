// src/components/EditarLinhaIndicadorDialog.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiSave, FiCalendar } from 'react-icons/fi';

const EditarLinhaIndicadorDialog = ({ 
  controleItem, 
  onClose, 
  onSuccess, 
  categorias,
  projetos,
  subcategorias,
  tiposUnidadeIndicador
}) => {
  const [formData, setFormData] = useState({
    projeto_id: '',
    categoria_id: '',
    indicador: '',
    observacao: '',
    descricao_detalhada: '',
    descricao_resumida: '',
    subcategoria_id: '',
    tipo_unidade_indicador: '',
    prazo_entrega_inicial: '',
    recorrencia: 'sem recorrencia',
    tempo_recorrencia: '',
    repeticoes: '',
    obrigatorio: false
  });
  
  const [loading, setLoading] = useState(false);

  // ✅ Função para formatar data para input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Se a data já está no formato correto YYYY-MM-DD, retornar como está
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      // Se for uma data completa com horário, extrair apenas a parte da data
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

  // ✅ Função para formatar data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return 'Data indisponível';
    
    try {
      // Se for uma string no formato YYYY-MM-DD, criar a data sem conversão de fuso
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Para outros formatos, usar parsing normal
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

  // Carrega os dados iniciais do item de controle
  useEffect(() => {
    if (controleItem) {
      setFormData({
        projeto_id: controleItem.projeto_id || '',
        categoria_id: controleItem.categoria_id || '',
        indicador: controleItem.indicador || '',
        observacao: controleItem.observacao || '',
        descricao_detalhada: controleItem.descricao_detalhada || '',
        descricao_resumida: controleItem.descricao_resumida || '',
        subcategoria_id: controleItem.subcategoria_id || '',
        tipo_unidade_indicador: controleItem.tipo_unidade_indicador || '',
        prazo_entrega_inicial: formatDateForInput(controleItem.prazo_entrega_inicial),
        recorrencia: controleItem.recorrencia || 'sem recorrencia',
        tempo_recorrencia: controleItem.tempo_recorrencia || '',
        repeticoes: controleItem.repeticoes || '',
        obrigatorio: controleItem.obrigatorio || false
      });
    }
  }, [controleItem]);

  // Função para lidar com mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Se o campo for "recorrencia" e mudar para "sem recorrencia", 
    // limpar os campos relacionados
    if (name === 'recorrencia' && value === 'sem recorrencia') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        tempo_recorrencia: '',
        repeticoes: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Salvar as alterações
  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validar campos obrigatórios
      if (!formData.projeto_id || !formData.categoria_id || !formData.indicador || 
          !formData.subcategoria_id || !formData.tipo_unidade_indicador) {
        toast.error('Por favor, preencha todos os campos obrigatórios');
        setLoading(false);
        return;
      }
      
      // Validar campos adicionais se a recorrência não for "sem recorrencia"
      if (formData.recorrencia !== 'sem recorrencia') {
        if (!formData.tempo_recorrencia || parseInt(formData.tempo_recorrencia) < 1) {
          toast.error('Por favor, informe um tempo de recorrência válido');
          setLoading(false);
          return;
        }
        
        if (!formData.repeticoes || parseInt(formData.repeticoes) < 1) {
          toast.error('Por favor, informe um número válido de repetições');
          setLoading(false);
          return;
        }
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao = {
        projeto_id: formData.projeto_id,
        categoria_id: formData.categoria_id,
        indicador: formData.indicador.trim(),
        observacao: formData.observacao.trim() || null,
        descricao_detalhada: formData.descricao_detalhada.trim() || null,
        descricao_resumida: formData.descricao_resumida.trim() || null,
        subcategoria_id: parseInt(formData.subcategoria_id),
        tipo_unidade_indicador: parseInt(formData.tipo_unidade_indicador),
        prazo_entrega_inicial: formData.prazo_entrega_inicial || null,
        recorrencia: formData.recorrencia,
        tempo_recorrencia: formData.recorrencia !== 'sem recorrencia' ? parseInt(formData.tempo_recorrencia) : null,
        repeticoes: formData.recorrencia !== 'sem recorrencia' ? parseInt(formData.repeticoes) : 0,
        obrigatorio: formData.obrigatorio
      };
      
      // Atualizar o item de controle de indicador
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
            <p><strong>Subcategoria Atual:</strong> {subcategorias[controleItem?.subcategoria_id] || 'N/A'}</p>
            {controleItem?.created_at && (
              <p><strong>Criado em:</strong> {formatDate(controleItem.created_at)}</p>
            )}
          </div>
          
          {/* Informações sobre linhas criadas */}
          <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100">
            <h4 className="font-medium text-blue-800 mb-1">Linhas Relacionadas</h4>
            <p className="text-sm text-blue-700">
              Este indicador possui linhas automaticamente geradas na tabela de controle geral.
              Alterar a configuração de recorrência pode afetar a quantidade de linhas futuras.
            </p>
          </div>
        </div>
        
        <form className="space-y-4">
          {/* Primeira linha: Projeto e Categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Projeto */}
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
            
            {/* Categoria */}
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
          
          {/* Segunda linha: Subcategoria e Tipo de Unidade do Indicador */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subcategoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategoria <span className="text-red-500">*</span>
              </label>
              <select
                name="subcategoria_id"
                value={formData.subcategoria_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione uma subcategoria</option>
                {Object.entries(subcategorias).map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Tipo de Unidade do Indicador */}
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
          
          {/* Prazo inicial */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prazo Inicial <span className="text-gray-400 text-xs">(opcional)</span>
            </label>
            <input
              type="date"
              name="prazo_entrega_inicial"
              value={formData.prazo_entrega_inicial}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Recorrência */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recorrência <span className="text-red-500">*</span>
            </label>
            <select
              name="recorrencia"
              value={formData.recorrencia}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="sem recorrencia">Sem recorrência</option>
              <option value="dia">Dia</option>
              <option value="mês">Mês</option>
              <option value="ano">Ano</option>
            </select>
          </div>
          
          {/* Tempo de Recorrência - apenas se a recorrência não for "sem recorrencia" */}
          {formData.recorrencia !== 'sem recorrencia' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tempo de Recorrência <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                name="tempo_recorrencia"
                value={formData.tempo_recorrencia}
                onChange={(e) => {
                  // Permitir apenas números ou campo vazio
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    handleInputChange(e);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 1"
                required={formData.recorrencia !== 'sem recorrencia'}
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.recorrencia === 'dia' && 'A cada quantos dias o item se repete'}
                {formData.recorrencia === 'mês' && 'A cada quantos meses o item se repete'}
                {formData.recorrencia === 'ano' && 'A cada quantos anos o item se repete'}
              </p>
            </div>
          )}
          
          {/* Número de Repetições - apenas se a recorrência não for "sem recorrencia" */}
          {formData.recorrencia !== 'sem recorrencia' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Repetições <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                name="repeticoes"
                value={formData.repeticoes}
                onChange={(e) => {
                  // Permitir apenas números ou campo vazio
                  const value = e.target.value;
                  if (value === '' || /^\d+$/.test(value)) {
                    handleInputChange(e);
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: 3"
                required={formData.recorrencia !== 'sem recorrencia'}
              />
              <p className="text-sm text-gray-500 mt-1">
                Quantas vezes este item deve se repetir (além da linha base)
              </p>
            </div>
          )}
          
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
          
          {/* Aviso sobre alterações */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-center">
              <FiCalendar className="h-5 w-5 text-yellow-600 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-yellow-900">Atenção</h4>
                <p className="text-sm text-yellow-700">
                  Alterar a configuração de recorrência pode impactar as linhas já geradas na tabela de controle geral.
                  Linhas já criadas não serão automaticamente removidas ou adicionadas.
                </p>
              </div>
            </div>
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