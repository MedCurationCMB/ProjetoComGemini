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
  FiMenu,
  FiUser,
  FiSettings,
  FiLogOut,
  FiTable,
  FiFilter,
  FiX,
  FiCheckCircle
} from 'react-icons/fi';

export default function VisualizacaoGeralIndicadores({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [kpis, setKpis] = useState({
    totalIndicadores: 0,
    indicadoresDentroPrazo: 0,
    indicadoresSemValor: 0
  });
  const [tabelaProjetosCategoria, setTabelaProjetosCategoria] = useState([]);
  const [tabelaProjetos, setTabelaProjetos] = useState([]);
  const [tabelaCategorias, setTabelaCategorias] = useState([]);
  const [loadingTabelas, setLoadingTabelas] = useState(true);

  // Estados para filtros
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState({
    projetos: {},
    categorias: {}
  });
  const [filtros, setFiltros] = useState({
    projeto_id: '',
    categoria_id: '',
    periodo: '', // '15dias', '30dias', '60dias', 'personalizado'
    data_inicio: '',
    data_fim: ''
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

  // Função para calcular datas dos períodos com correção do fuso horário
  const calcularPeriodo = (tipo) => {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    let dataFim = new Date(hoje);

    switch (tipo) {
      case '15dias':
        dataFim.setDate(dataFim.getDate() + 15);
        break;
      case '30dias':
        dataFim.setDate(dataFim.getDate() + 30);
        break;
      case '60dias':
        dataFim.setDate(dataFim.getDate() + 60);
        break;
      default:
        return { dataInicio: null, dataFim: null };
    }

    return {
      dataInicio: formatarDataLocal(dataInicio),
      dataFim: formatarDataLocal(dataFim)
    };
  };

  // Função utilitária para formatar data local no formato yyyy-mm-dd
  const formatarDataLocal = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Função para gerar texto descritivo baseado nos filtros
  const gerarTextoDescritivo = () => {
    if (!filtros.periodo) {
      return "Todos os indicadores";
    }

    let dataInicio, dataFim;

    if (filtros.periodo === 'personalizado') {
      if (!filtros.data_inicio || !filtros.data_fim) {
        return "Todos os indicadores";
      }
      dataInicio = filtros.data_inicio;
      dataFim = filtros.data_fim;
    } else {
      const periodo = calcularPeriodo(filtros.periodo);
      dataInicio = periodo.dataInicio;
      dataFim = periodo.dataFim;
    }

    // Formatar datas para exibição (DD/MM/AAAA)
    const formatarData = (dataString) => {
      const partes = dataString.split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`; // dd/mm/yyyy
    };

    return `Indicadores com prazo de entrega entre ${formatarData(dataInicio)} e ${formatarData(dataFim)}`;
  };

  // Função auxiliar para construir query com filtros de projeto e categoria
  const construirQueryComFiltros = (queryBase) => {
    let query = queryBase;

    // Aplicar filtros de projeto e categoria
    if (filtros.projeto_id) {
      query = query.eq('projeto_id', filtros.projeto_id);
    }

    if (filtros.categoria_id) {
      query = query.eq('categoria_id', filtros.categoria_id);
    }

    return query;
  };

  // Função para aplicar filtros de data
  const aplicarFiltrosData = (queryBase) => {
    let query = queryBase;

    // Verificar se há filtro de período ativo
    const temFiltroPeriodo = filtros.periodo && filtros.periodo !== '';
    
    if (!temFiltroPeriodo) {
      // SEM FILTRO DE DATA: retorna a query sem filtro de data
      return query;
    }

    // COM FILTRO DE DATA: aplicar filtros baseado na seleção
    let dataInicioFiltro = null;
    let dataFimFiltro = null;

    if (filtros.periodo && filtros.periodo !== 'personalizado') {
      const periodo = calcularPeriodo(filtros.periodo);
      dataInicioFiltro = periodo.dataInicio;
      dataFimFiltro = periodo.dataFim;
    } else if (filtros.periodo === 'personalizado' && filtros.data_inicio && filtros.data_fim) {
      dataInicioFiltro = filtros.data_inicio;
      dataFimFiltro = filtros.data_fim;
    }

    // Aplicar filtro de data se especificado
    if (dataInicioFiltro && dataFimFiltro) {
      query = query.gte('prazo_entrega', dataInicioFiltro)
                  .lte('prazo_entrega', dataFimFiltro);
    }

    return query;
  };

  // Verificar se há filtro de período ativo
  const temFiltroPeriodoAtivo = () => {
    return filtros.periodo && 
           (filtros.periodo !== 'personalizado' || 
            (filtros.periodo === 'personalizado' && filtros.data_inicio && filtros.data_fim));
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Carregar filtros disponíveis
  useEffect(() => {
    const fetchFiltrosDisponiveis = async () => {
      try {
        // Buscar projetos únicos que têm indicadores
        const { data: projetosData, error: projetosError } = await supabase
          .from('controle_indicador_geral')
          .select('projeto_id, projetos(nome)')
          .not('projeto_id', 'is', null)
          .not('projetos.nome', 'is', null);

        if (projetosError) throw projetosError;

        // Buscar categorias únicas que têm indicadores
        const { data: categoriasData, error: categoriasError } = await supabase
          .from('controle_indicador_geral')
          .select('categoria_id, categorias(nome)')
          .not('categoria_id', 'is', null)
          .not('categorias.nome', 'is', null);

        if (categoriasError) throw categoriasError;

        // Processar projetos únicos
        const projetosUnicos = {};
        projetosData.forEach(item => {
          if (item.projeto_id && item.projetos) {
            projetosUnicos[item.projeto_id] = item.projetos.nome;
          }
        });

        // Processar categorias únicas
        const categoriasUnicas = {};
        categoriasData.forEach(item => {
          if (item.categoria_id && item.categorias) {
            categoriasUnicas[item.categoria_id] = item.categorias.nome;
          }
        });

        setFiltrosDisponiveis({
          projetos: projetosUnicos,
          categorias: categoriasUnicas
        });

      } catch (error) {
        console.error('Erro ao carregar filtros disponíveis:', error);
        toast.error('Erro ao carregar opções de filtros');
      }
    };

    if (user) {
      fetchFiltrosDisponiveis();
    }
  }, [user]);

  // Buscar dados dos KPIs
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);

        // Data de hoje para comparações
        const hoje = formatarDataLocal(new Date());

        // Verificar se há filtro de período ativo
        const temFiltroPeriodo = temFiltroPeriodoAtivo();

        if (temFiltroPeriodo) {
          // ===== COM FILTRO DE PERÍODO =====
          
          // 1. Total de indicadores no período filtrado
          let queryTotal = supabase.from('controle_indicador_geral')
            .select('*', { count: 'exact', head: true });
          
          queryTotal = construirQueryComFiltros(queryTotal);
          queryTotal = aplicarFiltrosData(queryTotal);
          
          const { count: totalIndicadoresNoPeriodo, error: totalError } = await queryTotal;
          if (totalError) throw totalError;

          // 2. Indicadores dentro do prazo (no período filtrado)
          let queryDentroPrazo = supabase.from('controle_indicador_geral')
            .select('*', { count: 'exact', head: true })
            .gte('prazo_entrega', hoje);
          
          queryDentroPrazo = construirQueryComFiltros(queryDentroPrazo);
          queryDentroPrazo = aplicarFiltrosData(queryDentroPrazo);
          
          const { count: indicadoresDentroPrazo, error: dentroPrazoError } = await queryDentroPrazo;
          if (dentroPrazoError) throw dentroPrazoError;

          // 3. Indicadores sem valor (no período filtrado)
          let querySemValor = supabase.from('controle_indicador_geral')
            .select('*', { count: 'exact', head: true })
            .is('valor_indicador_apresentado', null);
          
          querySemValor = construirQueryComFiltros(querySemValor);
          querySemValor = aplicarFiltrosData(querySemValor);
          
          const { count: indicadoresSemValor, error: semValorError } = await querySemValor;
          if (semValorError) throw semValorError;

          // Atualizar estado
          setKpis({
            totalIndicadores: totalIndicadoresNoPeriodo || 0,
            indicadoresDentroPrazo: indicadoresDentroPrazo || 0,
            indicadoresSemValor: indicadoresSemValor || 0
          });

        } else {
          // ===== SEM FILTRO DE PERÍODO (PADRÃO) =====
          
          // 1. Total de indicadores (TODOS)
          let queryTotal = supabase.from('controle_indicador_geral')
            .select('*', { count: 'exact', head: true });
          
          queryTotal = construirQueryComFiltros(queryTotal);
          
          const { count: totalIndicadores, error: totalError } = await queryTotal;
          if (totalError) throw totalError;

          // 2. Indicadores dentro do prazo (>= hoje)
          let queryDentroPrazo = supabase.from('controle_indicador_geral')
            .select('*', { count: 'exact', head: true })
            .gte('prazo_entrega', hoje);
          
          queryDentroPrazo = construirQueryComFiltros(queryDentroPrazo);
          
          const { count: indicadoresDentroPrazo, error: dentroPrazoError } = await queryDentroPrazo;
          if (dentroPrazoError) throw dentroPrazoError;

          // 3. Indicadores sem valor (TODOS)
          let querySemValor = supabase.from('controle_indicador_geral')
            .select('*', { count: 'exact', head: true })
            .is('valor_indicador_apresentado', null);
          
          querySemValor = construirQueryComFiltros(querySemValor);
          
          const { count: indicadoresSemValor, error: semValorError } = await querySemValor;
          if (semValorError) throw semValorError;

          // Atualizar estado
          setKpis({
            totalIndicadores: totalIndicadores || 0,
            indicadoresDentroPrazo: indicadoresDentroPrazo || 0,
            indicadoresSemValor: indicadoresSemValor || 0
          });
        }

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
  }, [user, filtros]);

  // Buscar dados das tabelas
  useEffect(() => {
    const fetchTabelas = async () => {
      try {
        setLoadingTabelas(true);

        // Data de hoje para comparação de vencimento
        const hoje = new Date().toISOString().split('T')[0];

        // Construir query base para indicadores vencidos
        let queryIndicadores = supabase
          .from('controle_indicador_geral')
          .select('projeto_id, categoria_id')
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', hoje)
          .not('projeto_id', 'is', null)
          .not('categoria_id', 'is', null);

        // Para as tabelas, aplicar apenas filtros de projeto e categoria, NÃO de data
        queryIndicadores = construirQueryComFiltros(queryIndicadores);

        const { data: indicadoresVencidos, error: indicadoresError } = await queryIndicadores;

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
  }, [user, filtros]);

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      projeto_id: '',
      categoria_id: '',
      periodo: '',
      data_inicio: '',
      data_fim: ''
    });
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasFiltrosAtivos = () => {
    return filtros.projeto_id || 
           filtros.categoria_id || 
           filtros.periodo || 
           (filtros.data_inicio && filtros.data_fim);
  };

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
              
              {/* Controles à direita - Mobile */}
              <div className="flex items-center space-x-3">
                {/* Botão de filtro */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-lg transition-colors ${
                    showFilters || hasFiltrosAtivos() 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FiFilter className="w-5 h-5" />
                </button>

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

            {/* Filtros Mobile */}
            {showFilters && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
                  {hasFiltrosAtivos() && (
                    <button
                      onClick={limparFiltros}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Filtro de Projeto */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Projeto</label>
                    <select
                      value={filtros.projeto_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, projeto_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os projetos</option>
                      {Object.entries(filtrosDisponiveis.projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Categoria */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                    <select
                      value={filtros.categoria_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, categoria_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todas as categorias</option>
                      {Object.entries(filtrosDisponiveis.categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Período */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Filtro por Prazo</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFiltros(prev => ({ 
                          ...prev, 
                          periodo: prev.periodo === '15dias' ? '' : '15dias',
                          data_inicio: '',
                          data_fim: ''
                        }))}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === '15dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 15 dias
                      </button>
                      
                      <button
                        onClick={() => setFiltros(prev => ({ 
                          ...prev, 
                          periodo: prev.periodo === '30dias' ? '' : '30dias',
                          data_inicio: '',
                          data_fim: ''
                        }))}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === '30dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 30 dias
                      </button>
                      
                      <button
                        onClick={() => setFiltros(prev => ({ 
                          ...prev, 
                          periodo: prev.periodo === '60dias' ? '' : '60dias',
                          data_inicio: '',
                          data_fim: ''
                        }))}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === '60dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 60 dias
                      </button>
                      
                      <button
                        onClick={() => setFiltros(prev => ({ 
                          ...prev, 
                          periodo: prev.periodo === 'personalizado' ? '' : 'personalizado'
                        }))}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === 'personalizado'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Período Personalizado
                      </button>
                    </div>
                  </div>

                  {/* Campos de data personalizada */}
                  {filtros.periodo === 'personalizado' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data Início</label>
                        <input
                          type="date"
                          value={filtros.data_inicio}
                          onChange={(e) => setFiltros(prev => ({ ...prev, data_inicio: e.target.value }))}
                          className="w-full px-2 py-2 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
                        <input
                          type="date"
                          value={filtros.data_fim}
                          onChange={(e) => setFiltros(prev => ({ ...prev, data_fim: e.target.value }))}
                          className="w-full px-2 py-2 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Header com logo e menu */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Visualização Geral"
                showFallback={true}
              />
              
              {/* Controles à direita - Desktop */}
              <div className="flex items-center space-x-3">
                {/* Botão de filtro */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-lg transition-colors ${
                    showFilters || hasFiltrosAtivos() 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FiFilter className="w-5 h-5" />
                </button>

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

            {/* Filtros Desktop */}
            {showFilters && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
                  {hasFiltrosAtivos() && (
                    <button
                      onClick={limparFiltros}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filtro de Projeto */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Projeto</label>
                    <select
                      value={filtros.projeto_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, projeto_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os projetos</option>
                      {Object.entries(filtrosDisponiveis.projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Categoria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Categoria</label>
                    <select
                      value={filtros.categoria_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, categoria_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todas as categorias</option>
                      {Object.entries(filtrosDisponiveis.categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Campos de data personalizada */}
                  {filtros.periodo === 'personalizado' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Data Início</label>
                        <input
                          type="date"
                          value={filtros.data_inicio}
                          onChange={(e) => setFiltros(prev => ({ ...prev, data_inicio: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Data Fim</label>
                        <input
                          type="date"
                          value={filtros.data_fim}
                          onChange={(e) => setFiltros(prev => ({ ...prev, data_fim: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Filtro de Período */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Filtro por Prazo</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltros(prev => ({ 
                        ...prev, 
                        periodo: prev.periodo === '15dias' ? '' : '15dias',
                        data_inicio: '',
                        data_fim: ''
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === '15dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Próximos 15 dias
                    </button>
                    
                    <button
                      onClick={() => setFiltros(prev => ({ 
                        ...prev, 
                        periodo: prev.periodo === '30dias' ? '' : '30dias',
                        data_inicio: '',
                        data_fim: ''
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === '30dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Próximos 30 dias
                    </button>
                    
                    <button
                      onClick={() => setFiltros(prev => ({ 
                        ...prev, 
                        periodo: prev.periodo === '60dias' ? '' : '60dias',
                        data_inicio: '',
                        data_fim: ''
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === '60dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Próximos 60 dias
                    </button>
                    
                    <button
                      onClick={() => setFiltros(prev => ({ 
                        ...prev, 
                        periodo: prev.periodo === 'personalizado' ? '' : 'personalizado'
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === 'personalizado'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Período Personalizado
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-black">Visualização Geral (Indicadores)</h1>
            <p className="text-gray-600 text-sm mt-1">
              {gerarTextoDescritivo()}
              {hasFiltrosAtivos() && (
                <span className="ml-2 text-blue-600 font-medium">• Filtros aplicados</span>
              )}
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  {temFiltroPeriodoAtivo() ? 'Indicadores no período filtrado' : 'Todos os indicadores do sistema'}
                </p>
              </div>
            </div>

            {/* KPI 2: Indicadores Dentro do Prazo */}
            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">Dentro do Prazo</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {formatNumber(kpis.indicadoresDentroPrazo)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <FiCheckCircle className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center">
                  <p className="text-xs text-gray-500">
                    {calculatePercentage(kpis.indicadoresDentroPrazo, kpis.totalIndicadores)}% do total
                  </p>
                </div>
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
                {hasFiltrosAtivos() && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Filtrado
                  </span>
                )}
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
                {hasFiltrosAtivos() && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Filtrado
                  </span>
                )}
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
            {hasFiltrosAtivos() && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Filtrado
              </span>
            )}
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