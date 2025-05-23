// Arquivo: src/pages/med-curation-mobile.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiSearch, FiLogOut, FiFilter, FiX } from 'react-icons/fi';

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

  // Buscar documentos com base nos filtros e termo de pesquisa
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
          
        // Aplicar filtros se selecionados
        if (projetoSelecionado) {
          query = query.eq('projeto_id', projetoSelecionado);
        }
        
        if (categoriaSelecionada) {
          query = query.eq('categoria_id', categoriaSelecionada);
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
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado]);

  // Gerar iniciais da categoria para o avatar
  const getCategoryInitials = (categoryId) => {
    const categoryName = categorias[categoryId] || '';
    return categoryName.substring(0, 2).toUpperCase();
  };

  // Extrair um trecho do texto para mostrar como prévia
  const getTextPreview = (htmlContent, maxLength = 60) => {
    if (!htmlContent) return '';
    
    // Remover tags HTML para obter apenas o texto
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    // Limitar o tamanho e adicionar reticências se necessário
    return textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  // Limpar filtros
  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = categoriaSelecionada || projetoSelecionado;

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Visualização MedCuration</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header fixo com novo design */}
      <div className="sticky top-0 bg-white shadow-sm z-20 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          {/* Logo MC à esquerda */}
          <div className="h-10 w-10 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0 font-bold text-sm">
            MC
          </div>
          
          {/* Barra de pesquisa no centro */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-12 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Avatar/Logout à direita */}
          <button
            onClick={handleLogout}
            className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 hover:bg-blue-600 transition-colors"
            title="Logout"
          >
            <FiLogOut className="w-5 h-5" />
          </button>
        </div>
        
        {/* Botão de filtros abaixo da barra principal */}
        <div className="max-w-md mx-auto mt-3 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm transition-colors ${
              hasActiveFilters 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FiFilter className="w-4 h-4" />
            <span>Filtros</span>
            {hasActiveFilters && (
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            )}
          </button>
          
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Painel de filtros colapsável */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-4 z-10">
          <div className="max-w-md mx-auto space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Projeto Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Projeto
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={projetoSelecionado}
                  onChange={(e) => setProjetoSelecionado(e.target.value)}
                >
                  <option value="">Todos os Projetos</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>

              {/* Categoria Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={categoriaSelecionada}
                  onChange={(e) => setCategoriaSelecionada(e.target.value)}
                >
                  <option value="">Todas as Categorias</option>
                  {Object.entries(categorias).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Aplicar
                </button>
                <button
                  onClick={clearFilters}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="divide-y max-w-md mx-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : documentos.length > 0 ? (
          documentos.map((documento) => (
            <Link 
              key={documento.id} 
              href={`/documento/${documento.id}`}
              className="block px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex">
                {/* Category Avatar */}
                <div className="h-12 w-12 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mr-3 font-bold">
                  {getCategoryInitials(documento.categoria_id)}
                </div>
                
                <div className="flex-1 min-w-0">
                  {/* Document Description */}
                  <div className="flex justify-between">
                    <h2 className="text-base font-bold text-gray-900 truncate">
                      {documento.descricao || 'Sem descrição'}
                    </h2>
                    <span className="text-xs text-gray-500">
                      {new Date(documento.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {/* Text Preview */}
                  <p className="text-sm text-gray-600 truncate">
                    {getTextPreview(documento.texto_analise)}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="py-8 text-center text-gray-500">
            Nenhum documento encontrado
          </div>
        )}
      </div>
    </div>
  );
}