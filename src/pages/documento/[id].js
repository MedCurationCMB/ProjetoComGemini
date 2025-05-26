// Arquivo: src/pages/documento/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiCheck, FiStar, FiClock, FiArchive, FiHome, FiCalendar } from 'react-icons/fi';

export default function DocumentoDetalhe({ user }) {
  const router = useRouter();
  const { id } = router.query;
  const [documento, setDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [marcandoComoLido, setMarcandoComoLido] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  
  // Novo estado para controlar o modal de confirmação de arquivar
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

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
    
    // Se for arquivar e o documento não está arquivado, mostrar confirmação
    if (campo === 'arquivado' && !valorAtual) {
      setShowArchiveConfirm(true);
      return;
    }
    
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

  // Função para confirmar o arquivamento
  const confirmarArquivamento = async () => {
    setShowArchiveConfirm(false);
    
    try {
      setAtualizandoStatus(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Atualizar o documento no Supabase - definir arquivado como TRUE
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ arquivado: true })
        .eq('id', documento.id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setDocumento(prev => ({ ...prev, arquivado: true }));
      
      toast.success('Documento arquivado!');
    } catch (error) {
      console.error('Erro ao arquivar documento:', error);
      toast.error('Erro ao arquivar documento');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  // Função para navegar de volta para a página inicial
  const voltarParaInicio = () => {
    router.push('/med-curation-mobile');
  };

  // Função para formatar data
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

      {/* Modal de confirmação para arquivar */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <FiArchive className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Arquivar Documento
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Tem certeza que deseja arquivar este documento? Você poderá encontrá-lo na seção "Arquivados".
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarArquivamento}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Arquivar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header fixo com título, tags e data - MODIFICADO */}
      <div className="sticky top-0 bg-white shadow-sm z-10 px-4 py-4 border-b">
        <div className="max-w-md mx-auto">
          {/* Linha principal: Seta + Título à esquerda, Data à direita */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center flex-1 min-w-0">
              <Link href="/med-curation-mobile" className="mr-3 flex-shrink-0">
                <FiChevronLeft className="w-6 h-6 text-blue-600" />
              </Link>
              
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {documento.descricao || 'Sem descrição'}
              </h1>
            </div>
            
            <div className="flex items-center text-gray-500 text-sm ml-4 flex-shrink-0">
              <FiCalendar className="w-4 h-4 mr-1" />
              {formatDate(documento.created_at)}
            </div>
          </div>
          
          {/* Linha das tags */}
          <div className="flex space-x-2">
            {documento.projeto_id && (
              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                {projetos[documento.projeto_id] || 'Projeto N/A'}
              </span>
            )}
            {documento.categoria_id && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {categorias[documento.categoria_id] || 'Categoria N/A'}
              </span>
            )}
          </div>
        </div>
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
            className={`w-full py-3 rounded-md flex items-center justify-center font-medium transition-colors mb-3 ${
              marcandoComoLido
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {marcandoComoLido ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-2"></div>
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
          <div className="w-full py-3 rounded-md flex items-center justify-center font-medium bg-green-500 text-white mb-3">
            <FiCheck className="mr-2" />
            Documento Lido
          </div>
        )}

        {/* Novo botão Voltar para Início */}
        <button
          onClick={voltarParaInicio}
          className="w-full py-3 rounded-md flex items-center justify-center font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          <FiHome className="mr-2" />
          Voltar para Início
        </button>
      </div>

      {/* Barra fixa inferior com botões de ação - ÍCONES AZUIS CONTORNO */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-20">
        <div className="max-w-md mx-auto flex justify-center space-x-8">
          {/* Botão Importante */}
          <button
            onClick={() => alternarStatus('importante', documento.importante)}
            disabled={atualizandoStatus}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 transition-colors ${
              atualizandoStatus ? 'opacity-50' : ''
            }`}
          >
            <FiStar className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              Importante
            </span>
          </button>

          {/* Botão Ler Depois */}
          <button
            onClick={() => alternarStatus('ler_depois', documento.ler_depois)}
            disabled={atualizandoStatus}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 transition-colors ${
              atualizandoStatus ? 'opacity-50' : ''
            }`}
          >
            <FiClock className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              Ler Depois
            </span>
          </button>

          {/* Botão Arquivar */}
          <button
            onClick={() => alternarStatus('arquivado', documento.arquivado)}
            disabled={atualizandoStatus}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 transition-colors ${
              atualizandoStatus ? 'opacity-50' : ''
            }`}
          >
            <FiArchive className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-medium text-blue-600">
              Arquivar
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}