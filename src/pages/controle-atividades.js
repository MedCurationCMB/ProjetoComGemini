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
  FiCheckCircle,
  FiClock,
  FiHome,
  FiAlertOctagon,
  FiStar,
  FiClipboard,
  FiBarChart,
  FiCpu,
  FiList,
  FiFolder,
  FiTrendingUp,
  FiEdit3,
  FiUsers,
  FiTarget,
  FiCalendar,
  FiActivity,
  FiAward,
  FiGlobe
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi';

export default function ControleEficienciaTimes({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingDisciplina, setLoadingDisciplina] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // KPIs principais de eficiência - GLOBAIS
  const [kpisEficiencia, setKpisEficiencia] = useState({
    totalTarefas: 0,
    tarefasCompletas: 0,
    tarefasPendentes: 0,
    taxaConclusao: 0
  });

  // KPIs de disciplina (rotinas) - GLOBAIS
  const [kpisDisciplina, setKpisDisciplina] = useState({
    totalRotinas: 0,
    rotinasCompletas: 0,
    rotinasPendentes: 0,
    taxaDisciplina: 0
  });

  // Dados das tabelas - GLOBAIS
  const [tabelaTimes, setTabelaTimes] = useState([]);
  const [tabelaUsuarios, setTabelaUsuarios] = useState([]);
  const [tabelaRankingTimes, setTabelaRankingTimes] = useState([]);
  const [loadingTabelas, setLoadingTabelas] = useState(true);

  // Estados para filtros
  const [filtrosDisponiveis, setFiltrosDisponiveis] = useState({
    times: {},
    usuarios: {}
  });

  // Estado para controlar a navegação
  const [activeTab] = useState('times');

  // Função utilitária para formatar data local no formato yyyy-mm-dd
  const formatarDataLocal = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Função para calcular período padrão (últimos 30 dias)
  const calcularPeriodoPadrao = () => {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 30);

    return {
      dataInicio: formatarDataLocal(dataInicio),
      dataFim: formatarDataLocal(hoje),
      periodo: '30dias'
    };
  };

  // Inicializar filtros com período padrão
  const [filtros, setFiltros] = useState(() => {
    const periodoPadrao = calcularPeriodoPadrao();
    return {
      time_id: '',
      usuario_id: '',
      periodo: periodoPadrao.periodo,
      data_inicio: periodoPadrao.dataInicio,
      data_fim: periodoPadrao.dataFim
    };
  });

  // FUNÇÕES DE NAVEGAÇÃO
  const handleIndicadoresClick = () => {
    router.push('/visualizacao-indicadores');
  };

  const handleImportantesClick = () => {
    router.push('/visualizacao-indicadores-importantes');
  };

  const handleRegistrosClick = () => {
    router.push('/controle-indicador-geral');
  };

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

  const handleHistoricoAcessos = () => {
    router.push('/historico-acessos');
  };

  const handleConfiguracoesClick = () => {
    router.push('/configuracoes');
  };

  const handleInicioClick = () => {
    router.push('/inicio');
  };

  const handleAnalisesIndicadoresClick = () => {
    router.push('/analise-multiplos-indicadores');
  };

  // Função para calcular datas dos períodos
  const calcularPeriodo = (tipo) => {
    const hoje = new Date();
    let dataInicio = new Date(hoje);
    const dataFim = new Date(hoje);

    switch (tipo) {
      case '7dias':
        dataInicio.setDate(dataInicio.getDate() - 7);
        break;
      case '30dias':
        dataInicio.setDate(dataInicio.getDate() - 30);
        break;
      case '60dias':
        dataInicio.setDate(dataInicio.getDate() - 60);
        break;
      default:
        return { dataInicio: null, dataFim: null };
    }

    return {
      dataInicio: formatarDataLocal(dataInicio),
      dataFim: formatarDataLocal(dataFim)
    };
  };

  // Função para gerar texto descritivo baseado nos filtros
  const gerarTextoDescritivo = () => {
    let descricao = "Dados globais de todos os usuários e times";
    
    if (!filtros.periodo) {
      return descricao + " - Todos os períodos";
    }

    let dataInicio, dataFim;

    if (filtros.periodo === 'personalizado') {
      if (!filtros.data_inicio || !filtros.data_fim) {
        return descricao + " - Todos os períodos";
      }
      dataInicio = filtros.data_inicio;
      dataFim = filtros.data_fim;
    } else {
      const periodo = calcularPeriodo(filtros.periodo);
      dataInicio = periodo.dataInicio;
      dataFim = periodo.dataFim;
    }

    const formatarData = (dataString) => {
      const partes = dataString.split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    return `${descricao} entre ${formatarData(dataInicio)} e ${formatarData(dataFim)}`;
  };

  // Função auxiliar para construir query com filtros - SEM RESTRIÇÕES DE USUÁRIO
  const construirQueryComFiltros = (queryBase, tabela = 'tasks') => {
    let query = queryBase;

    // Aplicar filtros de data
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

    if (dataInicioFiltro && dataFimFiltro) {
      if (tabela === 'tasks') {
        query = query.gte('created_at', dataInicioFiltro)
                    .lte('created_at', dataFimFiltro + 'T23:59:59');
      } else if (tabela === 'routine_tasks_status') {
        query = query.gte('date', dataInicioFiltro)
                    .lte('date', dataFimFiltro);
      }
    }

    return query;
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Carregar filtros disponíveis - GLOBAIS (todos os times e usuários)
  useEffect(() => {
    const fetchFiltrosDisponiveis = async () => {
      try {
        // Buscar TODOS os times (listas) disponíveis - SEM RESTRIÇÕES
        const { data: timesData, error: timesError } = await supabase
          .from('tasks_list')
          .select('id, nome_lista')
          .order('nome_lista');

        if (timesError) throw timesError;

        // Buscar TODOS os usuários disponíveis - SEM RESTRIÇÕES
        const { data: usuariosData, error: usuariosError } = await supabase
          .from('usuarios')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome');

        if (usuariosError) throw usuariosError;

        const timesMap = {};
        timesData.forEach(time => {
          timesMap[time.id] = time.nome_lista;
        });

        const usuariosMap = {};
        usuariosData.forEach(usuario => {
          usuariosMap[usuario.id] = usuario.nome;
        });

        setFiltrosDisponiveis({
          times: timesMap,
          usuarios: usuariosMap
        });

        console.log(`Carregados ${timesData.length} times e ${usuariosData.length} usuários`);

      } catch (error) {
        console.error('Erro ao carregar filtros disponíveis:', error);
        toast.error('Erro ao carregar opções de filtros');
      }
    };

    if (user) {
      fetchFiltrosDisponiveis();
    }
  }, [user]);

  // Buscar dados dos KPIs de eficiência (tarefas normais) - GLOBAIS
  useEffect(() => {
    const fetchKPIsEficiencia = async () => {
      try {
        setLoading(true);

        // Total de tarefas no período - TODAS AS TAREFAS DE TODOS OS USUÁRIOS
        let queryTotal = supabase.from('tasks')
          .select('*', { count: 'exact', head: true });
        
        queryTotal = construirQueryComFiltros(queryTotal, 'tasks');
        
        // Aplicar filtros opcionais (não obrigatórios)
        if (filtros.time_id) {
          queryTotal = queryTotal.eq('task_list_id', filtros.time_id);
        }
        
        if (filtros.usuario_id) {
          queryTotal = queryTotal.eq('usuario_id', filtros.usuario_id);
        }

        const { count: totalTarefas, error: totalError } = await queryTotal;
        if (totalError) throw totalError;

        // Tarefas completas - TODAS AS TAREFAS COMPLETAS DE TODOS OS USUÁRIOS
        let queryCompletas = supabase.from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('completed', true);
        
        queryCompletas = construirQueryComFiltros(queryCompletas, 'tasks');
        
        // Aplicar filtros opcionais (não obrigatórios)
        if (filtros.time_id) {
          queryCompletas = queryCompletas.eq('task_list_id', filtros.time_id);
        }
        
        if (filtros.usuario_id) {
          queryCompletas = queryCompletas.eq('usuario_id', filtros.usuario_id);
        }

        const { count: tarefasCompletas, error: completasError } = await queryCompletas;
        if (completasError) throw completasError;

        const tarefasPendentes = (totalTarefas || 0) - (tarefasCompletas || 0);
        const taxaConclusao = totalTarefas > 0 ? ((tarefasCompletas || 0) / totalTarefas * 100) : 0;

        setKpisEficiencia({
          totalTarefas: totalTarefas || 0,
          tarefasCompletas: tarefasCompletas || 0,
          tarefasPendentes: tarefasPendentes,
          taxaConclusao: taxaConclusao
        });

        console.log(`KPIs Eficiência: ${totalTarefas} total, ${tarefasCompletas} completas`);

      } catch (error) {
        console.error('Erro ao buscar KPIs de eficiência:', error);
        toast.error('Erro ao carregar dados de eficiência');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchKPIsEficiencia();
    }
  }, [user, filtros]);

  // Buscar dados dos KPIs de disciplina (rotinas) - GLOBAIS
  useEffect(() => {
    const fetchKPIsDisciplina = async () => {
      try {
        setLoadingDisciplina(true);

        // Total de rotinas no período - TODAS AS ROTINAS DE TODOS OS USUÁRIOS
        let queryTotalRotinas = supabase.from('routine_tasks_status')
          .select('*', { count: 'exact', head: true });
        
        queryTotalRotinas = construirQueryComFiltros(queryTotalRotinas, 'routine_tasks_status');

        // Se há filtro de time ou usuário, precisamos fazer join
        if (filtros.time_id || filtros.usuario_id) {
          queryTotalRotinas = supabase.from('routine_tasks_status')
            .select(`
              *,
              routine_tasks!inner(
                task_list_id,
                usuario_id
              )
            `, { count: 'exact', head: true });
          
          queryTotalRotinas = construirQueryComFiltros(queryTotalRotinas, 'routine_tasks_status');
          
          if (filtros.time_id) {
            queryTotalRotinas = queryTotalRotinas.eq('routine_tasks.task_list_id', filtros.time_id);
          }
          
          if (filtros.usuario_id) {
            queryTotalRotinas = queryTotalRotinas.eq('routine_tasks.usuario_id', filtros.usuario_id);
          }
        }

        const { count: totalRotinas, error: totalRotinasError } = await queryTotalRotinas;
        if (totalRotinasError) throw totalRotinasError;

        // Rotinas completas - TODAS AS ROTINAS COMPLETAS DE TODOS OS USUÁRIOS
        let queryRotinasCompletas = supabase.from('routine_tasks_status')
          .select('*', { count: 'exact', head: true })
          .eq('completed', true);
        
        queryRotinasCompletas = construirQueryComFiltros(queryRotinasCompletas, 'routine_tasks_status');

        if (filtros.time_id || filtros.usuario_id) {
          queryRotinasCompletas = supabase.from('routine_tasks_status')
            .select(`
              *,
              routine_tasks!inner(
                task_list_id,
                usuario_id
              )
            `, { count: 'exact', head: true })
            .eq('completed', true);
          
          queryRotinasCompletas = construirQueryComFiltros(queryRotinasCompletas, 'routine_tasks_status');
          
          if (filtros.time_id) {
            queryRotinasCompletas = queryRotinasCompletas.eq('routine_tasks.task_list_id', filtros.time_id);
          }
          
          if (filtros.usuario_id) {
            queryRotinasCompletas = queryRotinasCompletas.eq('routine_tasks.usuario_id', filtros.usuario_id);
          }
        }

        const { count: rotinasCompletas, error: rotinasCompletasError } = await queryRotinasCompletas;
        if (rotinasCompletasError) throw rotinasCompletasError;

        const rotinasPendentes = (totalRotinas || 0) - (rotinasCompletas || 0);
        const taxaDisciplina = totalRotinas > 0 ? ((rotinasCompletas || 0) / totalRotinas * 100) : 0;

        setKpisDisciplina({
          totalRotinas: totalRotinas || 0,
          rotinasCompletas: rotinasCompletas || 0,
          rotinasPendentes: rotinasPendentes,
          taxaDisciplina: taxaDisciplina
        });

        console.log(`KPIs Disciplina: ${totalRotinas} total, ${rotinasCompletas} completas`);

      } catch (error) {
        console.error('Erro ao buscar KPIs de disciplina:', error);
        toast.error('Erro ao carregar dados de disciplina');
      } finally {
        setLoadingDisciplina(false);
      }
    };

    if (user) {
      fetchKPIsDisciplina();
    }
  }, [user, filtros]);

  // Buscar dados das tabelas - GLOBAIS (todos os times e usuários)
  useEffect(() => {
    const fetchTabelas = async () => {
      try {
        setLoadingTabelas(true);

        // Buscar TODOS os dados por time - SEM RESTRIÇÕES DE USUÁRIO
        const { data: timesComTarefas, error: timesError } = await supabase
          .from('tasks')
          .select(`
            task_list_id,
            completed,
            created_at,
            tasks_list!inner(nome_lista)
          `);

        if (timesError) throw timesError;

        // Buscar TODOS os dados de rotinas por time - SEM RESTRIÇÕES DE USUÁRIO
        const { data: timesComRotinas, error: timesRotinasError } = await supabase
          .from('routine_tasks_status')
          .select(`
            completed,
            date,
            routine_tasks!inner(
              task_list_id,
              tasks_list!inner(nome_lista)
            )
          `);

        if (timesRotinasError) throw timesRotinasError;

        // Processar dados dos times
        const timesMap = {};
        
        // Filtrar tarefas por data se necessário
        let tarefasFiltradas = timesComTarefas;
        if (filtros.periodo && filtros.periodo !== 'personalizado') {
          const periodo = calcularPeriodo(filtros.periodo);
          if (periodo.dataInicio && periodo.dataFim) {
            tarefasFiltradas = timesComTarefas.filter(tarefa => {
              const dataTarefa = tarefa.created_at.split('T')[0];
              return dataTarefa >= periodo.dataInicio && dataTarefa <= periodo.dataFim;
            });
          }
        } else if (filtros.periodo === 'personalizado' && filtros.data_inicio && filtros.data_fim) {
          tarefasFiltradas = timesComTarefas.filter(tarefa => {
            const dataTarefa = tarefa.created_at.split('T')[0];
            return dataTarefa >= filtros.data_inicio && dataTarefa <= filtros.data_fim;
          });
        }

        // Filtrar rotinas por data se necessário
        let rotinasFiltradas = timesComRotinas;
        if (filtros.periodo && filtros.periodo !== 'personalizado') {
          const periodo = calcularPeriodo(filtros.periodo);
          if (periodo.dataInicio && periodo.dataFim) {
            rotinasFiltradas = timesComRotinas.filter(rotina => {
              return rotina.date >= periodo.dataInicio && rotina.date <= periodo.dataFim;
            });
          }
        } else if (filtros.periodo === 'personalizado' && filtros.data_inicio && filtros.data_fim) {
          rotinasFiltradas = timesComRotinas.filter(rotina => {
            return rotina.date >= filtros.data_inicio && rotina.date <= filtros.data_fim;
          });
        }

        // Processar tarefas normais
        tarefasFiltradas.forEach(tarefa => {
          const timeId = tarefa.task_list_id;
          const nomeTime = tarefa.tasks_list.nome_lista;
          
          if (!timesMap[timeId]) {
            timesMap[timeId] = {
              id: timeId,
              nome: nomeTime,
              totalTarefas: 0,
              tarefasCompletas: 0,
              totalRotinas: 0,
              rotinasCompletas: 0
            };
          }
          
          timesMap[timeId].totalTarefas++;
          if (tarefa.completed) {
            timesMap[timeId].tarefasCompletas++;
          }
        });

        // Processar rotinas
        rotinasFiltradas.forEach(rotina => {
          const timeId = rotina.routine_tasks.task_list_id;
          const nomeTime = rotina.routine_tasks.tasks_list.nome_lista;
          
          if (!timesMap[timeId]) {
            timesMap[timeId] = {
              id: timeId,
              nome: nomeTime,
              totalTarefas: 0,
              tarefasCompletas: 0,
              totalRotinas: 0,
              rotinasCompletas: 0
            };
          }
          
          timesMap[timeId].totalRotinas++;
          if (rotina.completed) {
            timesMap[timeId].rotinasCompletas++;
          }
        });

        // Calcular métricas finais para times
        const dadosTimes = Object.values(timesMap).map(time => ({
          ...time,
          taxaEficiencia: time.totalTarefas > 0 ? (time.tarefasCompletas / time.totalTarefas * 100) : 0,
          taxaDisciplina: time.totalRotinas > 0 ? (time.rotinasCompletas / time.totalRotinas * 100) : 0,
          scoreGeral: 0
        })).map(time => ({
          ...time,
          scoreGeral: (time.taxaEficiencia + time.taxaDisciplina) / 2
        })).sort((a, b) => b.scoreGeral - a.scoreGeral);

        // Buscar TODOS os dados por usuário - SEM RESTRIÇÕES
        const { data: usuariosComTarefas, error: usuariosError } = await supabase
          .from('tasks')
          .select(`
            usuario_id,
            completed,
            created_at,
            usuarios!inner(nome)
          `);

        if (usuariosError) throw usuariosError;

        const { data: usuariosComRotinas, error: usuariosRotinasError } = await supabase
          .from('routine_tasks_status')
          .select(`
            completed,
            date,
            routine_tasks!inner(
              usuario_id,
              usuarios!inner(nome)
            )
          `);

        if (usuariosRotinasError) throw usuariosRotinasError;

        // Filtrar dados dos usuários por período
        let tarefasUsuariosFiltradas = usuariosComTarefas;
        let rotinasUsuariosFiltradas = usuariosComRotinas;

        if (filtros.periodo && filtros.periodo !== 'personalizado') {
          const periodo = calcularPeriodo(filtros.periodo);
          if (periodo.dataInicio && periodo.dataFim) {
            tarefasUsuariosFiltradas = usuariosComTarefas.filter(tarefa => {
              const dataTarefa = tarefa.created_at.split('T')[0];
              return dataTarefa >= periodo.dataInicio && dataTarefa <= periodo.dataFim;
            });
            rotinasUsuariosFiltradas = usuariosComRotinas.filter(rotina => {
              return rotina.date >= periodo.dataInicio && rotina.date <= periodo.dataFim;
            });
          }
        } else if (filtros.periodo === 'personalizado' && filtros.data_inicio && filtros.data_fim) {
          tarefasUsuariosFiltradas = usuariosComTarefas.filter(tarefa => {
            const dataTarefa = tarefa.created_at.split('T')[0];
            return dataTarefa >= filtros.data_inicio && dataTarefa <= filtros.data_fim;
          });
          rotinasUsuariosFiltradas = usuariosComRotinas.filter(rotina => {
            return rotina.date >= filtros.data_inicio && rotina.date <= filtros.data_fim;
          });
        }

        // Processar dados dos usuários
        const usuariosMap = {};
        
        // Processar tarefas normais dos usuários
        tarefasUsuariosFiltradas.forEach(tarefa => {
          const usuarioId = tarefa.usuario_id;
          const nomeUsuario = tarefa.usuarios.nome;
          
          if (!usuariosMap[usuarioId]) {
            usuariosMap[usuarioId] = {
              id: usuarioId,
              nome: nomeUsuario,
              totalTarefas: 0,
              tarefasCompletas: 0,
              totalRotinas: 0,
              rotinasCompletas: 0
            };
          }
          
          usuariosMap[usuarioId].totalTarefas++;
          if (tarefa.completed) {
            usuariosMap[usuarioId].tarefasCompletas++;
          }
        });

        // Processar rotinas dos usuários
        rotinasUsuariosFiltradas.forEach(rotina => {
          const usuarioId = rotina.routine_tasks.usuario_id;
          const nomeUsuario = rotina.routine_tasks.usuarios.nome;
          
          if (!usuariosMap[usuarioId]) {
            usuariosMap[usuarioId] = {
              id: usuarioId,
              nome: nomeUsuario,
              totalTarefas: 0,
              tarefasCompletas: 0,
              totalRotinas: 0,
              rotinasCompletas: 0
            };
          }
          
          usuariosMap[usuarioId].totalRotinas++;
          if (rotina.completed) {
            usuariosMap[usuarioId].rotinasCompletas++;
          }
        });

        // Calcular métricas finais para usuários
        const dadosUsuarios = Object.values(usuariosMap).map(usuario => ({
          ...usuario,
          taxaEficiencia: usuario.totalTarefas > 0 ? (usuario.tarefasCompletas / usuario.totalTarefas * 100) : 0,
          taxaDisciplina: usuario.totalRotinas > 0 ? (usuario.rotinasCompletas / usuario.totalRotinas * 100) : 0,
          scoreGeral: 0
        })).map(usuario => ({
          ...usuario,
          scoreGeral: (usuario.taxaEficiencia + usuario.taxaDisciplina) / 2
        })).sort((a, b) => b.scoreGeral - a.scoreGeral);

        setTabelaTimes(dadosTimes);
        setTabelaUsuarios(dadosUsuarios);
        setTabelaRankingTimes(dadosTimes.slice(0, 10)); // Top 10

        console.log(`Processados ${dadosTimes.length} times e ${dadosUsuarios.length} usuários`);

      } catch (error) {
        console.error('Erro ao buscar dados das tabelas:', error);
        toast.error('Erro ao carregar tabelas de performance');
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
    const periodoPadrao = calcularPeriodoPadrao();
    setFiltros({
      time_id: '',
      usuario_id: '',
      periodo: periodoPadrao.periodo,
      data_inicio: periodoPadrao.dataInicio,
      data_fim: periodoPadrao.dataFim
    });
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasFiltrosAtivos = () => {
    return filtros.time_id || 
           filtros.usuario_id;
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

  // Função para formatar percentual
  const formatPercentage = (percentage) => {
    return `${percentage.toFixed(1)}%`;
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Controle de Atividades - Dashboard Global</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Header com logo e controles */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Dashboard Global"
                showFallback={true}
              />
              
              {/* Controles à direita - Mobile */}
              <div className="flex items-center space-x-3">
                {/* Indicador Global */}
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <FiGlobe className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Global</span>
                </div>

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
                          handleInicioClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                      >
                        <FiHome className="mr-3 h-4 w-4" />
                        Início
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/visualizacao-indicadores');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiTrendingUp className="mr-3 h-4 w-4" />
                        Gestão Indicadores
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/documentos');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiFolder className="mr-3 h-4 w-4" />
                        Gestão Documentos
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/controle-indicador');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiEdit3 className="mr-3 h-4 w-4" />
                        Criar Indicador Base
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleAnalisesIndicadoresClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiCpu className="mr-3 h-4 w-4" />
                        Análises Indicadores
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleHistoricoAcessos();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiList className="mr-3 h-4 w-4" />
                        Histórico Acessos (admin)
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleConfiguracoesClick();
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
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <FiGlobe className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-700">Filtros Globais</h3>
                  </div>
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
                  {/* Filtro de Time */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Time (Opcional)</label>
                    <select
                      value={filtros.time_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, time_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os times ({Object.keys(filtrosDisponiveis.times).length})</option>
                      {Object.entries(filtrosDisponiveis.times).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Usuário */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Usuário (Opcional)</label>
                    <select
                      value={filtros.usuario_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, usuario_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os usuários ({Object.keys(filtrosDisponiveis.usuarios).length})</option>
                      {Object.entries(filtrosDisponiveis.usuarios).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Período */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Período de Análise</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodo('7dias');
                          setFiltros(prev => ({ 
                            ...prev, 
                            periodo: '7dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === '7dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Últimos 7 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodo('30dias');
                          setFiltros(prev => ({ 
                            ...prev, 
                            periodo: '30dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === '30dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Últimos 30 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodo('60dias');
                          setFiltros(prev => ({ 
                            ...prev, 
                            periodo: '60dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === '60dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Últimos 60 dias
                      </button>
                      
                      <button
                        onClick={() => setFiltros(prev => ({ 
                          ...prev, 
                          periodo: 'personalizado'
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

          {/* Desktop: Header */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <LogoDisplay 
                  className=""
                  fallbackText="Dashboard Global"
                  showFallback={true}
                />
              </div>
              
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
                          handleInicioClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                      >
                        <FiHome className="mr-3 h-4 w-4" />
                        Início
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/visualizacao-indicadores');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiTrendingUp className="mr-3 h-4 w-4" />
                        Gestão Indicadores
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/documentos');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiFolder className="mr-3 h-4 w-4" />
                        Gestão Documentos
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/controle-indicador');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiEdit3 className="mr-3 h-4 w-4" />
                        Criar Indicador Base
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleAnalisesIndicadoresClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiCpu className="mr-3 h-4 w-4" />
                        Análises Indicadores
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleHistoricoAcessos();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiList className="mr-3 h-4 w-4" />
                        Histórico Acessos (admin)
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleConfiguracoesClick();
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
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <FiGlobe className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-700">Filtros Globais (Opcionais)</h3>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      Dados de todos os usuários e times
                    </span>
                  </div>
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
                  {/* Filtro de Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Time (Opcional)</label>
                    <select
                      value={filtros.time_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, time_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os times ({Object.keys(filtrosDisponiveis.times).length})</option>
                      {Object.entries(filtrosDisponiveis.times).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Usuário */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Usuário (Opcional)</label>
                    <select
                      value={filtros.usuario_id}
                      onChange={(e) => setFiltros(prev => ({ ...prev, usuario_id: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Todos os usuários ({Object.keys(filtrosDisponiveis.usuarios).length})</option>
                      {Object.entries(filtrosDisponiveis.usuarios).map(([id, nome]) => (
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
                  <label className="block text-sm font-medium text-gray-600 mb-2">Período de Análise</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const periodo = calcularPeriodo('7dias');
                        setFiltros(prev => ({ 
                          ...prev, 
                          periodo: '7dias',
                          data_inicio: periodo.dataInicio,
                          data_fim: periodo.dataFim
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === '7dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Últimos 7 dias
                    </button>
                    
                    <button
                      onClick={() => {
                        const periodo = calcularPeriodo('30dias');
                        setFiltros(prev => ({ 
                          ...prev, 
                          periodo: '30dias',
                          data_inicio: periodo.dataInicio,
                          data_fim: periodo.dataFim
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === '30dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Últimos 30 dias
                    </button>
                    
                    <button
                      onClick={() => {
                        const periodo = calcularPeriodo('60dias');
                        setFiltros(prev => ({ 
                          ...prev, 
                          periodo: '60dias',
                          data_inicio: periodo.dataInicio,
                          data_fim: periodo.dataFim
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === '60dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Últimos 60 dias
                    </button>
                    
                    <button
                      onClick={() => setFiltros(prev => ({ 
                        ...prev, 
                        periodo: 'personalizado'
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

      {/* Layout principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="lg:flex lg:space-x-8">
          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            {/* Mobile: Cabeçalho da seção */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black">Dashboard Global de Atividades</h2>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <FiGlobe className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">Visão Global Ativa</span>
                </div>
                <p className="text-blue-700 text-xs">
                  {gerarTextoDescritivo()}
                  {hasFiltrosAtivos() && (
                    <span className="ml-2 text-blue-600 font-medium">• Filtros aplicados</span>
                  )}
                </p>
              </div>
            </div>

            {/* Desktop: Cabeçalho da seção */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-black">Dashboard Global de Atividades</h1>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <div className="flex items-center space-x-2 mb-1">
                    <FiGlobe className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Visão Global Ativa</span>
                  </div>
                  <p className="text-blue-700 text-sm">
                    {gerarTextoDescritivo()}
                    {hasFiltrosAtivos() && (
                      <span className="ml-2 text-blue-600 font-medium">• Filtros aplicados</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* KPIs de Eficiência (Tarefas Normais) - GLOBAIS */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
                {/* KPI 1: Total de Tarefas - GLOBAL */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Total de Tarefas (Global)</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {formatNumber(kpisEficiencia.totalTarefas)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <FiClipboard className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
                        <FiGlobe className="h-3 w-3 text-blue-400 absolute -top-1 -right-1" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs text-gray-400 mt-1">
                      De todos os usuários e times no período
                    </p>
                  </div>
                </div>

                {/* KPI 2: Tarefas Completas - GLOBAL */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Tarefas Completas (Global)</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {formatNumber(kpisEficiencia.tarefasCompletas)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <FiCheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
                        <FiGlobe className="h-3 w-3 text-green-400 absolute -top-1 -right-1" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs text-gray-400 mt-1">
                      {calculatePercentage(kpisEficiencia.tarefasCompletas, kpisEficiencia.totalTarefas)}% do total global
                    </p>
                  </div>
                </div>

                {/* KPI 3: Tarefas Pendentes - GLOBAL */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Tarefas Pendentes (Global)</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {formatNumber(kpisEficiencia.tarefasPendentes)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <FiClock className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-500" />
                        <FiGlobe className="h-3 w-3 text-yellow-400 absolute -top-1 -right-1" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs text-gray-400 mt-1">
                      {calculatePercentage(kpisEficiencia.tarefasPendentes, kpisEficiencia.totalTarefas)}% do total global
                    </p>
                  </div>
                </div>

                {/* KPI 4: Taxa de Conclusão - GLOBAL */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Taxa de Eficiência (Global)</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {formatPercentage(kpisEficiencia.taxaConclusao)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="relative">
                        <FiTarget className="h-6 w-6 lg:h-8 lg:w-8 text-purple-500" />
                        <FiGlobe className="h-3 w-3 text-purple-400 absolute -top-1 -right-1" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs text-gray-400 mt-1">
                      Performance global de conclusão
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* KPIs de Disciplina (Rotinas) - GLOBAIS */}
            <div className="mb-6 lg:mb-8">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black flex items-center">
                  <FiGlobe className="w-5 h-5 mr-2 text-indigo-600" />
                  Disciplina Global das Rotinas
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Consistência na execução de tarefas rotineiras - Dados de todos os usuários
                </p>
              </div>

              {loadingDisciplina ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {/* KPI 1: Total de Rotinas - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total de Rotinas (Global)</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplina.totalRotinas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiCalendar className="h-6 w-6 lg:h-8 lg:w-8 text-indigo-500" />
                          <FiGlobe className="h-3 w-3 text-indigo-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        Rotinas de todos os usuários no período
                      </p>
                    </div>
                  </div>

                  {/* KPI 2: Rotinas Completas - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Rotinas Completas (Global)</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplina.rotinasCompletas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiActivity className="h-6 w-6 lg:h-8 lg:w-8 text-emerald-500" />
                          <FiGlobe className="h-3 w-3 text-emerald-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        {calculatePercentage(kpisDisciplina.rotinasCompletas, kpisDisciplina.totalRotinas)}% do total global
                      </p>
                    </div>
                  </div>

                  {/* KPI 3: Rotinas Pendentes - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Rotinas Pendentes (Global)</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplina.rotinasPendentes)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiAlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-orange-500" />
                          <FiGlobe className="h-3 w-3 text-orange-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        {calculatePercentage(kpisDisciplina.rotinasPendentes, kpisDisciplina.totalRotinas)}% do total global
                      </p>
                    </div>
                  </div>

                  {/* KPI 4: Taxa de Disciplina - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-teal-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Taxa de Disciplina (Global)</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatPercentage(kpisDisciplina.taxaDisciplina)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiAward className="h-6 w-6 lg:h-8 lg:w-8 text-teal-500" />
                          <FiGlobe className="h-3 w-3 text-teal-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        Disciplina global em rotinas
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Score Geral Combinado - GLOBAL */}
            <div className="mb-6 lg:mb-8">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black flex items-center">
                  <FiGlobe className="w-5 h-5 mr-2 text-rose-600" />
                  Score Global de Performance
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Combinação global de eficiência (tarefas) e disciplina (rotinas) - Todos os usuários
                </p>
              </div>

              {loading || loadingDisciplina ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {/* Score Geral - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-rose-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Score Geral (Global)</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatPercentage((kpisEficiencia.taxaConclusao + kpisDisciplina.taxaDisciplina) / 2)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiAward className="h-6 w-6 lg:h-8 lg:w-8 text-rose-500" />
                          <FiGlobe className="h-3 w-3 text-rose-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-1"></div>
                          Eficiência Global: {formatPercentage(kpisEficiencia.taxaConclusao)}
                        </span>
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-teal-500 rounded-full mr-1"></div>
                          Disciplina Global: {formatPercentage(kpisDisciplina.taxaDisciplina)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Total de Atividades - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-gray-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total de Atividades (Global)</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisEficiencia.totalTarefas + kpisDisciplina.totalRotinas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiBarChart2 className="h-6 w-6 lg:h-8 lg:w-8 text-gray-500" />
                          <FiGlobe className="h-3 w-3 text-gray-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                          Tarefas: {formatNumber(kpisEficiencia.totalTarefas)}
                        </span>
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full mr-1"></div>
                          Rotinas: {formatNumber(kpisDisciplina.totalRotinas)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Seção das tabelas - GLOBAIS */}
            {!loading && !loadingDisciplina && (
              <>
                {/* Mobile: Tabelas empilhadas */}
                <div className="lg:hidden space-y-6">
                  {/* Tabela de Times - Mobile - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiUsers className="h-5 w-5 mr-2 text-blue-500" />
                      Performance Global dos Times
                      <FiGlobe className="h-4 w-4 ml-2 text-blue-400" />
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
                    ) : tabelaTimes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiUsers className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum dado de performance encontrado</p>
                        <p className="text-xs mt-2">Dados globais não disponíveis no período</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Eficiência
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Disciplina
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tabelaTimes.map((time, index) => (
                              <tr key={time.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {time.nome}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    T: {time.totalTarefas} | R: {time.totalRotinas}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    time.taxaEficiencia >= 80 ? 'bg-green-100 text-green-800' :
                                    time.taxaEficiencia >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(time.taxaEficiencia)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    time.taxaDisciplina >= 80 ? 'bg-green-100 text-green-800' :
                                    time.taxaDisciplina >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(time.taxaDisciplina)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    time.scoreGeral >= 80 ? 'bg-purple-100 text-purple-800' :
                                    time.scoreGeral >= 60 ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {formatPercentage(time.scoreGeral)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Tabela de Usuários - Mobile - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiUser className="h-5 w-5 mr-2 text-purple-500" />
                      Performance Global dos Usuários
                      <FiGlobe className="h-4 w-4 ml-2 text-purple-400" />
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
                    ) : tabelaUsuarios.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiUser className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum dado de performance encontrado</p>
                        <p className="text-xs mt-2">Dados globais não disponíveis no período</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Usuário
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Eficiência
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Disciplina
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tabelaUsuarios.slice(0, 10).map((usuario, index) => (
                              <tr key={usuario.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {usuario.nome}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    T: {usuario.totalTarefas} | R: {usuario.totalRotinas}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    usuario.taxaEficiencia >= 80 ? 'bg-green-100 text-green-800' :
                                    usuario.taxaEficiencia >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(usuario.taxaEficiencia)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    usuario.taxaDisciplina >= 80 ? 'bg-green-100 text-green-800' :
                                    usuario.taxaDisciplina >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(usuario.taxaDisciplina)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    usuario.scoreGeral >= 80 ? 'bg-purple-100 text-purple-800' :
                                    usuario.scoreGeral >= 60 ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {formatPercentage(usuario.scoreGeral)}
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

                {/* Desktop: Tabelas lado a lado - GLOBAIS */}
                <div className="hidden lg:grid lg:grid-cols-2 mt-8 gap-6">
                  {/* Tabela de Times - Desktop - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiUsers className="h-5 w-5 mr-2 text-blue-500" />
                      Performance Global dos Times
                      <FiGlobe className="h-4 w-4 ml-2 text-blue-400" />
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
                    ) : tabelaTimes.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiUsers className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum dado de performance encontrado</p>
                        <p className="text-xs mt-2">Dados globais não disponíveis no período</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Time
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Eficiência
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Disciplina
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tabelaTimes.map((time, index) => (
                              <tr key={time.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {time.nome}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Tarefas: {time.totalTarefas} | Rotinas: {time.totalRotinas}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    time.taxaEficiencia >= 80 ? 'bg-green-100 text-green-800' :
                                    time.taxaEficiencia >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(time.taxaEficiencia)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    time.taxaDisciplina >= 80 ? 'bg-green-100 text-green-800' :
                                    time.taxaDisciplina >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(time.taxaDisciplina)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    time.scoreGeral >= 80 ? 'bg-purple-100 text-purple-800' :
                                    time.scoreGeral >= 60 ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {formatPercentage(time.scoreGeral)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Tabela de Usuários (Top 10) - Desktop - GLOBAL */}
                  <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiUser className="h-5 w-5 mr-2 text-purple-500" />
                      Top 10 Usuários Globais
                      <FiGlobe className="h-4 w-4 ml-2 text-purple-400" />
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
                    ) : tabelaUsuarios.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <FiUser className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhum dado de performance encontrado</p>
                        <p className="text-xs mt-2">Dados globais não disponíveis no período</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Usuário
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Eficiência
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Disciplina
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Score
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tabelaUsuarios.slice(0, 10).map((usuario, index) => (
                              <tr key={usuario.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="flex-shrink-0 h-8 w-8">
                                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                        index === 1 ? 'bg-gray-100 text-gray-800' :
                                        index === 2 ? 'bg-orange-100 text-orange-800' :
                                        'bg-blue-100 text-blue-800'
                                      }`}>
                                        {index + 1}
                                      </div>
                                    </div>
                                    <div className="ml-3">
                                      <div className="text-sm font-medium text-gray-900">
                                        {usuario.nome}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        T: {usuario.totalTarefas} | R: {usuario.totalRotinas}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    usuario.taxaEficiencia >= 80 ? 'bg-green-100 text-green-800' :
                                    usuario.taxaEficiencia >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(usuario.taxaEficiencia)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    usuario.taxaDisciplina >= 80 ? 'bg-green-100 text-green-800' :
                                    usuario.taxaDisciplina >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {formatPercentage(usuario.taxaDisciplina)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                    usuario.scoreGeral >= 80 ? 'bg-purple-100 text-purple-800' :
                                    usuario.scoreGeral >= 60 ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {formatPercentage(usuario.scoreGeral)}
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

                {/* Ranking Detalhado de Times - Tabela Completa - GLOBAL */}
                <div className="mt-6 lg:mt-8 bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-yellow-500">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FiAward className="h-5 w-5 mr-2 text-yellow-500" />
                    Ranking Global Detalhado dos Times
                    <FiGlobe className="h-4 w-4 ml-2 text-yellow-400" />
                    {hasFiltrosAtivos() && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        Filtrado
                      </span>
                    )}
                  </h2>
                  
                  {loadingTabelas ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    </div>
                  ) : tabelaRankingTimes.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FiAward className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum dado de ranking encontrado</p>
                      <p className="text-xs mt-2">Dados globais não disponíveis no período</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Posição
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Tarefas
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Completas
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Rotinas
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Completas
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Eficiência
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Disciplina
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Score Geral
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tabelaRankingTimes.map((time, index) => (
                            <tr key={time.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                              index < 3 ? 'ring-2 ring-yellow-200' : ''
                            }`}>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    index === 0 ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-300' :
                                    index === 1 ? 'bg-gray-100 text-gray-800 ring-2 ring-gray-300' :
                                    index === 2 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-300' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  {index < 3 && (
                                    <FiAward className={`ml-2 h-4 w-4 ${
                                      index === 0 ? 'text-yellow-500' :
                                      index === 1 ? 'text-gray-500' :
                                      'text-orange-500'
                                    }`} />
                                  )}
                                </div>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {time.nome}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center">
                                  <FiGlobe className="w-3 h-3 mr-1" />
                                  Dados globais
                                </div>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className="text-sm text-gray-900 font-medium">
                                  {formatNumber(time.totalTarefas)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className="text-sm text-green-600 font-medium">
                                  {formatNumber(time.tarefasCompletas)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className="text-sm text-gray-900 font-medium">
                                  {formatNumber(time.totalRotinas)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className="text-sm text-green-600 font-medium">
                                  {formatNumber(time.rotinasCompletas)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium ${
                                  time.taxaEficiencia >= 80 ? 'bg-green-100 text-green-800' :
                                  time.taxaEficiencia >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {formatPercentage(time.taxaEficiencia)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium ${
                                  time.taxaDisciplina >= 80 ? 'bg-green-100 text-green-800' :
                                  time.taxaDisciplina >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {formatPercentage(time.taxaDisciplina)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-bold ${
                                  time.scoreGeral >= 90 ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-300' :
                                  time.scoreGeral >= 80 ? 'bg-blue-100 text-blue-800' :
                                  time.scoreGeral >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {formatPercentage(time.scoreGeral)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Resumo Global e Legenda */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Resumo Global */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-green-500">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FiGlobe className="w-5 h-5 mr-2 text-green-600" />
                      Resumo Global
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total de Times:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Object.keys(filtrosDisponiveis.times).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total de Usuários:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {Object.keys(filtrosDisponiveis.usuarios).length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Times com Dados:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {tabelaTimes.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Usuários com Dados:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {tabelaUsuarios.length}
                        </span>
                      </div>
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Score Médio Global:</span>
                          <span className={`text-sm font-bold ${
                            ((kpisEficiencia.taxaConclusao + kpisDisciplina.taxaDisciplina) / 2) >= 80 
                              ? 'text-green-600' 
                              : ((kpisEficiencia.taxaConclusao + kpisDisciplina.taxaDisciplina) / 2) >= 60 
                                ? 'text-yellow-600' 
                                : 'text-red-600'
                          }`}>
                            {formatPercentage((kpisEficiencia.taxaConclusao + kpisDisciplina.taxaDisciplina) / 2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Legenda de Classificação */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-blue-500">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Legenda de Performance</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                        <span className="text-sm text-gray-700">Excelente (≥80%)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
                        <span className="text-sm text-gray-700">Bom (60-79%)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
                        <span className="text-sm text-gray-700">Precisa Melhorar (&lt;60%)</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
                        <span className="text-sm text-gray-700">Score Geral</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Métricas Globais:</h4>
                      <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                        <div>• <strong>Eficiência:</strong> % de tarefas concluídas globalmente</div>
                        <div>• <strong>Disciplina:</strong> % de rotinas cumpridas globalmente</div>
                        <div>• <strong>Score Geral:</strong> Média entre eficiência e disciplina</div>
                        <div>• <strong>T:</strong> Tarefas | <strong>R:</strong> Rotinas</div>
                        <div className="flex items-center mt-2">
                          <FiGlobe className="w-3 h-3 mr-1 text-blue-500" />
                          <span>Dados agregados de todos os usuários e times</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Espaçamento inferior para mobile */}
      <div className="lg:hidden pb-16"></div>

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