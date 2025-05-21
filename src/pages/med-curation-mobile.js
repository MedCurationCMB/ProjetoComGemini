// Arquivo: src/pages/med-curation-mobile.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiSearch, FiChevronLeft, FiPlusCircle, FiEdit, FiX, FiExternalLink, FiEye } from 'react-icons/fi';

export default function MedCurationMobile({ user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  
  // Estados para o diálogo de detalhes do documento
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [carregandoDocumento, setCarregandoDocumento] = useState(false);

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

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

  // Função para abrir o diálogo de detalhes do documento
  const abrirDetalheDocumento = async (documentoId) => {
    try {
      setCarregandoDocumento(true);
      
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .select('*')
        .eq('id', documentoId)
        .single();
      
      if (error) throw error;
      
      setDocumentoSelecionado(data);
    } catch (error) {
      console.error('Erro ao buscar detalhes do documento:', error);
      toast.error('Erro ao carregar detalhes do documento');
    } finally {
      setCarregandoDocumento(false);
    }
  };

  // Função para fechar o diálogo de detalhes
  const fecharDetalheDocumento = () => {
    setDocumentoSelecionado(null);
  };

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

  // Função para visualizar o PDF
  const abrirPdf = async (documento) => {
    try {
      // Mostrar loading
      toast.loading('Preparando arquivo para visualização...');
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.dismiss();
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Obter URL temporária
      const response = await fetch(`/api/get_download_url?id=${documento.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar o link de acesso');
      }
      
      const result = await response.json();
      
      if (!result || !result.url) {
        throw new Error('Não foi possível gerar o link de acesso');
      }
      
      // Remover toast de loading
      toast.dismiss();
      
      // Abrir em nova aba
      window.open(result.url, '_blank');
    } catch (error) {
      toast.dismiss();
      console.error('Erro ao abrir PDF:', error);
      toast.error('Erro ao processar o arquivo');
    }
  };

  // Nova função para editar a análise
  const editarAnalise = (documento) => {
    router.push(`/tabela?editarAnalise=${documento.id}`);
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Visualização MedCuration (Celular)</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header */}
      <div className="bg-white shadow-sm z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <Link href="/welcome" className="mr-4">
            <FiChevronLeft className="w-6 h-6 text-blue-600" />
          </Link>
          <h1 className="text-xl font-bold flex-grow">Visualização MedCuration (Celular)</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white px-4 py-2 sticky top-0 z-10">
        <div className="relative max-w-md mx-auto">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            placeholder="Pesquisar em texto análise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white px-4 py-2 border-b">
        <div className="flex space-x-2 max-w-md mx-auto">
          {/* Projeto Filter */}
          <div className="flex-1">
            <select
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm"
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
          <div className="flex-1">
            <select
              className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm"
              value={categoriaSelecionada}
              onChange={(e) => setCategoriaSelecionada(e.target.value)}
            >
              <option value="">Todas as Categorias</option>
              {Object.entries(categorias).map(([id, nome]) => (
                <option key={id} value={id}>{nome}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Document List */}
      <div className="divide-y max-w-md mx-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : documentos.length > 0 ? (
          documentos.map((documento) => (
            <div 
              key={documento.id} 
              className="flex px-4 py-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => abrirDetalheDocumento(documento.id)}
            >
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
          ))
        ) : (
          <div className="py-8 text-center text-gray-500">
            Nenhum documento encontrado
          </div>
        )}
      </div>

      {/* Diálogo de Detalhes do Documento */}
      {documentoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-end md:items-center justify-center">
          <div className="relative bg-white w-full max-w-md md:rounded-t-lg rounded-t-xl max-h-[85vh] overflow-y-auto">
            {/* Barra superior com botão de fechar */}
            <div className="sticky top-0 bg-white shadow-sm z-10 flex items-center p-4 border-b">
              <button 
                onClick={fecharDetalheDocumento}
                className="text-gray-500 hover:text-gray-700 mr-3"
              >
                <FiX className="h-6 w-6" />
              </button>
              <h2 className="text-lg font-bold flex-1 truncate">
                {documentoSelecionado.descricao || 'Sem descrição'}
              </h2>
            </div>

            {carregandoDocumento ? (
              <div className="flex justify-center items-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="p-4">
                {/* Category Avatar + Info */}
                <div className="flex items-center mb-6">
                  <div className="h-16 w-16 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mr-4 font-bold text-lg">
                    {getCategoryInitials(documentoSelecionado.categoria_id)}
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">
                      Data: {new Date(documentoSelecionado.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-500">
                      Arquivo: {documentoSelecionado.nome_arquivo || 'N/A'}
                    </p>
                    <div className="flex text-xs text-gray-500 mt-1">
                      <span className="mr-2">{categorias[documentoSelecionado.categoria_id] || 'Categoria N/A'}</span>
                      <span>•</span>
                      <span className="ml-2">{projetos[documentoSelecionado.projeto_id] || 'Projeto N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mb-6">
                  <button 
                    onClick={() => abrirPdf(documentoSelecionado)}
                    className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-md flex items-center justify-center"
                  >
                    <FiEye className="mr-2" />
                    Visualizar PDF
                  </button>
                  <button 
                    onClick={() => editarAnalise(documentoSelecionado)}
                    className="flex-1 bg-green-100 text-green-700 py-2 rounded-md flex items-center justify-center"
                  >
                    <FiEdit className="mr-2" />
                    Editar Análise
                  </button>
                </div>

                {/* Texto Análise */}
                <div className="mb-4">
                  <h2 className="text-lg font-bold mb-3">Texto Análise</h2>
                  <div 
                    className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200"
                    dangerouslySetInnerHTML={{ __html: documentoSelecionado.texto_analise || '<p>Sem texto análise</p>' }}
                  />
                </div>

                {/* Ver na página completa */}
                <div className="mt-6 mb-2 text-center">
                  <Link
                    href={`/tabela?documento=${documentoSelecionado.id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800"
                  >
                    <FiExternalLink className="mr-1" />
                    Ver na versão completa
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}