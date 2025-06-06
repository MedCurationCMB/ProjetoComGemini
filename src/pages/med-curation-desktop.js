// Arquivo: src/pages/med-curation-desktop.js - Versão atualizada usando prazo_entrega
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
  FiCalendar
} from 'react-icons/fi';

export default function MedCurationDesktop({ user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]); // Novo estado para projetos vinculados
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  // Estados para filtros avançados
  const [filtroImportantes, setFiltroImportantes] = useState(false);
  const [filtroLerDepois, setFiltroLerDepois] = useState(false);
  const [filtroArquivados, setFiltroArquivados] = useState(false);
  
  // Estados para controlar a navegação
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'importantes', 'ler_depois', 'ver_todos'
  const [showAllContent, setShowAllContent] = useState(false); // Para o toggle "Ver todos" na seção Início

  // Função para buscar dados de apresentação
  const fetchApresentacaoVariaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('apresentacao_variaveis')
        .select('*');
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por nome_variavel
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
      
      // Extrair apenas os IDs dos projetos
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      return projetoIds;
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      return [];
    }
  };

  // Função para determinar a cor da borda baseada no status de leitura
  const getBorderColor = (documento) => {
    return documento.lido ? 'border-gray-300' : 'border-blue-500';
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
        // Buscar projetos vinculados primeiro
        const projetoIds = await fetchProjetosVinculados(user.id);
        
        // ✅ LÓGICA CORRIGIDA: Buscar categorias de controles visíveis E de projetos vinculados
        if (projetoIds.length > 0) {
          // Buscar quais categorias têm controles visíveis EM PROJETOS VINCULADOS
          const { data: categoriasComControles, error: categoriasControlesError } = await supabase
            .from('controle_conteudo_geral')
            .select('categoria_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds) // ✅ NOVA RESTRIÇÃO: apenas projetos vinculados
            .not('categoria_id', 'is', null); // Excluir registros sem categoria
          
          if (categoriasControlesError) throw categoriasControlesError;
          
          // Extrair IDs únicos de categorias que têm controles visíveis em projetos vinculados
          const categoriasComControlesVisiveis = [...new Set(
            categoriasComControles.map(item => item.categoria_id)
          )];
          
          console.log('Projetos vinculados:', projetoIds);
          console.log('Categorias com controles visíveis em projetos vinculados:', categoriasComControlesVisiveis);
          
          // Buscar apenas as categorias que atendem aos dois critérios
          if (categoriasComControlesVisiveis.length > 0) {
            const { data: categoriasData, error: categoriasError } = await supabase
              .from('categorias')
              .select('id, nome')
              .in('id', categoriasComControlesVisiveis) // Apenas categorias com controles visíveis em projetos vinculados
              .order('nome');
            
            if (categoriasError) throw categoriasError;
            
            // Converter array em objeto para fácil acesso por ID
            const categoriasObj = {};
            categoriasData.forEach(cat => {
              categoriasObj[cat.id] = cat.nome;
            });
            
            setCategorias(categoriasObj);
            console.log('Categorias carregadas para dropdown:', categoriasData?.length || 0);
          } else {
            // Se não há categorias que atendem aos critérios, definir como objeto vazio
            setCategorias({});
            console.log('Nenhuma categoria possui controles visíveis em projetos vinculados');
          }
          
          // ✅ LÓGICA DOS PROJETOS (mantida igual)
          // Buscar quais projetos têm controles visíveis
          const { data: projetosComControles, error: controlesError } = await supabase
            .from('controle_conteudo_geral')
            .select('projeto_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds); // Apenas dos projetos vinculados
          
          if (controlesError) throw controlesError;
          
          // Extrair IDs únicos de projetos que têm controles visíveis
          const projetosComControlesVisiveis = [...new Set(
            projetosComControles.map(item => item.projeto_id)
          )];
          
          console.log('Projetos com controles visíveis:', projetosComControlesVisiveis);
          
          // Buscar apenas os projetos que estão nas duas listas
          if (projetosComControlesVisiveis.length > 0) {
            const { data: projetosData, error: projetosError } = await supabase
              .from('projetos')
              .select('id, nome')
              .in('id', projetosComControlesVisiveis) // Apenas projetos com controles visíveis
              .order('nome');
            
            if (projetosError) throw projetosError;
            
            // Converter array em objeto para fácil acesso por ID
            const projetosObj = {};
            projetosData.forEach(proj => {
              projetosObj[proj.id] = proj.nome;
            });
            
            setProjetos(projetosObj);
            console.log('Projetos carregados para dropdown:', projetosData?.length || 0);
          } else {
            // Se não há projetos com controles visíveis, definir como objeto vazio
            setProjetos({});
            console.log('Nenhum projeto vinculado possui controles visíveis');
          }
        } else {
          // Se não há projetos vinculados, não há categorias nem projetos para mostrar
          setCategorias({});
          setProjetos({});
          console.log('Usuário não possui projetos vinculados');
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

  // Buscar documentos com base nos filtros e navegação
  useEffect(() => {
    const fetchDocumentos = async () => {
      try {
        setLoading(true);
        
        // Se o usuário não tem projetos vinculados, não mostrar nenhum documento
        if (projetosVinculados.length === 0) {
          setDocumentos([]);
          setLoading(false);
          return;
        }
        
        // Iniciar a consulta com filtros básicos obrigatórios
        let query = supabase
          .from('controle_conteudo_geral')
          .select('*')
          .eq('visivel', true)  // ← PRIMEIRO: verificar se é visível
          .not('texto_analise', 'is', null)  // ← SEGUNDO: não pode ser null
          .not('texto_analise', 'eq', '')    // ← TERCEIRO: não pode ser string vazia
          .not('texto_analise', 'eq', '<p></p>')  // ← QUARTO: não pode ser parágrafo vazio
          .in('projeto_id', projetosVinculados); // ← NOVO: Filtrar apenas projetos vinculados
          
        // Aplicar filtros de projeto e categoria se selecionados
        if (projetoSelecionado) {
          query = query.eq('projeto_id', projetoSelecionado);
        }
        
        if (categoriaSelecionada) {
          query = query.eq('categoria_id', categoriaSelecionada);
        }
        
        // Aplicar filtros baseados na aba ativa
        switch (activeTab) {
          case 'inicio':
            if (!showAllContent) {
              // Mostrar apenas não lidos
              query = query.eq('lido', false);
            }
            // Se showAllContent for true, mostra todos (sem filtro adicional)
            break;
          case 'importantes':
            query = query.eq('importante', true);
            break;
          case 'ler_depois':
            query = query.eq('ler_depois', true);
            break;
          case 'ver_todos':
            // Aplicar filtros avançados se estiverem ativos
            if (filtroImportantes) {
              query = query.eq('importante', true);
            }
            if (filtroLerDepois) {
              query = query.eq('ler_depois', true);
            }
            if (filtroArquivados) {
              query = query.eq('arquivado', true);
            }
            break;
        }
        
        // Aplicar termo de pesquisa se existir
        if (searchTerm.trim()) {
          query = query.ilike('texto_analise', `%${searchTerm.trim()}%`);
        }
        
        // ALTERAÇÃO: Ordenar por prazo_entrega se existir, caso contrário por created_at
        // Primeiro tentativa: ordenar por prazo_entrega (nulls last) e depois por created_at
        query = query.order('prazo_entrega', { ascending: false, nullsLast: true })
                     .order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setDocumentos(data || []);
      } catch (error) {
        console.error('Erro ao buscar documentos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && projetosVinculados.length >= 0) { // Permitir execução mesmo se não há projetos vinculados
      fetchDocumentos();
    }
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado, activeTab, showAllContent, filtroImportantes, filtroLerDepois, filtroArquivados, projetosVinculados]);

  // Limpar filtros
  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setFiltroImportantes(false);
    setFiltroLerDepois(false);
    setFiltroArquivados(false);
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = categoriaSelecionada || projetoSelecionado || filtroImportantes || filtroLerDepois || filtroArquivados;

  // Obter título da seção
  const getSectionTitle = () => {
    switch (activeTab) {
      case 'inicio':
        return 'Início';
      case 'importantes':
        return 'Importantes';
      case 'ler_depois':
        return 'Ler Depois';
      case 'ver_todos':
        return 'Ver Todos';
      default:
        return 'Início';
    }
  };

  // Obter subtítulo da seção
  const getSectionSubtitle = () => {
    if (projetosVinculados.length === 0) {
      return 'Nenhum projeto vinculado encontrado';
    }
    
    if (activeTab === 'inicio') {
      return showAllContent ? 'Todos os Conteúdos' : 'Conteúdos não lidos';
    }
    return `${documentos.length} conteúdos encontrados`;
  };

  // Obter indicadores de status do documento
  const getStatusIndicators = (documento) => {
    const indicators = [];
    
    // Adicionar bolinha azul se não foi lido
    if (!documento.lido) {
      indicators.push(
        <div key="nao-lido" className="w-3 h-3 bg-blue-500 rounded-full"></div>
      );
    }
    
    // Adicionar estrela se é importante
    if (documento.importante) {
      indicators.push(
        <FiStar key="importante" className="w-4 h-4 text-blue-600" />
      );
    }
    
    // Adicionar ícone de arquivo se está arquivado
    if (documento.arquivado) {
      indicators.push(
        <FiArchive key="arquivado" className="w-4 h-4 text-blue-600" />
      );
    }
    
    return indicators;
  };

  // Função para verificar se deve mostrar ícone de ler depois
  const shouldShowReadLaterIcon = (documento) => {
    return documento.ler_depois;
  };

  // Obter documento de destaque (mais recente)
  const getDestaqueDocument = () => {
    if (activeTab === 'inicio' && documentos.length > 0) {
      return documentos[0]; // O primeiro já é o mais recente devido à ordenação
    }
    return null;
  };

  // Obter documentos sem o destaque
  const getRegularDocuments = () => {
    if (activeTab === 'inicio' && documentos.length > 0) {
      return documentos.slice(1); // Remove o primeiro (destaque)
    }
    return documentos;
  };

  // ALTERAÇÃO: Formatar data - priorizar prazo_entrega, fallback para created_at
  const formatDate = (documento) => {
    // Priorizar prazo_entrega se existir, caso contrário usar created_at
    const dateString = documento.prazo_entrega || documento.created_at;
    
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  // Extrair prévia do texto
  const getTextPreview = (htmlContent, maxLength = 150) => {
    if (!htmlContent) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  // Componente customizado para ícone de grade
  const GridIcon = () => (
    <div className="w-5 h-5 grid grid-cols-3 gap-0.5">
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
    </div>
  );

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  const destaqueDoc = getDestaqueDocument();
  const regularDocs = getRegularDocuments();

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>MedCura</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Estrutura igual ao mobile */}
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
                  placeholder="Buscar conteúdo médico..."
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
            
            {/* Terceira linha: Filtros (aparecem quando showFilters é true) */}
            {showFilters && (
              <div className="mt-4 space-y-3">
                {/* Linha com os selects básicos */}
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
                
                {/* Filtros Avançados - apenas na aba "Ver Todos" */}
                {activeTab === 'ver_todos' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Filtros Avançados
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFiltroImportantes(!filtroImportantes)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroImportantes 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiStar className="w-4 h-4 mr-1" />
                        Importantes
                      </button>
                      
                      <button
                        onClick={() => setFiltroLerDepois(!filtroLerDepois)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroLerDepois 
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiClock className="w-4 h-4 mr-1" />
                        Ler Depois
                      </button>
                      
                      <button
                        onClick={() => setFiltroArquivados(!filtroArquivados)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroArquivados 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiArchive className="w-4 h-4 mr-1" />
                        Arquivados
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop: Layout original */}
          <div className="hidden lg:block">
            {/* Primeira linha: Logo, Busca e Menu */}
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
                    placeholder="Buscar conteúdo médico..."
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
                  
                  {/* Dropdown do menu */}
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
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
            </div>
            
            {/* Segunda linha: Filtros (aparecem quando showFilters é true) */}
            {showFilters && (
              <div className="space-y-3">
                {/* Linha com os selects básicos */}
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
                  
                  {/* Botão limpar - aparece só se houver filtros ativos */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                {/* Filtros Avançados - apenas na aba "Ver Todos" */}
                {activeTab === 'ver_todos' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Filtros Avançados
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFiltroImportantes(!filtroImportantes)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroImportantes 
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiStar className="w-4 h-4 mr-1" />
                        Importantes
                      </button>
                      
                      <button
                        onClick={() => setFiltroLerDepois(!filtroLerDepois)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroLerDepois 
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiClock className="w-4 h-4 mr-1" />
                        Ler Depois
                      </button>
                      
                      <button
                        onClick={() => setFiltroArquivados(!filtroArquivados)}
                        className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                          filtroArquivados 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <FiArchive className="w-4 h-4 mr-1" />
                        Arquivados
                      </button>
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
                  onClick={() => {
                    setActiveTab('inicio');
                    setShowAllContent(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'inicio'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiHome className="mr-3 h-5 w-5" />
                  Início
                </button>

                <button
                  onClick={() => setActiveTab('importantes')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'importantes'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiStar className="mr-3 h-5 w-5" />
                  Importantes
                </button>

                <button
                  onClick={() => setActiveTab('ler_depois')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'ler_depois'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiClock className="mr-3 h-5 w-5" />
                  Ler Depois
                </button>

                <button
                  onClick={() => setActiveTab('ver_todos')}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'ver_todos'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <GridIcon />
                  <span className="ml-3">Ver Todos</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            {/* Mobile: Cabeçalho da seção igual ao mobile */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black">{getSectionTitle()}</h2>
                
                {/* Botão Ver todos - apenas na seção Início */}
                {activeTab === 'inicio' && (
                  <button
                    onClick={() => setShowAllContent(!showAllContent)}
                    className="flex items-center text-gray-600 hover:text-gray-800"
                  >
                    {showAllContent ? <FiEyeOff className="w-5 h-5 mr-1" /> : <FiEye className="w-5 h-5 mr-1" />}
                    <span className="text-sm">Ver todos</span>
                  </button>
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-6">{getSectionSubtitle()}</p>
            </div>

            {/* Desktop: Cabeçalho da seção original */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-black">{getSectionTitle()}</h2>
                <p className="text-gray-600 text-sm mt-1">{getSectionSubtitle()}</p>
              </div>
              
              {/* Botão Ver todos - apenas na seção Início */}
              {activeTab === 'inicio' && (
                <button
                  onClick={() => setShowAllContent(!showAllContent)}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  {showAllContent ? <FiEyeOff className="w-5 h-5 mr-1" /> : <FiEye className="w-5 h-5 mr-1" />}
                  <span className="text-sm">Ver todos</span>
                </button>
              )}
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
            ) : (
              <div>
                {/* Mobile: Layout igual ao mobile */}
                <div className="lg:hidden">
                  {/* Card de destaque - apenas na seção Início */}
                  {destaqueDoc && (
                    <div className="mb-8">
                      <Link href={`/documento/${destaqueDoc.id}`}>
                        <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(destaqueDoc)} p-4 shadow-sm hover:shadow-md transition-shadow`}>
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
                              {destaqueDoc.descricao || 'Sem descrição'}
                            </h3>
                            <div className="flex items-center space-x-2">
                              {getStatusIndicators(destaqueDoc)}
                              {shouldShowReadLaterIcon(destaqueDoc) && (
                                <FiClock className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-sm mb-3">
                            {getTextPreview(destaqueDoc.texto_analise, 100)}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex space-x-2">
                              {destaqueDoc.projeto_id && (
                                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                  {projetos[destaqueDoc.projeto_id]}
                                </span>
                              )}
                              {destaqueDoc.categoria_id && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {categorias[destaqueDoc.categoria_id]}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center text-gray-500 text-xs">
                              <FiCalendar className="w-3 h-3 mr-1" />
                              {formatDate(destaqueDoc)}
                            </div>
                          </div>
                          
                          <div className="mt-3 flex justify-end">
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                              Destaque
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  )}

                  {/* Cards regulares - Mobile */}
                  {regularDocs.length > 0 ? (
                    regularDocs.map((documento, index) => (
                      <div key={documento.id} className={index > 0 ? "mt-4" : ""}>
                        <Link href={`/documento/${documento.id}`}>
                          <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(documento)} p-4 shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-base font-bold text-gray-900 flex-1 pr-2">
                                {documento.descricao || 'Sem descrição'}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {getStatusIndicators(documento)}
                                {shouldShowReadLaterIcon(documento) && (
                                  <FiClock className="w-4 h-4 text-blue-600" />
                                )}
                              </div>
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
                    ))
                  ) : (
                    !destaqueDoc && (
                      <div className="py-8 text-center text-gray-500">
                        Nenhum conteúdo encontrado
                      </div>
                    )
                  )}
                </div>

                {/* Desktop: Grid responsivo para desktop */}
                <div className="hidden lg:block">
                  <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {/* Card de destaque - apenas na seção Início */}
                    {destaqueDoc && (
                      <div className="lg:col-span-2 xl:col-span-3">
                        <Link href={`/documento/${destaqueDoc.id}`}>
                          <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(destaqueDoc)} p-6 shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="text-xl font-bold text-gray-900 flex-1 pr-4">
                                {destaqueDoc.descricao || 'Sem descrição'}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {getStatusIndicators(destaqueDoc)}
                                {shouldShowReadLaterIcon(destaqueDoc) && (
                                  <FiClock className="w-5 h-5 text-blue-600" />
                                )}
                              </div>
                            </div>
                            
                            <p className="text-gray-600 text-base mb-4 leading-relaxed">
                              {getTextPreview(destaqueDoc.texto_analise, 200)}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex space-x-2">
                                {destaqueDoc.projeto_id && (
                                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                                    {projetos[destaqueDoc.projeto_id]}
                                  </span>
                                )}
                                {destaqueDoc.categoria_id && (
                                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                                    {categorias[destaqueDoc.categoria_id]}
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center text-gray-500 text-sm">
                                <FiCalendar className="w-4 h-4 mr-1" />
                                {formatDate(destaqueDoc)}
                              </div>
                            </div>
                            
                            <div className="mt-4 flex justify-end">
                              <span className="px-4 py-2 bg-yellow-100 text-yellow-800 text-sm rounded-full font-medium">
                                Destaque
                              </span>
                            </div>
                          </div>
                        </Link>
                      </div>
                    )}

                    {/* Cards regulares - Desktop */}
                    {regularDocs.length > 0 ? (
                      regularDocs.map((documento) => (
                        <div key={documento.id}>
                          <Link href={`/documento/${documento.id}`}>
                            <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(documento)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
                                  {documento.descricao || 'Sem descrição'}
                                </h3>
                                <div className="flex items-center space-x-2">
                                  {getStatusIndicators(documento)}
                                  {shouldShowReadLaterIcon(documento) && (
                                    <FiClock className="w-4 h-4 text-blue-600" />
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                                {getTextPreview(documento.texto_analise)}
                              </p>
                              
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
                      ))
                    ) : (
                      !destaqueDoc && (
                        <div className="lg:col-span-2 xl:col-span-3 py-8 text-center text-gray-500">
                          Nenhum conteúdo encontrado
                        </div>
                      )
                    )}
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
            onClick={() => {
              setActiveTab('inicio');
              setShowAllContent(false);
            }}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'inicio'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiHome className="w-5 h-5" />
            <span className="text-xs font-medium">Início</span>
          </button>

          <button
            onClick={() => setActiveTab('importantes')}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'importantes'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiStar className="w-5 h-5" />
            <span className="text-xs font-medium">Importantes</span>
          </button>

          <button
            onClick={() => setActiveTab('ler_depois')}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'ler_depois'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiClock className="w-5 h-5" />
            <span className="text-xs font-medium">Ler Depois</span>
          </button>

          <button
            onClick={() => setActiveTab('ver_todos')}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'ver_todos'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <GridIcon />
            <span className="text-xs font-medium">Ver Todos</span>
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