// Arquivo: src/pages/visualizacao-indicadores.js - Versão com descrição resumida
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  ResponsiveContainer, 
  LabelList,
  Tooltip
} from 'recharts';
import { 
  FiArchive,
  FiSearch, 
  FiFilter, 
  FiFolder,
  FiMenu, 
  FiHome, 
  FiStar, 
  FiClock, 
  FiClipboard,
  FiEye, 
  FiEyeOff, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiCalendar,
  FiBarChart,
  FiCpu,
  FiList,
  FiTrendingUp,
  FiInfo
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi';

export default function VisualizacaoIndicadores({ user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [indicadores, setIndicadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  const [filtroImportantes, setFiltroImportantes] = useState(false);
  const [filtroArquivados, setFiltroArquivados] = useState(false);
  
  const [activeTab, setActiveTab] = useState('inicio');
  const [showAllContent, setShowAllContent] = useState(false);

  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoModalContent, setInfoModalContent] = useState('');
  const [infoModalTitle, setInfoModalTitle] = useState('');

  // =====================================
  // FUNÇÕES PARA GRÁFICO ADAPTATIVO REALIZADO VS META
  // =====================================

  const fetchGraficoRealizadoMeta = async (idControleindicador) => {
    try {
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .select('*')
        .eq('id_controleindicador', idControleindicador)
        .not('periodo_referencia', 'is', null)
        .order('periodo_referencia', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
      return [];
    }
  };

  const prepararDadosGraficoCombinado = (dadosIndicadores) => {
    if (!dadosIndicadores || dadosIndicadores.length === 0) return [];
    
    const dadosAgrupados = {};
    
    dadosIndicadores.forEach(indicador => {
      const periodo = formatDateGrafico(indicador.periodo_referencia);
      const periodoCompleto = indicador.periodo_referencia;
      
      if (!dadosAgrupados[periodo]) {
        dadosAgrupados[periodo] = {
          periodo,
          periodoCompleto,
          realizadoApresentado: 0,
          realizadoIndicador: 0,
          metaApresentado: 0,
          metaIndicador: 0
        };
      }
      
      if (indicador.tipo_indicador === 1) { // Realizado
        dadosAgrupados[periodo].realizadoApresentado = parseFloat(indicador.valor_indicador_apresentado) || 0;
        dadosAgrupados[periodo].realizadoIndicador = parseFloat(indicador.valor_indicador) || 0;
      } else if (indicador.tipo_indicador === 2) { // Meta
        dadosAgrupados[periodo].metaApresentado = parseFloat(indicador.valor_indicador_apresentado) || 0;
        dadosAgrupados[periodo].metaIndicador = parseFloat(indicador.valor_indicador) || 0;
      }
    });
    
    return Object.values(dadosAgrupados)
      .sort((a, b) => new Date(a.periodoCompleto) - new Date(b.periodoCompleto));
  };

  const formatDateGrafico = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return '';
    }
  };

  const MAX_VISIBLE_BARS = 7;

  const calculateOptimalBarWidth = (dataLength, isMobile = false) => {
    const effectiveDataLength = Math.min(dataLength, MAX_VISIBLE_BARS);
    
    if (isMobile) {
      if (effectiveDataLength <= 3) return 60;
      if (effectiveDataLength <= 5) return 45;
      if (effectiveDataLength <= 7) return 35;
      return 35;
    } else {
      if (effectiveDataLength <= 3) return 80;
      if (effectiveDataLength <= 5) return 65;
      if (effectiveDataLength <= 7) return 50;
      return 50;
    }
  };

  const calculateBarSpacing = (dataLength, isMobile = false) => {
    const effectiveDataLength = Math.min(dataLength, MAX_VISIBLE_BARS);
    
    if (isMobile) {
      if (effectiveDataLength <= 3) return 15;
      if (effectiveDataLength <= 5) return 10;
      if (effectiveDataLength <= 7) return 5;
      return 5;
    } else {
      if (effectiveDataLength <= 3) return 20;
      if (effectiveDataLength <= 5) return 15;
      if (effectiveDataLength <= 7) return 10;
      return 10;
    }
  };

  const calculateTotalWidth = (dataLength, isMobile = false) => {
    if (dataLength <= MAX_VISIBLE_BARS) {
      const barWidth = calculateOptimalBarWidth(dataLength, isMobile);
      const spacing = calculateBarSpacing(dataLength, isMobile);
      const margins = 40;
      
      const calculatedWidth = (barWidth + spacing) * dataLength + margins;
      const minWidth = isMobile ? 320 : 400;
      
      return {
        width: Math.max(calculatedWidth, minWidth),
        needsScroll: false,
        calculatedWidth: calculatedWidth,
        visibleBars: dataLength
      };
    } 
    else {
      const barWidth = calculateOptimalBarWidth(MAX_VISIBLE_BARS, isMobile);
      const spacing = calculateBarSpacing(MAX_VISIBLE_BARS, isMobile);
      const margins = 40;
      
      const containerWidth = (barWidth + spacing) * MAX_VISIBLE_BARS + margins;
      const totalContentWidth = (barWidth + spacing) * dataLength + margins;
      
      return {
        width: containerWidth,
        needsScroll: true,
        calculatedWidth: totalContentWidth,
        visibleBars: MAX_VISIBLE_BARS
      };
    }
  };

  const calculateCategoryGap = (dataLength) => {
    const effectiveDataLength = Math.min(dataLength, MAX_VISIBLE_BARS);
    
    if (effectiveDataLength <= 3) return "8%";
    if (effectiveDataLength <= 5) return "5%";
    if (effectiveDataLength <= 7) return "3%";
    return "3%";
  };

  const ScrollableChartContainer = ({ children, dataLength, isMobile = false }) => {
    const scrollRef = useRef(null);
    const [hasScrolled, setHasScrolled] = useState(false);

    const { width, needsScroll, calculatedWidth, visibleBars } = calculateTotalWidth(dataLength, isMobile);

    useEffect(() => {
      if (scrollRef.current && !hasScrolled && needsScroll) {
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth - scrollRef.current.clientWidth;
            setHasScrolled(true);
          }
        }, 100);
      }
    }, [needsScroll, hasScrolled]);
    
    return (
      <div 
        className="flex justify-center"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <div 
          ref={scrollRef}
          className={needsScroll ? "overflow-x-auto" : ""}
          style={{
            width: needsScroll ? `${width}px` : 'auto',
            maxWidth: needsScroll ? `${width}px` : '100%',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ 
            width: needsScroll ? `${calculatedWidth}px` : `${width}px`,
            minWidth: needsScroll ? `${calculatedWidth}px` : `${width}px`,
            margin: '0 auto'
          }}>
            {children}
          </div>
        </div>
      </div>
    );
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-medium text-gray-900">{`Período: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.value?.toLocaleString('pt-BR') || 0}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const GraficoBarrasAdaptativo = ({ indicador, isMobile = false }) => {
    const [graficoData, setGraficoData] = useState([]);
    const [loadingGrafico, setLoadingGrafico] = useState(true);

    useEffect(() => {
      const loadGraficoData = async () => {
        setLoadingGrafico(true);
        const data = await fetchGraficoRealizadoMeta(indicador.id_controleindicador);
        const dadosCombinados = prepararDadosGraficoCombinado(data);
        setGraficoData(dadosCombinados);
        setLoadingGrafico(false);
      };

      loadGraficoData();
    }, [indicador.id_controleindicador]);

    if (loadingGrafico) {
      return (
        <div className="mb-3 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (graficoData.length === 0) {
      return (
        <div className="mb-3 text-center text-gray-500 text-sm">
          Sem dados para gráfico
        </div>
      );
    }

    const dataLength = graficoData.length;
    const categoryGap = calculateCategoryGap(dataLength);
    const optimalBarWidth = calculateOptimalBarWidth(dataLength, isMobile);
    
    const altura = isMobile ? 120 : 160;
    const fontSize = isMobile ? 8 : 10;
    const labelFontSize = isMobile ? 7 : 9;

    return (
      <div className="mb-3">
        <ScrollableChartContainer dataLength={dataLength} isMobile={isMobile}>
          <div style={{ height: altura }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart 
                data={graficoData} 
                margin={{ 
                  top: 25, 
                  right: 10, 
                  left: 10, 
                  bottom: 5 
                }}
                barCategoryGap={categoryGap}
              >
                <XAxis 
                  dataKey="periodo" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ 
                    fontSize: fontSize, 
                    fill: '#6B7280',
                    textAnchor: 'middle'
                  }}
                  interval={0}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Bar 
                  dataKey="realizadoApresentado" 
                  fill="#3B82F6" 
                  name="Realizado"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={optimalBarWidth}
                >
                  <LabelList 
                    dataKey="realizadoApresentado" 
                    position="top" 
                    style={{ 
                      fontSize: `${labelFontSize}px`, 
                      fill: '#374151',
                      fontWeight: '500'
                    }}
                    formatter={(value) => {
                      if (value === 0) return '0';
                      return parseFloat(value).toLocaleString('pt-BR');
                    }}
                  />
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ScrollableChartContainer>
      </div>
    );
  };

  // =====================================
  // FUNÇÕES EXISTENTES
  // =====================================

  const isKpiOrNull = (indicador) => {
    if (!indicador.controle_indicador) return false;
    const tipoApresentacao = indicador.controle_indicador.tipos_apresentacao?.nome;
    return !tipoApresentacao || tipoApresentacao === 'KPI';
  };

  const formatarValorIndicador = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    const num = parseFloat(valor);
    if (isNaN(num)) return valor;
    return num.toLocaleString('pt-BR');
  };

  const isGraficoBarras = (indicador) => {
    if (!indicador.controle_indicador) return false;
    const tipoApresentacao = indicador.controle_indicador.tipos_apresentacao?.nome;
    return tipoApresentacao === 'Gráfico de Barras';
  };

  const separarIndicadoresPorTipo = (indicadores) => {
    const kpis = [];
    const graficos = [];
    const outros = [];

    indicadores.forEach(indicador => {
      if (isKpiOrNull(indicador)) {
        kpis.push(indicador);
      } else if (isGraficoBarras(indicador)) {
        graficos.push(indicador);
      } else {
        outros.push(indicador);
      }
    });

    return { kpis, graficos, outros };
  };

  const handleInfoClick = async (indicador, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { data, error } = await supabase
        .from('controle_indicador')
        .select('descricao_detalhada')
        .eq('id', indicador.id_controleindicador)
        .single();
      
      if (error) {
        console.error('Erro ao buscar descrição detalhada:', error);
        toast.error('Erro ao carregar informações');
        return;
      }
      
      if (data?.descricao_detalhada) {
        setInfoModalTitle(indicador.indicador || 'Informações do Indicador');
        setInfoModalContent(data.descricao_detalhada);
        setShowInfoModal(true);
      }
    } catch (error) {
      console.error('Erro ao buscar informações:', error);
      toast.error('Erro ao carregar informações');
    }
  };

  const shouldShowInfoIcon = (indicador) => {
    return indicador.controle_indicador?.descricao_detalhada && 
           indicador.controle_indicador.descricao_detalhada.trim() !== '';
  };

  // ✅ NOVA FUNÇÃO: Verificar se deve mostrar descrição resumida
  const getDescricaoResumida = (indicador) => {
    const descricao = indicador.controle_indicador?.descricao_resumida;
    return descricao && descricao.trim() !== '' ? descricao.trim() : null;
  };

  const renderKPICard = (indicador, className = "") => (
    <div key={indicador.id} className={className}>
      <Link href={`/indicador/${indicador.id_controleindicador}`}>
        <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 pr-2">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {indicador.indicador || 'Sem indicador'}
              </h3>
              {/* ✅ NOVA: Descrição resumida */}
              {getDescricaoResumida(indicador) && (
                <p className="text-xs text-gray-400 leading-relaxed">
                  {getDescricaoResumida(indicador)}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIndicators(indicador)}
              {shouldShowReadLaterIcon(indicador) && (
                <FiClock className="w-4 h-4 text-blue-600" />
              )}
              {shouldShowInfoIcon(indicador) && (
                <button
                  onClick={(e) => handleInfoClick(indicador, e)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  title="Ver informações detalhadas"
                >
                  <FiInfo className="w-4 h-4 text-gray-600 hover:text-blue-600" />
                </button>
              )}
            </div>
          </div>
          
          <div className="mb-4">
            <div className="text-5xl font-bold text-black">
              {formatarValorIndicador(indicador.valor_indicador_apresentado)}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {indicador.projeto_id && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full whitespace-nowrap">
                  {projetos[indicador.projeto_id]}
                </span>
              )}
              {indicador.categoria_id && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
                  {categorias[indicador.categoria_id]}
                </span>
              )}
            </div>
            
            <div className="flex items-center text-gray-400 text-xs">
              <FiCalendar className="w-3 h-3 mr-1" />
              {formatDate(indicador)}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );

  const renderKPILayout = (kpis) => {
    if (kpis.length === 0) return null;

    const count = kpis.length;

    switch (count) {
      case 1:
        return (
          <div className="grid grid-cols-1 gap-6 mb-6">
            {renderKPICard(kpis[0])}
          </div>
        );
      case 2:
        return (
          <div className="grid grid-cols-2 gap-6 mb-6">
            {kpis.map(kpi => renderKPICard(kpi))}
          </div>
        );
      case 3:
        return (
          <div className="grid grid-cols-3 gap-6 mb-6">
            {kpis.map(kpi => renderKPICard(kpi))}
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-1 gap-6">
              {renderKPICard(kpis[3])}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              {kpis.slice(3, 5).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-1 gap-6">
              {renderKPICard(kpis[6])}
            </div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              {kpis.slice(6, 8).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(6, 9).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
      default:
        return (
          <div className="grid grid-cols-3 gap-6 mb-6">
            {kpis.map(kpi => renderKPICard(kpi))}
          </div>
        );
    }
  };

  const fetchApresentacaoVariaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('apresentacao_variaveis')
        .select('*');
      
      if (error) throw error;
      
      const apresentacaoObj = {};
      data.forEach(item => {
        apresentacaoObj[item.nome_variavel] = item.nome_apresentacao;
      });
      
      setApresentacaoVariaveis(apresentacaoObj);
    } catch (error) {
      console.error('Erro ao carregar apresentação das variáveis:', error);
    }
  };

  const fetchProjetosVinculados = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', userId);
      
      if (error) throw error;
      
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      return projetoIds;
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      return [];
    }
  };

  // ✅ MODIFICADO: Borda sempre azul
  const getBorderColor = (indicador) => {
    return 'border-blue-500';
  };

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

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

  const handleControleClick = () => {
    router.push('/visualizacao-geral-indicadores');
  };

  const handleRegistrosClick = () => {
    router.push('/controle-indicador-geral');
  };

  const handleImportantesClick = () => {
    router.push('/visualizacao-indicadores-importantes');
  };

  useEffect(() => {
    const fetchCategoriasProjetos = async () => {
      try {
        const projetoIds = await fetchProjetosVinculados(user.id);
        
        if (projetoIds.length > 0) {
          const { data: categoriasComControles, error: categoriasControlesError } = await supabase
            .from('controle_indicador_geral')
            .select('categoria_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds)
            .not('categoria_id', 'is', null);
          
          if (categoriasControlesError) throw categoriasControlesError;
          
          const categoriasComControlesVisiveis = [...new Set(
            categoriasComControles.map(item => item.categoria_id)
          )];
          
          if (categoriasComControlesVisiveis.length > 0) {
            const { data: categoriasData, error: categoriasError } = await supabase
              .from('categorias')
              .select('id, nome')
              .in('id', categoriasComControlesVisiveis)
              .order('nome');
            
            if (categoriasError) throw categoriasError;
            
            const categoriasObj = {};
            categoriasData.forEach(cat => {
              categoriasObj[cat.id] = cat.nome;
            });
            
            setCategorias(categoriasObj);
          } else {
            setCategorias({});
          }
          
          const { data: projetosComControles, error: controlesError } = await supabase
            .from('controle_indicador_geral')
            .select('projeto_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds);
          
          if (controlesError) throw controlesError;
          
          const projetosComControlesVisiveis = [...new Set(
            projetosComControles.map(item => item.projeto_id)
          )];
          
          if (projetosComControlesVisiveis.length > 0) {
            const { data: projetosData, error: projetosError } = await supabase
              .from('projetos')
              .select('id, nome')
              .in('id', projetosComControlesVisiveis)
              .order('nome');
            
            if (projetosError) throw projetosError;
            
            const projetosObj = {};
            projetosData.forEach(proj => {
              projetosObj[proj.id] = proj.nome;
            });
            
            setProjetos(projetosObj);
          } else {
            setProjetos({});
          }
        } else {
          setCategorias({});
          setProjetos({});
        }
        
        await fetchApresentacaoVariaveis();
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    if (user) {
      fetchCategoriasProjetos();
    }
  }, [user]);

  // ✅ MODIFICADO: Buscar indicadores incluindo descricao_resumida
  useEffect(() => {
    const fetchIndicadores = async () => {
      try {
        setLoading(true);
        
        if (projetosVinculados.length === 0) {
          setIndicadores([]);
          setLoading(false);
          return;
        }
        
        // ✅ MODIFICADO: Incluir descricao_resumida no select
        let query = supabase
          .from('controle_indicador_geral')
          .select(`
            *,
            controle_indicador!inner(
              id,
              tipo_apresentacao,
              descricao_detalhada,
              descricao_resumida,
              tipos_apresentacao(nome)
            )
          `)
          .eq('visivel', true)
          .not('indicador', 'is', null)
          .not('indicador', 'eq', '')
          .not('periodo_referencia', 'is', null)
          .in('projeto_id', projetosVinculados);
          
        if (projetoSelecionado) {
          query = query.eq('projeto_id', projetoSelecionado);
        }
        
        if (categoriaSelecionada) {
          query = query.eq('categoria_id', categoriaSelecionada);
        }
        
        switch (activeTab) {
          case 'inicio':
            break;
          case 'importantes':
            query = query.eq('importante', true);
            break;
          case 'controle':
            break;
          case 'registros':
            break;
        }

        if (filtroImportantes) {
          query = query.eq('importante', true);
        }
        if (filtroArquivados) {
          query = query.eq('arquivado', true);
        }
        
        if (searchTerm.trim()) {
          query = query.ilike('indicador', `%${searchTerm.trim()}%`);
        }
        
        query = query.order('periodo_referencia', { ascending: false, nullsLast: true })
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        const indicadoresAgrupados = {};
        (data || []).forEach(indicador => {
          const controlId = indicador.id_controleindicador;
          
          if (!indicadoresAgrupados[controlId] || 
              new Date(indicador.periodo_referencia) > new Date(indicadoresAgrupados[controlId].periodo_referencia)) {
              indicadoresAgrupados[controlId] = indicador;
          }
        });

        const indicadoresFinais = Object.values(indicadoresAgrupados)
          .sort((a, b) => new Date(b.periodo_referencia) - new Date(a.periodo_referencia));

        setIndicadores(indicadoresFinais);
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && projetosVinculados.length >= 0) {
      fetchIndicadores();
    }
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado, activeTab, showAllContent, filtroImportantes, filtroArquivados, projetosVinculados]);

  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setFiltroImportantes(false);
    setFiltroArquivados(false);
    setShowFilters(false);
  };

  const hasActiveFilters = categoriaSelecionada || projetoSelecionado || filtroImportantes || filtroArquivados;

  const getSectionTitle = () => {
    switch (activeTab) {
      case 'inicio':
        return 'Indicadores';
      case 'importantes':
        return 'Importantes';
      case 'controle':
        return 'Controle';
      case 'registros':
        return 'Registros';
      default:
        return 'Indicadores';
    }
  };

  const getSectionSubtitle = () => {
    if (projetosVinculados.length === 0) {
      return 'Nenhum projeto vinculado encontrado';
    }
    
    if (activeTab === 'inicio') {
      return showAllContent ? 'Todos os Indicadores' : 'Indicadores disponíveis';
    }
    return `${indicadores.length} indicadores encontrados`;
  };

  const getStatusIndicators = (indicador) => {
    const indicators = [];
    
    if (indicador.importante) {
      indicators.push(
        <FiStar key="importante" className="w-4 h-4 text-blue-600" />
      );
    }
    
    if (indicador.arquivado) {
      indicators.push(
        <FiArchive key="arquivado" className="w-4 h-4 text-blue-600" />
      );
    }
    
    return indicators;
  };

  const shouldShowReadLaterIcon = (indicador) => {
    return indicador.ler_depois;
  };

  const formatDate = (indicador) => {
    const dateString = indicador.periodo_referencia || indicador.created_at;
    
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

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Visualização de Indicadores</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Modal de Informação */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {infoModalTitle}
              </h3>
              <button
                onClick={() => setShowInfoModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {infoModalContent}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end p-4 border-t border-gray-200">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .overflow-x-auto::-webkit-scrollbar {
          height: 6px;
        }
        
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 3px;
        }

        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Indicadores"
                showFallback={true}
              />
              
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <FiMenu className="w-6 h-6 text-gray-600" />
                </button>
                
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
            
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  placeholder="Buscar indicadores..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-lg transition-colors ${
                  showFilters || hasActiveFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>
            
            {showFilters && (
              <div className="mt-4 space-y-3">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.projeto || 'Projeto'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={projetoSelecionado}
                      onChange={(e) => setProjetoSelecionado(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.categoria || 'Categoria'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={categoriaSelecionada}
                      onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Filtros Avançados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltroImportantes(!filtroImportantes)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroImportantes 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiStar className="w-4 h-4 mr-1" />
                      Importantes
                    </button>
                    
                    <button
                      onClick={() => setFiltroArquivados(!filtroArquivados)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroArquivados 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiArchive className="w-4 h-4 mr-1" />
                      Arquivados
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop: Layout similar */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Indicadores"
                showFallback={true}
              />
              
              <div className="flex-1 max-w-md lg:max-w-lg mx-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    placeholder="Buscar indicadores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-3 rounded-lg transition-colors ${
                    showFilters || hasActiveFilters 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FiFilter className="w-5 h-5" />
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-md"
                  >
                    <FiMenu className="w-6 h-6 text-gray-600" />
                  </button>
                  
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
            
            {showFilters && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.projeto || 'Projeto'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={projetoSelecionado}
                      onChange={(e) => setProjetoSelecionado(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {apresentacaoVariaveis.categoria || 'Categoria'}
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={categoriaSelecionada}
                      onChange={(e) => setCategoriaSelecionada(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {Object.entries(categorias).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Filtros Avançados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltroImportantes(!filtroImportantes)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroImportantes 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiStar className="w-4 h-4 mr-1" />
                      Importantes
                    </button>
                    
                    <button
                      onClick={() => setFiltroArquivados(!filtroArquivados)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroArquivados 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiArchive className="w-4 h-4 mr-1" />
                      Arquivados
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
                  onClick={() => {
                    setActiveTab('inicio');
                    setShowAllContent(false);
                  }}
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
                  onClick={handleControleClick}
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
                <h2 className="text-2xl font-bold text-black">{getSectionTitle()}</h2>
                
                {activeTab === 'inicio' && (
                  <button
                    onClick={() => setShowAllContent(!showAllContent)}
                    className="flex items-center text-gray-600 hover:text-gray-800"
                  >
                    {showAllContent ? <FiEyeOff className="w-5 h-5 mr-1" /> : <FiEye className="w-5 h-5 mr-1" />}
                    <span className="text-sm">Ver todos</span>
                  </button>
                )}
              </div>
              
              <p className="text-gray-600 text-sm mb-6">{getSectionSubtitle()}</p>
            </div>

            {/* Desktop: Cabeçalho da seção */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-black">{getSectionTitle()}</h2>
                <p className="text-gray-600 text-sm mt-1">{getSectionSubtitle()}</p>
              </div>
              
              {activeTab === 'inicio' && (
                <button
                  onClick={() => setShowAllContent(!showAllContent)}
                  className="flex items-center text-gray-600 hover:text-gray-800"
                >
                  {showAllContent ? <FiEyeOff className="w-5 h-5 mr-1" /> : <FiEye className="w-5 h-5 mr-1" />}
                  <span className="text-sm">Ver todos</span>
                </button>
              )}
            </div>

            {/* Conteúdo dos cards */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : projetosVinculados.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FiFolder className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes.
                </p>
              </div>
            ) : (
              <div>
                {/* Mobile: Layout com descrição resumida */}
                <div className="lg:hidden">
                  {indicadores.length > 0 ? (
                    indicadores.map((indicador, index) => {
                      const isKPI = isKpiOrNull(indicador);
                      const isGrafico = isGraficoBarras(indicador);
                      
                      return (
                        <div key={indicador.id} className={index > 0 ? "mt-4" : ""}>
                          <Link href={`/indicador/${indicador.id_controleindicador}`}>
                            <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 pr-2">
                                  <h3 className="text-base font-bold text-gray-900 mb-1">
                                    {indicador.indicador || 'Sem indicador'}
                                  </h3>
                                  {/* ✅ NOVA: Descrição resumida - Mobile */}
                                  {getDescricaoResumida(indicador) && (
                                    <p className="text-xs text-gray-400 leading-relaxed">
                                      {getDescricaoResumida(indicador)}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2">
                                  {getStatusIndicators(indicador)}
                                  {shouldShowReadLaterIcon(indicador) && (
                                    <FiClock className="w-4 h-4 text-blue-600" />
                                  )}
                                  {shouldShowInfoIcon(indicador) && (
                                    <button
                                      onClick={(e) => handleInfoClick(indicador, e)}
                                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                      title="Ver informações detalhadas"
                                    >
                                      <FiInfo className="w-4 h-4 text-gray-600 hover:text-blue-600" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {(() => {
                                if (isKPI) {
                                  return (
                                    <div className="mb-3">
                                      <div className="text-4xl font-bold text-black">
                                        {formatarValorIndicador(indicador.valor_indicador_apresentado)}
                                      </div>
                                    </div>
                                  );
                                } else if (isGrafico) {
                                  return <GraficoBarrasAdaptativo indicador={indicador} isMobile={true} />;
                                }
                                
                                return null;
                              })()}
                              
                              {(isKPI || isGrafico) ? (
                                <div className="flex items-center justify-between">
                                  <div className="flex space-x-2">
                                    {indicador.projeto_id && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                        {projetos[indicador.projeto_id]}
                                      </span>
                                    )}
                                    {indicador.categoria_id && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        {categorias[indicador.categoria_id]}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center text-gray-400 text-xs">
                                    <FiCalendar className="w-3 h-3 mr-1" />
                                    {formatDate(indicador)}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <div className="flex space-x-2">
                                    {indicador.projeto_id && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                        {projetos[indicador.projeto_id]}
                                      </span>
                                    )}
                                    {indicador.categoria_id && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        {categorias[indicador.categoria_id]}
                                      </span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center text-gray-500 text-xs">
                                    <FiCalendar className="w-3 h-3 mr-1" />
                                    {formatDate(indicador)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </Link>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      Nenhum indicador encontrado
                    </div>
                  )}
                </div>

                {/* Desktop: Layout com sistema KPI responsivo e descrição resumida */}
                <div className="hidden lg:block">
                  {indicadores.length > 0 ? (
                    (() => {
                      const { kpis, graficos, outros } = separarIndicadoresPorTipo(indicadores);
                      
                      return (
                        <div>
                          {/* Seção de KPIs com layout responsivo */}
                          {kpis.length > 0 && renderKPILayout(kpis)}
                          
                          {/* Seção de gráficos de barras */}
                          {graficos.length > 0 && (
                            <div className="space-y-6 mb-6">
                              {graficos.map((indicador) => (
                                <div key={indicador.id} className="lg:col-span-2 xl:col-span-3">
                                  <Link href={`/indicador/${indicador.id_controleindicador}`}>
                                    <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 pr-2">
                                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                                            {indicador.indicador || 'Sem indicador'}
                                          </h3>
                                          {/* ✅ NOVA: Descrição resumida - Desktop gráficos */}
                                          {getDescricaoResumida(indicador) && (
                                            <p className="text-sm text-gray-400 leading-relaxed">
                                              {getDescricaoResumida(indicador)}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {getStatusIndicators(indicador)}
                                          {shouldShowReadLaterIcon(indicador) && (
                                            <FiClock className="w-4 h-4 text-blue-600" />
                                          )}
                                          {shouldShowInfoIcon(indicador) && (
                                            <button
                                              onClick={(e) => handleInfoClick(indicador, e)}
                                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                              title="Ver informações detalhadas"
                                            >
                                              <FiInfo className="w-4 h-4 text-gray-600 hover:text-blue-600" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <GraficoBarrasAdaptativo indicador={indicador} isMobile={false} />
                                      
                                      <div className="flex items-center justify-between">
                                        <div className="flex flex-wrap gap-2">
                                          {indicador.projeto_id && (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 text-sm rounded-full whitespace-nowrap">
                                              {projetos[indicador.projeto_id]}
                                            </span>
                                          )}
                                          {indicador.categoria_id && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full whitespace-nowrap">
                                              {categorias[indicador.categoria_id]}
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center text-gray-400 text-sm">
                                          <FiCalendar className="w-4 h-4 mr-1" />
                                          {formatDate(indicador)}
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Seção de outros tipos */}
                          {outros.length > 0 && (
                            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                              {outros.map((indicador) => (
                                <div key={indicador.id}>
                                  <Link href={`/indicador/${indicador.id_controleindicador}`}>
                                    <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
                                      <div className="flex justify-between items-start mb-3">
                                        <div className="flex-1 pr-2">
                                          <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            {indicador.indicador || 'Sem indicador'}
                                          </h3>
                                          {/* ✅ NOVA: Descrição resumida - Desktop outros */}
                                          {getDescricaoResumida(indicador) && (
                                            <p className="text-sm text-gray-400 leading-relaxed">
                                              {getDescricaoResumida(indicador)}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {getStatusIndicators(indicador)}
                                          {shouldShowReadLaterIcon(indicador) && (
                                            <FiClock className="w-4 h-4 text-blue-600" />
                                          )}
                                          {shouldShowInfoIcon(indicador) && (
                                            <button
                                              onClick={(e) => handleInfoClick(indicador, e)}
                                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                              title="Ver informações detalhadas"
                                            >
                                              <FiInfo className="w-4 h-4 text-gray-600 hover:text-blue-600" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap gap-2">
                                          {indicador.projeto_id && (
                                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full whitespace-nowrap">
                                              {projetos[indicador.projeto_id]}
                                            </span>
                                          )}
                                          {indicador.categoria_id && (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full whitespace-nowrap">
                                              {categorias[indicador.categoria_id]}
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center justify-end text-gray-400 text-xs">
                                          <FiCalendar className="w-3 h-3 mr-1" />
                                          {formatDate(indicador)}
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="py-8 text-center text-gray-500">
                      Nenhum indicador encontrado
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de navegação inferior - Mobile apenas */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-30">
        <div className="flex justify-around">
          <button
            onClick={() => {
              setActiveTab('inicio');
              setShowAllContent(false);
            }}
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
            onClick={handleControleClick}
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
      {(showMenu || showInfoModal) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowMenu(false);
            if (!showInfoModal) {
              setShowMenu(false);
            }
          }}
        />
      )}
    </div>
  );
}