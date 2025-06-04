// src/components/AdicionarLinhaIndicadorBaseDialog.js
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck } from 'react-icons/fi';

const AdicionarLinhaIndicadorBaseDialog = ({ 
  onClose, 
  onSuccess, 
  categorias, 
  projetos, 
  tiposIndicador, 
  subcategorias 
}) => {
  // Estado inicial do formulário
  const [formData, setFormData] = useState({
    projeto_id: '',
    categoria_id: '',
    indicador: '',
    observacao: '',
    tipo_indicador: '',
    subcategoria_id: '',
    valor_indicador_apresentado: '',
    tipo_unidade_indicador: '1', // padrão: porcentagem
    periodo_referencia: '',
    prazo_entrega_inicial: '',
    recorrencia: 'sem recorrencia',
    tempo_recorrencia: '',
    repeticoes: '',
    obrigatorio: false
  });
  
  const [loading, setLoading] = useState(false);

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

  // Validação e submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validar campos obrigatórios
      if (!formData.projeto_id || !formData.categoria_id || !formData.indicador || !formData.tipo_indicador || !formData.subcategoria_id) {
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
      
      // Preparar dados para inserção
      const dadosInsercao = {
        projeto_id: formData.projeto_id,
        categoria_id: formData.categoria_id,
        indicador: formData.indicador.trim(),
        observacao: formData.observacao.trim() || null,
        tipo_indicador: parseInt(formData.tipo_indicador),
        subcategoria_id: parseInt(formData.subcategoria_id),
        valor_indicador_apresentado: formData.valor_indicador_apresentado ? parseFloat(formData.valor_indicador_apresentado) : null,
        tipo_unidade_indicador: parseInt(formData.tipo_unidade_indicador),
        periodo_referencia: formData.periodo_referencia || null,
        prazo_entrega_inicial: formData.prazo_entrega_inicial || null,
        recorrencia: formData.recorrencia,
        tempo_recorrencia: formData.recorrencia !== 'sem recorrencia' ? parseInt(formData.tempo_recorrencia) : null,
        repeticoes: formData.recorrencia !== 'sem recorrencia' ? parseInt(formData.repeticoes) : 0,
        obrigatorio: formData.obrigatorio,
        tem_documento: false // sempre começa como false
      };
      
      // Inserir na tabela controle_indicador
      const { data, error } = await supabase
        .from('controle_indicador')
        .insert([dadosInsercao])
        .select();
      
      if (error) throw error;
      
      toast.success('Linha de indicador adicionada com sucesso!');
      
      // Chamar a função de sucesso e fechar o diálogo
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Erro ao adicionar linha de indicador:', error);
      toast.error(error.message || 'Erro ao adicionar linha de indicador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Adicionar Linha de Indicador</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Digite o nome do indicador"
              required
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows="3"
              placeholder="Digite observações sobre o indicador"
            />
          </div>
          
          {/* Segunda linha: Tipo de Indicador e Subcategoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Indicador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Indicador <span className="text-red-500">*</span>
              </label>
              <select
                name="tipo_indicador"
                value={formData.tipo_indicador}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">Selecione um tipo</option>
                {Object.entries(tiposIndicador).map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Subcategoria */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategoria <span className="text-red-500">*</span>
              </label>
              <select
                name="subcategoria_id"
                value={formData.subcategoria_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
          </div>
          
          {/* Terceira linha: Valor apresentado e Tipo de unidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valor Indicador Apresentado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor Apresentado <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                name="valor_indicador_apresentado"
                value={formData.valor_indicador_apresentado}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: 75.5"
              />
            </div>
            
            {/* Tipo de Unidade do Indicador */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Unidade
              </label>
              <select
                name="tipo_unidade_indicador"
                value={formData.tipo_unidade_indicador}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="1">Porcentagem</option>
                <option value="2">Decimal</option>
                <option value="3">Inteiro</option>
              </select>
            </div>
          </div>
          
          {/* Quarta linha: Período de referência e Prazo inicial */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Período de Referência */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Período de Referência <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                type="date"
                name="periodo_referencia"
                value={formData.periodo_referencia}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            {/* Prazo Inicial */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prazo Inicial <span className="text-gray-400 text-xs">(opcional)</span>
              </label>
              <input
                type="date"
                name="prazo_entrega_inicial"
                value={formData.prazo_entrega_inicial}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: 3"
                required={formData.recorrencia !== 'sem recorrencia'}
              />
              <p className="text-sm text-gray-500 mt-1">
                Quantas vezes este item deve se repetir
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
          
          {/* Botões */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-md ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Processando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarLinhaIndicadorBaseDialog;