import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiFolder,
  FiBarChart3,
  FiAlertTriangle,
  FiClock,
  FiTrendingUp,
  FiCalendar,
  FiMenu,
  FiUser,
  FiSettings,
  FiLogOut
} from 'react-icons/fi';

export default function VisualizacaoGeralIndicadores({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [tabelaIndicadores, setTabelaIndicadores] = useState([]);
  const [kpis, setKpis] = useState({
    totalArquivos: 0,
    totalIndicadores: 0,
    indicadoresSemValor: 0,
    indicadoresVencidos: 0
  });

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

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Buscar dados dos KPIs e tabela
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

        // 3. Total de indicadores sem valor definido (valor_indicador_apresentado é NULL)
        const { count: indicadoresSemValor, error: semValorError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null);

        if (semValorError) throw semValorError;

        // 4. Total de indicadores sem valor definido e com prazo vencido
        const hoje = new Date().toISOString().split('T')[0]; // Data de hoje no formato YYYY-MM-DD
        
        const { count: indicadoresVencidos, error: vencidosError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', hoje);

        if (vencidosError) throw vencidosError;

        // 5. Buscar dados para a tabela - indicadores sem valor agrupados por projeto e categoria
        const { data: tabelaData, error: tabelaError } = await supabase
          .from('controle_indicador_geral')
          .select(`
            projeto_id,
            categoria_id,
            projetos!inner(nome),
            categorias!inner(nome)
          `)
          .is('valor_indicador_apresentado', null)
          .not('projeto_id', 'is', null)
          .not('categoria_id', 'is', null);

        if (tabelaError) throw tabelaError;

        // Processar dados da tabela para agrupar por projeto e categoria
        const agrupados = {};
        (tabelaData || []).forEach(item => {
          const key = `${item.projeto_id}-${item.categoria_id}`;
          if (!agrupados[key]) {
            agrupados[key] = {
              projeto_id: item.projeto_id,
              categoria_id: item.categoria_id,
              nome_projeto: item.projetos?.nome || 'N/A',
              nome_categoria: item.categorias?.nome || 'N/A',
              count: 0
            };
          }
          agrupados[key].count++;
        });

        // Converter objeto em array e ordenar
        const tabelaFinal = Object.values(agrupados).sort((a, b) => {
          // Ordenar por count decrescente, depois por nome do projeto
          if (b.count !== a.count) {
            return b.count - a.count;
          }
          return a.nome_projeto.localeCompare(b.nome_projeto);
        });

        // Atualizar estados
        setKpis({
          totalArquivos: totalArquivos || 0,
          totalIndicadores: totalIndicadores || 0,
          indicadoresSemValor: indicadoresSemValor || 0,
          indicadoresVencidos: indicadoresVencidos || 0
        });

        setTabelaIndicadores(tabelaFinal);

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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Header com logo e menu */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Visualização Geral"
                showFallback={true}
              />
              
              {/* Menu hambúrguer */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <FiMenu className="w-6 h-6 text-gray-600" />
                </button>
                
                {/* Dropdown do menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        // TODO: Implementar perfil
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        // TODO: Implementar configurações
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiSettings className="mr-3 h-4 w-4" />
                      Configurações
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600"
                    >
                      <FiLogOut className="mr-3 h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop: Header com logo e menu */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between">
              <LogoDisplay 
                className=""
                fallbackText="Visualização Geral"
                showFallback={true}
              />
              
              {/* Menu hambúrguer - Desktop */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <FiMenu className="w-6 h-6 text-gray-600" />
                </button>
                
                {/* Dropdown do menu */}
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        // TODO: Implementar perfil
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        // TODO: Implementar configurações
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiSettings className="mr-3 h-4 w-4" />
                      Configurações
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleLogout();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600"
                    >
                      <FiLogOut className="mr-3 h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-black">Visualização Geral (Indicadores)</h1>
            <p className="text-gray-600 text-sm mt-1">Dashboard com métricas principais do sistema</p>
          </div>
          
          <Link 
            href="/welcome" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Voltar
          </Link>
        </div>

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
                <div className="flex items-center">
                  <p className="text-xs text-gray-500">
                    {calculatePercentage(kpis.indicadoresSemValor, kpis.totalIndicadores)}% do total
                  </p>
                </div>
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
                <div className="flex items-center">
                  <p className="text-xs text-gray-500">
                    {calculatePercentage(kpis.indicadoresVencidos, kpis.indicadoresSemValor)}% dos sem valor
                  </p>
                </div>
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

        {/* Tabela de Indicadores sem Valor por Projeto e Categoria */}
        {!loading && tabelaIndicadores.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FiAlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Indicadores Sem Valor por Projeto e Categoria
            </h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome do Projeto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome da Categoria
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Indicadores Sem Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tabelaIndicadores.map((item, index) => (
                    <tr key={`${item.projeto_id}-${item.categoria_id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.nome_projeto}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.nome_categoria}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                          item.count > 10 
                            ? 'bg-red-100 text-red-800'
                            : item.count > 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {formatNumber(item.count)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Rodapé da tabela */}
            <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
              <span>
                Total de combinações: {formatNumber(tabelaIndicadores.length)}
              </span>
              <span>
                Total de indicadores sem valor: {formatNumber(tabelaIndicadores.reduce((sum, item) => sum + item.count, 0))}
              </span>
            </div>
          </div>
        )}

        {/* Mensagem caso não haja dados na tabela */}
        {!loading && tabelaIndicadores.length === 0 && kpis.indicadoresSemValor > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FiAlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Indicadores Sem Valor por Projeto e Categoria
            </h2>
            <div className="text-center py-8">
              <div className="text-gray-500">
                <p>Existem indicadores sem valor definido, mas eles não possuem projeto ou categoria associados.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay para fechar menus quando clicar fora */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}