import { useState, useEffect, useCallback } from 'react';
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
  FiGlobe,
  FiFastForward
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi';

export default function ControleEficienciaTimes({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingDisciplina, setLoadingDisciplina] = useState(true);
  const [loadingFuturo, setLoadingFuturo] = useState(true);
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

  // KPIs de disciplina separados por tipo
  const [kpisDisciplinaPersistente, setKpisDisciplinaPersistente] = useState({
    totalRotinas: 0,
    rotinasCompletas: 0,
    rotinasPendentes: 0,
    taxaDisciplina: 0
  });

  const [kpisDisciplinaTemporaria, setKpisDisciplinaTemporaria] = useState({
    totalRotinas: 0,
    rotinasCompletas: 0,
    rotinasPendentes: 0,
    taxaDisciplina: 0
  });

  // KPIs de período futuro - GLOBAIS
  const [kpisFuturo, setKpisFuturo] = useState({
    totalRotinas: 0,
    rotinasAgendadas: 0,
    tarefasAgendadas: 0,
    totalAtividades: 0
  });

  // Dados das tabelas - GLOBAIS
  const [tabelaTimes, setTabelaTimes] = useState([]);
  const [tabelaUsuarios, setTabelaUsuarios] = useState([]);
  const [tabelaRankingTimes, setTabelaRankingTimes] = useState([]);
  const [tabelaFuturo, setTabelaFuturo] = useState([]);
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

  // ✅ FUNÇÃO GLOBAL MELHORADA - UMA SÓ VEZ
  const calcularOcorrenciasRotina = useCallback((rotina, dataInicio, dataFim) => {
    const ocorrencias = [];
    const inicioRotina = new Date(Math.max(new Date(rotina.start_date), new Date(dataInicio)));
    const fimRotina = rotina.end_date 
      ? new Date(Math.min(new Date(rotina.end_date), new Date(dataFim)))
      : new Date(dataFim);

    let dataAtual = new Date(inicioRotina);

    while (dataAtual <= fimRotina) {
      let deveIncluir = false;

      if (rotina.recurrence_type === 'daily') {
        const diffTime = dataAtual.getTime() - new Date(rotina.start_date).getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        deveIncluir = diffDays >= 0 && diffDays % (rotina.recurrence_interval || 1) === 0;
        
      } else if (rotina.recurrence_type === 'weekly') {
        const diaSemana = dataAtual.getDay() === 0 ? 7 : dataAtual.getDay();
        // ✅ CORRIGIR: usar recurrence_days diretamente para weekly básico
        const targetDays = rotina.recurrence_days || [];
        deveIncluir = targetDays.includes(diaSemana);
        
      } else if (rotina.recurrence_type === 'biweekly') {
        const diaSemana = dataAtual.getDay() === 0 ? 7 : dataAtual.getDay();
        const weeksSinceStart = Math.floor(
          (dataAtual.getTime() - new Date(rotina.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        const isCorrectWeek = weeksSinceStart % 2 === 0;
        
        // ✅ CORRIGIR: usar selected_weekday para tipos avançados
        const targetDay = rotina.selected_weekday;
        deveIncluir = isCorrectWeek && targetDay && diaSemana === targetDay;
        
      } else if (rotina.recurrence_type === 'triweekly') {
        const diaSemana = dataAtual.getDay() === 0 ? 7 : dataAtual.getDay();
        const weeksSinceStart = Math.floor(
          (dataAtual.getTime() - new Date(rotina.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        const isCorrectWeek = weeksSinceStart % 3 === 0;
        
        // ✅ CORRIGIR: usar selected_weekday para tipos avançados
        const targetDay = rotina.selected_weekday;
        deveIncluir = isCorrectWeek && targetDay && diaSemana === targetDay;
        
      } else if (rotina.recurrence_type === 'quadweekly') {
        const diaSemana = dataAtual.getDay() === 0 ? 7 : dataAtual.getDay();
        const weeksSinceStart = Math.floor(
          (dataAtual.getTime() - new Date(rotina.start_date).getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        const isCorrectWeek = weeksSinceStart % 4 === 0;
        
        // ✅ CORRIGIR: usar selected_weekday para tipos avançados
        const targetDay = rotina.selected_weekday;
        deveIncluir = isCorrectWeek && targetDay && diaSemana === targetDay;
        
      } else if (rotina.recurrence_type === 'monthly') {
        // ✅ CORRIGIR: monthly básico usa dia fixo do mês
        const diaInicioRotina = new Date(rotina.start_date).getDate();
        deveIncluir = dataAtual.getDate() === diaInicioRotina;
        
      } else if (rotina.recurrence_type === 'monthly_weekday') {
        // ✅ CORRIGIR: monthly_weekday usa ordinal + weekday
        if (rotina.monthly_ordinal && rotina.monthly_weekday) {
          deveIncluir = isNthWeekdayOfMonth(dataAtual, rotina.monthly_ordinal, rotina.monthly_weekday);
        }
      }

      // ✅ CORRIGIR: Remover verificação de persistent daqui
      if (deveIncluir) {
        ocorrencias.push(dataAtual.toISOString().split('T')[0]);
      }

      dataAtual.setDate(dataAtual.getDate() + 1);
    }

    return ocorrencias;
  }, []);

  // ✅ FUNÇÃO AUXILIAR GLOBAL
  const isNthWeekdayOfMonth = useCallback((date, ordinal, weekday) => {
    // ✅ CORRIGIR: Converter weekday corretamente (1-7 para 0-6)
    const targetWeekday = weekday === 7 ? 0 : weekday;
    const currentWeekday = date.getDay();
    
    if (currentWeekday !== targetWeekday) return false;
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (ordinal === -1) {
      // ✅ ADICIONAR: Lógica para "última" ocorrência
      const lastDayOfMonth = new Date(year, month + 1, 0);
      for (let day = lastDayOfMonth.getDate(); day >= 1; day--) {
        const testDate = new Date(year, month, day);
        if (testDate.getDay() === targetWeekday) {
          return date.getDate() === day;
        }
      }
      return false;
    } else {
      // ✅ CORRIGIR: Lógica para N-ésima ocorrência
      let count = 0;
      for (let day = 1; day <= 31; day++) {
        const testDate = new Date(year, month, day);
        if (testDate.getMonth() !== month) break; // Saiu do mês
        
        if (testDate.getDay() === targetWeekday) {
          count++;
          if (count === ordinal) {
            return date.getDate() === day;
          }
        }
      }
      return false;
    }
  }, []);

  // Função para calcular período padrão (últimos 7 dias - MUDANÇA AQUI)
  const calcularPeriodoPadrao = () => {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - 7); // MUDOU DE 30 PARA 7 DIAS

    return {
      dataInicio: formatarDataLocal(dataInicio),
      dataFim: formatarDataLocal(hoje),
      periodo: '7dias' // MUDOU DE '30dias' PARA '7dias'
    };
  };

  // Função para calcular período futuro padrão (próximos 7 dias)
  const calcularPeriodoFuturoPadrao = () => {
    const hoje = new Date();
    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 7);

    return {
      dataInicio: formatarDataLocal(hoje),
      dataFim: formatarDataLocal(dataFim),
      periodo: '7dias'
    };
  };

  // Inicializar filtros com período padrão (últimos 7 dias)
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

  // Filtros para período futuro
  const [filtrosFuturo, setFiltrosFuturo] = useState(() => {
    const periodoFuturo = calcularPeriodoFuturoPadrao();
    return {
      periodo: periodoFuturo.periodo,
      data_inicio: periodoFuturo.dataInicio,
      data_fim: periodoFuturo.dataFim
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

  // Função para calcular datas dos períodos futuros
  const calcularPeriodoFuturo = (tipo) => {
    const hoje = new Date();
    const dataInicio = new Date(hoje);
    let dataFim = new Date(hoje);

    switch (tipo) {
      case '7dias':
        dataFim.setDate(dataFim.getDate() + 7);
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

  // Função para gerar texto descritivo para período futuro
  const gerarTextoDescritivoFuturo = () => {
    let descricao = "Atividades programadas";
    
    if (!filtrosFuturo.periodo) {
      return descricao + " - Todos os períodos";
    }

    let dataInicio, dataFim;

    if (filtrosFuturo.periodo === 'personalizado') {
      if (!filtrosFuturo.data_inicio || !filtrosFuturo.data_fim) {
        return descricao + " - Todos os períodos";
      }
      dataInicio = filtrosFuturo.data_inicio;
      dataFim = filtrosFuturo.data_fim;
    } else {
      const periodo = calcularPeriodoFuturo(filtrosFuturo.periodo);
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

  // Buscar dados dos KPIs de disciplina (rotinas) - GLOBAIS COM SEPARAÇÃO - CORRIGIDO
  useEffect(() => {
    const fetchKPIsDisciplina = async () => {
      try {
        setLoadingDisciplina(true);

        // Calcular período de análise
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

        if (!dataInicioFiltro || !dataFimFiltro) {
          // Se não há período definido, usar um período padrão
          const periodo = calcularPeriodoPadrao();
          dataInicioFiltro = periodo.dataInicio;
          dataFimFiltro = periodo.dataFim;
        }

        // ✅ CORREÇÃO 1: Buscar rotinas persistentes COM FILTRO CORRETO
        let queryPersistentes = supabase.from('routine_tasks')
          .select(`
            *,
            routine_tasks_status(*)
          `)
          .lte('start_date', dataFimFiltro)
          .or(`end_date.is.null,end_date.gte.${dataInicioFiltro}`)
          .eq('persistent', true); // ✅ ADICIONADO: filtro por persistent = true

        // ✅ CORREÇÃO 2: Aplicar filtros opcionais para persistentes
        if (filtros.time_id) {
          queryPersistentes = queryPersistentes.eq('task_list_id', filtros.time_id);
        }
        
        if (filtros.usuario_id) {
          queryPersistentes = queryPersistentes.eq('usuario_id', filtros.usuario_id);
        }

        // ✅ CORREÇÃO 3: Buscar rotinas temporárias COM FILTROS APLICADOS
        let queryTemporarias = supabase.from('routine_tasks')
          .select(`
            *,
            routine_tasks_status(*)
          `)
          .lte('start_date', dataFimFiltro)
          .or(`end_date.is.null,end_date.gte.${dataInicioFiltro}`)
          .eq('persistent', false); // ✅ Filtro por persistent = false

        // ✅ CORREÇÃO 4: Aplicar filtros opcionais para temporárias
        if (filtros.time_id) {
          queryTemporarias = queryTemporarias.eq('task_list_id', filtros.time_id);
        }
        
        if (filtros.usuario_id) {
          queryTemporarias = queryTemporarias.eq('usuario_id', filtros.usuario_id);
        }

        // ✅ CORREÇÃO 5: Executar as queries
        const [
          { data: rotinasPersistentes, error: persistentesError },
          { data: rotinasTemporarias, error: temporariasError }
        ] = await Promise.all([queryPersistentes, queryTemporarias]);

        if (persistentesError) throw persistentesError;
        if (temporariasError) throw temporariasError;

        console.log(`✅ DEBUG: Rotinas encontradas - Persistentes: ${rotinasPersistentes?.length || 0}, Temporárias: ${rotinasTemporarias?.length || 0}`);

        // Calcular KPIs para persistentes
        let totalRotinasPers = 0;
        let rotinasCompletasPers = 0;

        rotinasPersistentes?.forEach(rotina => {
          const ocorrencias = calcularOcorrenciasRotina(rotina, dataInicioFiltro, dataFimFiltro);
          totalRotinasPers += ocorrencias.length;

          const statusCompletados = rotina.routine_tasks_status?.filter(status => 
            status.completed && 
            ocorrencias.includes(status.date)
          ) || [];
          
          rotinasCompletasPers += statusCompletados.length;
        });

        // Calcular KPIs para temporárias
        let totalRotinasTemp = 0;
        let rotinasCompletasTemp = 0;

        rotinasTemporarias?.forEach(rotina => {
          const ocorrencias = calcularOcorrenciasRotina(rotina, dataInicioFiltro, dataFimFiltro);
          totalRotinasTemp += ocorrencias.length;

          const statusCompletados = rotina.routine_tasks_status?.filter(status => 
            status.completed && 
            ocorrencias.includes(status.date)
          ) || [];
          
          rotinasCompletasTemp += statusCompletados.length;
        });

        // Atualizar estados separados
        setKpisDisciplinaPersistente({
          totalRotinas: totalRotinasPers,
          rotinasCompletas: rotinasCompletasPers,
          rotinasPendentes: totalRotinasPers - rotinasCompletasPers,
          taxaDisciplina: totalRotinasPers > 0 ? (rotinasCompletasPers / totalRotinasPers * 100) : 0
        });

        setKpisDisciplinaTemporaria({
          totalRotinas: totalRotinasTemp,
          rotinasCompletas: rotinasCompletasTemp,
          rotinasPendentes: totalRotinasTemp - rotinasCompletasTemp,
          taxaDisciplina: totalRotinasTemp > 0 ? (rotinasCompletasTemp / totalRotinasTemp * 100) : 0
        });

        // Manter o KPI geral (soma dos dois)
        const totalGeralRotinas = totalRotinasPers + totalRotinasTemp;
        const totalGeralCompletas = rotinasCompletasPers + rotinasCompletasTemp;
        
        setKpisDisciplina({
          totalRotinas: totalGeralRotinas,
          rotinasCompletas: totalGeralCompletas,
          rotinasPendentes: totalGeralRotinas - totalGeralCompletas,
          taxaDisciplina: totalGeralRotinas > 0 ? (totalGeralCompletas / totalGeralRotinas * 100) : 0
        });

        console.log(`✅ KPIs Disciplina CORRIGIDOS: Persistentes ${totalRotinasPers}, Temporárias ${totalRotinasTemp}, Total ${totalGeralRotinas}`);

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
  }, [user, filtros, calcularOcorrenciasRotina, isNthWeekdayOfMonth]);

  // Buscar dados dos KPIs do período futuro - COM FILTROS APLICADOS
  useEffect(() => {
    const fetchKPIsFuturo = async () => {
      try {
        setLoadingFuturo(true);

        // Calcular período futuro
        let dataInicioFiltro = null;
        let dataFimFiltro = null;

        if (filtrosFuturo.periodo && filtrosFuturo.periodo !== 'personalizado') {
          const periodo = calcularPeriodoFuturo(filtrosFuturo.periodo);
          dataInicioFiltro = periodo.dataInicio;
          dataFimFiltro = periodo.dataFim;
        } else if (filtrosFuturo.periodo === 'personalizado' && filtrosFuturo.data_inicio && filtrosFuturo.data_fim) {
          dataInicioFiltro = filtrosFuturo.data_inicio;
          dataFimFiltro = filtrosFuturo.data_fim;
        }

        if (!dataInicioFiltro || !dataFimFiltro) {
          const periodo = calcularPeriodoFuturoPadrao();
          dataInicioFiltro = periodo.dataInicio;
          dataFimFiltro = periodo.dataFim;
        }

        // ✅ Buscar tarefas agendadas no período futuro COM FILTROS
        let queryTarefas = supabase
          .from('tasks')
          .select('*')
          .gte('created_at', dataInicioFiltro)
          .lte('created_at', dataFimFiltro + 'T23:59:59')
          .eq('completed', false);

        // ✅ APLICAR FILTROS OPCIONAIS DE TIME E USUÁRIO
        if (filtros.time_id) {
          queryTarefas = queryTarefas.eq('task_list_id', filtros.time_id);
        }
        
        if (filtros.usuario_id) {
          queryTarefas = queryTarefas.eq('usuario_id', filtros.usuario_id);
        }

        const { data: tarefasFuturas, error: tarefasError } = await queryTarefas;

        if (tarefasError) throw tarefasError;

        // ✅ Buscar rotinas que estarão ativas no período futuro COM FILTROS
        let queryRotinas = supabase
          .from('routine_tasks')
          .select('*')
          .lte('start_date', dataFimFiltro)
          .or(`end_date.is.null,end_date.gte.${dataInicioFiltro}`)

        // ✅ APLICAR FILTROS OPCIONAIS DE TIME E USUÁRIO
        if (filtros.time_id) {
          queryRotinas = queryRotinas.eq('task_list_id', filtros.time_id);
        }
        
        if (filtros.usuario_id) {
          queryRotinas = queryRotinas.eq('usuario_id', filtros.usuario_id);
        }

        const { data: rotinasFuturas, error: rotinasError } = await queryRotinas;

        if (rotinasError) throw rotinasError;

        let totalRotinasAgendadas = 0;
        rotinasFuturas.forEach(rotina => {
          const ocorrencias = calcularOcorrenciasRotina(rotina, dataInicioFiltro, dataFimFiltro);
          totalRotinasAgendadas += ocorrencias.length;
        });

        setKpisFuturo({
          totalRotinas: totalRotinasAgendadas,
          rotinasAgendadas: totalRotinasAgendadas,
          tarefasAgendadas: tarefasFuturas.length,
          totalAtividades: totalRotinasAgendadas + tarefasFuturas.length
        });

        console.log(`✅ KPIs Futuro COM FILTROS: ${totalRotinasAgendadas} rotinas, ${tarefasFuturas.length} tarefas agendadas`);

      } catch (error) {
        console.error('Erro ao buscar KPIs do futuro:', error);
        toast.error('Erro ao carregar dados do período futuro');
      } finally {
        setLoadingFuturo(false);
      }
    };

    if (user) {
      fetchKPIsFuturo();
    }
  }, [user, filtrosFuturo, filtros]); // ✅ AGORA ESCUTA AMBOS OS FILTROS

  // Buscar dados das tabelas - GLOBAIS (todos os times e usuários)
  useEffect(() => {
    const fetchTabelas = async () => {
      try {
        setLoadingTabelas(true);

        // ✅ CALCULAR PERÍODO DE ANÁLISE
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

        if (!dataInicioFiltro || !dataFimFiltro) {
          // Se não há período definido, usar um período padrão
          const periodo = calcularPeriodoPadrao();
          dataInicioFiltro = periodo.dataInicio;
          dataFimFiltro = periodo.dataFim;
        }

        // ✅ BUSCAR TODAS AS TAREFAS NORMAIS - SEM RESTRIÇÕES DE USUÁRIO
        const { data: timesComTarefas, error: timesError } = await supabase
          .from('tasks')
          .select(`
            task_list_id,
            completed,
            created_at,
            tasks_list!inner(nome_lista)
          `);

        if (timesError) throw timesError;

        // ✅ BUSCAR TODAS AS ROTINAS COM STATUS - SEM RESTRIÇÕES DE USUÁRIO
        const { data: todasRotinas, error: rotinasError } = await supabase
          .from('routine_tasks')
          .select(`
            *,
            routine_tasks_status(*),
            tasks_list!inner(nome_lista),
            usuarios!inner(nome)
          `)

        if (rotinasError) throw rotinasError;

        // ✅ PROCESSAR DADOS DOS TIMES
        const timesMap = {};
        
        // ✅ FILTRAR TAREFAS POR DATA SE NECESSÁRIO
        let tarefasFiltradas = timesComTarefas;
        if (dataInicioFiltro && dataFimFiltro) {
          tarefasFiltradas = timesComTarefas.filter(tarefa => {
            const dataTarefa = tarefa.created_at.split('T')[0];
            return dataTarefa >= dataInicioFiltro && dataTarefa <= dataFimFiltro;
          });
        }

        // ✅ PROCESSAR TAREFAS NORMAIS
        tarefasFiltradas.forEach(tarefa => {
          // Aplicar filtros opcionais
          if (filtros.time_id && tarefa.task_list_id !== filtros.time_id) return;
          
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

        // ✅ PROCESSAR ROTINAS COM CÁLCULO CORRETO DE OCORRÊNCIAS
        const rotinasFiltradas = todasRotinas.filter(rotina => {
          const fimRotina = rotina.end_date || dataFimFiltro;
          return rotina.start_date <= dataFimFiltro && fimRotina >= dataInicioFiltro;
        });

        rotinasFiltradas.forEach(rotina => {
          // Aplicar filtros opcionais
          if (filtros.time_id && rotina.task_list_id !== filtros.time_id) return;
          if (filtros.usuario_id && rotina.usuario_id !== filtros.usuario_id) return;

          const timeId = rotina.task_list_id;
          const nomeTime = rotina.tasks_list.nome_lista;
          
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
          
          // ✅ CALCULAR TODAS AS OCORRÊNCIAS DESTA ROTINA NO PERÍODO
          const ocorrencias = calcularOcorrenciasRotina(rotina, dataInicioFiltro, dataFimFiltro);
          
          // ✅ CONTAR QUANTAS DESSAS OCORRÊNCIAS FORAM COMPLETADAS
          const statusCompletados = rotina.routine_tasks_status?.filter(status => 
            status.completed && 
            status.date >= dataInicioFiltro &&
            status.date <= dataFimFiltro &&
            ocorrencias.includes(status.date)
          ) || [];
          
          timesMap[timeId].totalRotinas += ocorrencias.length;
          timesMap[timeId].rotinasCompletas += statusCompletados.length;
        });

        // ✅ CALCULAR MÉTRICAS FINAIS PARA TIMES
        const dadosTimes = Object.values(timesMap).map(time => ({
          ...time,
          taxaEficiencia: time.totalTarefas > 0 ? (time.tarefasCompletas / time.totalTarefas * 100) : 0,
          taxaDisciplina: time.totalRotinas > 0 ? (time.rotinasCompletas / time.totalRotinas * 100) : 0,
          scoreGeral: 0
        })).map(time => ({
          ...time,
          scoreGeral: (time.taxaEficiencia + time.taxaDisciplina) / 2
        })).sort((a, b) => b.scoreGeral - a.scoreGeral);

        // ✅ BUSCAR TODAS AS TAREFAS DOS USUÁRIOS - SEM RESTRIÇÕES
        const { data: usuariosComTarefas, error: usuariosError } = await supabase
          .from('tasks')
          .select(`
            usuario_id,
            completed,
            created_at,
            usuarios!inner(nome)
          `);

        if (usuariosError) throw usuariosError;

        // ✅ FILTRAR DADOS DOS USUÁRIOS POR PERÍODO
        let tarefasUsuariosFiltradas = usuariosComTarefas;
        if (dataInicioFiltro && dataFimFiltro) {
          tarefasUsuariosFiltradas = usuariosComTarefas.filter(tarefa => {
            const dataTarefa = tarefa.created_at.split('T')[0];
            return dataTarefa >= dataInicioFiltro && dataTarefa <= dataFimFiltro;
          });
        }

        // ✅ PROCESSAR DADOS DOS USUÁRIOS
        const usuariosMap = {};
        
        // ✅ PROCESSAR TAREFAS NORMAIS DOS USUÁRIOS
        tarefasUsuariosFiltradas.forEach(tarefa => {
          // Aplicar filtros opcionais
          if (filtros.usuario_id && tarefa.usuario_id !== filtros.usuario_id) return;
          
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

        // ✅ PROCESSAR ROTINAS DOS USUÁRIOS COM CÁLCULO CORRETO
        rotinasFiltradas.forEach(rotina => {
          // Aplicar filtros opcionais
          if (filtros.time_id && rotina.task_list_id !== filtros.time_id) return;
          if (filtros.usuario_id && rotina.usuario_id !== filtros.usuario_id) return;

          const usuarioId = rotina.usuario_id;
          const nomeUsuario = rotina.usuarios.nome;
          
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
          
          // ✅ CALCULAR TODAS AS OCORRÊNCIAS DESTA ROTINA NO PERÍODO
          const ocorrencias = calcularOcorrenciasRotina(rotina, dataInicioFiltro, dataFimFiltro);
          
          // ✅ CONTAR QUANTAS DESSAS OCORRÊNCIAS FORAM COMPLETADAS
          const statusCompletados = rotina.routine_tasks_status?.filter(status => 
            status.completed && 
            status.date >= dataInicioFiltro &&
            status.date <= dataFimFiltro &&
            ocorrencias.includes(status.date)
          ) || [];
          
          usuariosMap[usuarioId].totalRotinas += ocorrencias.length;
          usuariosMap[usuarioId].rotinasCompletas += statusCompletados.length;
        });

        // ✅ CALCULAR MÉTRICAS FINAIS PARA USUÁRIOS
        const dadosUsuarios = Object.values(usuariosMap).map(usuario => ({
          ...usuario,
          taxaEficiencia: usuario.totalTarefas > 0 ? (usuario.tarefasCompletas / usuario.totalTarefas * 100) : 0,
          taxaDisciplina: usuario.totalRotinas > 0 ? (usuario.rotinasCompletas / usuario.totalRotinas * 100) : 0,
          scoreGeral: 0
        })).map(usuario => ({
          ...usuario,
          scoreGeral: (usuario.taxaEficiencia + usuario.taxaDisciplina) / 2
        })).sort((a, b) => b.scoreGeral - a.scoreGeral);

        // ✅ ATUALIZAR ESTADOS
        setTabelaTimes(dadosTimes);
        setTabelaUsuarios(dadosUsuarios);
        setTabelaRankingTimes(dadosTimes.slice(0, 10)); // Top 10

        console.log(`✅ Tabelas processadas: ${dadosTimes.length} times e ${dadosUsuarios.length} usuários`);
        console.log('📊 Exemplo de dados corrigidos:', {
          primeiroTime: dadosTimes[0],
          primeiroUsuario: dadosUsuarios[0]
        });

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
  }, [user, filtros, calcularOcorrenciasRotina, isNthWeekdayOfMonth]);

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
                          router.push('/perfil');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
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
              <div className="mb-4 space-y-4">
                {/* Filtros de Período Passado */}
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center space-x-2">
                      <FiGlobe className="w-4 h-4 text-blue-600" />
                      <h3 className="text-sm font-medium text-gray-700">Filtros Globais (Período Passado)</h3>
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

                {/* Filtros de Período Futuro */}
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center space-x-2 mb-3">
                    <FiFastForward className="w-4 h-4 text-green-600" />
                    <h3 className="text-sm font-medium text-gray-700">Filtros do Período Futuro</h3>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Período de Análise</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodoFuturo('7dias');
                          setFiltrosFuturo(prev => ({ 
                            ...prev, 
                            periodo: '7dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosFuturo.periodo === '7dias'
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 7 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodoFuturo('30dias');
                          setFiltrosFuturo(prev => ({ 
                            ...prev, 
                            periodo: '30dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosFuturo.periodo === '30dias'
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 30 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodoFuturo('60dias');
                          setFiltrosFuturo(prev => ({ 
                            ...prev, 
                            periodo: '60dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosFuturo.periodo === '60dias'
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 60 dias
                      </button>
                      
                      <button
                        onClick={() => setFiltrosFuturo(prev => ({ 
                          ...prev, 
                          periodo: 'personalizado'
                        }))}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosFuturo.periodo === 'personalizado'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Período Personalizado
                      </button>
                    </div>
                  </div>

                  {/* Campos de data personalizada para período futuro */}
                  {filtrosFuturo.periodo === 'personalizado' && (
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data Início</label>
                        <input
                          type="date"
                          value={filtrosFuturo.data_inicio}
                          onChange={(e) => setFiltrosFuturo(prev => ({ ...prev, data_inicio: e.target.value }))}
                          className="w-full px-2 py-2 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
                        <input
                          type="date"
                          value={filtrosFuturo.data_fim}
                          onChange={(e) => setFiltrosFuturo(prev => ({ ...prev, data_fim: e.target.value }))}
                          className="w-full px-2 py-2 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
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
                          router.push('/perfil');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
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
              <div className="mb-4 space-y-4">
                {/* Filtros de Período Passado - Desktop */}
                <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <FiGlobe className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-medium text-gray-700">Filtros Globais (Período Passado) - Opcionais</h3>
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

                {/* Filtros de Período Futuro - Desktop */}
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <div className="flex items-center space-x-2 mb-4">
                    <FiFastForward className="w-5 h-5 text-green-600" />
                    <h3 className="text-sm font-medium text-gray-700">Filtros do Período Futuro</h3>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      Atividades programadas
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Campos de data personalizada para período futuro */}
                    {filtrosFuturo.periodo === 'personalizado' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Data Início</label>
                          <input
                            type="date"
                            value={filtrosFuturo.data_inicio}
                            onChange={(e) => setFiltrosFuturo(prev => ({ ...prev, data_inicio: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-600 mb-1">Data Fim</label>
                          <input
                            type="date"
                            value={filtrosFuturo.data_fim}
                            onChange={(e) => setFiltrosFuturo(prev => ({ ...prev, data_fim: e.target.value }))}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Filtro de Período Futuro */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Período de Análise Futuro</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodoFuturo('7dias');
                          setFiltrosFuturo(prev => ({ 
                            ...prev, 
                            periodo: '7dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          filtrosFuturo.periodo === '7dias'
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 7 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodoFuturo('30dias');
                          setFiltrosFuturo(prev => ({ 
                            ...prev, 
                            periodo: '30dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          filtrosFuturo.periodo === '30dias'
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 30 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodoFuturo('60dias');
                          setFiltrosFuturo(prev => ({ 
                            ...prev, 
                            periodo: '60dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          filtrosFuturo.periodo === '60dias'
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 60 dias
                      </button>
                      
                      <button
                        onClick={() => setFiltrosFuturo(prev => ({ 
                          ...prev, 
                          periodo: 'personalizado'
                        }))}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                          filtrosFuturo.periodo === 'personalizado'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Período Personalizado
                      </button>
                    </div>
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

            {/* Seção de Rotinas Persistentes */}
            <div className="mb-6 lg:mb-8">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black flex items-center">
                  <FiCalendar className="w-5 h-5 mr-2 text-blue-600" />
                  Rotinas Persistentes (Contínuas)
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Rotinas que continuam indefinidamente - Hábitos e disciplinas permanentes
                </p>
              </div>

              {loadingDisciplina ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {/* KPI 1: Total Persistentes */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total Persistentes</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplinaPersistente.totalRotinas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiCalendar className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
                      </div>
                    </div>
                  </div>

                  {/* KPI 2: Completas Persistentes */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Completas Persistentes</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplinaPersistente.rotinasCompletas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiActivity className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
                      </div>
                    </div>
                  </div>

                  {/* KPI 3: Pendentes Persistentes */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Pendentes Persistentes</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplinaPersistente.rotinasPendentes)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiAlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-orange-500" />
                      </div>
                    </div>
                  </div>

                  {/* KPI 4: Taxa Persistentes */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-teal-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Taxa Persistentes</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatPercentage(kpisDisciplinaPersistente.taxaDisciplina)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiAward className="h-6 w-6 lg:h-8 lg:w-8 text-teal-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seção de Rotinas Temporárias */}
            <div className="mb-6 lg:mb-8">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black flex items-center">
                  <FiTarget className="w-5 h-5 mr-2 text-orange-600" />
                  Rotinas Temporárias (Projetos)
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  Rotinas com prazo definido - Projetos e objetivos específicos
                </p>
              </div>

              {loadingDisciplina ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {/* KPI 1: Total Temporárias */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total Temporárias</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplinaTemporaria.totalRotinas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiTarget className="h-6 w-6 lg:h-8 lg:w-8 text-orange-500" />
                      </div>
                    </div>
                  </div>

                  {/* KPI 2: Completas Temporárias */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-emerald-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Completas Temporárias</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplinaTemporaria.rotinasCompletas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiCheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-emerald-500" />
                      </div>
                    </div>
                  </div>

                  {/* KPI 3: Pendentes Temporárias */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Pendentes Temporárias</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisDisciplinaTemporaria.rotinasPendentes)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiClock className="h-6 w-6 lg:h-8 lg:w-8 text-red-500" />
                      </div>
                    </div>
                  </div>

                  {/* KPI 4: Taxa Temporárias */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Taxa Temporárias</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatPercentage(kpisDisciplinaTemporaria.taxaDisciplina)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiBarChart className="h-6 w-6 lg:h-8 lg:w-8 text-purple-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nova Seção: KPIs do Período Futuro - GLOBAIS */}
            <div className="mb-6 lg:mb-8">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black flex items-center">
                  <FiFastForward className="w-5 h-5 mr-2 text-green-600" />
                  Planejamento Global - Período Futuro
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {gerarTextoDescritivoFuturo()}
                </p>
              </div>

              {loadingFuturo ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  {/* KPI 1: Total Rotinas Agendadas - FUTURO */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Rotinas Agendadas</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisFuturo.rotinasAgendadas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiCalendar className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
                          <FiFastForward className="h-3 w-3 text-green-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        Rotinas programadas no período futuro
                      </p>
                    </div>
                  </div>

                  {/* KPI 2: Tarefas Agendadas - FUTURO */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-cyan-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Tarefas Agendadas</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisFuturo.tarefasAgendadas)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiClipboard className="h-6 w-6 lg:h-8 lg:w-8 text-cyan-500" />
                          <FiFastForward className="h-3 w-3 text-cyan-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        Tarefas não concluídas no período futuro
                      </p>
                    </div>
                  </div>

                  {/* KPI 3: Total Atividades Futuras */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total de Atividades</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisFuturo.totalAtividades)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiBarChart2 className="h-6 w-6 lg:h-8 lg:w-8 text-purple-500" />
                          <FiFastForward className="h-3 w-3 text-purple-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        Soma de todas as atividades futuras
                      </p>
                    </div>
                  </div>

                  {/* KPI 4: Capacidade de Planejamento */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Capacidade de Planejamento</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {kpisFuturo.totalAtividades > 0 ? 'Alta' : 'Baixa'}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <FiTarget className="h-6 w-6 lg:h-8 lg:w-8 text-orange-500" />
                          <FiFastForward className="h-3 w-3 text-orange-400 absolute -top-1 -right-1" />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-400 mt-1">
                        Avaliação do nível de organização futura
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
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Atividades Futuras:</span>
                          <span className="text-sm font-bold text-green-600">
                            {formatNumber(kpisFuturo.totalAtividades)}
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
                        <div className="flex items-center mt-1">
                          <FiFastForward className="w-3 h-3 mr-1 text-green-500" />
                          <span>Período futuro: atividades programadas e planejamento</span>
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