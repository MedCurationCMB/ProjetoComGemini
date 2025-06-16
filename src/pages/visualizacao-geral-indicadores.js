import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiBarChart2,
  FiAlertTriangle,
  FiClock,
  FiMenu,
  FiUser,
  FiSettings,
  FiLogOut,
  FiTable
} from 'react-icons/fi';

export default function VisualizacaoGeralIndicadores({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [kpis, setKpis] = useState({
    totalIndicadores: 0,
    indicadoresSemValor: 0,
    indicadoresVencidos: 0
  });
  const [tabelaProjetosCategoria, setTabelaProjetosCategoria] = useState([]);
  const [tabelaProjetos, setTabelaProjetos] = useState([]);
  const [tabelaCategorias, setTabelaCategorias] = useState([]);
  const [loadingTabelas, setLoadingTabelas] = useState(true);

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

  // Buscar dados dos KPIs
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);

        // 1. Total de indicadores na controle_indicador_geral
        const { count: totalIndicadores, error: indicadoresError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true });

        if (indicadoresError) throw indicadoresError;

        // 2. Total de indicadores sem valor definido (valor_indicador_apresentado é NULL)
        const { count: indicadoresSemValor, error: semValorError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null);

        if (semValorError) throw semValorError;

        // 3. Total de indicadores sem valor definido e com prazo vencido
        const hoje = new Date().toISOString().split('T')[0]; // Data de hoje no formato YYYY-MM-DD
        
        const { count: indicadoresVencidos, error: vencidosError } = await supabase
          .from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', hoje);

        if (vencidosError) throw vencidosError;

        // Atualizar estado com os resultados
        setKpis({
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

  // Buscar dados das tabelas
  useEffect(() => {
    const fetchTabelas = async () => {
      try {
        setLoadingTabelas(true);

        // Data de hoje para comparação de vencimento
        const hoje = new Date().toISOString().split('T')[0];

        // 1. Buscar todos os indicadores sem valor definido e vencidos
        const { data: indicadoresVencidos, error: indicadoresError } = await supabase
          .from('controle_indicador_geral')
          .select('projeto_id, categoria_id')
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', hoje)
          .not('projeto_id', 'is', null)
          .not('categoria_id', 'is', null);

        if (indicadoresError) throw indicadoresError;

        // 2. Agrupar por projeto_id e categoria_id e contar (tabela combinada)
        const agrupamentoCombinado = {};
        indicadoresVencidos.forEach(item => {
          const chave = `${item.projeto_id}_${item.categoria_id}`;
          if (!agrupamentoCombinado[chave]) {
            agrupamentoCombinado[chave] = {
              projeto_id: item.projeto_id,
              categoria_id: item.categoria_id,
              quantidade: 0
            };
          }
          agrupamentoCombinado[chave].quantidade++;
        });

        // 3. Agrupar apenas por projeto_id
        const agrupamentoProjetos = {};
        indicadoresVencidos.forEach(item => {
          if (!agrupamentoProjetos[item.projeto_id]) {
            agrupamentoProjetos[item.projeto_id] = {
              projeto_id: item.projeto_id,
              quantidade: 0
            };
          }
          agrupamentoProjetos[item.projeto_id].quantidade++;
        });

        // 4. Agrupar apenas por categoria_id
        const agrupamentoCategorias = {};
        indicadoresVencidos.forEach(item => {
          if (!agrupamentoCategorias[item.categoria_id]) {
            agrupamentoCategorias[item.categoria_id] = {
              categoria_id: item.categoria_id,
              quantidade: 0
            };
          }
          agrupamentoCategorias[item.categoria_id].quantidade++;
        });

        // 5. Buscar nomes dos projetos e categorias únicos
        const projetoIds = [...new Set(indicadoresVencidos.map(item => item.projeto_id))];
        const categoriaIds = [...new Set(indicadoresVencidos.map(item => item.categoria_id))];

        // Buscar nomes dos projetos
        const { data: projetos, error: projetosError } = await supabase
          .from('projetos')
          .select('id, nome')
          .in('id', projetoIds);

        if (projetosError) throw projetosError;

        // Buscar nomes das categorias
        const { data: categorias, error: categoriasError } = await supabase
          .from('categorias')
          .select('id, nome')
          .in('id', categoriaIds);

        if (categoriasError) throw categoriasError;

        // 6. Criar objetos de lookup
        const projetosLookup = {};
        projetos.forEach(projeto => {
          projetosLookup[projeto.id] = projeto.nome;
        });

        const categoriasLookup = {};
        categorias.forEach(categoria => {
          categoriasLookup[categoria.id] = categoria.nome;
        });

        // 7. Montar dados finais da tabela combinada (projeto + categoria)
        const dadosTabelaCombinada = Object.values(agrupamentoCombinado).map(item => ({
          projeto_id: item.projeto_id,
          categoria_id: item.categoria_id,
          nome_projeto: projetosLookup[item.projeto_id] || 'Projeto não encontrado',
          nome_categoria: categoriasLookup[item.categoria_id] || 'Categoria não encontrada',
          quantidade_vencidos: item.quantidade
        })).sort((a, b) => {
          // Ordenar por nome do projeto, depois por nome da categoria
          if (a.nome_projeto === b.nome_projeto) {
            return a.nome_categoria.localeCompare(b.nome_categoria);
          }
          return a.nome_projeto.localeCompare(b.nome_projeto);
        });

        // 8. Montar dados da tabela de projetos
        const dadosTabelaProjetos = Object.values(agrupamentoProjetos).map(item => ({
          projeto_id: item.projeto_id,
          nome_projeto: projetosLookup[item.projeto_id] || 'Projeto não encontrado',
          quantidade_vencidos: item.quantidade
        })).sort((a, b) => a.nome_projeto.localeCompare(b.nome_projeto));

        // 9. Montar dados da tabela de categorias
        const dadosTabelaCategorias = Object.values(agrupamentoCategorias).map(item => ({
          categoria_id: item.categoria_id,
          nome_categoria: categoriasLookup[item.categoria_id] || 'Categoria não encontrada',
          quantidade_vencidos: item.quantidade
        })).sort((a, b) => a.nome_categoria.localeCompare(b.nome_categoria));

        setTabelaProjetosCategoria(dadosTabelaCombinada);
        setTabelaProjetos(dadosTabelaProjetos);
        setTabelaCategorias(dadosTabelaCategorias);

      } catch (error) {
        console.error('Erro ao buscar dados das tabelas:', error);
        toast.error('Erro ao carregar tabelas de projetos e categorias');
      } finally {
        setLoadingTabelas(false);
      }
    };

    if (user) {
      fetchTabelas();
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI 1: Total de Indicadores */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Total de Indicadores</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(kpis.totalIndicadores)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <FiBarChart2 className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-gray-500">
                  Indicadores cadastrados no sistema
                </p>
              </div>
            </div>

            {/* KPI 2: Indicadores Sem Valor */}
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

            {/* KPI 3: Indicadores em Atraso */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Indicador em Atraso</p>
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

        {/* Seção das duas tabelas lado a lado */}
        {!loading && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tabela de Projetos */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiTable className="h-5 w-5 mr-2 text-blue-500" />
                Projetos com Indicadores em Atraso
              </h2>
              
              {loadingTabelas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : tabelaProjetos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiTable className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum projeto com indicadores em atraso</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Projeto
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Indicadores em Atraso
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tabelaProjetos.map((item, index) => (
                        <tr key={item.projeto_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.nome_projeto}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              {formatNumber(item.quantidade_vencidos)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  

                </div>
              )}
            </div>

            {/* Tabela de Categorias */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiTable className="h-5 w-5 mr-2 text-purple-500" />
                Categorias com Indicadores em Atraso
              </h2>
              
              {loadingTabelas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                </div>
              ) : tabelaCategorias.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiTable className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma categoria com indicadores em atraso</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Categoria
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Indicadores em Atraso
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tabelaCategorias.map((item, index) => (
                        <tr key={item.categoria_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {item.nome_categoria}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                              {formatNumber(item.quantidade_vencidos)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  

                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabela de Projetos x Categorias (mantida abaixo das duas tabelas) */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiTable className="h-5 w-5 mr-2 text-green-500" />
            Detalhamento de Indicadores em Atraso por Projeto e Categoria
          </h2>
          
          {loadingTabelas ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
            </div>
          ) : tabelaProjetosCategoria.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FiTable className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum indicador em atraso encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Projeto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Indicadores em Atraso
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tabelaProjetosCategoria.map((item, index) => (
                    <tr key={`${item.projeto_id}_${item.categoria_id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          {formatNumber(item.quantidade_vencidos)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              

            </div>
          )}
        </div>
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