// Arquivo: src/pages/med-curation-mobile.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  FiSearch, 
  FiFilter, 
  FiMenu, 
  FiHome, 
  FiStar, 
  FiClock, 
  FiGrid, // Mudança: FiGrid3X3 não existe, usar FiGrid
  FiEye, 
  FiEyeOff, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiBookmark,
  FiCalendar
} from 'react-icons/fi';

export default function MedCurationMobile({ user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Estados para controlar a navegação
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'importantes', 'ler_depois', 'ver_todos'
  const [showAllContent, setShowAllContent] = useState(false); // Para o toggle "Ver todos" na seção Início

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

  // Carregar categorias e projetos
  useEffect(() => {
    const fetchCategoriasProjetos = async () => {
      try {
        // Buscar categorias
        const { data: categoriasData, error: categoriasError } = await supabase
          .from('categorias')
          .select('id, nome');
        
        if (categoriasError) throw categoriasError;
        
        // Converter array em objeto para fácil acesso por ID
        const categoriasObj = {};
        categoriasData.forEach(cat => {
          categoriasObj[cat.id] = cat.nome;
        });
        
        setCategorias(categoriasObj);
        
        // Buscar projetos
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('id, nome');
        
        if (projetosError) throw projetosError;
        
        // Converter array em objeto para fácil acesso por ID
        const projetosObj = {};
        projetosData.forEach(proj => {
          projetosObj[proj.id] = proj.nome;
        });
        
        setProjetos(projetosObj);
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
        
        // Iniciar a consulta
        let query = supabase
          .from('base_dados_conteudo')
          .select('*')
          .not('texto_analise', 'is', null)
          .not('texto_analise', 'eq', '');
          
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
            // Sem filtro adicional, mostra todos
            break;
        }
        
        // Aplicar termo de pesquisa se existir
        if (searchTerm.trim()) {
          query = query.ilike('texto_analise', `%${searchTerm.trim()}%`);
        }
        
        // Ordenar por data de criação, do mais recente ao mais antigo
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        setDocumentos(data || []);
      } catch (error) {
        console.error('Erro ao buscar documentos:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDocumentos();
    }
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado, activeTab, showAllContent]);

  // Limpar filtros
  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = categoriaSelecionada || projetoSelecionado;

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
    if (activeTab === 'inicio') {
      return showAllContent ? 'Todos os Conteúdos' : 'Conteúdos não lidos';
    }
    return `${documentos.length} conteúdos encontrados`;
  };

  // Obter indicador de status do documento
  const getStatusIndicator = (documento) => {
    if (documento.arquivado) {
      return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
    }
    if (documento.importante) {
      return <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>;
    }
    if (!documento.lido) {
      return <div className="w-3 h-3 bg-blue-500 rounded-full"></div>;
    }
    // Se lido e não tem outros status, não mostra bolinha
    return null;
  };

  // Verificar se deve mostrar ícone de "Ler Depois"
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

  // Formatar data
  const formatDate = (dateString) => {
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
  const getTextPreview = (htmlContent, maxLength = 100) => {
    if (!htmlContent) return '';
    
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  // Componente customizado para ícone de grade (substituindo FiGrid3X3)
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
    <div className="min-h-screen bg-gray-50 pb-16">
      <Head>
        <title>MedCura</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header fixo */}
      <div className="sticky top-0 bg-white shadow-sm z-20 px-4 py-4">
        <div className="max-w-md mx-auto">
          {/* Primeira linha: Logo e Menu */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-blue-600">MedCura</h1>
            
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
              {/* Linha com os selects */}
              <div className="flex items-end space-x-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Projeto
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
                    Categoria
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
            </div>
          )}
        </div>
      </div>

      {/* Cabeçalho da seção */}
      <div className="max-w-md mx-auto px-4 py-4">
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
        
        <p className="text-gray-600 text-sm">{getSectionSubtitle()}</p>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-md mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Card de destaque - apenas na seção Início */}
            {destaqueDoc && (
              <div className="mb-8">
                <Link href={`/documento/${destaqueDoc.id}`}>
                  <div className="bg-white rounded-lg border-l-4 border-blue-500 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
                        {destaqueDoc.descricao || 'Sem descrição'}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {getStatusIndicator(destaqueDoc)}
                        {shouldShowReadLaterIcon(destaqueDoc) && (
                          <FiBookmark className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3">
                      {getTextPreview(destaqueDoc.texto_analise)}
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
                        {formatDate(destaqueDoc.created_at)}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex justify-end">
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium flex items-center">
                        ⭐ Destaque
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Cards regulares */}
            {regularDocs.length > 0 ? (
              regularDocs.map((documento, index) => (
                <div key={documento.id} className={index > 0 ? "mt-6" : ""}>
                  <Link href={`/documento/${documento.id}`}>
                    <div className="bg-white rounded-lg border-l-4 border-gray-300 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-bold text-gray-900 flex-1 pr-2">
                          {documento.descricao || 'Sem descrição'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIndicator(documento)}
                          {shouldShowReadLaterIcon(documento) && (
                            <FiBookmark className="w-4 h-4 text-blue-500" />
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
                          {formatDate(documento.created_at)}
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
        )}
      </div>

      {/* Barra de navegação inferior */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-30">
        <div className="max-w-md mx-auto flex justify-around">
          <button
            onClick={() => {
              setActiveTab('inicio');
              setShowAllContent(false); // Reset ao voltar para início
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