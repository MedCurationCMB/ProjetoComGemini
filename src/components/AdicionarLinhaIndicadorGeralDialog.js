import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiPlus, FiX, FiCheck, FiCalendar } from 'react-icons/fi';

const AdicionarLinhaIndicadorGeralDialog = ({ onClose, onSuccess, categorias, projetos, tiposIndicador, subcategorias }) => {
  const [step, setStep] = useState(1); // 1: escolha recorrente, 2: formulário
  const [isRecorrente, setIsRecorrente] = useState(null);
  const [linhasBase, setLinhasBase] = useState([]);
  const [linhaBaseId, setLinhaBaseId] = useState('');
  const [numRepeticoes, setNumRepeticoes] = useState('1');
  const [loading, setLoading] = useState(false);
  const [loadingLinhasBase, setLoadingLinhasBase] = useState(false);
  
  // Campos para formulário não recorrente
  const [novaLinha, setNovaLinha] = useState({
    projeto_id: '',
    categoria_id: '',
    indicador: '',
    observacao: '',
    tipo_indicador: '',
    subcategoria_id: '',
    prazo_entrega_inicial: '',
    obrigatorio: false
  });

  // Buscar linhas base recorrentes disponíveis
  useEffect(() => {
    if (isRecorrente === true) {
      fetchLinhasBaseRecorrentes();
    }
  }, [isRecorrente]);

  const fetchLinhasBaseRecorrentes = async () => {
    try {
      setLoadingLinhasBase(true);
      
      // Buscar linhas de controle_indicador com recorrência diferente de "sem recorrencia"
      const { data, error } = await supabase
        .from('controle_indicador')
        .select('*')
        .not('recorrencia', 'eq', 'sem recorrencia')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      setLinhasBase(data || []);
    } catch (error) {
      console.error('Erro ao carregar linhas base:', error);
      toast.error('Erro ao carregar linhas base recorrentes');
    } finally {
      setLoadingLinhasBase(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNovaLinha(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleConfirmChoice = () => {
    if (isRecorrente === null) {
      toast.error('Por favor, escolha se deseja adicionar uma linha recorrente ou não');
      return;
    }
    
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      if (isRecorrente) {
        // Adicionar linhas recorrentes
        if (!linhaBaseId) {
          toast.error('Por favor, selecione uma linha base');
          setLoading(false);
          return;
        }
        
        // Verificar número de repetições
        if (!numRepeticoes || numRepeticoes === '' || parseInt(numRepeticoes) < 1) {
          toast.error('Por favor, informe um número válido de repetições');
          setLoading(false);
          return;
        }
        
        // Converter para número inteiro
        const repeticoesValue = parseInt(numRepeticoes);
        
        // 1. Buscar a linha base selecionada
        const { data: linhaBase, error: linhaBaseError } = await supabase
          .from('controle_indicador')
          .select('*')
          .eq('id', linhaBaseId)
          .single();
          
        if (linhaBaseError) throw linhaBaseError;
        
        // 2. Buscar a última linha com este Base ID (para continuar a partir dela)
        const { data: ultimaLinha, error: ultimaLinhaError } = await supabase
          .from('controle_indicador_geral')
          .select('*')
          .eq('id_controleindicador', linhaBaseId)
          .order('prazo_entrega', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (ultimaLinhaError) throw ultimaLinhaError;
        
        // Determinar a data de início para as novas repetições
        let ultimoDataPrazo;
        
        if (ultimaLinha && ultimaLinha.prazo_entrega) {
          // Se existe uma última linha, usar a data dela
          ultimoDataPrazo = new Date(ultimaLinha.prazo_entrega);
        } else {
          // Se não existe última linha, usar a data inicial da linha base
          ultimoDataPrazo = new Date(linhaBase.prazo_entrega_inicial);
        }
        
        // 3. Calcular as novas datas com base na recorrência
        const novasLinhas = [];
        
        for (let i = 0; i < repeticoesValue; i++) {
          // Calcular próxima data com base na recorrência
          let novaPrazoEntrega = new Date(ultimoDataPrazo);
          
          if (linhaBase.recorrencia === 'dia') {
            novaPrazoEntrega.setDate(novaPrazoEntrega.getDate() + (linhaBase.tempo_recorrencia || 1));
          } else if (linhaBase.recorrencia === 'mês') {
            novaPrazoEntrega.setMonth(novaPrazoEntrega.getMonth() + (linhaBase.tempo_recorrencia || 1));
          } else if (linhaBase.recorrencia === 'ano') {
            novaPrazoEntrega.setFullYear(novaPrazoEntrega.getFullYear() + (linhaBase.tempo_recorrencia || 1));
          }
          
          // Criar registro para a nova linha
          novasLinhas.push({
            id_controleindicador: linhaBaseId,
            projeto_id: linhaBase.projeto_id,
            categoria_id: linhaBase.categoria_id,
            indicador: linhaBase.indicador,
            observacao: linhaBase.observacao,
            tipo_indicador: linhaBase.tipo_indicador,
            subcategoria_id: linhaBase.subcategoria_id,
            prazo_entrega_inicial: linhaBase.prazo_entrega_inicial,
            prazo_entrega: novaPrazoEntrega.toISOString().split('T')[0],
            recorrencia: linhaBase.recorrencia,
            tempo_recorrencia: linhaBase.tempo_recorrencia,
            obrigatorio: linhaBase.obrigatorio,
            visivel: true
          });
          
          // Atualizar a data para a próxima iteração
          ultimoDataPrazo = novaPrazoEntrega;
        }
        
        // 4. Inserir novas linhas no banco de dados
        const { data: novasLinhasInseridas, error: inserirError } = await supabase
          .from('controle_indicador_geral')
          .insert(novasLinhas)
          .select();
          
        if (inserirError) throw inserirError;
        
        toast.success(`${novasLinhasInseridas.length} novas linhas adicionadas com sucesso!`);
        
      } else {
        // Adicionar uma nova linha não recorrente
        // Validar campos obrigatórios
        if (!novaLinha.projeto_id || !novaLinha.categoria_id || !novaLinha.indicador || !novaLinha.tipo_indicador || !novaLinha.subcategoria_id) {
          toast.error('Por favor, preencha todos os campos obrigatórios');
          setLoading(false);
          return;
        }
        
        // Preparar dados para inserção na tabela controle_indicador_geral
        const dadosInsercao = {
          projeto_id: novaLinha.projeto_id,
          categoria_id: novaLinha.categoria_id,
          indicador: novaLinha.indicador,
          observacao: novaLinha.observacao || null,
          tipo_indicador: parseInt(novaLinha.tipo_indicador),
          subcategoria_id: parseInt(novaLinha.subcategoria_id),
          prazo_entrega_inicial: novaLinha.prazo_entrega_inicial || null,
          prazo_entrega: novaLinha.prazo_entrega_inicial || null,
          recorrencia: 'sem recorrencia',
          tempo_recorrencia: null,
          obrigatorio: novaLinha.obrigatorio,
          visivel: true
        };
        
        // Inserir na tabela controle_indicador_geral
        const { data, error } = await supabase
          .from('controle_indicador_geral')
          .insert([dadosInsercao])
          .select();
          
        if (error) throw error;
        
        toast.success('Nova linha de indicador geral adicionada com sucesso!');
      }
      
      // Fechar diálogo e atualizar tabela
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Erro ao adicionar linha de indicador geral:', error);
      toast.error(error.message || 'Erro ao adicionar linha de indicador geral');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Adicionar Linha de Indicador Geral</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {step === 1 ? (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Esta será uma linha recorrente?</h3>
            
            <div className="flex space-x-4">
              <button
                className={`flex-1 py-3 px-4 rounded-md ${
                  isRecorrente === true 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setIsRecorrente(true)}
              >
                <div className="flex justify-center items-center">
                  <FiCheck className="mr-2" />
                  Sim
                </div>
              </button>
              
              <button
                className={`flex-1 py-3 px-4 rounded-md ${
                  isRecorrente === false 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setIsRecorrente(false)}
              >
                <div className="flex justify-center items-center">
                  <FiX className="mr-2" />
                  Não
                </div>
              </button>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleConfirmChoice}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md"
              >
                Continuar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {isRecorrente ? (
              // Formulário para linhas recorrentes
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selecione a Linha Base
                  </label>
                  {loadingLinhasBase ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <div className="mr-2 h-4 w-4 border-t-2 border-b-2 border-gray-500 rounded-full animate-spin"></div>
                      Carregando linhas disponíveis...
                    </div>
                  ) : (
                    <select
                      value={linhaBaseId}
                      onChange={(e) => setLinhaBaseId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecione uma linha base</option>
                      {linhasBase.map((linha) => (
                        <option key={linha.id} value={linha.id}>
                          ID {linha.id} - {projetos[linha.projeto_id] || 'Projeto'} - {linha.indicador} ({linha.recorrencia})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Repetições
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={numRepeticoes}
                    onChange={(e) => {
                      // Permite campo vazio ou apenas números
                      const value = e.target.value;
                      if (value === '' || /^\d+$/.test(value)) {
                        setNumRepeticoes(value);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </>
            ) : (
              // Formulário para novas linhas não recorrentes
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projeto
                  </label>
                  <select
                    name="projeto_id"
                    value={novaLinha.projeto_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                    Categoria
                  </label>
                  <select
                    name="categoria_id"
                    value={novaLinha.categoria_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="">Selecione uma categoria</option>
                    {Object.entries(categorias).map(([id, nome]) => (
                      <option key={id} value={id}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indicador <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="indicador"
                    value={novaLinha.indicador}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Digite o nome do indicador"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observação <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <textarea
                    name="observacao"
                    value={novaLinha.observacao}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows="2"
                    placeholder="Digite observações sobre o indicador"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Indicador <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="tipo_indicador"
                      value={novaLinha.tipo_indicador}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="">Selecione um tipo</option>
                      {Object.entries(tiposIndicador).map(([id, nome]) => (
                        <option key={id} value={id}>
                          {nome}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subcategoria <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="subcategoria_id"
                      value={novaLinha.subcategoria_id}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prazo Inicial <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="date"
                    name="prazo_entrega_inicial"
                    value={novaLinha.prazo_entrega_inicial}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="obrigatorio"
                    name="obrigatorio"
                    checked={novaLinha.obrigatorio}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="obrigatorio" className="ml-2 block text-sm text-gray-700">
                    Obrigatório
                  </label>
                </div>
              </>
            )}
            
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              
              <button
                onClick={handleSubmit}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default AdicionarLinhaIndicadorGeralDialog;