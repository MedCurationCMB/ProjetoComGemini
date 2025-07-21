// Arquivo: src/pages/documentos/[id].js - Versão Corrigida Completa
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../../components/LogoDisplay';
import { 
  FiArrowLeft,
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
  FiCalendar,
  FiFileText,
  FiArchive,
  FiExternalLink
} from 'react-icons/fi';

export default function DocumentoDetalhes({ user }) {
  const router = useRouter();
  const { id } = router.query;
  
  const [documento, setDocumento] = useState(null);
  const [itensRelacionados, setItensRelacionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingItens, setLoadingItens] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  // Estados para filtros dos itens relacionados
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroLidos, setFiltroLidos] = useState('');
  const [filtroImportantes, setFiltroImportantes] = useState(false);
  const [filtroArquivados, setFiltroArquivados] = useState(false);
  const [filtroVisivel, setFiltroVisivel] = useState('todos'); // Novo filtro para debug

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

  // Buscar dados do documento principal
  useEffect(() => {
    const fetchDocumento = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        
        // ✅ CORREÇÃO: Convertendo id para string explicitamente
        const documentoId = String(id);
        console.log('Buscando documento ID:', documentoId, 'Tipo:', typeof documentoId);
        
        // Buscar o documento na tabela controle_conteudo
        const { data: docData, error: docError } = await supabase
          .from('controle_conteudo')
          .select('*')
          .eq('id', documentoId)
          .single();
        
        if (docError) {
          console.error('Erro ao buscar documento:', docError);
          toast.error('Documento não encontrado');
          router.push('/documentos');
          return;
        }
        
        console.log('Documento encontrado:', docData);
        setDocumento(docData);
        
        // Buscar dados de categorias e projetos
        const [categoriasResponse, projetosResponse] = await Promise.all([
          supabase.from('categorias').select('id, nome'),
          supabase.from('projetos').select('id, nome')
        ]);
        
        if (categoriasResponse.data) {
          const categoriasObj = {};
          categoriasResponse.data.forEach(cat => {
            categoriasObj[cat.id] = cat.nome;
          });
          setCategorias(categoriasObj);
        }
        
        if (projetosResponse.data) {
          const projetosObj = {};
          projetosResponse.data.forEach(proj => {
            projetosObj[proj.id] = proj.nome;
          });
          setProjetos(projetosObj);
        }
        
      } catch (error) {
        console.error('Erro ao carregar documento:', error);
        toast.error('Erro ao carregar documento');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumento();
    fetchApresentacaoVariaveis();
  }, [id, user, router]);

  // ✅ BUSCAR ITENS RELACIONADOS - VERSÃO CORRIGIDA
  useEffect(() => {
    const fetchItensRelacionados = async () => {
      if (!id || !user) return;
      
      try {
        setLoadingItens(true);
        
        // ✅ CORREÇÃO: Convertendo id para string explicitamente
        const documentoId = String(id);
        console.log('Buscando itens relacionados para documento ID:', documentoId);
        
        // ✅ VERSÃO DE DEBUG: Query mais permissiva primeiro
        let query = supabase
          .from('controle_conteudo_geral')
          .select('*')
          .eq('id_controleconteudo', documentoId);
          // ✅ REMOVIDO temporariamente: .eq('visivel', true)
          // ✅ REMOVIDO temporariamente: filtros de texto
        
        console.log('Query SQL gerada:', query);
        
        // Executar query básica primeiro para debug
        const { data: allData, error: debugError } = await query;
        
        if (debugError) {
          console.error('Erro na query básica:', debugError);
          toast.error('Erro ao carregar itens relacionados');
          return;
        }
        
        console.log('Todos os registros encontrados (sem filtros):', allData);
        console.log('Quantidade total:', allData?.length || 0);
        
        // ✅ APLICAR FILTROS POSTERIORMENTE
        let filteredData = allData || [];
        
        // Aplicar filtros se ativos
        if (searchTerm.trim()) {
          filteredData = filteredData.filter(item => 
            (item.descricao && item.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (item.texto_analise && item.texto_analise.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        if (filtroLidos === 'lidos') {
          filteredData = filteredData.filter(item => item.lido === true);
        } else if (filtroLidos === 'nao_lidos') {
          filteredData = filteredData.filter(item => item.lido === false);
        }
        
        if (filtroImportantes) {
          filteredData = filteredData.filter(item => item.importante === true);
        }
        
        if (filtroArquivados) {
          filteredData = filteredData.filter(item => item.arquivado === true);
        }
        
        // ✅ NOVO: Filtro de visibilidade opcional
        if (filtroVisivel === 'visiveis') {
          filteredData = filteredData.filter(item => item.visivel === true);
        } else if (filtroVisivel === 'ocultos') {
          filteredData = filteredData.filter(item => item.visivel === false);
        }
        // Se for 'todos', não filtra
        
        console.log('Dados após filtros:', filteredData);
        console.log('Quantidade após filtros:', filteredData.length);
        
        // ✅ ORDENAÇÃO: Manter ordenação original
        filteredData.sort((a, b) => {
          // Ordenar por prazo_entrega se existir, senão por created_at
          const dateA = new Date(a.prazo_entrega || a.created_at || 0);
          const dateB = new Date(b.prazo_entrega || b.created_at || 0);
          return dateB - dateA; // Mais recentes primeiro
        });
        
        setItensRelacionados(filteredData);
        
      } catch (error) {
        console.error('Erro ao carregar itens relacionados:', error);
        toast.error('Erro ao carregar itens relacionados');
      } finally {
        setLoadingItens(false);
      }
    };

    fetchItensRelacionados();
  }, [id, user, searchTerm, filtroLidos, filtroImportantes, filtroArquivados, filtroVisivel]);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFiltroLidos('');
    setFiltroImportantes(false);
    setFiltroArquivados(false);
    setFiltroVisivel('todos');
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = searchTerm.trim() || filtroLidos || filtroImportantes || filtroArquivados || filtroVisivel !== 'todos';

  // Função para determinar a cor da borda baseada no status de leitura
  const getBorderColor = (item) => {
    return item.lido ? 'border-gray-300' : 'border-blue-500';
  };

  // Obter indicadores de status do item
  const getStatusIndicators = (item) => {
    const indicators = [];
    
    // Adicionar bolinha azul se não foi lido
    if (!item.lido) {
      indicators.push(
        <div key="nao-lido" className="w-3 h-3 bg-blue-500 rounded-full" title="Não lido"></div>
      );
    }
    
    // Adicionar estrela se é importante
    if (item.importante) {
      indicators.push(
        <FiStar key="importante" className="w-4 h-4 text-yellow-600" title="Importante" />
      );
    }
    
    // Adicionar ícone de arquivo se está arquivado
    if (item.arquivado) {
      indicators.push(
        <FiArchive key="arquivado" className="w-4 h-4 text-gray-600" title="Arquivado" />
      );
    }
    
    // ✅ NOVO: Indicador de visibilidade
    if (item.visivel === false) {
      indicators.push(
        <FiEyeOff key="oculto" className="w-4 h-4 text-gray-400" title="Oculto" />
      );
    }
    
    return indicators;
  };

  // Função para verificar se deve mostrar ícone de ler depois
  const shouldShowReadLaterIcon = (item) => {
    return item.ler_depois;
  };

  // ✅ CORREÇÃO: Formatar data usando prazo_entrega_inicial para documento principal e prazo_entrega/created_at para itens
  const formatDate = (item, isDocumentoPrincipal = false) => {
    let dateString;
    
    if (isDocumentoPrincipal) {
      // Para documento principal da tabela controle_conteudo
      dateString = item.prazo_entrega_inicial;
    } else {
      // Para itens relacionados da tabela controle_conteudo_geral
      dateString = item.prazo_entrega || item.created_at;
    }
    
    if (!dateString) return isDocumentoPrincipal ? 'Sem prazo definido' : '';
    
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

  // ✅ CORREÇÃO: Extrair prévia do texto - versão mais robusta
  const getTextPreview = (htmlContent, maxLength = 150) => {
    if (!htmlContent) return '';
    
    // Se for só tags vazias, retornar vazio
    if (htmlContent === '<p></p>' || htmlContent.trim() === '') return '';
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      // Se após extrair o texto ainda está vazio
      if (!textContent.trim()) return '';
      
      return textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '...'
        : textContent;
    } catch (e) {
      return htmlContent; // Fallback para texto original se der erro
    }
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

  // ✅ NOVO: Obter status do item
  const getItemStatus = (item) => {
    const status = [];
    
    if (!item.visivel) status.push('Oculto');
    if (item.lido) status.push('Lido');
    if (item.importante) status.push('Importante');
    if (item.ler_depois) status.push('Ler Depois');
    if (item.arquivado) status.push('Arquivado');
    
    return status.length > 0 ? status.join(', ') : 'Pendente';
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Documento não encontrado</h2>
          <Link href="/documentos" className="text-blue-600 hover:text-blue-800">
            Voltar para documentos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{documento.descricao || 'Documento'} - MedCura</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Botão voltar e Logo */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/documentos"
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <FiArrowLeft className="w-6 h-6 text-gray-600" />
              </Link>
              
              <LogoDisplay 
                className=""
                fallbackText="MedCuration"
                showFallback={true}
              />
            </div>
            
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
                  <Link href="/documentos" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                    <FiFileText className="mr-3 h-4 w-4" />
                    Documentos
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
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Informações do documento principal */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {documento.descricao || 'Sem descrição'}
              </h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {documento.projeto_id && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                    {apresentacaoVariaveis.projeto || 'Projeto'}: {projetos[documento.projeto_id]}
                  </span>
                )}
                {documento.categoria_id && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {apresentacaoVariaveis.categoria || 'Categoria'}: {categorias[documento.categoria_id]}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              {documento.obrigatorio && (
                <div className="flex items-center text-red-600">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm">Obrigatório</span>
                </div>
              )}
              {documento.tem_documento && (
                <div className="flex items-center text-green-600">
                  <FiFileText className="w-5 h-5 mr-1" />
                  <span className="text-sm">Com Anexo</span>
                </div>
              )}
              {documento.recorrencia && documento.recorrencia !== 'sem recorrencia' && (
                <div className="flex items-center text-blue-600">
                  <FiClock className="w-5 h-5 mr-1" />
                  <span className="text-sm">Recorrente</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Informações detalhadas do documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">Prazo de Entrega</h4>
              <p className="text-gray-900">
                {formatDate(documento, true)}
              </p>
            </div>
            
            {documento.recorrencia && documento.recorrencia !== 'sem recorrencia' && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Recorrência</h4>
                <p className="text-gray-900">
                  {getRecorrenciaText(documento)}
                </p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">Status</h4>
              <div className="flex flex-wrap gap-2">
                {documento.obrigatorio && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    Obrigatório
                  </span>
                )}
                {documento.tem_documento && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Tem Documento
                  </span>
                )}
                {!documento.obrigatorio && !documento.tem_documento && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Pendente
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-gray-500">
            <div className="flex items-center">
              <FiCalendar className="w-4 h-4 mr-1" />
              Criado em {formatDate(documento, true)}
            </div>
            
            <div className="text-right">
              <span className="font-medium">ID:</span> {documento.id}
            </div>
          </div>
        </div>

        {/* Seção de itens relacionados */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header dos itens relacionados */}
          <div className="p-6 border-b">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Itens Relacionados</h2>
                <p className="text-gray-600 text-sm mt-1">
                  {loadingItens ? 'Carregando...' : `${itensRelacionados.length} itens encontrados`}
                </p>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`mt-4 lg:mt-0 px-4 py-2 rounded-lg transition-colors ${
                  showFilters || hasActiveFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-4 h-4 inline mr-2" />
                Filtros
              </button>
            </div>
            
            {/* Barra de busca */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Buscar nos itens relacionados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Filtros */}
            {showFilters && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Status de Leitura
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={filtroLidos}
                      onChange={(e) => setFiltroLidos(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="lidos">Lidos</option>
                      <option value="nao_lidos">Não Lidos</option>
                    </select>
                  </div>
                  
                  {/* ✅ NOVO: Filtro de visibilidade para debug */}
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Visibilidade
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={filtroVisivel}
                      onChange={(e) => setFiltroVisivel(e.target.value)}
                    >
                      <option value="todos">Todos</option>
                      <option value="visiveis">Apenas Visíveis</option>
                      <option value="ocultos">Apenas Ocultos</option>
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
              </div>
            )}
          </div>
          
          {/* Lista de itens relacionados */}
          <div className="p-6">
            {loadingItens ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : itensRelacionados.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FiFileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item relacionado</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {hasActiveFilters 
                    ? 'Não há itens que correspondam aos filtros selecionados.'
                    : 'Este documento ainda não possui itens relacionados na curadoria.'
                  }
                </p>
                {/* ✅ NOVO: Informações de debug */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                  <p><strong>Debug Info:</strong></p>
                  <p>Documento ID: {id}</p>
                  <p>Filtros ativos: {hasActiveFilters ? 'Sim' : 'Não'}</p>
                  <p>Busca por: id_controleconteudo = {id}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {itensRelacionados.map((item) => (
                  <div key={item.id} className="block">
                    <Link 
                      href={`/documento/${item.id}`}
                      className="block"
                    >
                      <div className={`border-l-4 ${getBorderColor(item)} p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors`}>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">
                            {item.descricao || 'Sem descrição'}
                          </h3>
                          <div className="flex items-center space-x-2">
                            {getStatusIndicators(item)}
                            {shouldShowReadLaterIcon(item) && (
                              <FiClock className="w-4 h-4 text-blue-600" />
                            )}
                            <FiExternalLink className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                        
                        {/* ✅ MELHORADO: Preview do texto com fallback */}
                        {item.texto_analise && getTextPreview(item.texto_analise) && (
                          <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                            {getTextPreview(item.texto_analise, 200)}
                          </p>
                        )}
                        
                        {/* ✅ NOVO: Se não tem texto_analise, mostrar indicador */}
                        {(!item.texto_analise || !getTextPreview(item.texto_analise)) && (
                          <p className="text-gray-400 text-sm mb-3 italic">
                            Sem conteúdo de análise disponível
                          </p>
                        )}
                        
                        {/* Informações do item */}
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap space-x-2">
                            {item.projeto_id && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                {projetos[item.projeto_id] || `Projeto ${item.projeto_id}`}
                              </span>
                            )}
                            {item.categoria_id && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                {categorias[item.categoria_id] || `Categoria ${item.categoria_id}`}
                              </span>
                            )}
                            {/* ✅ NOVO: Status do item */}
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              {getItemStatus(item)}
                            </span>
                          </div>
                          
                          <div className="flex items-center text-gray-500 text-xs">
                            <FiCalendar className="w-3 h-3 mr-1" />
                            {formatDate(item, false) || 'Sem data'}
                          </div>
                        </div>
                        
                        {/* ✅ NOVO: Informações técnicas de debug */}
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>ID: {item.id}</span>
                            <span>Visível: {item.visivel ? 'Sim' : 'Não'}</span>
                            <span>Controle: {item.id_controleconteudo}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
            
            {/* ✅ NOVO: Seção de informações de debug sempre visível */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Informações de Debug</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                <div>
                  <p><strong>Documento ID:</strong> {id}</p>
                  <p><strong>Total de itens:</strong> {itensRelacionados.length}</p>
                </div>
                <div>
                  <p><strong>Filtros ativos:</strong> {hasActiveFilters ? 'Sim' : 'Não'}</p>
                  <p><strong>Loading:</strong> {loadingItens ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              
              {/* Mostrar resumo dos filtros ativos */}
              {hasActiveFilters && (
                <div className="mt-2 text-xs text-blue-600">
                  <p><strong>Filtros aplicados:</strong></p>
                  <ul className="list-disc list-inside ml-2">
                    {searchTerm && <li>Busca: "{searchTerm}"</li>}
                    {filtroLidos && <li>Leitura: {filtroLidos === 'lidos' ? 'Lidos' : 'Não lidos'}</li>}
                    {filtroImportantes && <li>Apenas importantes</li>}
                    {filtroArquivados && <li>Apenas arquivados</li>}
                    {filtroVisivel !== 'todos' && <li>Visibilidade: {filtroVisivel}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay para fechar menus quando clicar fora */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}