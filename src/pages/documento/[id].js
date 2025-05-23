// Arquivo: src/pages/documento/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiEye, FiEdit } from 'react-icons/fi';

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

  // Função para editar a análise
  const editarAnalise = (documento) => {
    router.push(`/tabela?editarAnalise=${documento.id}`);
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
        {/* Action Buttons */}
        <div className="flex space-x-2 mb-6">
          <button 
            onClick={() => abrirPdf(documento)}
            className="flex-1 bg-blue-100 text-blue-700 py-3 rounded-md flex items-center justify-center font-medium"
          >
            <FiEye className="mr-2" />
            Visualizar PDF
          </button>
          <button 
            onClick={() => editarAnalise(documento)}
            className="flex-1 bg-green-100 text-green-700 py-3 rounded-md flex items-center justify-center font-medium"
          >
            <FiEdit className="mr-2" />
            Editar Análise
          </button>
        </div>

        {/* Texto Análise - sem título */}
        <div 
          className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200"
          dangerouslySetInnerHTML={{ __html: documento.texto_analise || '<p>Sem texto análise</p>' }}
        />

        {/* Informações adicionais no final (opcional) */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Categoria:</span><br />
              {categorias[documento.categoria_id] || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Projeto:</span><br />
              {projetos[documento.projeto_id] || 'N/A'}
            </div>
            <div>
              <span className="font-medium">Data:</span><br />
              {new Date(documento.created_at).toLocaleDateString('pt-BR')}
            </div>
            <div>
              <span className="font-medium">Arquivo:</span><br />
              {documento.nome_arquivo || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}