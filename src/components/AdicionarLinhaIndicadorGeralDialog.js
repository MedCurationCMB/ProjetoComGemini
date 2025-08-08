// src/components/AdicionarLinhaIndicadorGeralDialog.js - COMPLETO COM PARES META/REALIZADO
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiPlus, FiX, FiCheck, FiCalendar, FiDatabase } from 'react-icons/fi';

const AdicionarLinhaIndicadorGeralDialog = ({ 
  onClose, 
  onSuccess, 
  categorias, 
  projetos, 
  tiposIndicador, 
  tiposUnidadeIndicador
}) => {
  const formatarValorIndicador = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    
    const num = parseFloat(valor);
    if (isNaN(num)) return valor;
    
    return num.toLocaleString('pt-BR');
  };

  const router = useRouter();
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
    prazo_entrega_inicial: '',
    descricao_detalhada: '',
    descricao_resumida: '',
    valor_indicador_apresentado: '', 
    tipo_unidade_indicador: '', 
    obrigatorio: false
  });

  // Buscar linhas base recorrentes disponíveis
  useEffect(() => {
    if (isRecorrente === true) {
      fetchLinhasBaseRecorrentes();
    }
  }, [isRecorrente]);

  const handleIrParaControleIndicador = () => {
    onClose(); // Fechar o modal atual
    router.push('/controle-indicador'); // Navegar para a página
  };

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
        // ✅ MODIFICADO: Adicionar linhas recorrentes em PARES (Meta + Realizado)
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
        
        // ✅ MODIFICADO: Calcular as novas datas e criar PARES (Meta + Realizado)
        const novasLinhas = [];
        
        // ✅ NOVO: Buscar IDs dos tipos Meta e Realizado
        const tipoMeta = Object.keys(tiposIndicador).find(id => 
          tiposIndicador[id].toLowerCase().includes('meta')
        );
        const tipoRealizado = Object.keys(tiposIndicador).find(id => 
          tiposIndicador[id].toLowerCase().includes('realizado')
        );

        // Fallback caso não encontre os tipos nos nomes
        const tipoMetaId = tipoMeta ? parseInt(tipoMeta) : 2; // Padrão 2 para Meta
        const tipoRealizadoId = tipoRealizado ? parseInt(tipoRealizado) : 1; // Padrão 1 para Realizado
        
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
          
          const dataFormatada = novaPrazoEntrega.toISOString().split('T')[0];
          
          // ✅ NOVO: Criar linha META
          novasLinhas.push({
            id_controleindicador: linhaBaseId,
            projeto_id: linhaBase.projeto_id,
            categoria_id: linhaBase.categoria_id,
            indicador: linhaBase.indicador,
            observacao: linhaBase.observacao,
            tipo_indicador: tipoMetaId, // Tipo Meta
            prazo_entrega_inicial: linhaBase.prazo_entrega_inicial,
            prazo_entrega: dataFormatada,
            recorrencia: linhaBase.recorrencia,
            tempo_recorrencia: linhaBase.tempo_recorrencia,
            obrigatorio: linhaBase.obrigatorio,
            visivel: true,
            valor_indicador_apresentado: null,
            tipo_unidade_indicador: linhaBase.tipo_unidade_indicador, // ✅ COPIAR da linha base
            valor_indicador: null,
            descricao_detalhada: linhaBase.descricao_detalhada || null,
            descricao_resumida: linhaBase.descricao_resumida || null
          });
          
          // ✅ NOVO: Criar linha REALIZADO
          novasLinhas.push({
            id_controleindicador: linhaBaseId,
            projeto_id: linhaBase.projeto_id,
            categoria_id: linhaBase.categoria_id,
            indicador: linhaBase.indicador,
            observacao: linhaBase.observacao,
            tipo_indicador: tipoRealizadoId, // Tipo Realizado
            prazo_entrega_inicial: linhaBase.prazo_entrega_inicial,
            prazo_entrega: dataFormatada,
            recorrencia: linhaBase.recorrencia,
            tempo_recorrencia: linhaBase.tempo_recorrencia,
            obrigatorio: linhaBase.obrigatorio,
            visivel: true,
            valor_indicador_apresentado: null,
            tipo_unidade_indicador: linhaBase.tipo_unidade_indicador, // ✅ COPIAR da linha base
            valor_indicador: null,
            descricao_detalhada: linhaBase.descricao_detalhada || null,
            descricao_resumida: linhaBase.descricao_resumida || null
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
        
        // ✅ MODIFICADO: Mensagem mais clara sobre pares criados
        const totalLinhas = novasLinhasInseridas.length;
        const pares = totalLinhas / 2;
        toast.success(`${totalLinhas} novas linhas adicionadas com sucesso! (${pares} pares de Meta + Realizado)`);
        
      } else {
        // Adicionar uma nova linha não recorrente na tabela controle_indicador (BASE)
        if (!novaLinha.projeto_id || !novaLinha.categoria_id || !novaLinha.indicador || !novaLinha.tipo_indicador) {
          toast.error('Por favor, preencha todos os campos obrigatórios');
          setLoading(false);
          return;
        }
        
        const dadosInsercao = {
          projeto_id: novaLinha.projeto_id,
          categoria_id: novaLinha.categoria_id,
          indicador: novaLinha.indicador.trim(),
          observacao: novaLinha.observacao.trim() || null,
          tipo_indicador: parseInt(novaLinha.tipo_indicador),
          prazo_entrega_inicial: novaLinha.prazo_entrega_inicial || null,
          descricao_detalhada: novaLinha.descricao_detalhada.trim() || null,
          descricao_resumida: novaLinha.descricao_resumida.trim() || null,
          recorrencia: 'sem recorrencia',
          tempo_recorrencia: null,
          repeticoes: 0,
          obrigatorio: novaLinha.obrigatorio,
          tem_documento: false
        };

        // Adicionar valor_indicador_apresentado se preenchido
        if (novaLinha.valor_indicador_apresentado && novaLinha.valor_indicador_apresentado !== '') {
          const valorNumerico = parseFloat(novaLinha.valor_indicador_apresentado);
          if (!isNaN(valorNumerico)) {
            dadosInsercao.valor_indicador_apresentado = valorNumerico;
          }
        }

        // Adicionar tipo_unidade_indicador se selecionado
        if (novaLinha.tipo_unidade_indicador && novaLinha.tipo_unidade_indicador !== '') {
          dadosInsercao.tipo_unidade_indicador = parseInt(novaLinha.tipo_unidade_indicador);
        }
        
        // Inserir na tabela controle_indicador (BASE)
        const { data, error } = await supabase
          .from('controle_indicador')
          .insert([dadosInsercao])
          .select();
          
        if (error) throw error;
        
        toast.success('Nova linha de indicador adicionada com sucesso!');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Adicionar Linha de Indicador</h2>
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

            {isRecorrente === true && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FiDatabase className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-2">Precisa criar uma linha base primeiro?</h4>
                    <p className="text-sm text-blue-700 mb-3">
                      Para adicionar linhas recorrentes, você precisa ter uma linha base configurada. 
                      Se ainda não criou, use o botão abaixo para ir à página de controle.
                    </p>
                    <button
                      onClick={handleIrParaControleIndicador}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <FiDatabase className="mr-2 h-4 w-4" />
                      Criar Linha Base
                    </button>
                  </div>
                </div>
              </div>
            )}
            
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
              // ✅ MODIFICADO: Formulário para linhas recorrentes com explicação sobre pares
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
                    placeholder="Ex: 3"
                  />
                  {/* ✅ NOVA: Explicação sobre pares Meta + Realizado */}
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-700">
                      <strong>📊 Criação em Pares:</strong> Para cada repetição, serão criadas <strong>2 linhas</strong> com a mesma data:
                    </p>
                    <ul className="text-sm text-green-700 mt-1 space-y-1">
                      <li>• 1 linha tipo <strong>Meta</strong></li>
                      <li>• 1 linha tipo <strong>Realizado</strong></li>
                    </ul>
                    {numRepeticoes && parseInt(numRepeticoes) > 0 && (
                      <p className="text-sm text-green-800 mt-2 font-medium">
                        🎯 Com {numRepeticoes} repetição(ões), serão criadas <strong>{parseInt(numRepeticoes) * 2} linhas</strong> no total
                      </p>
                    )}
                    <p className="text-xs text-green-600 mt-2">
                      💡 A unidade do indicador da linha base será copiada para ambas as linhas
                    </p>
                  </div>
                </div>
              </>
            ) : (
              // Formulário para novas linhas não recorrentes
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Projeto <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="projeto_id"
                    value={novaLinha.projeto_id}
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
                    value={novaLinha.categoria_id}
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Indicador <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="indicador"
                    value={novaLinha.indicador}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite o nome do indicador"
                    required
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Digite observações sobre o indicador"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição Detalhada <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <textarea
                    name="descricao_detalhada"
                    value={novaLinha.descricao_detalhada}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="4"
                    placeholder="Digite uma descrição detalhada do indicador, sua finalidade e metodologia"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição Resumida <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <textarea
                    name="descricao_resumida"
                    value={novaLinha.descricao_resumida}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder="Digite uma descrição resumida do indicador"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Indicador <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="tipo_indicador"
                    value={novaLinha.tipo_indicador}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                
                {/* Valor Apresentado */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Apresentado <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    name="valor_indicador_apresentado"
                    value={novaLinha.valor_indicador_apresentado}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Digite o valor do indicador (ex: 15.75)"
                  />
                  {/* Preview formatado */}
                  {novaLinha.valor_indicador_apresentado && (
                    <p className="mt-1 text-xs text-gray-500">
                      <strong>Preview:</strong> {formatarValorIndicador(novaLinha.valor_indicador_apresentado)}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Valor numérico que será apresentado para este indicador.
                  </p>
                </div>

                {/* Unidade do Indicador */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade do Indicador <span className="text-gray-400 text-xs">(opcional)</span>
                  </label>
                  <select
                    name="tipo_unidade_indicador"
                    value={novaLinha.tipo_unidade_indicador}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma unidade</option>
                    {Object.entries(tiposUnidadeIndicador).map(([id, nome]) => (
                      <option key={id} value={id}>
                        {nome}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Unidade de medida para este indicador (ex: %, R$, unidades).
                  </p>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>
            )}
            
            {/* Rodapé com botões */}
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