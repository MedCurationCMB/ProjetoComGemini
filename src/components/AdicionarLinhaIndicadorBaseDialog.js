// src/components/AdicionarLinhaIndicadorBaseDialog.js - Versão Atualizada com Novos Campos
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck } from 'react-icons/fi';

const AdicionarLinhaIndicadorBaseDialog = ({ 
  onClose, 
  onSuccess, 
  categorias, 
  projetos, 
  subcategorias 
}) => {
  // Estado inicial do formulário - REMOVIDO tipo_indicador + ADICIONADOS novos campos
  const [formData, setFormData] = useState({
    projeto_id: '',
    categoria_id: '',
    indicador: '',
    observacao: '',
    descricao_detalhada: '',
    descricao_resumida: '',
    subcategoria_id: '',
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
      
      // Validar campos obrigatórios - REMOVIDO tipo_indicador da validação
      if (!formData.projeto_id || !formData.categoria_id || !formData.indicador || !formData.subcategoria_id) {
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
      
      // Preparar dados para inserção - REMOVIDO tipo_indicador + ADICIONADOS novos campos
      const dadosInsercao = {
        projeto_id: formData.projeto_id,
        categoria_id: formData.categoria_id,
        indicador: formData.indicador.trim(),
        observacao: formData.observacao.trim() || null,
        descricao_detalhada: formData.descricao_detalhada.trim() || null,
        descricao_resumida: formData.descricao_resumida.trim() || null,
        // tipo_indicador: REMOVIDO - será definido automaticamente pela função
        subcategoria_id: parseInt(formData.subcategoria_id),
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
      
      // Calcular quantas linhas serão criadas para informar o usuário
      let totalLinhasEsperadas;
      if (formData.recorrencia === 'sem recorrencia' || !formData.repeticoes || parseInt(formData.repeticoes) <= 0) {
        totalLinhasEsperadas = 2; // 1 linha base × 2 (Meta + Realizado)
      } else {
        const repeticoes = parseInt(formData.repeticoes);
        totalLinhasEsperadas = (1 + repeticoes) * 2; // (linha base + repetições) × 2
      }
      
      toast.success(`Linha de indicador adicionada com sucesso! Foram criadas ${totalLinhasEsperadas} linhas automaticamente (Meta + Realizado).`);
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* ✅ ADICIONADO: Container com max-height e overflow para rolagem */}
      <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Criar Linha Base de Indicador</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {/* Informação sobre a criação automática */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <FiCheck className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Criação Automática Meta/Realizado</h3>
              <p className="text-sm text-blue-700 mt-1">
                Para cada período configurado, o sistema criará automaticamente duas linhas: 
                uma para <strong>Meta</strong> e outra para <strong>Realizado</strong>.
              </p>
              <p className="text-sm text-blue-600 mt-1">
                {formData.recorrencia === 'sem recorrencia' || !formData.repeticoes || parseInt(formData.repeticoes) <= 0
                  ? 'Será criada 1 linha base → 2 linhas finais (1 Meta + 1 Realizado)'
                  : `Serão criadas ${1 + (parseInt(formData.repeticoes) || 0)} linhas → ${(1 + (parseInt(formData.repeticoes) || 0)) * 2} linhas finais`
                }
              </p>
            </div>
          </div>
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
          
          {/* ✅ NOVOS CAMPOS: Descrição Detalhada */}
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
          
          {/* ✅ NOVOS CAMPOS: Descrição Resumida */}
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
          
          {/* REMOVIDO: Tipo de Indicador - agora é automático */}
          
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
          
          {/* ✅ BOTÕES: Rodapé normal (sem sticky) */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 rounded-md ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Processando...' : 'Criar Linha Base'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarLinhaIndicadorBaseDialog;