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
  FiBarChart
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi';

export default function VisualizacaoGeralIndicadores({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadingAtraso, setLoadingAtraso] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [kpis, setKpis] = useState({
    totalIndicadores: 0,
    indicadoresComValor: 0,
    indicadoresSemValor: 0
  });
  
  const [kpisDetalhados, setKpisDetalhados] = useState({
    totalMeta: 0,
    totalRealizado: 0,
    comValorMeta: 0,
    comValorRealizado: 0,
    semValorMeta: 0,
    semValorRealizado: 0
  });
  
  const [kpisAtraso, setKpisAtraso] = useState({
    todosAtrasados: 0,
    atrasadosAte7Dias: 0,
    atrasadosAte30Dias: 0
  });

  const [kpisAtrasoDetalhados, setKpisAtrasoDetalhados] = useState({
    todosAtrasadosMeta: 0,
    todosAtrasadosRealizado: 0,
    ate7DiasMeta: 0,
    ate7DiasRealizado: 0,
    ate30DiasMeta: 0,
    ate30DiasRealizado: 0
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

  // Estado para controlar a navegação (fixo em 'controle')
  const [activeTab] = useState('controle');

  // Função utilitária para formatar data local no formato yyyy-mm-dd
  const formatarDataLocal = (data) => {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  };

  // Função para calcular período padrão (hoje + 30 dias)
  const calcularPeriodoPadrao = () => {
    const hoje = new Date();
    const dataFim = new Date(hoje);
    dataFim.setDate(dataFim.getDate() + 30);

    return {
      dataInicio: formatarDataLocal(hoje),
      dataFim: formatarDataLocal(dataFim),
      periodo: '30dias'
    };
  };

  // Inicializar filtros com período padrão
  const [filtros, setFiltros] = useState(() => {
    const periodoPadrao = calcularPeriodoPadrao();
    return {
      projeto_id: '',
      categoria_id: '',
      periodo: periodoPadrao.periodo,
      data_inicio: periodoPadrao.dataInicio,
      data_fim: periodoPadrao.dataFim,
      data_referencia_atraso: ''
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

  const handleConfiguracoesClick = () => {
    router.push('/cadastros');
  };

  const handleInicioClick = () => {
    router.push('/visualizacao-indicadores');
  };

  // Função para calcular datas dos períodos
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

  // Função para obter data de referência para atraso
  const getDataReferenciaAtraso = () => {
    if (filtros.data_referencia_atraso) {
      return filtros.data_referencia_atraso;
    }
    if (filtros.data_inicio) {
      return filtros.data_inicio;
    }
    return formatarDataLocal(new Date());
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

    const formatarData = (dataString) => {
      const partes = dataString.split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    return `Indicadores com prazo de entrega entre ${formatarData(dataInicio)} e ${formatarData(dataFim)}`;
  };

  // Função para gerar texto descritivo dos indicadores em atraso
  const gerarTextoDescritivoAtraso = () => {
    const dataReferencia = getDataReferenciaAtraso();
    
    const formatarData = (dataString) => {
      const partes = dataString.split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    const usandoDataCustomizada = filtros.data_referencia_atraso !== '';
    const tipoReferencia = usandoDataCustomizada ? 'personalizada' : 'sincronizada com KPIs principais';

    return `Indicadores em atraso com base na data de referência: ${formatarData(dataReferencia)} (${tipoReferencia})`;
  };

  // Função auxiliar para construir query com filtros de projeto e categoria
  const construirQueryComFiltros = (queryBase) => {
    let query = queryBase;

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
      query = query.gte('prazo_entrega', dataInicioFiltro)
                  .lte('prazo_entrega', dataFimFiltro);
    }

    return query;
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
        const { data: projetosData, error: projetosError } = await supabase
          .from('controle_indicador_geral')
          .select('projeto_id, projetos(nome)')
          .not('projeto_id', 'is', null)
          .not('projetos.nome', 'is', null);

        if (projetosError) throw projetosError;

        const { data: categoriasData, error: categoriasError } = await supabase
          .from('controle_indicador_geral')
          .select('categoria_id, categorias(nome)')
          .not('categoria_id', 'is', null)
          .not('categorias.nome', 'is', null);

        if (categoriasError) throw categoriasError;

        const projetosUnicos = {};
        projetosData.forEach(item => {
          if (item.projeto_id && item.projetos) {
            projetosUnicos[item.projeto_id] = item.projetos.nome;
          }
        });

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

  // Buscar dados dos KPIs com divisão Meta/Realizado
  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);

        // 1. Indicadores com valor - Meta (tipo_indicador = 2)
        let queryComValorMeta = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .not('valor_indicador_apresentado', 'is', null)
          .eq('tipo_indicador', 2);
        
        queryComValorMeta = construirQueryComFiltros(queryComValorMeta);
        queryComValorMeta = aplicarFiltrosData(queryComValorMeta);
        
        const { count: comValorMeta, error: comValorMetaError } = await queryComValorMeta;
        if (comValorMetaError) throw comValorMetaError;

        // 2. Indicadores com valor - Realizado (tipo_indicador = 1)
        let queryComValorRealizado = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .not('valor_indicador_apresentado', 'is', null)
          .eq('tipo_indicador', 1);
        
        queryComValorRealizado = construirQueryComFiltros(queryComValorRealizado);
        queryComValorRealizado = aplicarFiltrosData(queryComValorRealizado);
        
        const { count: comValorRealizado, error: comValorRealizadoError } = await queryComValorRealizado;
        if (comValorRealizadoError) throw comValorRealizadoError;

        // 3. Indicadores sem valor - Meta (tipo_indicador = 2)
        let querySemValorMeta = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .eq('tipo_indicador', 2);
        
        querySemValorMeta = construirQueryComFiltros(querySemValorMeta);
        querySemValorMeta = aplicarFiltrosData(querySemValorMeta);
        
        const { count: semValorMeta, error: semValorMetaError } = await querySemValorMeta;
        if (semValorMetaError) throw semValorMetaError;

        // 4. Indicadores sem valor - Realizado (tipo_indicador = 1)
        let querySemValorRealizado = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .eq('tipo_indicador', 1);
        
        querySemValorRealizado = construirQueryComFiltros(querySemValorRealizado);
        querySemValorRealizado = aplicarFiltrosData(querySemValorRealizado);
        
        const { count: semValorRealizado, error: semValorRealizadoError } = await querySemValorRealizado;
        if (semValorRealizadoError) throw semValorRealizadoError;

        // Calcular totais
        const totalMeta = (comValorMeta || 0) + (semValorMeta || 0);
        const totalRealizado = (comValorRealizado || 0) + (semValorRealizado || 0);
        const totalGeral = totalMeta + totalRealizado;
        const comValorGeral = (comValorMeta || 0) + (comValorRealizado || 0);
        const semValorGeral = (semValorMeta || 0) + (semValorRealizado || 0);

        // Atualizar estados
        setKpis({
          totalIndicadores: totalGeral,
          indicadoresComValor: comValorGeral,
          indicadoresSemValor: semValorGeral
        });

        setKpisDetalhados({
          totalMeta: totalMeta,
          totalRealizado: totalRealizado,
          comValorMeta: comValorMeta || 0,
          comValorRealizado: comValorRealizado || 0,
          semValorMeta: semValorMeta || 0,
          semValorRealizado: semValorRealizado || 0
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
  }, [user, filtros]);

  // Buscar dados dos KPIs de atraso com divisão Meta/Realizado
  useEffect(() => {
    const fetchKPIsAtraso = async () => {
      try {
        setLoadingAtraso(true);

        const dataReferencia = getDataReferenciaAtraso();

        const dataRef = new Date(dataReferencia);
        const data7DiasAntes = new Date(dataRef);
        data7DiasAntes.setDate(data7DiasAntes.getDate() - 7);
        const data30DiasAntes = new Date(dataRef);
        data30DiasAntes.setDate(data30DiasAntes.getDate() - 30);

        const data7DiasAntesStr = formatarDataLocal(data7DiasAntes);
        const data30DiasAntesStr = formatarDataLocal(data30DiasAntes);

        // 1. Todos os indicadores em atraso - Meta
        let queryTodosAtrasadosMeta = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', dataReferencia)
          .eq('tipo_indicador', 2);
        
        queryTodosAtrasadosMeta = construirQueryComFiltros(queryTodosAtrasadosMeta);
        
        const { count: todosAtrasadosMeta, error: todosAtrasadosMetaError } = await queryTodosAtrasadosMeta;
        if (todosAtrasadosMetaError) throw todosAtrasadosMetaError;

        // 2. Todos os indicadores em atraso - Realizado
        let queryTodosAtrasadosRealizado = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', dataReferencia)
          .eq('tipo_indicador', 1);
        
        queryTodosAtrasadosRealizado = construirQueryComFiltros(queryTodosAtrasadosRealizado);
        
        const { count: todosAtrasadosRealizado, error: todosAtrasadosRealizadoError } = await queryTodosAtrasadosRealizado;
        if (todosAtrasadosRealizadoError) throw todosAtrasadosRealizadoError;

        // 3. Indicadores em atraso até 7 dias - Meta
        let queryAtrasados7DiasMeta = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', dataReferencia)
          .gte('prazo_entrega', data7DiasAntesStr)
          .eq('tipo_indicador', 2);
        
        queryAtrasados7DiasMeta = construirQueryComFiltros(queryAtrasados7DiasMeta);
        
        const { count: atrasadosAte7DiasMeta, error: atrasados7DiasMetaError } = await queryAtrasados7DiasMeta;
        if (atrasados7DiasMetaError) throw atrasados7DiasMetaError;

        // 4. Indicadores em atraso até 7 dias - Realizado
        let queryAtrasados7DiasRealizado = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', dataReferencia)
          .gte('prazo_entrega', data7DiasAntesStr)
          .eq('tipo_indicador', 1);
        
        queryAtrasados7DiasRealizado = construirQueryComFiltros(queryAtrasados7DiasRealizado);
        
        const { count: atrasadosAte7DiasRealizado, error: atrasados7DiasRealizadoError } = await queryAtrasados7DiasRealizado;
        if (atrasados7DiasRealizadoError) throw atrasados7DiasRealizadoError;

        // 5. Indicadores em atraso até 30 dias - Meta
        let queryAtrasados30DiasMeta = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', dataReferencia)
          .gte('prazo_entrega', data30DiasAntesStr)
          .eq('tipo_indicador', 2);
        
        queryAtrasados30DiasMeta = construirQueryComFiltros(queryAtrasados30DiasMeta);
        
        const { count: atrasadosAte30DiasMeta, error: atrasados30DiasMetaError } = await queryAtrasados30DiasMeta;
        if (atrasados30DiasMetaError) throw atrasados30DiasMetaError;

        // 6. Indicadores em atraso até 30 dias - Realizado
        let queryAtrasados30DiasRealizado = supabase.from('controle_indicador_geral')
          .select('*', { count: 'exact', head: true })
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', dataReferencia)
          .gte('prazo_entrega', data30DiasAntesStr)
          .eq('tipo_indicador', 1);
        
        queryAtrasados30DiasRealizado = construirQueryComFiltros(queryAtrasados30DiasRealizado);
        
        const { count: atrasadosAte30DiasRealizado, error: atrasados30DiasRealizadoError } = await queryAtrasados30DiasRealizado;
        if (atrasados30DiasRealizadoError) throw atrasados30DiasRealizadoError;

        // Calcular totais
        const todosAtrasadosTotal = (todosAtrasadosMeta || 0) + (todosAtrasadosRealizado || 0);
        const atrasados7DiasTotal = (atrasadosAte7DiasMeta || 0) + (atrasadosAte7DiasRealizado || 0);
        const atrasados30DiasTotal = (atrasadosAte30DiasMeta || 0) + (atrasadosAte30DiasRealizado || 0);

        // Atualizar estados
        setKpisAtraso({
          todosAtrasados: todosAtrasadosTotal,
          atrasadosAte7Dias: atrasados7DiasTotal,
          atrasadosAte30Dias: atrasados30DiasTotal
        });

        setKpisAtrasoDetalhados({
          todosAtrasadosMeta: todosAtrasadosMeta || 0,
          todosAtrasadosRealizado: todosAtrasadosRealizado || 0,
          ate7DiasMeta: atrasadosAte7DiasMeta || 0,
          ate7DiasRealizado: atrasadosAte7DiasRealizado || 0,
          ate30DiasMeta: atrasadosAte30DiasMeta || 0,
          ate30DiasRealizado: atrasadosAte30DiasRealizado || 0
        });

      } catch (error) {
        console.error('Erro ao buscar KPIs de indicadores em atraso:', error);
        toast.error('Erro ao carregar dados de indicadores em atraso');
      } finally {
        setLoadingAtraso(false);
      }
    };

    if (user) {
      fetchKPIsAtraso();
    }
  }, [user, filtros]);

  // Buscar dados das tabelas
  useEffect(() => {
    const fetchTabelas = async () => {
      try {
        setLoadingTabelas(true);

        const dataReferenciaAtraso = getDataReferenciaAtraso();

        // Buscar indicadores em atraso COM tipo_indicador
        let queryIndicadores = supabase
          .from('controle_indicador_geral')
          .select('projeto_id, categoria_id, tipo_indicador')
          .is('valor_indicador_apresentado', null)
          .lt('prazo_entrega', dataReferenciaAtraso)
          .not('projeto_id', 'is', null)
          .not('categoria_id', 'is', null);

        queryIndicadores = construirQueryComFiltros(queryIndicadores);

        const { data: indicadoresVencidos, error: indicadoresError } = await queryIndicadores;

        if (indicadoresError) throw indicadoresError;

        // Agrupamento combinado (Projeto + Categoria) com tipo_indicador
        const agrupamentoCombinado = {};
        indicadoresVencidos.forEach(item => {
          const chave = `${item.projeto_id}_${item.categoria_id}`;
          if (!agrupamentoCombinado[chave]) {
            agrupamentoCombinado[chave] = {
              projeto_id: item.projeto_id,
              categoria_id: item.categoria_id,
              realizado: 0,
              meta: 0
            };
          }
          
          // tipo_indicador: 1 = Realizado, 2 = Meta
          if (item.tipo_indicador === 1) {
            agrupamentoCombinado[chave].realizado++;
          } else if (item.tipo_indicador === 2) {
            agrupamentoCombinado[chave].meta++;
          }
        });

        // Agrupamento por Projetos com tipo_indicador
        const agrupamentoProjetos = {};
        indicadoresVencidos.forEach(item => {
          if (!agrupamentoProjetos[item.projeto_id]) {
            agrupamentoProjetos[item.projeto_id] = {
              projeto_id: item.projeto_id,
              realizado: 0,
              meta: 0
            };
          }
          
          // tipo_indicador: 1 = Realizado, 2 = Meta
          if (item.tipo_indicador === 1) {
            agrupamentoProjetos[item.projeto_id].realizado++;
          } else if (item.tipo_indicador === 2) {
            agrupamentoProjetos[item.projeto_id].meta++;
          }
        });

        // Agrupamento por Categorias com tipo_indicador
        const agrupamentoCategorias = {};
        indicadoresVencidos.forEach(item => {
          if (!agrupamentoCategorias[item.categoria_id]) {
            agrupamentoCategorias[item.categoria_id] = {
              categoria_id: item.categoria_id,
              realizado: 0,
              meta: 0
            };
          }
          
          // tipo_indicador: 1 = Realizado, 2 = Meta
          if (item.tipo_indicador === 1) {
            agrupamentoCategorias[item.categoria_id].realizado++;
          } else if (item.tipo_indicador === 2) {
            agrupamentoCategorias[item.categoria_id].meta++;
          }
        });

        // Buscar nomes dos projetos e categorias
        const projetoIds = [...new Set(indicadoresVencidos.map(item => item.projeto_id))];
        const categoriaIds = [...new Set(indicadoresVencidos.map(item => item.categoria_id))];

        const { data: projetos, error: projetosError } = await supabase
          .from('projetos')
          .select('id, nome')
          .in('id', projetoIds);

        if (projetosError) throw projetosError;

        const { data: categorias, error: categoriasError } = await supabase
          .from('categorias')
          .select('id, nome')
          .in('id', categoriaIds);

        if (categoriasError) throw categoriasError;

        // Criar lookups para nomes
        const projetosLookup = {};
        projetos.forEach(projeto => {
          projetosLookup[projeto.id] = projeto.nome;
        });

        const categoriasLookup = {};
        categorias.forEach(categoria => {
          categoriasLookup[categoria.id] = categoria.nome;
        });

        // Dados das tabelas com divisão Realizado/Meta
        
        // Tabela combinada (Projeto + Categoria)
        const dadosTabelaCombinada = Object.values(agrupamentoCombinado).map(item => ({
          projeto_id: item.projeto_id,
          categoria_id: item.categoria_id,
          nome_projeto: projetosLookup[item.projeto_id] || 'Projeto não encontrado',
          nome_categoria: categoriasLookup[item.categoria_id] || 'Categoria não encontrada',
          realizado: item.realizado,
          meta: item.meta
        })).sort((a, b) => {
          if (a.nome_projeto === b.nome_projeto) {
            return a.nome_categoria.localeCompare(b.nome_categoria);
          }
          return a.nome_projeto.localeCompare(b.nome_projeto);
        });

        // Tabela de Projetos
        const dadosTabelaProjetos = Object.values(agrupamentoProjetos).map(item => ({
          projeto_id: item.projeto_id,
          nome_projeto: projetosLookup[item.projeto_id] || 'Projeto não encontrado',
          realizado: item.realizado,
          meta: item.meta
        })).sort((a, b) => a.nome_projeto.localeCompare(b.nome_projeto));

        // Tabela de Categorias
        const dadosTabelaCategorias = Object.values(agrupamentoCategorias).map(item => ({
          categoria_id: item.categoria_id,
          nome_categoria: categoriasLookup[item.categoria_id] || 'Categoria não encontrada',
          realizado: item.realizado,
          meta: item.meta
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
    const periodoPadrao = calcularPeriodoPadrao();
    setFiltros({
      projeto_id: '',
      categoria_id: '',
      periodo: periodoPadrao.periodo,
      data_inicio: periodoPadrao.dataInicio,
      data_fim: periodoPadrao.dataFim,
      data_referencia_atraso: ''
    });
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasFiltrosAtivos = () => {
    return filtros.projeto_id || 
           filtros.categoria_id || 
           filtros.data_referencia_atraso;
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
          {/* Mobile: Header com logo e controles */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Controle"
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

                  {/* Data de Referência para Indicadores em Atraso */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Data de Referência (Indicadores em Atraso)
                    </label>
                    <input
                      type="date"
                      value={filtros.data_referencia_atraso}
                      onChange={(e) => setFiltros(prev => ({ ...prev, data_referencia_atraso: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={filtros.data_inicio}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {filtros.data_referencia_atraso 
                        ? 'Usando data personalizada' 
                        : `Sincronizado com KPIs principais (${filtros.data_inicio ? new Date(filtros.data_inicio).toLocaleDateString('pt-BR') : 'hoje'})`
                      }
                    </p>
                  </div>

                  {/* Filtro de Período */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Filtro por Prazo (Primeiros 3 KPIs)</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodo('15dias');
                          setFiltros(prev => ({ 
                            ...prev, 
                            periodo: '15dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          }));
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtros.periodo === '15dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 15 dias
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
                        Próximos 30 dias
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
                        Próximos 60 dias
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
              <LogoDisplay 
                className=""
                fallbackText="Controle"
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

                  {/* Data de Referência para Indicadores em Atraso */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Data de Referência (Atraso)</label>
                    <input
                      type="date"
                      value={filtros.data_referencia_atraso}
                      onChange={(e) => setFiltros(prev => ({ ...prev, data_referencia_atraso: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={filtros.data_inicio}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {filtros.data_referencia_atraso 
                        ? 'Usando data personalizada' 
                        : `Sync com KPIs (${filtros.data_inicio ? new Date(filtros.data_inicio).toLocaleDateString('pt-BR') : 'hoje'})`
                      }
                    </p>
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
                  <label className="block text-sm font-medium text-gray-600 mb-2">Filtro por Prazo (Primeiros 3 KPIs)</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const periodo = calcularPeriodo('15dias');
                        setFiltros(prev => ({ 
                          ...prev, 
                          periodo: '15dias',
                          data_inicio: periodo.dataInicio,
                          data_fim: periodo.dataFim
                        }));
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtros.periodo === '15dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Próximos 15 dias
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
                      Próximos 30 dias
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
                      Próximos 60 dias
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
          {/* Sidebar de navegação - Desktop apenas */}
          <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <nav className="space-y-2">
                <button
                  onClick={handleIndicadoresClick}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'inicio'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiBarChart className="mr-3 h-5 w-5" />
                  Indicadores
                </button>

                <button
                  onClick={handleImportantesClick}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'importantes'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiStar className="mr-3 h-5 w-5" />
                  Importantes
                </button>

                <button
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'controle'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <FiClipboard className="mr-3 h-5 w-5" />
                  Controle
                </button>

                <button
                  onClick={handleRegistrosClick}
                  className={`w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'registros'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <TfiPencil className="mr-3 h-5 w-5" />
                  Registros
                </button>
              </nav>
            </div>
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            {/* Mobile: Cabeçalho da seção */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black">Visualização Geral (Indicadores)</h2>
              </div>
              
              <p className="text-gray-600 text-sm mb-6">
                {gerarTextoDescritivo()}
                {hasFiltrosAtivos() && (
                  <span className="ml-2 text-blue-600 font-medium">• Filtros aplicados</span>
                )}
              </p>
            </div>

            {/* Desktop: Cabeçalho da seção */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-black">Visualização Geral (Indicadores)</h1>
                <p className="text-gray-600 text-sm mt-1">
                  {gerarTextoDescritivo()}
                  {hasFiltrosAtivos() && (
                    <span className="ml-2 text-blue-600 font-medium">• Filtros aplicados</span>
                  )}
                </p>
              </div>
            </div>

            {/* KPIs com divisão Meta/Realizado */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
                {/* KPI 1: Total de Indicadores */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Total de Indicadores</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {formatNumber(kpis.totalIndicadores)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <FiBarChart2 className="h-6 w-6 lg:h-8 lg:w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs text-gray-500">
                      Realizado: {formatNumber(kpisDetalhados.totalRealizado)} | Meta: {formatNumber(kpisDetalhados.totalMeta)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Indicadores no período filtrado (hoje + 30 dias por padrão)
                    </p>
                  </div>
                </div>

                {/* KPI 2: Indicadores Com Valor */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Com Valor Definido</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {formatNumber(kpis.indicadoresComValor)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <FiCheckCircle className="h-6 w-6 lg:h-8 lg:w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs text-gray-500">
                      Realizado: {formatNumber(kpisDetalhados.comValorRealizado)} | Meta: {formatNumber(kpisDetalhados.comValorMeta)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {calculatePercentage(kpis.indicadoresComValor, kpis.totalIndicadores)}% do total
                    </p>
                  </div>
                </div>

                {/* KPI 3: Indicadores Sem Valor */}
                <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Sem Valor Definido</p>
                      <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                        {formatNumber(kpis.indicadoresSemValor)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <FiAlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-yellow-500" />
                    </div>
                  </div>
                  <div className="mt-3 lg:mt-4">
                    <p className="text-xs text-gray-500">
                      Realizado: {formatNumber(kpisDetalhados.semValorRealizado)} | Meta: {formatNumber(kpisDetalhados.semValorMeta)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {calculatePercentage(kpis.indicadoresSemValor, kpis.totalIndicadores)}% do total
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* KPIs de Atraso com divisão Meta/Realizado */}
            <div className="mb-6 lg:mb-8">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black">Indicadores em Atraso</h2>
                <p className="text-gray-600 text-sm mt-1">
                  {gerarTextoDescritivoAtraso()}
                </p>
              </div>

              {loadingAtraso ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                  {/* KPI 1: Todos os Indicadores em Atraso */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Todos os Indicadores</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisAtraso.todosAtrasados)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiAlertOctagon className="h-6 w-6 lg:h-8 lg:w-8 text-red-500" />
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-500">
                        Realizado: {formatNumber(kpisAtrasoDetalhados.todosAtrasadosRealizado)} | Meta: {formatNumber(kpisAtrasoDetalhados.todosAtrasadosMeta)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Total de indicadores em atraso
                      </p>
                    </div>
                  </div>

                  {/* KPI 2: Indicadores em Atraso até 7 dias */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Até 7 Dias Antes</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisAtraso.atrasadosAte7Dias)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiClock className="h-6 w-6 lg:h-8 lg:w-8 text-orange-500" />
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-500">
                        Realizado: {formatNumber(kpisAtrasoDetalhados.ate7DiasRealizado)} | Meta: {formatNumber(kpisAtrasoDetalhados.ate7DiasMeta)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {calculatePercentage(kpisAtraso.atrasadosAte7Dias, kpisAtraso.todosAtrasados)}% dos atrasados
                      </p>
                    </div>
                  </div>

                  {/* KPI 3: Indicadores em Atraso até 30 dias */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Até 30 Dias Antes</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpisAtraso.atrasadosAte30Dias)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiClock className="h-6 w-6 lg:h-8 lg:w-8 text-purple-500" />
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-500">
                        Realizado: {formatNumber(kpisAtrasoDetalhados.ate30DiasRealizado)} | Meta: {formatNumber(kpisAtrasoDetalhados.ate30DiasMeta)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {calculatePercentage(kpisAtraso.atrasadosAte30Dias, kpisAtraso.todosAtrasados)}% dos atrasados
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Total Geral com divisão Meta/Realizado */}
            <div className="mb-6 lg:mb-8">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black">Total Geral dos Indicadores</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Visão consolidada de todos os indicadores do sistema
                </p>
              </div>

              {loading || loadingAtraso ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  {/* KPI 1: Total Geral (incluindo atrasados) */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total Geral (incluindo atrasados)</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpis.totalIndicadores + kpisAtraso.todosAtrasados)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiBarChart2 className="h-6 w-6 lg:h-8 lg:w-8 text-indigo-500" />
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-500">
                        Realizado: {formatNumber(kpisDetalhados.totalRealizado + kpisAtrasoDetalhados.todosAtrasadosRealizado)} | Meta: {formatNumber(kpisDetalhados.totalMeta + kpisAtrasoDetalhados.todosAtrasadosMeta)}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                          Total período: {formatNumber(kpis.totalIndicadores)}
                        </span>
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                          Atrasados: {formatNumber(kpisAtraso.todosAtrasados)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* KPI 2: Pendentes */}
                  <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 border-l-4 border-amber-500">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Pendentes</p>
                        <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                          {formatNumber(kpis.indicadoresSemValor + kpisAtraso.todosAtrasados)}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <FiAlertTriangle className="h-6 w-6 lg:h-8 lg:w-8 text-amber-500" />
                      </div>
                    </div>
                    <div className="mt-3 lg:mt-4">
                      <p className="text-xs text-gray-500">
                        Realizado: {formatNumber(kpisDetalhados.semValorRealizado + kpisAtrasoDetalhados.todosAtrasadosRealizado)} | Meta: {formatNumber(kpisDetalhados.semValorMeta + kpisAtrasoDetalhados.todosAtrasadosMeta)}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400 mt-1">
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                          Sem valor: {formatNumber(kpis.indicadoresSemValor)}
                        </span>
                        <span className="flex items-center">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                          Atrasados: {formatNumber(kpisAtraso.todosAtrasados)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Seção das tabelas */}
            {!loading && (
              <>
                {/* Mobile: Tabelas empilhadas */}
                <div className="lg:hidden space-y-6">
                  {/* Tabela de Projetos - Mobile */}
                  <div className="bg-white rounded-lg shadow-md p-4">
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
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Projeto
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Realizado
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Meta
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tabelaProjetos.map((item, index) => (
                              <tr key={item.projeto_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.nome_projeto}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {formatNumber(item.realizado)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {formatNumber(item.meta)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Tabela de Categorias - Mobile */}
                  <div className="bg-white rounded-lg shadow-md p-4">
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
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Categoria
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Realizado
                              </th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Meta
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {tabelaCategorias.map((item, index) => (
                              <tr key={item.categoria_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.nome_categoria}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {formatNumber(item.realizado)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {formatNumber(item.meta)}
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

                {/* Desktop: Tabelas lado a lado */}
                <div className="hidden lg:grid lg:grid-cols-2 mt-8 gap-6">
                  {/* Tabela de Projetos - Desktop */}
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
                                Realizado
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Meta
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
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    {formatNumber(item.realizado)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    {formatNumber(item.meta)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Tabela de Categorias - Desktop */}
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
                                Realizado
                              </th>
                              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Meta
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
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    {formatNumber(item.realizado)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                    {formatNumber(item.meta)}
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

                {/* Tabela de Projetos x Categorias - Mobile e Desktop */}
                <div className="mt-6 lg:mt-8 bg-white rounded-lg shadow-md p-4 lg:p-6">
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
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Projeto
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Categoria
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Realizado
                            </th>
                            <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Meta
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tabelaProjetosCategoria.map((item, index) => (
                            <tr key={`${item.projeto_id}_${item.categoria_id}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  {item.nome_projeto}
                                </div>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {item.nome_categoria}
                                </div>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium bg-blue-100 text-blue-800">
                                  {formatNumber(item.realizado)}
                                </span>
                              </td>
                              <td className="px-4 lg:px-6 py-3 lg:py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2 lg:px-3 py-1 rounded-full text-xs lg:text-sm font-medium bg-green-100 text-green-800">
                                  {formatNumber(item.meta)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Barra de navegação inferior - Mobile apenas */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-30">
        <div className="flex justify-around">
          <button
            onClick={handleIndicadoresClick}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'inicio'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiBarChart className="w-5 h-5" />
            <span className="text-xs font-medium">Indicadores</span>
          </button>

          <button
            onClick={handleImportantesClick}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'importantes'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiStar className="w-5 h-5" />
            <span className="text-xs font-medium">Importantes</span>
          </button>

          <button
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'controle'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <FiClipboard className="w-5 h-5" />
            <span className="text-xs font-medium">Controle</span>
          </button>

          <button
            onClick={handleRegistrosClick}
            className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 rounded-lg transition-colors ${
              activeTab === 'registros'
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <TfiPencil className="w-5 h-5" />
            <span className="text-xs font-medium">Registros</span>
          </button>
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