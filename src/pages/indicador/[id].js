// Arquivo: src/pages/indicador/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiCheck, FiStar, FiClock, FiArchive, FiHome, FiCalendar, FiArrowLeft } from 'react-icons/fi';

export default function IndicadorDetalhe({ user }) {
  const router = useRouter();
  const { id } = router.query; // Este é o id_controleindicador
  const [indicadores, setIndicadores] = useState([]);
  const [nomeIndicador, setNomeIndicador] = useState('');
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [marcandoComoLido, setMarcandoComoLido] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  
  // Novo estado para controlar o modal de confirmação de arquivar
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [itemParaArquivar, setItemParaArquivar] = useState(null);

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

  // Buscar dados dos indicadores
  useEffect(() => {
    const fetchIndicadores = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('controle_indicador_geral')
          .select('*')
          .eq('id_controleindicador', id)
          .not('periodo_referencia', 'is', null)  // ← ADICIONADO: Filtrar apenas registros com periodo_referencia não nulo
          .order('periodo_referencia', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          router.push('/visualizacao-indicadores');
          return;
        }
        
        setIndicadores(data);
        // O nome do indicador deve ser o mesmo em todos os registros
        setNomeIndicador(data[0].indicador || 'Indicador sem nome');
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        router.push('/visualizacao-indicadores');
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchIndicadores();
    }
  }, [user, id, router]);

  // Função para alternar o status de lido de um indicador específico
  const toggleLido = async (indicadorId) => {
    if (marcandoComoLido) return;
    
    try {
      setMarcandoComoLido(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Encontrar o indicador na lista
      const indicador = indicadores.find(ind => ind.id === indicadorId);
      if (!indicador) return;
      
      const novoStatus = !indicador.lido;
      
      // Atualizar o indicador no Supabase
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({ lido: novoStatus })
        .eq('id', indicadorId)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setIndicadores(prev => 
        prev.map(ind => 
          ind.id === indicadorId ? { ...ind, lido: novoStatus } : ind
        )
      );
      
      toast.success(novoStatus ? 'Indicador marcado como lido!' : 'Indicador marcado como não lido!');
    } catch (error) {
      console.error('Erro ao alterar status de lido:', error);
      toast.error('Erro ao alterar status do indicador');
    } finally {
      setMarcandoComoLido(false);
    }
  };

  // Função para alternar status (importante, ler_depois, arquivado) de um indicador específico
  const alternarStatus = async (indicadorId, campo, valorAtual) => {
    if (atualizandoStatus) return;
    
    // Se for arquivar e o indicador não está arquivado, mostrar confirmação
    if (campo === 'arquivado' && !valorAtual) {
      setItemParaArquivar({ indicadorId, campo, valorAtual });
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
      
      // Atualizar o indicador no Supabase
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({ [campo]: novoValor })
        .eq('id', indicadorId)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setIndicadores(prev => 
        prev.map(ind => 
          ind.id === indicadorId ? { ...ind, [campo]: novoValor } : ind
        )
      );
      
      // Mensagens específicas para cada ação
      const mensagens = {
        importante: novoValor ? 'Marcado como importante!' : 'Removido dos importantes',
        ler_depois: novoValor ? 'Adicionado para ler depois!' : 'Removido de ler depois',
        arquivado: novoValor ? 'Indicador arquivado!' : 'Indicador desarquivado'
      };
      
      toast.success(mensagens[campo]);
    } catch (error) {
      console.error(`Erro ao alterar ${campo}:`, error);
      toast.error('Erro ao atualizar indicador');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  // Função para confirmar o arquivamento
  const confirmarArquivamento = async () => {
    if (!itemParaArquivar) return;
    
    setShowArchiveConfirm(false);
    
    try {
      setAtualizandoStatus(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Atualizar o indicador no Supabase - definir arquivado como TRUE
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({ arquivado: true })
        .eq('id', itemParaArquivar.indicadorId)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setIndicadores(prev => 
        prev.map(ind => 
          ind.id === itemParaArquivar.indicadorId ? { ...ind, arquivado: true } : ind
        )
      );
      
      toast.success('Indicador arquivado!');
    } catch (error) {
      console.error('Erro ao arquivar indicador:', error);
      toast.error('Erro ao arquivar indicador');
    } finally {
      setAtualizandoStatus(false);
      setItemParaArquivar(null);
    }
  };

  // Função para navegar de volta para a página inicial
  const voltarParaInicio = () => {
    router.push('/visualizacao-indicadores');
  };

  // Função para navegar de volta (desktop)
  const voltarParaInicioDesktop = () => {
    router.push('/visualizacao-indicadores');
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

  // Função para formatar valor (número com separadores de milhares)
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('pt-BR');
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

  if (!indicadores || indicadores.length === 0) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <p className="text-gray-500">Indicadores não encontrados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:bg-gray-50">
      <Head>
        <title>Indicador - {nomeIndicador}</title>
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
                Arquivar Indicador
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Tem certeza que deseja arquivar este indicador? Você poderá encontrá-lo na seção "Arquivados".
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowArchiveConfirm(false);
                    setItemParaArquivar(null);
                  }}
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

      {/* MOBILE: Layout original */}
      <div className="lg:hidden pb-20">
        {/* Header fixo com título - Mobile */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-4 py-4 border-b">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center flex-1 min-w-0">
                <Link href="/visualizacao-indicadores" className="mr-3 flex-shrink-0">
                  <FiChevronLeft className="w-6 h-6 text-blue-600" />
                </Link>
                
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {nomeIndicador}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da página - Mobile */}
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="space-y-6">
            {indicadores.map((indicador) => (
              <div key={indicador.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                {/* Header do card */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {formatDate(indicador.periodo_referencia)}
                    </h3>
                    <div className="flex space-x-2 mb-2">
                      {indicador.projeto_id && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          {projetos[indicador.projeto_id] || 'Projeto N/A'}
                        </span>
                      )}
                      {indicador.categoria_id && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {categorias[indicador.categoria_id] || 'Categoria N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicadores de status */}
                  <div className="flex items-center space-x-2 ml-4">
                    {!indicador.lido && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    )}
                    {indicador.importante && (
                      <FiStar className="w-4 h-4 text-blue-600" />
                    )}
                    {indicador.ler_depois && (
                      <FiClock className="w-4 h-4 text-blue-600" />
                    )}
                    {indicador.arquivado && (
                      <FiArchive className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>

                {/* Valores do indicador */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Valor Apresentado
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatValue(indicador.valor_indicador_apresentado)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      Valor Indicador
                    </label>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatValue(indicador.valor_indicador)}
                    </p>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex space-x-2">
                  {!indicador.lido ? (
                    <button
                      onClick={() => toggleLido(indicador.id)}
                      disabled={marcandoComoLido}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        marcandoComoLido
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {marcandoComoLido ? 'Marcando...' : 'Marcar como Lido'}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleLido(indicador.id)}
                      disabled={marcandoComoLido}
                      className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                        marcandoComoLido
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {marcandoComoLido ? 'Processando...' : 'Lido'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => alternarStatus(indicador.id, 'importante', indicador.importante)}
                    disabled={atualizandoStatus}
                    className={`p-2 rounded-md transition-colors ${
                      atualizandoStatus ? 'opacity-50' : ''
                    } ${
                      indicador.importante 
                        ? 'text-blue-600' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <FiStar className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => alternarStatus(indicador.id, 'ler_depois', indicador.ler_depois)}
                    disabled={atualizandoStatus}
                    className={`p-2 rounded-md transition-colors ${
                      atualizandoStatus ? 'opacity-50' : ''
                    } ${
                      indicador.ler_depois 
                        ? 'text-blue-600' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <FiClock className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => alternarStatus(indicador.id, 'arquivado', indicador.arquivado)}
                    disabled={atualizandoStatus}
                    className={`p-2 rounded-md transition-colors ${
                      atualizandoStatus ? 'opacity-50' : ''
                    } ${
                      indicador.arquivado 
                        ? 'text-blue-600' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <FiArchive className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Botão Voltar para Início */}
          <div className="mt-6">
            <button
              onClick={voltarParaInicio}
              className="w-full py-3 rounded-md flex items-center justify-center font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <FiHome className="mr-2" />
              Voltar para Início
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP: Layout modificado */}
      <div className="hidden lg:block">
        {/* Header fixo com título e botão voltar - Desktop */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-8 py-6 border-b">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <button 
                  onClick={voltarParaInicioDesktop}
                  className="mr-4 flex-shrink-0 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiArrowLeft className="w-6 h-6 mr-2" />
                  <span className="text-sm font-medium">Voltar</span>
                </button>
                
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {nomeIndicador}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da página - Desktop */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="grid gap-6 lg:grid-cols-2">
            {indicadores.map((indicador) => (
              <div key={indicador.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                {/* Header do card */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {formatDate(indicador.periodo_referencia)}
                    </h3>
                    <div className="flex space-x-2">
                      {indicador.projeto_id && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                          {projetos[indicador.projeto_id] || 'Projeto N/A'}
                        </span>
                      )}
                      {indicador.categoria_id && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {categorias[indicador.categoria_id] || 'Categoria N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Indicadores de status */}
                  <div className="flex items-center space-x-3 ml-6">
                    {!indicador.lido && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    )}
                    {indicador.importante && (
                      <FiStar className="w-5 h-5 text-blue-600" />
                    )}
                    {indicador.ler_depois && (
                      <FiClock className="w-5 h-5 text-blue-600" />
                    )}
                    {indicador.arquivado && (
                      <FiArchive className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>

                {/* Valores do indicador */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Valor Apresentado
                    </label>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatValue(indicador.valor_indicador_apresentado)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      Valor Indicador
                    </label>
                    <p className="text-2xl font-semibold text-gray-900">
                      {formatValue(indicador.valor_indicador)}
                    </p>
                  </div>
                </div>

                {/* Botões de ação */}
                <div className="flex items-center justify-between">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => alternarStatus(indicador.id, 'importante', indicador.importante)}
                      disabled={atualizandoStatus}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors text-sm ${
                        atualizandoStatus ? 'opacity-50' : ''
                      } ${
                        indicador.importante 
                          ? 'text-blue-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <FiStar className="w-4 h-4" />
                      <span className="font-medium">Importante</span>
                    </button>

                    <button
                      onClick={() => alternarStatus(indicador.id, 'ler_depois', indicador.ler_depois)}
                      disabled={atualizandoStatus}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors text-sm ${
                        atualizandoStatus ? 'opacity-50' : ''
                      } ${
                        indicador.ler_depois 
                          ? 'text-blue-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <FiClock className="w-4 h-4" />
                      <span className="font-medium">Ler Depois</span>
                    </button>

                    <button
                      onClick={() => alternarStatus(indicador.id, 'arquivado', indicador.arquivado)}
                      disabled={atualizandoStatus}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-md transition-colors text-sm ${
                        atualizandoStatus ? 'opacity-50' : ''
                      } ${
                        indicador.arquivado 
                          ? 'text-blue-600' 
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <FiArchive className="w-4 h-4" />
                      <span className="font-medium">Arquivar</span>
                    </button>
                  </div>

                  {!indicador.lido ? (
                    <button
                      onClick={() => toggleLido(indicador.id)}
                      disabled={marcandoComoLido}
                      className={`px-4 py-2 rounded-md flex items-center font-medium transition-colors text-sm ${
                        marcandoComoLido
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {marcandoComoLido ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                          Marcando...
                        </>
                      ) : (
                        <>
                          <FiCheck className="mr-2 h-4 w-4" />
                          Marcar como Lido
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleLido(indicador.id)}
                      disabled={marcandoComoLido}
                      className={`px-4 py-2 rounded-md flex items-center font-medium transition-colors text-sm ${
                        marcandoComoLido
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      {marcandoComoLido ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processando...
                        </>
                      ) : (
                        <>
                          <FiCheck className="mr-2 h-4 w-4" />
                          Lido
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}