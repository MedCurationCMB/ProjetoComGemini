import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiChevronRight, FiX, FiPlus } from 'react-icons/fi';

const AddConteudoDialog = ({ onClose, onSuccess }) => {
  // Estados para controle de fluxo
  const [step, setStep] = useState(1); // 1: Pergunta de recorrência, 2: Formulário
  const [isRecorrente, setIsRecorrente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Estados para dados
  const [controleItens, setControleItens] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [repeticoes, setRepeticoes] = useState(1);
  const [projetos, setProjetos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [projetoId, setProjetoId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [obrigatorio, setObrigatorio] = useState(false);
  
  // Carregar dados necessários ao iniciar
  useEffect(() => {
    if (isRecorrente === true) {
      fetchControleItems();
    } else if (isRecorrente === false) {
      fetchProjetos();
      fetchCategorias();
    }
  }, [isRecorrente]);
  
  // Buscar itens da tabela controle_conteudo
  const fetchControleItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('controle_conteudo')
        .select('id, descricao, projeto_id, categoria_id, prazo_entrega_inicial, recorrencia, tempo_recorrencia, obrigatorio')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      // Buscar informações adicionais dos projetos e categorias para exibir ao usuário
      const projetosData = await supabase.from('projetos').select('id, nome');
      const categoriasData = await supabase.from('categorias').select('id, nome');
      
      const projetosMap = {};
      const categoriasMap = {};
      
      if (projetosData.data) {
        projetosData.data.forEach(p => (projetosMap[p.id] = p.nome));
      }
      
      if (categoriasData.data) {
        categoriasData.data.forEach(c => (categoriasMap[c.id] = c.nome));
      }
      
      // Adicionar nomes aos itens para facilitar visualização
      const itemsWithDetails = data.map(item => ({
        ...item,
        projeto_nome: projetosMap[item.projeto_id] || 'Projeto desconhecido',
        categoria_nome: categoriasMap[item.categoria_id] || 'Categoria desconhecida'
      }));
      
      setControleItens(itemsWithDetails);
    } catch (error) {
      console.error('Erro ao carregar itens de controle:', error);
      toast.error('Erro ao carregar itens de referência');
    } finally {
      setLoading(false);
    }
  };
  
  // Buscar projetos
  const fetchProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      
      setProjetos(data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      toast.error('Erro ao carregar lista de projetos');
    }
  };
  
  // Buscar categorias
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      
      setCategorias(data || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar lista de categorias');
    }
  };
  
  // Formatador de data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
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
  
  // Converter data para formato ISO que o banco aceita
  const formatDateForDB = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  };
  
  // Avançar para o próximo passo do formulário
  const handleNext = () => {
    if (isRecorrente === null) {
      toast.error('Por favor, selecione uma opção');
      return;
    }
    
    setStep(2);
  };
  
  // Processar recorrência baseada em um item existente
  const handleProcessarRecorrencia = async () => {
    if (!selectedItemId) {
      toast.error('Por favor, selecione um item de controle');
      return;
    }
    
    if (repeticoes < 1) {
      toast.error('O número de repetições deve ser pelo menos 1');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Buscar o item selecionado
      const { data: itemData, error: itemError } = await supabase
        .from('controle_conteudo')
        .select('*')
        .eq('id', selectedItemId)
        .single();
      
      if (itemError) throw itemError;
      
      // Buscar o último item da tabela controle_conteudo_geral com o mesmo id_controleconteudo
      const { data: lastItems, error: lastItemError } = await supabase
        .from('controle_conteudo_geral')
        .select('*')
        .eq('id_controleconteudo', selectedItemId)
        .order('prazo_entrega', { ascending: false })
        .limit(1);
      
      if (lastItemError) throw lastItemError;
      
      // Definir a data de início para as novas entradas
      let lastDate;
      
      if (lastItems && lastItems.length > 0) {
        // Usar o último prazo existente
        lastDate = new Date(lastItems[0].prazo_entrega);
      } else {
        // Se não houver entradas anteriores, usar a data inicial do item de controle
        lastDate = new Date(itemData.prazo_entrega_inicial);
      }
      
      // Criar as novas entradas
      const newEntries = [];
      
      for (let i = 0; i < repeticoes; i++) {
        // Calcular a próxima data com base na recorrência
        let nextDate = new Date(lastDate);
        
        if (itemData.recorrencia === 'dia') {
          nextDate.setDate(nextDate.getDate() + (itemData.tempo_recorrencia || 1));
        } else if (itemData.recorrencia === 'mês') {
          nextDate.setMonth(nextDate.getMonth() + (itemData.tempo_recorrencia || 1));
        } else if (itemData.recorrencia === 'ano') {
          nextDate.setFullYear(nextDate.getFullYear() + (itemData.tempo_recorrencia || 1));
        }
        
        // Criar a nova entrada
        newEntries.push({
          projeto_id: itemData.projeto_id,
          categoria_id: itemData.categoria_id,
          descricao: itemData.descricao,
          prazo_entrega_inicial: formatDateForDB(nextDate),
          prazo_entrega: formatDateForDB(nextDate),
          recorrencia: itemData.recorrencia,
          tempo_recorrencia: itemData.tempo_recorrencia,
          obrigatorio: itemData.obrigatorio,
          tem_documento: false,
          id_controleconteudo: selectedItemId
        });
        
        // Atualizar a última data para a próxima iteração
        lastDate = nextDate;
      }
      
      // Inserir as novas entradas no banco
      const { data: insertData, error: insertError } = await supabase
        .from('controle_conteudo_geral')
        .insert(newEntries);
      
      if (insertError) throw insertError;
      
      toast.success(`${repeticoes} nova(s) linha(s) de conteúdo adicionada(s) com sucesso!`);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao processar recorrência:', error);
      toast.error('Erro ao adicionar linhas de conteúdo');
    } finally {
      setSubmitting(false);
      onClose();
    }
  };
  
  // Adicionar um novo item sem recorrência
  const handleAddNovoItem = async () => {
    if (!projetoId) {
      toast.error('Por favor, selecione um projeto');
      return;
    }
    
    if (!categoriaId) {
      toast.error('Por favor, selecione uma categoria');
      return;
    }
    
    if (!prazoEntrega) {
      toast.error('Por favor, defina um prazo de entrega');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Criar o novo item para a tabela controle_conteudo
      const newControleItem = {
        projeto_id: projetoId,
        categoria_id: categoriaId,
        descricao: descricao || null,
        prazo_entrega_inicial: formatDateForDB(prazoEntrega),
        recorrencia: 'sem recorrencia',
        tempo_recorrencia: null,
        obrigatorio,
        tem_documento: false
      };
      
      // Inserir na tabela controle_conteudo
      const { data: insertedItem, error: insertError } = await supabase
        .from('controle_conteudo')
        .insert(newControleItem)
        .select();
      
      if (insertError) throw insertError;
      
      // Criar entrada correspondente na tabela controle_conteudo_geral
      const newGeralItem = {
        projeto_id: projetoId,
        categoria_id: categoriaId,
        descricao: descricao || null,
        prazo_entrega_inicial: formatDateForDB(prazoEntrega),
        prazo_entrega: formatDateForDB(prazoEntrega),
        recorrencia: 'sem recorrencia',
        tempo_recorrencia: null,
        obrigatorio,
        tem_documento: false,
        id_controleconteudo: insertedItem[0].id
      };
      
      // Inserir na tabela controle_conteudo_geral
      const { error: insertGeralError } = await supabase
        .from('controle_conteudo_geral')
        .insert(newGeralItem);
      
      if (insertGeralError) throw insertGeralError;
      
      toast.success('Nova linha de conteúdo adicionada com sucesso!');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao adicionar novo item:', error);
      toast.error('Erro ao adicionar linha de conteúdo');
    } finally {
      setSubmitting(false);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Adicionar Linha de Conteúdo</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">A nova linha de conteúdo é recorrente?</h3>
              <div className="flex space-x-4">
                <button
                  onClick={() => setIsRecorrente(true)}
                  className={`flex-1 py-3 px-4 rounded-lg border ${
                    isRecorrente === true 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Sim
                </button>
                <button
                  onClick={() => setIsRecorrente(false)}
                  className={`flex-1 py-3 px-4 rounded-lg border ${
                    isRecorrente === false 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Não
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {isRecorrente === true 
                  ? 'Você poderá selecionar um item existente e criar repetições baseadas nele.'
                  : isRecorrente === false 
                    ? 'Você precisará preencher todos os campos manualmente para criar um novo item.'
                    : 'Selecione uma opção para continuar.'}
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleNext}
                disabled={isRecorrente === null}
                className={`px-4 py-2 rounded flex items-center ${
                  isRecorrente === null
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Continuar
                <FiChevronRight className="ml-2" />
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && isRecorrente === true && (
          <div className="space-y-6">
            <div>
              <label htmlFor="itemId" className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o Item Base
              </label>
              
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span>Carregando itens...</span>
                </div>
              ) : (
                <select
                  id="itemId"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">Selecione um item</option>
                  {controleItens.map((item) => (
                    <option key={item.id} value={item.id}>
                      ID: {item.id} - {item.projeto_nome} - {item.categoria_nome} - {item.descricao}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            {selectedItemId && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Detalhes do Item Selecionado</h4>
                {controleItens
                  .filter(item => item.id.toString() === selectedItemId.toString())
                  .map(item => (
                    <div key={item.id} className="space-y-1 text-sm">
                      <p><strong>Projeto:</strong> {item.projeto_nome}</p>
                      <p><strong>Categoria:</strong> {item.categoria_nome}</p>
                      <p><strong>Descrição:</strong> {item.descricao || 'Sem descrição'}</p>
                      <p><strong>Prazo inicial:</strong> {formatDate(item.prazo_entrega_inicial)}</p>
                      <p><strong>Recorrência:</strong> {item.recorrencia} {item.tempo_recorrencia ? `(${item.tempo_recorrencia})` : ''}</p>
                      <p><strong>Obrigatório:</strong> {item.obrigatorio ? 'Sim' : 'Não'}</p>
                    </div>
                  ))}
              </div>
            )}
            
            <div>
              <label htmlFor="repeticoes" className="block text-sm font-medium text-gray-700 mb-2">
                Número de Repetições
              </label>
              <input
                id="repeticoes"
                type="number"
                min="1"
                value={repeticoes}
                onChange={(e) => setRepeticoes(parseInt(e.target.value) || 1)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleProcessarRecorrencia}
                disabled={!selectedItemId || repeticoes < 1 || submitting}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
                  !selectedItemId || repeticoes < 1 || submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting ? 'Processando...' : 'Adicionar Linhas'}
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && isRecorrente === false && (
          <div className="space-y-6">
            <div>
              <label htmlFor="projeto" className="block text-sm font-medium text-gray-700 mb-2">
                Projeto
              </label>
              <select
                id="projeto"
                value={projetoId}
                onChange={(e) => setProjetoId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecione um projeto</option>
                {projetos.map((projeto) => (
                  <option key={projeto.id} value={projeto.id}>
                    {projeto.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                id="categoria"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 mb-2">
                Descrição <span className="text-gray-500 text-xs">(opcional)</span>
              </label>
              <input
                id="descricao"
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Descrição do item"
              />
            </div>
            
            <div>
              <label htmlFor="prazoEntrega" className="block text-sm font-medium text-gray-700 mb-2">
                Prazo de Entrega
              </label>
              <input
                id="prazoEntrega"
                type="date"
                value={prazoEntrega}
                onChange={(e) => setPrazoEntrega(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex items-center">
              <input
                id="obrigatorio"
                type="checkbox"
                checked={obrigatorio}
                onChange={(e) => setObrigatorio(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="obrigatorio" className="ml-2 block text-sm text-gray-700">
                Item obrigatório
              </label>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddNovoItem}
                disabled={!projetoId || !categoriaId || !prazoEntrega || submitting}
                className={`px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white ${
                  !projetoId || !categoriaId || !prazoEntrega || submitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {submitting ? 'Processando...' : 'Adicionar Item'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddConteudoDialog;