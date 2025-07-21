// Arquivo: src/pages/documentos.js - Versão Atualizada com Menu Lateral Modificado
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiArchive,
  FiSearch, 
  FiFilter, 
  FiFolder,
  FiMenu, 
  FiHome, 
  FiStar, 
  FiClock, 
  FiGrid,
  FiEye, 
  FiEyeOff, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiCalendar,
  FiFileText,
  FiEdit,
  FiPaperclip
} from 'react-icons/fi';

export default function Documentos({ user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  // Estados para filtros avançados
  const [filtroObrigatorio, setFiltroObrigatorio] = useState(false);
  const [filtroComDocumento, setFiltroComDocumento] = useState(false);
  const [filtroRecorrencia, setFiltroRecorrencia] = useState('');
  
  // Estados para controlar a navegação
  const [activeTab, setActiveTab] = useState('documentos'); // 'documentos', 'obrigatorios', 'com_documento', 'recorrentes'

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
    }
  };

  // Função para determinar a cor da borda baseada no status
  const getBorderColor = (documento) => {
    if (documento.obrigatorio) return 'border-red-500';
    if (documento.tem_documento) return 'border-green-500';
    if (documento.recorrencia && documento.recorrencia !== 'sem recorrencia') return 'border-blue-500';
    return 'border-gray-300';
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
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

  // Carregar categorias, projetos e projetos vinculados
  useEffect(() => {
    const fetchCategoriasProjetos = async () => {
      try {
        const projetoIds = await fetchProjetosVinculados(user.id);
        
        if (projetoIds.length > 0) {
          // Buscar categorias que têm controles nos projetos vinculados
          const { data: categoriasComControles, error: categoriasControlesError } = await supabase
            .from('controle_conteudo')
            .select('categoria_id')
            .in('projeto_id', projetoIds)
            .not('categoria_id', 'is', null);
          
          if (categoriasControlesError) throw categoriasControlesError;
          
          const categoriasComControlesIds = [...new Set(
            categoriasComControles.map(item => item.categoria_id)
          )];
          
          if (categoriasComControlesIds.length > 0) {
            const { data: categoriasData, error: categoriasError } = await supabase
              .from('categorias')
              .select('id, nome')
              .in('id', categoriasComControlesIds)
              .order('nome');
            
            if (categoriasError) throw categoriasError;
            
            const categoriasObj = {};
            categoriasData.forEach(cat => {
              categoriasObj[cat.id] = cat.nome;
            });
            
            setCategorias(categoriasObj);
          }
          
          // Buscar projetos que têm controles
          const { data: projetosComControles, error: controlesError } = await supabase
            .from('controle_conteudo')
            .select('projeto_id')
            .in('projeto_id', projetoIds);
          
          if (controlesError) throw controlesError;
          
          const projetosComControlesIds = [...new Set(
            projetosComControles.map(item => item.projeto_id)
          )];
          
          if (projetosComControlesIds.length > 0) {
            const { data: projetosData, error: projetosError } = await supabase
              .from('projetos')
              .select('id, nome')
              .in('id', projetosComControlesIds)
              .order('nome');
            
            if (projetosError) throw projetosError;
            
            const projetosObj = {};
            projetosData.forEach(proj => {
              projetosObj[proj.id] = proj.nome;
            });
            
            setProjetos(projetosObj);
          }
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

  // Buscar documentos da tabela controle_conteudo
  useEffect(() => {
    const fetchDocumentos = async () => {
      try {
        setLoading(true);
        
        if (projetosVinculados.length === 0) {
          setDocumentos([]);
          setLoading(false);
          return;
        }
        
        // Query base para controle_conteudo
        let query = supabase
          .from('controle_conteudo')
          .select('*')
          .in('projeto_id', projetosVinculados);
          
        // Aplicar filtros de projeto e categoria se selecionados
        if (projetoSelecionado) {
          query = query.eq('projeto_id', projetoSelecionado);
        }
        
        if (categoriaSelecionada) {
          query = query.eq('categoria_id', categoriaSelecionada);
        }
        
        // Aplicar filtros baseados na aba ativa
        switch (activeTab) {
          case 'obrigatorios':
            query = query.eq('obrigatorio', true);
            break;
          case 'com_documento':
            query = query.eq('tem_documento', true);
            break;
          case 'recorrentes':
            query = query.not('recorrencia', 'eq', 'sem recorrencia')
                         .not('recorrencia', 'is', null);
            break;
          case 'documentos':
          default:
            // Aplicar filtros avançados se estiverem ativos
            if (filtroObrigatorio) {
              query = query.eq('obrigatorio', true);
            }
            if (filtroComDocumento) {
              query = query.eq('tem_documento', true);
            }
            if (filtroRecorrencia && filtroRecorrencia !== 'todos') {
              if (filtroRecorrencia === 'sem_recorrencia') {
                query = query.eq('recorrencia', 'sem recorrencia');
              } else {
                query = query.eq('recorrencia', filtroRecorrencia);
              }
            }
            break;
        }
        
        // Aplicar termo de pesquisa se existir
        if (searchTerm.trim()) {
          query = query.ilike('descricao', `%${searchTerm.trim()}%`);
        }
        
        // ✅ CORREÇÃO: Ordenar por prazo_entrega_inicial em vez de created_at
        query = query.order('prazo_entrega_inicial', { ascending: false, nullsLast: true })
                     .order('id', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setDocumentos(data || []);
      } catch (error) {
        console.error('Erro ao buscar documentos:', error);
        toast.error('Erro ao carregar documentos');
      } finally {
        setLoading(false);
      }
    };

    if (user && projetosVinculados.length >= 0) {
      fetchDocumentos();
    }
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado, activeTab, filtroObrigatorio, filtroComDocumento, filtroRecorrencia, projetosVinculados]);

  // Limpar filtros
  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setFiltroObrigatorio(false);
    setFiltroComDocumento(false);
    setFiltroRecorrencia('');
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = categoriaSelecionada || projetoSelecionado || filtroObrigatorio || filtroComDocumento || filtroRecorrencia;

  // Obter título da seção
  const getSectionTitle = () => {
    switch (activeTab) {
      case 'documentos':
        return 'Documentos';
      case 'obrigatorios':
        return 'Documentos Obrigatórios';
      case 'com_documento':
        return 'Com Anexos';
      case 'recorrentes':
        return 'Recorrentes';
      default:
        return 'Documentos';
    }
  };

  // Obter subtítulo da seção
  const getSectionSubtitle = () => {
    if (projetosVinculados.length === 0) {
      return 'Nenhum projeto vinculado encontrado';
    }
    
    return `${documentos.length} documentos encontrados`;
  };

  // Obter indicadores de status do documento
  const getStatusIndicators = (documento) => {
    const indicators = [];
    
    // Adicionar indicador se tem documento vinculado
    if (documento.tem_documento) {
      indicators.push(
        <div key="tem-doc" className="w-3 h-3 bg-green-500 rounded-full" title="Tem documento"></div>
      );
    }
    
    // Adicionar indicador se é obrigatório
    if (documento.obrigatorio) {
      indicators.push(
        <div key="obrigatorio" className="w-3 h-3 bg-red-500 rounded-full" title="Obrigatório"></div>
      );
    }
    
    // Adicionar indicador se é recorrente
    if (documento.recorrencia && documento.recorrencia !== 'sem recorrencia') {
      indicators.push(
        <FiClock key="recorrente" className="w-4 h-4 text-blue-600" title="Recorrente" />
      );
    }
    
    return indicators;
  };

  // ✅ CORREÇÃO: Formatar data usando prazo_entrega_inicial
  const formatDate = (documento) => {
    const dateString = documento.prazo_entrega_inicial;
    
    if (!dateString) return 'Sem prazo definido';
    
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

  // Extrair prévia do texto
  const getTextPreview = (text, maxLength = 150) => {
    if (!text) return 'Sem descrição disponível';
    
    return text.length > maxLength 
      ? text.substring(0, maxLength) + '...'
      : text;
  };

  // Obter texto da recorrência formatado
  const getRecorrenciaText = (documento) => {
    if (!documento.recorrencia || documento.recorrencia === 'sem recorrencia') {
      return 'Sem recorrência';
    }
    
    const tempo = documento.tempo_recorrencia || '';
    const repeticoes = documento.repeticoes ? ` (${documento.repeticoes}x)` : '';
    
    return `A cada ${tempo} ${documento.recorrencia}${repeticoes}`;
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Documentos - MedCura</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Layout responsivo */}
          <div className="lg:hidden">
            {/* Primeira linha: Logo e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="MedCuration"
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
                
                {/* Dropdown do menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                    <Link href="/med-curation-desktop" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                      <FiHome className="mr-3 h-4 w-4" />
                      Curadoria
                    </Link>
                    <Link href="/registros" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                      <FiEdit className="mr-3 h-4 w-4" />
                      Registros
                    </Link>
                    <Link href="/anexos" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                      <FiPaperclip className="mr-3 h-4 w-4" />
                      Anexos
                    </Link>
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
                        // TODO: Implementar configurações
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
                  placeholder="Buscar documentos..."
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
                
                {/* Filtros Avançados - apenas na aba "Documentos" */}
                {activeTab === 'documentos' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Filtros Avançados
                    </label>
                    
                    {/* Primeira linha de filtros */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        onClick={() => setFiltroObrigatorio(!filtroObrigatorio)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroObrigatorio 
                            ? 'bg-red-100 text-red-800 border border-red-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        Obrigatórios
                      </button>
                      
                      <button
                        onClick={() => setFiltroComDocumento(!filtroComDocumento)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroComDocumento 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiFileText className="w-4 h-4 mr-1" />
                        Com Documento
                      </button>
                    </div>
                    
                    {/* Segunda linha - Filtro de recorrência */}
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Recorrência
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filtroRecorrencia}
                        onChange={(e) => setFiltroRecorrencia(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sem_recorrencia">Sem recorrência</option>
                        <option value="dia">Diária</option>
                        <option value="semana">Semanal</option>
                        <option value="mês">Mensal</option>
                        <option value="ano">Anual</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Layout original */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="MedCuration"
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
                    placeholder="Buscar documentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Controles à direita */}
              <div className="flex items-center space-x-3">
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
                
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    <FiMenu className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                      <Link href="/med-curation-desktop" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                        <FiHome className="mr-3 h-4 w-4" />
                        Curadoria
                      </Link>
                      <Link href="/registros" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                        <FiEdit className="mr-3 h-4 w-4" />
                        Registros
                      </Link>
                      <Link href="/anexos" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                        <FiPaperclip className="mr-3 h-4 w-4" />
                        Anexos
                      </Link>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
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
            
            {/* Filtros Desktop */}
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
                
                {/* Filtros Avançados - apenas na aba "Documentos" */}
                {activeTab === 'documentos' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Filtros Avançados
                    </label>
                    
                    {/* Primeira linha de filtros */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        onClick={() => setFiltroObrigatorio(!filtroObrigatorio)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroObrigatorio 
                            ? 'bg-red-100 text-red-800 border border-red-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        Obrigatórios
                      </button>
                      
                      <button
                        onClick={() => setFiltroComDocumento(!filtroComDocumento)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroComDocumento 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiFileText className="w-4 h-4 mr-1" />
                        Com Documento
                      </button>
                    </div>
                    
                    {/* Segunda linha - Filtro de recorrência */}
                    <div className="flex-1 max-w-xs">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Recorrência
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filtroRecorrencia}
                        onChange={(e) => setFiltroRecorrencia(e.target.value)}
                      >
                        <option value="">Todos</option>
                        <option value="sem_recorrencia">Sem recorrência</option>
                        <option value="dia">Diária</option>
                        <option value="semana">Semanal</option>
                        <option value="mês">Mensal</option>
                        <option value="ano">Anual</option>
                      </select>
                    </div>
                  </div>
                )}
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
            <div className="bg-white rounded-lg shadow-sm p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('documentos')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'documentos'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiFileText className="mr-3 h-5 w-5" />
                  <span className="ml-0">Documentos</span>
                </button>

                <Link
                  href="/registros"
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100`}
                >
                  <FiEdit className="mr-3 h-5 w-5" />
                  <span className="ml-0">Registros</span>
                </Link>

                <Link
                  href="/anexos"
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100`}
                >
                  <FiPaperclip className="mr-3 h-5 w-5" />
                  <span className="ml-0">Anexos</span>
                </Link>

                <button
                  onClick={() => setActiveTab('com_documento')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'com_documento'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiFileText className="mr-3 h-5 w-5" />
                  Com Anexos
                </button>

                <button
                  onClick={() => setActiveTab('recorrentes')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'recorrentes'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiClock className="mr-3 h-5 w-5" />
                  Recorrentes
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

            {/* Conteúdo dos cards */}
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
            ) : documentos.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FiFileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum documento encontrado</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Não há documentos que correspondam aos filtros selecionados.
                </p>
              </div>
            ) : (
              <div>
                {/* Mobile: Layout em lista */}
                <div className="lg:hidden">
                  {documentos.map((documento, index) => (
                    <div key={documento.id} className={index > 0 ? "mt-4" : ""}>
                      <Link href={`/documentos/${documento.id}`}>
                        <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(documento)} p-4 shadow-sm hover:shadow-md transition-shadow`}>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-base font-bold text-gray-900 flex-1 pr-2">
                              {getTextPreview(documento.descricao, 60)}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {getStatusIndicators(documento)}
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-gray-600 text-sm">
                              {getTextPreview(documento.descricao, 100)}
                            </p>
                            {documento.recorrencia && documento.recorrencia !== 'sem recorrencia' && (
                              <p className="text-blue-600 text-xs mt-1">
                                {getRecorrenciaText(documento)}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              {documento.projeto_id && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  {projetos[documento.projeto_id]}
                                </span>
                              )}
                              {documento.categoria_id && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {categorias[documento.categoria_id]}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center text-gray-500 text-xs">
                              <FiCalendar className="w-3 h-3 mr-1" />
                              {formatDate(documento)}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Desktop: Grid responsivo */}
                <div className="hidden lg:block">
                  <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {documentos.map((documento) => (
                      <div key={documento.id}>
                        <Link href={`/documentos/${documento.id}`}>
                          <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(documento)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
                                {getTextPreview(documento.descricao, 80)}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {getStatusIndicators(documento)}
                              </div>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-gray-600 text-sm line-clamp-3">
                                {getTextPreview(documento.descricao)}
                              </p>
                              {documento.recorrencia && documento.recorrencia !== 'sem recorrencia' && (
                                <p className="text-blue-600 text-sm mt-2">
                                  {getRecorrenciaText(documento)}
                                </p>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex flex-wrap gap-2">
                                {documento.projeto_id && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full whitespace-nowrap">
                                    {projetos[documento.projeto_id]}
                                  </span>
                                )}
                                {documento.categoria_id && (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
                                    {categorias[documento.categoria_id]}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center justify-end text-gray-500 text-xs">
                                <FiCalendar className="w-3 h-3 mr-1" />
                                {formatDate(documento)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de navegação inferior - Mobile apenas */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-30">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab('documentos')}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'documentos'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiFileText className="w-5 h-5" />
            <span className="text-xs font-medium">Docs</span>
          </button>

          <Link
            href="/registros"
            className="flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors text-gray-500"
          >
            <FiEdit className="w-5 h-5" />
            <span className="text-xs font-medium">Registros</span>
          </Link>

          <Link
            href="/anexos"
            className="flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors text-gray-500"
          >
            <FiPaperclip className="w-5 h-5" />
            <span className="text-xs font-medium">Anexos</span>
          </Link>

          <button
            onClick={() => setActiveTab('recorrentes')}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'recorrentes'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiClock className="w-5 h-5" />
            <span className="text-xs font-medium">Recorrentes</span>
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
    </div>
  );
}