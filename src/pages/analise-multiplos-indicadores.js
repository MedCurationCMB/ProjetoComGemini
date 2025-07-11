// src/pages/analise-multiplos-indicadores.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiSearch, 
  FiFilter, 
  FiFolder,
  FiMenu, 
  FiHome, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiCheckSquare,
  FiSquare,
  FiCpu,
  FiBookOpen
} from 'react-icons/fi';
import MultipleIndicatorAnalysisDialog from '../components/MultipleIndicatorAnalysisDialog';
import SelectedIndicatorsPreview from '../components/SelectedIndicatorsPreview';
import HistoricoAnaliseMultiplaDialog from '../components/HistoricoAnaliseMultiplaDialog';

export default function AnaliseMultiplosIndicadores({ user }) {
  const router = useRouter();
  
  // Estados principais
  const [indicadores, setIndicadores] = useState([]);
  const [indicadoresSelecionados, setIndicadoresSelecionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Estados para modais
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const [showHistoricoDialog, setShowHistoricoDialog] = useState(false);

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

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
  const handleConfiguracoesClick = () => {
    router.push('/cadastros');
  };

  const handleInicioClick = () => {
    router.push('/visualizacao-indicadores');
  };

  const handleAnalisesIndicadoresClick = () => {
    router.push('/analise-multiplos-indicadores');
  };

  // Função para buscar projetos vinculados
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
    }
  };

  // Função para buscar dados de apresentação
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

  // Carregar categorias e projetos
  useEffect(() => {
    const fetchCategoriasProjetos = async () => {
      try {
        const projetoIds = await fetchProjetosVinculados(user.id);
        
        if (projetoIds.length > 0) {
          // Buscar categorias com controles visíveis em projetos vinculados
          const { data: categoriasComControles, error: categoriasControlesError } = await supabase
            .from('controle_indicador_geral')
            .select('categoria_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds)
            .not('categoria_id', 'is', null);
          
          if (categoriasControlesError) throw categoriasControlesError;
          
          const categoriasComControlesVisiveis = [...new Set(
            categoriasComControles.map(item => item.categoria_id)
          )];
          
          if (categoriasComControlesVisiveis.length > 0) {
            const { data: categoriasData, error: categoriasError } = await supabase
              .from('categorias')
              .select('id, nome')
              .in('id', categoriasComControlesVisiveis)
              .order('nome');
            
            if (categoriasError) throw categoriasError;
            
            const categoriasObj = {};
            categoriasData.forEach(cat => {
              categoriasObj[cat.id] = cat.nome;
            });
            
            setCategorias(categoriasObj);
          } else {
            setCategorias({});
          }
          
          // Buscar projetos com controles visíveis
          const { data: projetosComControles, error: controlesError } = await supabase
            .from('controle_indicador_geral')
            .select('projeto_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds);
          
          if (controlesError) throw controlesError;
          
          const projetosComControlesVisiveis = [...new Set(
            projetosComControles.map(item => item.projeto_id)
          )];
          
          if (projetosComControlesVisiveis.length > 0) {
            const { data: projetosData, error: projetosError } = await supabase
              .from('projetos')
              .select('id, nome')
              .in('id', projetosComControlesVisiveis)
              .order('nome');
            
            if (projetosError) throw projetosError;
            
            const projetosObj = {};
            projetosData.forEach(proj => {
              projetosObj[proj.id] = proj.nome;
            });
            
            setProjetos(projetosObj);
          } else {
            setProjetos({});
          }
        } else {
          setCategorias({});
          setProjetos({});
        }
        
        await fetchApresentacaoVariaveis();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    if (user) {
      fetchCategoriasProjetos();
    }
  }, [user]);

  // Carregar indicadores da tabela controle_indicador
  useEffect(() => {
    const fetchIndicadores = async () => {
      if (projetosVinculados.length === 0) {
        setIndicadores([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        let query = supabase
          .from('controle_indicador')
          .select('id, indicador, projeto_id, categoria_id')
          .in('projeto_id', projetosVinculados)
          .order('indicador');

        // Aplicar filtros se selecionados
        if (projetoSelecionado) {
          query = query.eq('projeto_id', projetoSelecionado);
        }
        
        if (categoriaSelecionada) {
          query = query.eq('categoria_id', categoriaSelecionada);
        }
        
        // Aplicar termo de pesquisa
        if (searchTerm.trim()) {
          query = query.ilike('indicador', `%${searchTerm.trim()}%`);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setIndicadores(data || []);
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        toast.error('Erro ao carregar indicadores');
      } finally {
        setLoading(false);
      }
    };

    if (user && projetosVinculados.length >= 0) {
      fetchIndicadores();
    }
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado, projetosVinculados]);

  // Função para alternar seleção de indicador
  const toggleIndicadorSelecionado = (indicadorId) => {
    setIndicadoresSelecionados(prev => {
      if (prev.includes(indicadorId)) {
        return prev.filter(id => id !== indicadorId);
      } else {
        return [...prev, indicadorId];
      }
    });
  };

  // Função para selecionar todos os indicadores filtrados
  const selecionarTodos = () => {
    const indicadoresFiltrados = indicadores;
    const todosSelecionados = indicadoresFiltrados.every(ind => 
      indicadoresSelecionados.includes(ind.id)
    );
    
    if (todosSelecionados) {
      setIndicadoresSelecionados(prev => 
        prev.filter(id => !indicadoresFiltrados.find(ind => ind.id === id))
      );
    } else {
      const idsParaAdicionar = indicadoresFiltrados
        .filter(ind => !indicadoresSelecionados.includes(ind.id))
        .map(ind => ind.id);
      
      setIndicadoresSelecionados(prev => [...prev, ...idsParaAdicionar]);
    }
  };

  // Função para limpar todas as seleções
  const limparSelecoes = () => {
    setIndicadoresSelecionados([]);
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = categoriaSelecionada || projetoSelecionado;

  // Função para iniciar análise
  const iniciarAnalise = () => {
    if (indicadoresSelecionados.length < 2) {
      toast.error('Selecione pelo menos 2 indicadores para análise');
      return;
    }
    
    setShowAnalysisDialog(true);
  };

  // Função para lidar com a conclusão da análise
  const handleAnalysisComplete = (resultado) => {
    console.log('Análise comparativa concluída:', resultado);
    toast.success('Análise comparativa concluída com sucesso!');
  };

  const todosFiltradosSelecionados = indicadores.length > 0 && 
    indicadores.every(ind => indicadoresSelecionados.includes(ind.id));

  // Não renderizar nada até autenticação
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Análise Múltiplos Indicadores</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Modais */}
      {showAnalysisDialog && (
        <MultipleIndicatorAnalysisDialog 
          indicadoresSelecionados={indicadoresSelecionados}
          onClose={() => setShowAnalysisDialog(false)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {showHistoricoDialog && (
        <HistoricoAnaliseMultiplaDialog 
          onClose={() => setShowHistoricoDialog(false)}
        />
      )}

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile */}
          <div className="lg:hidden">
            {/* Primeira linha: Logo e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Análise Múltipla"
                showFallback={true}
              />
              
              {/* Menu hambúrguer */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <FiMenu className="w-6 h-6 text-gray-600" />
                </button>
                
                {/* Dropdown do menu - ATUALIZADO */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleInicioClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                    >
                      <FiHome className="mr-3 h-4 w-4" />
                      Início
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        // TODO: Implementar perfil
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleAnalisesIndicadoresClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiCpu className="mr-3 h-4 w-4" />
                      Análises Indicadores
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleConfiguracoesClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiSettings className="mr-3 h-4 w-4" />
                      Configurações
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600"
                    >
                      <FiLogOut className="mr-3 h-4 w-4" />
                      Logout
                    </button>
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  placeholder="Buscar indicadores..."
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
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={categoriaSelecionada}
                      onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
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

            {/* Info de seleção */}
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {indicadoresSelecionados.length} de {indicadores.length} selecionados
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={selecionarTodos}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {todosFiltradosSelecionados ? 'Desmarcar' : 'Selecionar'} Todos
                </button>
                {indicadoresSelecionados.length > 0 && (
                  <button
                    onClick={limparSelecoes}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden lg:block">
            {/* Primeira linha: Logo, Busca e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Análise Múltipla"
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
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    placeholder="Buscar indicadores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Controles à direita */}
              <div className="flex items-center space-x-3">
                {/* Botão de histórico */}
                <button
                  onClick={() => setShowHistoricoDialog(true)}
                  className="p-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                >
                  <FiBookOpen className="w-5 h-5" />
                </button>

                {/* Botão de filtro */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-lg transition-colors ${
                    showFilters || hasActiveFilters 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FiFilter className="w-5 h-5" />
                </button>
                
                {/* Menu hambúrguer */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    <FiMenu className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  {/* Dropdown do menu - ATUALIZADO */}
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleInicioClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                      >
                        <FiHome className="mr-3 h-4 w-4" />
                        Início
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          // TODO: Implementar perfil
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleAnalisesIndicadoresClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiCpu className="mr-3 h-4 w-4" />
                        Análises Indicadores
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleConfiguracoesClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiSettings className="mr-3 h-4 w-4" />
                        Configurações
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600"
                      >
                        <FiLogOut className="mr-3 h-4 w-4" />
                        Logout
                      </button>
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
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={categoriaSelecionada}
                      onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ações em massa Desktop */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex space-x-3">
                <button
                  onClick={selecionarTodos}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  {todosFiltradosSelecionados ? 'Desmarcar' : 'Selecionar'} Todos Filtrados
                </button>
                {indicadoresSelecionados.length > 0 && (
                  <button
                    onClick={limparSelecoes}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Limpar Todas as Seleções
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {indicadoresSelecionados.length} de {indicadores.length} selecionados
                </span>
                
                {indicadoresSelecionados.length > 0 && (
                  <button
                    onClick={iniciarAnalise}
                    disabled={indicadoresSelecionados.length < 2}
                    className={`px-4 py-2 rounded-lg flex items-center font-medium transition-colors ${
                      indicadoresSelecionados.length < 2
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <FiCpu className="mr-2" />
                    Analisar Indicadores
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal - SEM SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cabeçalho da seção */}
        <div className="mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold text-black">Análise Múltipla de Indicadores</h2>
          <p className="text-gray-600 text-sm mt-1">
            Selecione múltiplos indicadores para análise comparativa com IA
          </p>
        </div>

        {/* Loading */}
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
            <p className="text-gray-500 max-w-md mx-auto">
              Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes.
            </p>
          </div>
        ) : (
          <div>
            {/* Preview dos Indicadores Selecionados */}
            {indicadoresSelecionados.length > 0 && (
              <div className="mb-8">
                <SelectedIndicatorsPreview 
                  indicadoresSelecionados={indicadoresSelecionados}
                  categorias={categorias}
                  projetos={projetos}
                />
              </div>
            )}

            {/* Lista de indicadores - Mobile */}
            <div className="lg:hidden">
              {indicadores.length > 0 ? (
                <div className="space-y-3">
                  {indicadores.map(indicador => {
                    const isSelected = indicadoresSelecionados.includes(indicador.id);
                    return (
                      <div
                        key={indicador.id}
                        onClick={() => toggleIndicadorSelecionado(indicador.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate">
                              {indicador.indicador}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {indicador.projeto_id && (
                                <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                  {projetos[indicador.projeto_id] || 'Projeto N/A'}
                                </span>
                              )}
                              {indicador.categoria_id && (
                                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {categorias[indicador.categoria_id] || 'Categoria N/A'}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-3 flex-shrink-0">
                            {isSelected ? (
                              <FiCheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <FiSquare className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum indicador encontrado com os filtros aplicados</p>
                </div>
              )}
            </div>

            {/* Grid de indicadores - Desktop */}
            <div className="hidden lg:block">
              {indicadores.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {indicadores.map(indicador => {
                    const isSelected = indicadoresSelecionados.includes(indicador.id);
                    return (
                      <div
                        key={indicador.id}
                        onClick={() => toggleIndicadorSelecionado(indicador.id)}
                        className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                            {indicador.indicador}
                          </h3>
                          <div className="ml-3 flex-shrink-0">
                            {isSelected ? (
                              <FiCheckSquare className="w-6 h-6 text-blue-600" />
                            ) : (
                              <FiSquare className="w-6 h-6 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {indicador.projeto_id && (
                            <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                              {projetos[indicador.projeto_id] || 'Projeto N/A'}
                            </span>
                          )}
                          {indicador.categoria_id && (
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full ml-2">
                              {categorias[indicador.categoria_id] || 'Categoria N/A'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                    Nenhum indicador encontrado com os filtros aplicados
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botão fixo de análise - Mobile */}
      {indicadoresSelecionados.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-30">
          <button
            onClick={iniciarAnalise}
            disabled={indicadoresSelecionados.length < 2}
            className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition-colors ${
              indicadoresSelecionados.length < 2
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <FiCpu className="mr-2" />
            Analisar {indicadoresSelecionados.length} Indicadores
          </button>
        </div>
      )}

      {/* Espaçamento inferior para mobile */}
      <div className="lg:hidden pb-20"></div>

      {/* Overlay para fechar menus quando clicar fora */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}