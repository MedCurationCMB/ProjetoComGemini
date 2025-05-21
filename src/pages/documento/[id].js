// Arquivo: src/pages/documento/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { FiChevronLeft, FiDownload, FiEdit } from 'react-icons/fi';

export default function DocumentoDetalhe({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});

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

  // Buscar dados do documento
  useEffect(() => {
    const fetchDocumento = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('base_dados_conteudo')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        
        setDocumento(data);
      } catch (error) {
        console.error('Erro ao buscar documento:', error);
        router.push('/med-curation-mobile');
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchDocumento();
    }
  }, [user, id, router]);

  // Gerar iniciais da categoria para o avatar
  const getCategoryInitials = (categoryId) => {
    const categoryName = categorias[categoryId] || '';
    return categoryName.substring(0, 2).toUpperCase();
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <p className="text-gray-500">Documento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>Documento - {documento.descricao || 'Sem descrição'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <Link href="/med-curation-mobile" className="mr-4">
            <FiChevronLeft className="w-6 h-6 text-blue-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">{documento.descricao || 'Sem descrição'}</h1>
            <div className="flex text-xs text-gray-500 mt-1">
              <span className="mr-2">{categorias[documento.categoria_id] || 'Categoria N/A'}</span>
              <span>•</span>
              <span className="ml-2">{projetos[documento.projeto_id] || 'Projeto N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Category Avatar + Info */}
        <div className="flex items-center mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mr-4 font-bold text-lg">
            {getCategoryInitials(documento.categoria_id)}
          </div>
          
          <div>
            <p className="text-sm text-gray-500">
              Data: {new Date(documento.created_at).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500">
              Arquivo: {documento.nome_arquivo || 'N/A'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-2 mb-6">
          <button className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-md flex items-center justify-center">
            <FiDownload className="mr-2" />
            Baixar PDF
          </button>
          <button className="flex-1 bg-green-100 text-green-700 py-2 rounded-md flex items-center justify-center">
            <FiEdit className="mr-2" />
            Editar Análise
          </button>
        </div>

        {/* Texto Análise */}
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-3">Texto Análise</h2>
          <div 
            className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200"
            dangerouslySetInnerHTML={{ __html: documento.texto_analise || '<p>Sem texto análise</p>' }}
          />
        </div>
      </div>
    </div>
  );
}