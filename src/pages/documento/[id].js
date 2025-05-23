// Arquivo: src/pages/documento/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft } from 'react-icons/fi';

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

      {/* Header fixo com ícone da categoria e descrição */}
      <div className="sticky top-0 bg-white shadow-sm z-10 flex items-center p-4 border-b">
        {/* Botão de voltar à esquerda */}
        <Link href="/med-curation-mobile" className="mr-3">
          <FiChevronLeft className="w-6 h-6 text-blue-600" />
        </Link>
        
        {/* Ícone da categoria */}
        <div className="h-10 w-10 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mr-3 font-bold text-sm">
          {getCategoryInitials(documento.categoria_id)}
        </div>
        
        {/* Descrição do documento */}
        <h1 className="text-lg font-bold flex-1 truncate">
          {documento.descricao || 'Sem descrição'}
        </h1>
      </div>

      {/* Conteúdo da página */}
      <div className="max-w-md mx-auto px-4 py-4">
        {/* Texto Análise - sem título e sem botões */}
        <div 
          className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200"
          dangerouslySetInnerHTML={{ __html: documento.texto_analise || '<p>Sem texto análise</p>' }}
        />
      </div>
    </div>
  );
}