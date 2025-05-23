// Arquivo: src/pages/documento/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiCheck, FiStar, FiClock, FiArchive } from 'react-icons/fi';

export default function DocumentoDetalhe({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [marcandoComoLido, setMarcandoComoLido] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);

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

  // Função para marcar documento como lido
  const marcarComoLido = async () => {
    if (!documento || documento.lido) return; // Se já estiver lido, não faz nada
    
    try {
      setMarcandoComoLido(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Atualizar o documento no Supabase
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ lido: true })
        .eq('id', documento.id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setDocumento(prev => ({ ...prev, lido: true }));
      
      toast.success('Documento marcado como lido!');
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
      toast.error('Erro ao marcar documento como lido');
    } finally {
      setMarcandoComoLido(false);
    }
  };

  // Função para alternar status (importante, ler_depois, arquivado)
  const alternarStatus = async (campo, valorAtual) => {
    if (!documento || atualizandoStatus) return;
    
    try {
      setAtualizandoStatus(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      const novoValor = !valorAtual;
      
      // Atualizar o documento no Supabase
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ [campo]: novoValor })
        .eq('id', documento.id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setDocumento(prev => ({ ...prev, [campo]: novoValor }));
      
      // Mensagens específicas para cada ação
      const mensagens = {
        importante: novoValor ? 'Marcado como importante!' : 'Removido dos importantes',
        ler_depois: novoValor ? 'Adicionado para ler depois!' : 'Removido de ler depois',
        arquivado: novoValor ? 'Documento arquivado!' : 'Documento desarquivado'
      };
      
      toast.success(mensagens[campo]);
    } catch (error) {
      console.error(`Erro ao alterar ${campo}:`, error);
      toast.error('Erro ao atualizar documento');
    } finally {
      setAtualizandoStatus(false);
    }
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
    <div className="min-h-screen bg-white pb-20">
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
          className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200 mb-6"
          dangerouslySetInnerHTML={{ __html: documento.texto_analise || '<p>Sem texto análise</p>' }}
        />
        
        {/* Botão Marcar como Lido */}
        {!documento.lido ? (
          <button
            onClick={marcarComoLido}
            disabled={marcandoComoLido}
            className={`w-full py-3 rounded-md flex items-center justify-center font-medium transition-colors ${
              marcandoComoLido
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {marcandoComoLido ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-700 mr-2"></div>
                Marcando...
              </>
            ) : (
              <>
                <FiCheck className="mr-2" />
                Marcar como Lido
              </>
            )}
          </button>
        ) : (
          <div className="w-full py-3 rounded-md flex items-center justify-center font-medium bg-green-200 text-green-800">
            <FiCheck className="mr-2" />
            Documento Lido
          </div>
        )}
      </div>

      {/* Barra fixa inferior com botões de ação - APENAS ÍCONES */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
        <div className="max-w-md mx-auto flex justify-center space-x-12">
          {/* Botão Importante */}
          <button
            onClick={() => alternarStatus('importante', documento.importante)}
            disabled={atualizandoStatus}
            className={`p-2 transition-colors ${
              atualizandoStatus ? 'opacity-50' : ''
            }`}
          >
            <FiStar 
              className={`h-7 w-7 ${
                documento.importante 
                  ? 'text-yellow-500 fill-current' 
                  : 'text-gray-400 hover:text-yellow-400'
              }`} 
            />
          </button>

          {/* Botão Ler Depois */}
          <button
            onClick={() => alternarStatus('ler_depois', documento.ler_depois)}
            disabled={atualizandoStatus}
            className={`p-2 transition-colors ${
              atualizandoStatus ? 'opacity-50' : ''
            }`}
          >
            <FiClock 
              className={`h-7 w-7 ${
                documento.ler_depois 
                  ? 'text-blue-500' 
                  : 'text-gray-400 hover:text-blue-400'
              }`} 
            />
          </button>

          {/* Botão Arquivar */}
          <button
            onClick={() => alternarStatus('arquivado', documento.arquivado)}
            disabled={atualizandoStatus}
            className={`p-2 transition-colors ${
              atualizandoStatus ? 'opacity-50' : ''
            }`}
          >
            <FiArchive 
              className={`h-7 w-7 ${
                documento.arquivado 
                  ? 'text-green-500' 
                  : 'text-gray-400 hover:text-green-400'
              }`} 
            />
          </button>
        </div>
      </div>
    </div>
  );
}