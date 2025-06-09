// Arquivo: src/pages/indicador/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiStar, FiClock, FiArchive, FiHome, FiCalendar, FiArrowLeft } from 'react-icons/fi';

export default function IndicadorDetalhe({ user }) {
  const router = useRouter();
  const { id } = router.query; // Este é o id_controleindicador
  const [indicadores, setIndicadores] = useState([]);
  const [nomeIndicador, setNomeIndicador] = useState('');
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [infoGeral, setInfoGeral] = useState(null); // Para armazenar informações gerais do indicador
  const [marcandoComoLido, setMarcandoComoLido] = useState(false);
  const [todosMarcadosComoLidos, setTodosMarcadosComoLidos] = useState(false);

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
          .not('periodo_referencia', 'is', null)  // Filtrar apenas registros com periodo_referencia não nulo
          .order('periodo_referencia', { ascending: false });
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          router.push('/visualizacao-indicadores');
          return;
        }
        
        setIndicadores(data);
        // O nome do indicador deve ser o mesmo em todos os registros
        setNomeIndicador(data[0].indicador || 'Indicador sem nome');
        
        // Verificar se todos os registros estão marcados como lidos
        const todosLidos = data.every(indicador => indicador.lido === true);
        setTodosMarcadosComoLidos(todosLidos);
        
        // Pegar as informações gerais do primeiro registro (projeto, categoria)
        setInfoGeral({
          projeto_id: data[0].projeto_id,
          categoria_id: data[0].categoria_id,
          created_at: data[0].created_at
        });
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

  // Função para marcar todos os indicadores como lidos
  const marcarTodosComoLidos = async () => {
    if (marcandoComoLido) return;
    
    try {
      setMarcandoComoLido(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Atualizar TODOS os registros com o mesmo id_controleindicador
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({ lido: true })
        .eq('id_controleindicador', id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setIndicadores(prev => 
        prev.map(ind => ({ ...ind, lido: true }))
      );
      
      setTodosMarcadosComoLidos(true);
      
      toast.success('Todos os indicadores marcados como lidos!');
    } catch (error) {
      console.error('Erro ao marcar como lidos:', error);
      toast.error('Erro ao marcar indicadores como lidos');
    } finally {
      setMarcandoComoLido(false);
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

      {/* MOBILE: Layout com tabela */}
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
            
            {/* Tags e data - Mobile */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                {infoGeral?.projeto_id && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                    {projetos[infoGeral.projeto_id] || 'Projeto N/A'}
                  </span>
                )}
                {infoGeral?.categoria_id && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {categorias[infoGeral.categoria_id] || 'Categoria N/A'}
                  </span>
                )}
              </div>
              
              <div className="flex items-center text-gray-500 text-xs">
                <FiCalendar className="w-3 h-3 mr-1" />
                {formatDate(infoGeral?.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da página - Mobile */}
        <div className="max-w-md mx-auto px-4 py-4">
          {/* Tabela - Mobile - Compacta e Responsiva */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Período
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Valor Apresentado
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Indicador
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {indicadores.map((indicador, index) => (
                    <tr key={indicador.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 border-r border-gray-200">
                        {formatDate(indicador.periodo_referencia)}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 border-r border-gray-200">
                        {formatValue(indicador.valor_indicador_apresentado)}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900">
                        {formatValue(indicador.valor_indicador)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Rodapé com total - Mobile */}
            <div className="px-4 py-3 bg-gray-50 text-center text-gray-500 text-xs border-t">
              Total de períodos: {indicadores.length}
            </div>
          </div>

          {/* Botão Marcar como Lido - Mobile (abaixo da tabela) */}
          <div className="mt-4 mb-4">
            {!todosMarcadosComoLidos ? (
              <button
                onClick={marcarTodosComoLidos}
                disabled={marcandoComoLido}
                className={`w-full py-3 rounded-md flex items-center justify-center font-medium transition-colors ${
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
                  'Marcar como Lido'
                )}
              </button>
            ) : (
              <div className="w-full py-3 rounded-md flex items-center justify-center font-medium bg-green-500 text-white">
                ✓ Marcado como Lido
              </div>
            )}
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

      {/* DESKTOP: Layout com tabela */}
      <div className="hidden lg:block">
        {/* Header fixo com título e botão voltar - Desktop */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-8 py-6 border-b">
          <div className="max-w-6xl mx-auto">
            {/* Primeira linha: Botão Voltar + Título + Data */}
            <div className="flex items-center justify-between mb-4">
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
              
              {/* Data no lado direito */}
              <div className="flex items-center text-gray-500 text-base ml-6 flex-shrink-0">
                <FiCalendar className="w-5 h-5 mr-2" />
                {formatDate(infoGeral?.created_at)}
              </div>
            </div>
            
            {/* Segunda linha: Tags */}
            <div className="flex space-x-3">
              {infoGeral?.projeto_id && (
                <span className="px-3 py-1.5 bg-red-100 text-red-800 text-sm rounded-full font-medium">
                  {projetos[infoGeral.projeto_id] || 'Projeto N/A'}
                </span>
              )}
              {infoGeral?.categoria_id && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                  {categorias[infoGeral.categoria_id] || 'Categoria N/A'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo da página - Desktop */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Tabela - Desktop */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período de Referência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Apresentado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor do Indicador
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {indicadores.map((indicador, index) => (
                  <tr key={indicador.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatDate(indicador.periodo_referencia)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatValue(indicador.valor_indicador_apresentado)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatValue(indicador.valor_indicador)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Botão Marcar como Lido - Desktop (abaixo da tabela, canto direito) */}
          <div className="mt-6 flex justify-end">
            {!todosMarcadosComoLidos ? (
              <button
                onClick={marcarTodosComoLidos}
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
                  'Marcar como Lido'
                )}
              </button>
            ) : (
              <div className="px-4 py-2 rounded-md flex items-center font-medium bg-green-500 text-white text-sm">
                ✓ Marcado como Lido
              </div>
            )}
          </div>
          
          {/* Informações adicionais */}
          <div className="mt-4 text-center text-gray-500 text-sm">
            Total de períodos: {indicadores.length}
          </div>
        </div>
      </div>
    </div>
  );
}