import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import AnexosListView from '../components/AnexosListView';
import { 
  FiSearch, 
  FiFilter, 
  FiFolder,
  FiMenu, 
  FiHome, 
  FiStar, 
  FiClipboard,
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiBarChart,
  FiList,
  FiPaperclip,
  FiPlus
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi';

export default function Anexos({ user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  // Estados para controlar a navegação
  const [activeTab, setActiveTab] = useState('anexos');

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', userId);
      
      if (error) throw error;
      
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      return projetoIds;
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Função para buscar apresentação das variáveis
  const fetchApresentacaoVariaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('apresentacao_variaveis')
        .select('*');
      
      if (error) throw error;
      
      const apresentacaoObj = {};
      data.forEach(item => {
        apresentacaoObj[item.nome_variavel] = item.nome_apresentacao;
      });
      
      setApresentacaoVariaveis(apresentacaoObj);
    } catch (error) {
      console.error('Erro ao carregar apresentação das variáveis:', error);
    }
  };

  // Função para buscar categorias
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

  // Função para buscar projetos
  const fetchProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('*');
      
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

  // Carregar projetos vinculados e outros dados
  useEffect(() => {
    if (user) {
      fetchProjetosVinculados(user.id);
      fetchApresentacaoVariaveis();
      fetchCategorias();
      fetchProjetos();
    }
  }, [user]);

  // Função para fazer logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
      router.push('/login');
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer logout');
    }
  };

  // Funções de navegação
  const handleInicioClick = () => {
    router.push('/visualizacao-indicadores');
  };

  const handleImportantesClick = () => {
    router.push('/visualizacao-indicadores-importantes');
  };

  const handleControleClick = () => {
    router.push('/visualizacao-geral-indicadores');
  };

  const handleRegistrosClick = () => {
    router.push('/registros');
  };

  const handleAnexosClick = () => {
    router.push('/anexos');
  };

  const handleHistoricoAcessos = () => {
    router.push('/historico-acessos');
  };

  const handleConfiguracoesClick = () => {
    router.push('/cadastros');
  };

  const handleTabelaClick = () => {
    router.push('/tabela');
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = categoriaSelecionada || projetoSelecionado;

  // Limpar filtros
  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setShowFilters(false);
  };

  const getSectionTitle = () => {
    return 'Anexos';
  };

  const getSectionSubtitle = () => {
    if (projetosVinculados.length === 0) {
      return 'Nenhum projeto vinculado encontrado';
    }
    return 'Gerencie documentos anexados e análises de IA';
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Anexos - Sistema de Gerenciamento</title>
        <meta name="description" content="Gerencie documentos anexados, análises de IA e extrações de texto" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Estrutura responsiva */}
          <div className="lg:hidden">
            {/* Primeira linha: Logo e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Anexos"
                showFallback={true}
              />
              
              {/* Menu hambúrguer */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  aria-label="Menu de navegação"
                >
                  <FiMenu className="w-6 h-6 text-gray-600" />
                </button>
                
                {/* Dropdown do menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-30">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleInicioClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                      >
                        <FiHome className="mr-3 h-4 w-4" />
                        Início
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleHistoricoAcessos();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                      >
                        <FiList className="mr-3 h-4 w-4" />
                        Histórico Acessos (admin)
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleConfiguracoesClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                      >
                        <FiSettings className="mr-3 h-4 w-4" />
                        Configurações
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600 transition-colors"
                      >
                        <FiLogOut className="mr-3 h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Segunda linha: Busca e Filtro */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                  placeholder="Buscar anexos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-lg transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Filtros"
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>
            
            {/* Terceira linha: Filtros */}
            {showFilters && (
              <div className="mt-4 space-y-3">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.projeto || 'Projeto'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={projetoSelecionado}
                      onChange={(e) => setProjetoSelecionado(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.categoria || 'Categoria'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={categoriaSelecionada}
                      onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Botão limpar - aparece só se houver filtros ativos */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Layout completo */}
          <div className="hidden lg:block">
            {/* Primeira linha: Logo, Busca e Controles */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Anexos"
                showFallback={true}
              />
              
              {/* Barra de busca - Desktop */}
              <div className="flex-1 max-w-md lg:max-w-lg mx-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
                    placeholder="Buscar anexos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Controles à direita */}
              <div className="flex items-center space-x-3">
                {/* Botão de filtro */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-lg transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label="Filtros"
                >
                  <FiFilter className="w-5 h-5" />
                </button>
                
                {/* Menu hambúrguer */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Menu de navegação"
                  >
                    <FiMenu className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  {/* Dropdown do menu */}
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-30">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleInicioClick();
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                        >
                          <FiHome className="mr-3 h-4 w-4" />
                          Início
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                        >
                          <FiUser className="mr-3 h-4 w-4" />
                          Perfil
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleHistoricoAcessos();
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                        >
                          <FiList className="mr-3 h-4 w-4" />
                          Histórico Acessos (admin)
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleConfiguracoesClick();
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100 transition-colors"
                        >
                          <FiSettings className="mr-3 h-4 w-4" />
                          Configurações
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleLogout();
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600 transition-colors"
                        >
                          <FiLogOut className="mr-3 h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Segunda linha: Filtros */}
            {showFilters && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.projeto || 'Projeto'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={projetoSelecionado}
                      onChange={(e) => setProjetoSelecionado(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.categoria || 'Categoria'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      value={categoriaSelecionada}
                      onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Botão limpar - aparece só se houver filtros ativos */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar Filtros
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:flex lg:space-x-8">
          {/* Sidebar de navegação - Desktop apenas */}
          <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              <nav className="space-y-2">

                <button
                  onClick={handleImportantesClick}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <FiStar className="mr-3 h-5 w-5" />
                  Importantes
                </button>

                <button
                  onClick={handleControleClick}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <FiClipboard className="mr-3 h-5 w-5" />
                  Controle
                </button>

                <button
                  onClick={handleRegistrosClick}
                  className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100"
                >
                  <TfiPencil className="mr-3 h-5 w-5" />
                  Registros
                </button>

                <button
                  onClick={handleAnexosClick}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'anexos'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiPaperclip className="mr-3 h-5 w-5" />
                  Anexos
                </button>

              </nav>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            {/* Mobile: Cabeçalho da seção */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black">{getSectionTitle()}</h2>
              </div>
              
              <p className="text-gray-600 text-sm mb-6">{getSectionSubtitle()}</p>
            </div>

            {/* Desktop: Cabeçalho da seção */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-black">{getSectionTitle()}</h2>
                <p className="text-gray-600 text-sm mt-1">{getSectionSubtitle()}</p>
              </div>
            </div>

            {/* Conteúdo principal */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : projetosVinculados.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FiFolder className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-4">
                  Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleConfiguracoesClick}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center transition-colors"
                  >
                    <FiSettings className="mr-2 h-5 w-5" />
                    Configurações
                  </button>
                  <button
                    onClick={handleTabelaClick}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center transition-colors"
                  >
                    <FiList className="mr-2 h-5 w-5" />
                    Ver Tabela
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm">
                <AnexosListView 
                  user={user} 
                  filtroProjetoId={projetoSelecionado}
                  filtroCategoriaId={categoriaSelecionada}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de navegação inferior - Mobile apenas */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-30">
        <div className="flex justify-around">
          <button
            onClick={handleInicioClick}
            className="flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <FiBarChart className="w-5 h-5" />
            <span className="text-xs font-medium">Indicadores</span>
          </button>

          <button
            onClick={handleImportantesClick}
            className="flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <FiStar className="w-5 h-5" />
            <span className="text-xs font-medium">Importantes</span>
          </button>

          <button
            onClick={handleControleClick}
            className="flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <FiClipboard className="w-5 h-5" />
            <span className="text-xs font-medium">Controle</span>
          </button>

          <button
            onClick={handleRegistrosClick}
            className="flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
          >
            <TfiPencil className="w-5 h-5" />
            <span className="text-xs font-medium">Registros</span>
          </button>

          <button
            onClick={handleAnexosClick}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'anexos'
                ? 'text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FiPaperclip className="w-5 h-5" />
            <span className="text-xs font-medium">Anexos</span>
          </button>
        </div>
      </div>

      {/* Espaçamento inferior para mobile */}
      <div className="lg:hidden pb-16"></div>

      {/* Overlay para fechar menus quando clicar fora */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowMenu(false);
          }}
        />
      )}

      {/* Meta tags e informações adicionais no head - melhorias de SEO e performance */}
      <noscript>
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">JavaScript Necessário</h1>
            <p className="text-gray-600">
              Esta aplicação requer JavaScript para funcionar corretamente. 
              Por favor, habilite JavaScript em seu navegador.
            </p>
          </div>
        </div>
      </noscript>
    </div>
  );
}