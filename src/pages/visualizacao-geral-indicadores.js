import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  FiFolder,
  FiBarChart3,
  FiAlertTriangle,
  FiClock,
  FiTrendingUp,
  FiCalendar
} from 'react-icons/fi';

export default function VisualizacaoGeralIndicadores({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalArquivos: 0,
    totalIndicadores: 0,
    indicadoresSemValor: 0,
    indicadoresVencidos: 0
  });

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Buscar dados dos KPIs
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);

        // 1. Total de arquivos na base_dados_conteudo
        const { count: totalArquivos, error: arquivosError } = await supabase
          .from('base_dados_conteudo')
          .select('*', { count: 'exact', head: true });

        if (arquivosError) throw arquivosError;

        // 2. Total de indicadores na controle_indicador_geral
        const { count: totalIndicadores, error: indicadoresError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true });

        if (indicadoresError) throw indicadoresError;

        // 3. Total de indicadores sem valor definido
        const { count: indicadoresSemValor, error: semValorError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null);

        if (semValorError) throw semValorError;

        // 4. Total de indicadores sem valor definido e com prazo vencido
        const hoje = new Date().toISOString().split('T')[0];
        
        const { count: indicadoresVencidos, error: vencidosError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', hoje);

        if (vencidosError) throw vencidosError;

        // Atualizar estado com os resultados
        setKpis({
          totalArquivos: totalArquivos || 0,
          totalIndicadores: totalIndicadores || 0,
          indicadoresSemValor: indicadoresSemValor || 0,
          indicadoresVencidos: indicadoresVencidos || 0
        });

      } catch (error) {
        console.error('Erro ao buscar KPIs:', error);
        toast.error('Erro ao carregar dados dos indicadores');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchKPIs();
    }
  }, [user]);

  // Função para formatar números
  const formatNumber = (number) => {
    return number.toLocaleString('pt-BR');
  };

  // Função para calcular percentual
  const calculatePercentage = (valor, total) => {
    if (total === 0) return 0;
    return ((valor / total) * 100).toFixed(1);
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Visualização Geral (Indicadores)</title>
      </Head>

      {/* Header simples */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Visualização Geral (Indicadores)</h1>
            <Link 
              href="/welcome" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Voltar
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* KPI 1: Total de Arquivos */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total de Arquivos</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(kpis.totalArquivos)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <FiFolder className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  Documentos na base de dados
                </p>
              </div>
            </div>

            {/* KPI 2: Total de Indicadores */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total de Indicadores</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(kpis.totalIndicadores)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <FiBarChart3 className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  Indicadores cadastrados no sistema
                </p>
              </div>
            </div>

            {/* KPI 3: Indicadores Sem Valor */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Sem Valor Definido</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(kpis.indicadoresSemValor)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <FiAlertTriangle className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {calculatePercentage(kpis.indicadoresSemValor, kpis.totalIndicadores)}% do total
                </p>
              </div>
            </div>

            {/* KPI 4: Indicadores Vencidos */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Prazo Vencido</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(kpis.indicadoresVencidos)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <FiClock className="h-8 w-8 text-red-500" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  {calculatePercentage(kpis.indicadoresVencidos, kpis.indicadoresSemValor)}% dos sem valor
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Seção de informações adicionais */}
        {!loading && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FiTrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Resumo da Situação
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Status dos Indicadores</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Com valor definido:</span>
                    <span className="text-sm font-medium text-green-600">
                      {formatNumber(kpis.totalIndicadores - kpis.indicadoresSemValor)} 
                      ({calculatePercentage(kpis.totalIndicadores - kpis.indicadoresSemValor, kpis.totalIndicadores)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Sem valor definido:</span>
                    <span className="text-sm font-medium text-yellow-600">
                      {formatNumber(kpis.indicadoresSemValor)} 
                      ({calculatePercentage(kpis.indicadoresSemValor, kpis.totalIndicadores)}%)
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Com prazo vencido:</span>
                    <span className="text-sm font-medium text-red-600">
                      {formatNumber(kpis.indicadoresVencidos)} 
                      ({calculatePercentage(kpis.indicadoresVencidos, kpis.totalIndicadores)}%)
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Informações</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center">
                    <FiCalendar className="h-4 w-4 mr-2 text-gray-400" />
                    Última atualização: {new Date().toLocaleDateString('pt-BR')}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    * Indicadores com prazo vencido são aqueles sem valor definido e 
                    com data de entrega anterior à data atual.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}