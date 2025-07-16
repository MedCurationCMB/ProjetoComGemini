import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  FiFile, 
  FiUpload, 
  FiCalendar, 
  FiCheck, 
  FiX, 
  FiPlus, 
  FiEdit, 
  FiFolder,
  FiClock,
  FiTag,
  FiBriefcase,
  FiRepeat,
  FiEye,
  FiEyeOff,
  FiInfo
} from 'react-icons/fi';
import AnexarDocumentoDialog from './AnexarDocumentoDialog';
import AdicionarLinhaConteudoDialog from './AdicionarLinhaConteudoDialog';
import EditarLinhaConteudoDialog from './EditarLinhaConteudoDialog';

// Componente do popup de detalhes
const DetalheConteudoPopup = ({ 
  item, 
  onClose, 
  categorias, 
  projetos, 
  onEditClick, 
  onAnexarClick,
  onToggleVisibilidade,
  atualizandoVisibilidade 
}) => {
  if (!item) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const dateWithTime = dateString.includes('T') ? dateString : dateString + 'T00:00:00';
      const date = new Date(dateWithTime);
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Detalhes do Conteúdo</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Informações básicas */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="mt-1 text-sm text-gray-900">{item.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Base ID</label>
                <p className="mt-1 text-sm text-gray-900">{item.id_controleconteudo || '-'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Projeto</label>
                <p className="mt-1 text-sm text-gray-900">{projetos[item.projeto_id] || 'Projeto indisponível'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <p className="mt-1 text-sm text-gray-900">{categorias[item.categoria_id] || 'Categoria indisponível'}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <p className="mt-1 text-sm text-gray-900">{item.descricao || '-'}</p>
              </div>
            </div>
          </div>

          {/* Datas e prazos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Prazos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo Inicial</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <FiCalendar className="mr-2 text-gray-400" />
                  {formatDate(item.prazo_entrega_inicial)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo Atual</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <FiClock className="mr-2 text-blue-500" />
                  {formatDate(item.prazo_entrega)}
                </div>
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiRepeat className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Recorrência</span>
                </div>
                <span className="text-sm text-gray-900">
                  {item.recorrencia ? (
                    <span>
                      {item.recorrencia}
                      {item.tempo_recorrencia ? ` (${item.tempo_recorrencia})` : ''}
                    </span>
                  ) : '-'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiInfo className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Obrigatório</span>
                </div>
                {item.obrigatorio ? (
                  <span className="text-green-600 flex items-center text-sm">
                    <FiCheck className="mr-1" />
                    Sim
                  </span>
                ) : (
                  <span className="text-gray-500 flex items-center text-sm">
                    <FiX className="mr-1" />
                    Não
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiFile className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Status do Documento</span>
                </div>
                {item.tem_documento ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Documento Anexado
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Sem Documento
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {item.visivel ? <FiEye className="mr-2 text-gray-500" /> : <FiEyeOff className="mr-2 text-gray-500" />}
                  <span className="text-sm font-medium text-gray-700">Visibilidade</span>
                </div>
                <div className="flex items-center">
                  {atualizandoVisibilidade ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                  ) : (
                    <input
                      type="checkbox"
                      checked={item.visivel || false}
                      onChange={() => onToggleVisibilidade(item.id, item.visivel)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mr-2"
                    />
                  )}
                  <span className="text-sm text-gray-900">
                    {item.visivel ? 'Visível' : 'Oculto'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com ações */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => onEditClick(item.id)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
            >
              <FiEdit className="mr-2 h-4 w-4" />
              Editar
            </button>
            
            {!item.tem_documento && (
              <button
                onClick={() => onAnexarClick(item.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <FiUpload className="mr-2 h-4 w-4" />
                Anexar Documento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal da lista
const ControleConteudoListView = ({ user, filtroProjetoId, filtroCategoriaId }) => {
  const [controles, setControles] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [anexarDocumentoId, setAnexarDocumentoId] = useState(null);
  const [showAdicionarLinhaDialog, setShowAdicionarLinhaDialog] = useState(false);
  const [editarItemId, setEditarItemId] = useState(null);
  const [atualizandoVisibilidade, setAtualizandoVisibilidade] = useState({});
  
  // Estados para o popup de detalhes
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [showDetalhePopup, setShowDetalhePopup] = useState(false);
  
  // Estado para controlar as abas
  const [abaAtiva, setAbaAtiva] = useState('todos'); // 'todos' ou 'pendentes'

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) {
      fetchCategorias();
      fetchProjetos();
      fetchControles();
    }
  }, [projetosVinculados, filtroProjetoId, filtroCategoriaId]);

  // Função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', user.id);
      
      if (error) throw error;
      
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      setProjetosVinculados([]);
    }
  };

  // Buscar todas as categorias
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*');
      
      if (error) throw error;
      
      const categoriasObj = {};
      data.forEach(cat => {
        categoriasObj[cat.id] = cat.nome;
      });
      
      setCategorias(categoriasObj);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  // Buscar apenas os projetos vinculados ao usuário
  const fetchProjetos = async () => {
    try {
      if (projetosVinculados.length === 0) {
        setProjetos({});
        return;
      }

      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .in('id', projetosVinculados);
      
      if (error) throw error;
      
      const projetosObj = {};
      data.forEach(proj => {
        projetosObj[proj.id] = proj.nome;
      });
      
      setProjetos(projetosObj);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  // Buscar os dados de controle_conteudo_geral
  const fetchControles = async () => {
    try {
      setLoading(true);
      
      if (projetosVinculados.length === 0) {
        setControles([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('controle_conteudo_geral')
        .select('*')
        .in('projeto_id', projetosVinculados);
      
      // Aplicar filtros se estiverem definidos
      if (filtroProjetoId && filtroProjetoId.trim() !== '') {
        query = query.eq('projeto_id', filtroProjetoId);
      }
      
      if (filtroCategoriaId && filtroCategoriaId.trim() !== '') {
        query = query.eq('categoria_id', filtroCategoriaId);
      }
      
      // Ordenar por prazo_entrega (mais próximos primeiro) e depois por ID
      query = query.order('prazo_entrega', { ascending: true, nullsLast: true })
                   .order('id', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setControles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erro ao carregar dados de controle');
      console.error('Erro ao carregar controles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar visibilidade
  const toggleVisibilidade = async (itemId, currentVisibility) => {
    try {
      setAtualizandoVisibilidade(prev => ({ ...prev, [itemId]: true }));
      
      const novaVisibilidade = !currentVisibility;
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('controle_conteudo_geral')
        .update({ visivel: novaVisibilidade })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Atualizar estado local
      setControles(prevControles => 
        prevControles.map(item => 
          item.id === itemId 
            ? { ...item, visivel: novaVisibilidade }
            : item
        )
      );

      // Atualizar o item selecionado se for o mesmo
      if (itemSelecionado && itemSelecionado.id === itemId) {
        setItemSelecionado(prev => ({ ...prev, visivel: novaVisibilidade }));
      }
      
      toast.success(`Item ${novaVisibilidade ? 'tornado visível' : 'ocultado'} com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade do item');
    } finally {
      setAtualizandoVisibilidade(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Formata a data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const dateWithTime = dateString.includes('T') ? dateString : dateString + 'T00:00:00';
      const date = new Date(dateWithTime);
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Função para determinar a cor do prazo
  const getPrazoColor = (prazoString) => {
    if (!prazoString) return 'text-gray-500';
    
    try {
      const prazo = new Date(prazoString + 'T00:00:00');
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const diffTime = prazo.getTime() - hoje.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'text-red-600'; // Atrasado
      if (diffDays <= 3) return 'text-orange-600'; // Próximo do vencimento
      if (diffDays <= 7) return 'text-yellow-600'; // Uma semana
      return 'text-green-600'; // No prazo
    } catch (e) {
      return 'text-gray-500';
    }
  };

  // Função para abrir o popup de detalhes
  const handleItemClick = (item) => {
    setItemSelecionado(item);
    setShowDetalhePopup(true);
  };

  // Função para fechar o popup de detalhes
  const handleCloseDetalhe = () => {
    setShowDetalhePopup(false);
    setItemSelecionado(null);
  };

  // Função para atualizar o status de um documento após upload ou vínculo
  const handleDocumentoAnexado = async (controleId, documentoId = null) => {
    try {
      // Atualizar localmente
      setControles(prevControles => 
        prevControles.map(item => 
          item.id === controleId 
            ? { 
                ...item, 
                tem_documento: true
              } 
            : item
        )
      );

      // Atualizar o item selecionado se for o mesmo
      if (itemSelecionado && itemSelecionado.id === controleId) {
        setItemSelecionado(prev => ({ ...prev, tem_documento: true }));
      }
      
      toast.success('Documento anexado com sucesso!');
      setAnexarDocumentoId(null);
      setShowDetalhePopup(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do documento');
    }
  };

  // Função para lidar com o sucesso da adição de linha
  const handleAdicionarLinhaSuccess = () => {
    setShowAdicionarLinhaDialog(false);
    fetchControles();
    toast.success('Operação concluída com sucesso!');
  };

  // Função para lidar com o sucesso da edição de linha
  const handleEditarSuccess = () => {
    setEditarItemId(null);
    setShowDetalhePopup(false);
    fetchControles();
    toast.success('Item atualizado com sucesso!');
  };

  // Funções para obter título e descrição das abas
  const getTituloAba = () => {
    switch (abaAtiva) {
      case 'pendentes':
        return 'Conteúdos - Pendentes';
      default:
        return 'Todos os Conteúdos';
    }
  };

  const getDescricaoAba = () => {
    switch (abaAtiva) {
      case 'pendentes':
        return 'Visualizando apenas conteúdos sem documento anexado';
      default:
        return 'Visualizando todos os conteúdos';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Se não há projetos vinculados, mostrar mensagem informativa
  if (projetosVinculados.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FiFolder className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Sistema de Abas com design igual ao controle-indicador-geral */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          {/* MOBILE: Navegação por abas horizontal com scroll */}
          <div className="lg:hidden">
            <div className="overflow-x-auto">
              <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
                {/* Aba: Todos */}
                <button
                  onClick={() => setAbaAtiva('todos')}
                  className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                    abaAtiva === 'todos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Todos
                  {abaAtiva === 'todos' && (
                    <span className="ml-1 bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full text-xs">
                      ✓
                    </span>
                  )}
                </button>

                {/* Aba: Pendentes */}
                <button
                  onClick={() => setAbaAtiva('pendentes')}
                  className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                    abaAtiva === 'pendentes'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pendentes
                  {abaAtiva === 'pendentes' && (
                    <span className="ml-1 bg-red-100 text-red-600 px-1 py-0.5 rounded-full text-xs">
                      ✓
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* DESKTOP: Navegação por abas normal */}
          <div className="hidden lg:block">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {/* Aba: Todos */}
              <button
                onClick={() => setAbaAtiva('todos')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'todos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Todos os Conteúdos
                {abaAtiva === 'todos' && (
                  <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>

              {/* Aba: Pendentes */}
              <button
                onClick={() => setAbaAtiva('pendentes')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'pendentes'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pendentes
                {abaAtiva === 'pendentes' && (
                  <span className="ml-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="p-4 lg:p-6">
          {/* MOBILE: Cabeçalho de aba compacto */}
          <div className="lg:hidden mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {getTituloAba()}
            </h2>
            <div className="flex items-center">
              {abaAtiva === 'todos' && (
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              )}
              {abaAtiva === 'pendentes' && (
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              )}
              <span className="text-sm text-gray-600">
                {abaAtiva === 'todos' && 'Todos os conteúdos'}
                {abaAtiva === 'pendentes' && 'Sem documento anexado'}
              </span>
            </div>
          </div>

          {/* DESKTOP: Cabeçalho de aba completo */}
          <div className="hidden lg:block mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {getTituloAba()}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {abaAtiva === 'todos' && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                )}
                {abaAtiva === 'pendentes' && (
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                )}
                <span className="text-sm text-gray-600">
                  {abaAtiva === 'todos' && 'Mostrando todos os conteúdos disponíveis'}
                  {abaAtiva === 'pendentes' && 'Filtrando apenas conteúdos sem documento anexado'}
                </span>
              </div>
            </div>
          </div>

          {/* Cabeçalho com informações e botão adicionar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
            {/* Lado esquerdo - Informações */}
            <div className="flex flex-col space-y-2">
              <div>
                <p className="text-sm text-gray-500">
                  {(() => {
                    // Filtrar controles baseado na aba ativa
                    const controlesFiltrados = abaAtiva === 'todos' 
                      ? controles 
                      : controles.filter(item => !item.tem_documento);

                    return `${controlesFiltrados.length} ${controlesFiltrados.length === 1 ? 'item encontrado' : 'itens encontrados'}`;
                  })()}
                </p>
              </div>
            </div>
            
            {/* Lado direito - Botão adicionar */}
            <button
              onClick={() => setShowAdicionarLinhaDialog(true)}
              className="flex items-center text-white px-4 py-2 rounded-md text-sm font-medium"
              style={{ 
                backgroundColor: 'rgb(1, 32, 96)',
                '&:hover': { backgroundColor: 'rgb(0, 20, 60)' }
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgb(0, 20, 60)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgb(1, 32, 96)'}
            >
              <FiPlus className="mr-2" />
              Adicionar Linha de Conteúdo
            </button>
          </div>

          {/* Lista de conteúdos */}
          <div className="space-y-3">
            {(() => {
              // Filtrar controles baseado na aba ativa
              const controlesFiltrados = abaAtiva === 'todos' 
                ? controles 
                : controles.filter(item => !item.tem_documento);

              return controlesFiltrados.length > 0 ? (
                controlesFiltrados.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      {/* Lado esquerdo - Informações principais */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-xs font-medium text-gray-500">ID {item.id}</span>
                          {item.id_controleconteudo && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs font-medium text-gray-500">Base {item.id_controleconteudo}</span>
                            </>
                          )}
                          {!item.visivel && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs font-medium text-red-500 flex items-center">
                                <FiEyeOff className="mr-1 h-3 w-3" />
                                Oculto
                              </span>
                            </>
                          )}
                          {abaAtiva === 'pendentes' && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="text-xs font-medium text-orange-600 flex items-center">
                                <FiFile className="mr-1 h-3 w-3" />
                                Pendente
                              </span>
                            </>
                          )}
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-1 truncate">
                          {item.descricao || 'Sem descrição'}
                        </h4>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center">
                            <FiBriefcase className="mr-1 h-4 w-4" />
                            <span className="truncate">{projetos[item.projeto_id] || 'Projeto indisponível'}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <FiTag className="mr-1 h-4 w-4" />
                            <span className="truncate">{categorias[item.categoria_id] || 'Categoria indisponível'}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center">
                            <FiClock className={`mr-1 h-4 w-4 ${getPrazoColor(item.prazo_entrega)}`} />
                            <span className={`font-medium ${getPrazoColor(item.prazo_entrega)}`}>
                              {formatDate(item.prazo_entrega)}
                            </span>
                          </div>
                          
                          {item.recorrencia && item.recorrencia !== 'sem recorrencia' && (
                            <div className="flex items-center text-purple-600">
                              <FiRepeat className="mr-1 h-4 w-4" />
                              <span className="text-xs font-medium">{item.recorrencia}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Lado direito - Status e indicadores */}
                      <div className="flex flex-col items-end space-y-2 ml-4">
                        {/* Status do documento */}
                        {item.tem_documento ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
                            <FiCheck className="mr-1 h-3 w-3" />
                            Documento OK
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center">
                            <FiFile className="mr-1 h-3 w-3" />
                            Sem Documento
                          </span>
                        )}
                        
                        {/* Obrigatório */}
                        {item.obrigatorio && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                            Obrigatório
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FiFolder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {abaAtiva === 'todos' ? 'Nenhum conteúdo encontrado' : 'Nenhum conteúdo pendente'}
                  </h3>
                  <p className="text-gray-500">
                    {abaAtiva === 'todos' 
                      ? 'Não há itens de controle para os filtros selecionados.'
                      : 'Todos os conteúdos possuem documentos anexados.'
                    }
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modais */}
      {showDetalhePopup && (
        <DetalheConteudoPopup
          item={itemSelecionado}
          onClose={handleCloseDetalhe}
          categorias={categorias}
          projetos={projetos}
          onEditClick={(itemId) => {
            setEditarItemId(itemId);
            setShowDetalhePopup(false);
          }}
          onAnexarClick={(itemId) => {
            setAnexarDocumentoId(itemId);
            setShowDetalhePopup(false);
          }}
          onToggleVisibilidade={toggleVisibilidade}
          atualizandoVisibilidade={atualizandoVisibilidade[itemSelecionado?.id]}
        />
      )}

      {anexarDocumentoId && (
        <AnexarDocumentoDialog
          controleId={anexarDocumentoId} 
          onClose={() => setAnexarDocumentoId(null)}
          onSuccess={(documentoId) => handleDocumentoAnexado(anexarDocumentoId, documentoId)}
          controleItem={controles.find(item => item.id === anexarDocumentoId)}
          categorias={categorias}
          projetos={projetos}
          isGeralTable={true}
        />
      )}

      {showAdicionarLinhaDialog && (
        <AdicionarLinhaConteudoDialog
          onClose={() => setShowAdicionarLinhaDialog(false)}
          onSuccess={handleAdicionarLinhaSuccess}
          categorias={categorias}
          projetos={projetos}
        />
      )}

      {editarItemId && (
        <EditarLinhaConteudoDialog
          controleItem={controles.find(item => item.id === editarItemId)}
          onClose={() => setEditarItemId(null)}
          onSuccess={handleEditarSuccess}
          categorias={categorias}
          projetos={projetos}
        />
      )}
    </div>
  );
};

export default ControleConteudoListView;