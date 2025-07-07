// Arquivo: src/pages/visualizacao-indicadores-importantes.js - Versão Final com Menu
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { BarChart, Bar, XAxis, ResponsiveContainer, LabelList } from 'recharts';
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
  FiBarChart
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi';

export default function VisualizacaoIndicadoresImportantes({ user }) {
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
  
  // Estados para filtros avançados - sem filtroImportantes (já aplicado automaticamente)
  const [filtroLerDepois, setFiltroLerDepois] = useState(false);
  const [filtroArquivados, setFiltroArquivados] = useState(false);

  // ✅ NOVO: Estado para controlar a navegação (importantes sempre ativo)
  const [activeTab, setActiveTab] = useState('importantes');
  const [showAllContent, setShowAllContent] = useState(false);

  // =====================================
  // FUNÇÕES PARA GRÁFICO ADAPTATIVO
  // =====================================

  // Função para buscar dados do gráfico
  const fetchGraficoData = async (idControleindicador) => {
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

  // Função para formatar data para gráfico (DD-MM-AA)
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

  // Função para calcular largura ideal por barra baseada na quantidade
  const calculateOptimalBarWidth = (dataLength, isMobile = false) => {
    if (isMobile) {
      if (dataLength <= 3) return 60;
      if (dataLength <= 5) return 45;
      if (dataLength <= 8) return 35;
      return 25;
    } else {
      if (dataLength <= 3) return 80;
      if (dataLength <= 5) return 65;
      if (dataLength <= 8) return 50;
      if (dataLength <= 12) return 40;
      return 30;
    }
  };

  // Função para calcular espaçamento entre barras baseado na quantidade
  const calculateBarSpacing = (dataLength, isMobile = false) => {
    if (isMobile) {
      if (dataLength <= 3) return 15;
      if (dataLength <= 5) return 10;
      if (dataLength <= 8) return 5;
      return 2;
    } else {
      if (dataLength <= 3) return 20;
      if (dataLength <= 5) return 15;
      if (dataLength <= 8) return 10;
      if (dataLength <= 12) return 5;
      return 2;
    }
  };

  // Função para calcular se precisa de scroll baseado na tela disponível
  const calculateNeedsScroll = (dataLength, isMobile = false) => {
    const maxBarsWithoutScroll = isMobile ? 6 : 10;
    return dataLength > maxBarsWithoutScroll;
  };

  // Função para calcular largura total do container
  const calculateTotalWidth = (dataLength, isMobile = false) => {
    const barWidth = calculateOptimalBarWidth(dataLength, isMobile);
    const spacing = calculateBarSpacing(dataLength, isMobile);
    const margins = 20;
    
    const totalWidth = (barWidth + spacing) * dataLength + margins;
    const minWidth = isMobile ? 300 : 500;
    
    return Math.max(totalWidth, minWidth);
  };

  // Função para calcular barCategoryGap dinâmico
  const calculateCategoryGap = (dataLength) => {
    if (dataLength <= 3) return "8%";
    if (dataLength <= 5) return "5%";
    if (dataLength <= 8) return "3%";
    if (dataLength <= 12) return "1%";
    return "2%";
  };

  // =====================================
  // COMPONENTE DO GRÁFICO ADAPTATIVO
  // =====================================
  const GraficoBarrasAdaptativo = ({ indicador, isMobile = false }) => {
    const [graficoData, setGraficoData] = useState([]);
    const [loadingGrafico, setLoadingGrafico] = useState(true);

    useEffect(() => {
      const loadGraficoData = async () => {
        setLoadingGrafico(true);
        const data = await fetchGraficoData(indicador.id_controleindicador);
        
        const dadosGrafico = data.map(item => ({
          periodo: formatDateGrafico(item.periodo_referencia),
          periodoCompleto: item.periodo_referencia,
          valorApresentado: parseFloat(item.valor_indicador_apresentado) || 0,
        })).sort((a, b) => new Date(a.periodoCompleto) - new Date(b.periodoCompleto));
        
        setGraficoData(dadosGrafico);
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
    const needsScroll = calculateNeedsScroll(dataLength, isMobile);
    const totalWidth = calculateTotalWidth(dataLength, isMobile);
    const optimalBarWidth = calculateOptimalBarWidth(dataLength, isMobile);
    const categoryGap = calculateCategoryGap(dataLength);
    
    const altura = isMobile ? 120 : 160;
    const fontSize = isMobile ? 8 : 10;
    const labelFontSize = isMobile ? 7 : 9;

    return (
      <div className="mb-3">
        <div className={needsScroll ? "overflow-x-auto" : ""}>
          <div 
            style={{ 
              width: `${totalWidth}px`,
              minWidth: `${totalWidth}px`,
              margin: needsScroll ? '0' : '0 auto'
            }}
          >
            <div style={{ height: altura }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={graficoData} 
                  margin={{ 
                    top: 25, 
                    right: 10, 
                    left: 10, 
                    bottom: 5 
                  }}
                  barCategoryGap={categoryGap}
                  maxBarSize={optimalBarWidth}
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
                  <Bar 
                    dataKey="valorApresentado" 
                    fill="#3B82F6"
                    radius={[3, 3, 0, 0]}
                  >
                    <LabelList 
                      dataKey="valorApresentado" 
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
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        {needsScroll && (
          <div className="text-center mt-1">
            <span className="text-xs text-gray-400">
              ← Deslize para ver mais períodos →
            </span>
          </div>
        )}
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

  // Layout responsivo de KPIs
  const renderKPILayout = (kpis) => {
    if (kpis.length === 0) return null;
    const count = kpis.length;

    const renderKPICard = (indicador, className = "") => (
      <div key={indicador.id} className={className}>
        <Link href={`/indicador/${indicador.id_controleindicador}`}>
          <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
                {indicador.indicador || 'Sem indicador'}
              </h3>
              <div className="flex items-center space-x-2">
                {getStatusIndicators(indicador)}
                {shouldShowReadLaterIcon(indicador) && (
                  <FiClock className="w-4 h-4 text-blue-600" />
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
              
              <div className="flex items-center text-gray-500 text-xs">
                <FiCalendar className="w-3 h-3 mr-1" />
                {formatDate(indicador)}
              </div>
            </div>
          </div>
        </Link>
      </div>
    );

    // Mesma lógica de layout da página original
    switch (count) {
      case 1:
        return <div className="grid grid-cols-1 gap-6 mb-6">{renderKPICard(kpis[0])}</div>;
      case 2:
        return <div className="grid grid-cols-2 gap-6 mb-6">{kpis.map(kpi => renderKPICard(kpi))}</div>;
      case 3:
        return <div className="grid grid-cols-3 gap-6 mb-6">{kpis.map(kpi => renderKPICard(kpi))}</div>;
      case 4:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">{kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-1 gap-6">{renderKPICard(kpis[3])}</div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">{kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-2 gap-6">{kpis.slice(3, 5).map(kpi => renderKPICard(kpi))}</div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">{kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-3 gap-6">{kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}</div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">{kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-3 gap-6">{kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-1 gap-6">{renderKPICard(kpis[6])}</div>
          </div>
        );
      case 8:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">{kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-3 gap-6">{kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-2 gap-6">{kpis.slice(6, 8).map(kpi => renderKPICard(kpi))}</div>
          </div>
        );
      case 9:
        return (
          <div className="space-y-6 mb-6">
            <div className="grid grid-cols-3 gap-6">{kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-3 gap-6">{kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}</div>
            <div className="grid grid-cols-3 gap-6">{kpis.slice(6, 9).map(kpi => renderKPICard(kpi))}</div>
          </div>
        );
      default:
        return <div className="grid grid-cols-3 gap-6 mb-6">{kpis.map(kpi => renderKPICard(kpi))}</div>;
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

  const getBorderColor = (indicador) => {
    return indicador.lido ? 'border-gray-300' : 'border-blue-500';
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
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

  const handleConfiguracoesClick = () => {
    router.push('/cadastros');
  };

  // ✅ FUNÇÕES DE NAVEGAÇÃO (iguais à página principal)
  const handleInicioClick = () => {
    router.push('/visualizacao-indicadores');
  };

  const handleControleClick = () => {
    router.push('/visualizacao-geral-indicadores');
  };

  const handleRegistrosClick = () => {
    router.push('/controle-indicador-geral');
  };

  // Componente customizado para ícone de grade
  const GridIcon = () => (
    <div className="w-5 h-5 grid grid-cols-3 gap-0.5">
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
      <div className="bg-current rounded-sm"></div>
    </div>
  );

  // Carregar categorias, projetos e projetos vinculados
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

  // ✅ BUSCAR INDICADORES IMPORTANTES (filtro automático aplicado)
  useEffect(() => {
    const fetchIndicadores = async () => {
      try {
        setLoading(true);
        
        if (projetosVinculados.length === 0) {
          setIndicadores([]);
          setLoading(false);
          return;
        }
        
        let query = supabase
          .from('controle_indicador_geral')
          .select(`
            *,
            controle_indicador!inner(
              id,
              tipo_apresentacao,
              tipos_apresentacao(nome)
            )
          `)
          .eq('visivel', true)
          .not('indicador', 'is', null)
          .not('indicador', 'eq', '')
          .not('periodo_referencia', 'is', null)
          .in('projeto_id', projetosVinculados)
          .eq('importante', true); // ✅ FILTRO AUTOMÁTICO PARA IMPORTANTES
          
        // Aplicar filtros de projeto e categoria se selecionados
        if (projetoSelecionado) {
          query = query.eq('projeto_id', projetoSelecionado);
        }
        
        if (categoriaSelecionada) {
          query = query.eq('categoria_id', categoriaSelecionada);
        }

        // Aplicar filtros avançados adicionais
        if (filtroLerDepois) {
          query = query.eq('ler_depois', true);
        }
        if (filtroArquivados) {
          query = query.eq('arquivado', true);
        }
        
        // Aplicar termo de pesquisa se existir
        if (searchTerm.trim()) {
          query = query.ilike('indicador', `%${searchTerm.trim()}%`);
        }
        
        query = query.order('periodo_referencia', { ascending: false, nullsLast: true })
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // Agrupar por id_controleindicador e manter apenas o mais recente
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
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado, filtroLerDepois, filtroArquivados, projetosVinculados]);

  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setFiltroLerDepois(false);
    setFiltroArquivados(false);
    setShowFilters(false);
  };

  const hasActiveFilters = categoriaSelecionada || projetoSelecionado || filtroLerDepois || filtroArquivados;

  const getStatusIndicators = (indicador) => {
    const indicators = [];
    
    if (!indicador.lido) {
      indicators.push(
        <div key="nao-lido" className="w-3 h-3 bg-blue-500 rounded-full"></div>
      );
    }
    
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
        <title>Indicadores Importantes</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              {/* ✅ SEM BOTÃO VOLTAR - apenas logo */}
              <LogoDisplay 
                className=""
                fallbackText="Importantes"
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
            
            {/* Segunda linha: Busca e Filtro */}
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  placeholder="Buscar indicadores importantes..."
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
            
            {/* Terceira linha: Filtros */}
            {showFilters && (
              <div className="mt-4 space-y-3">
                {/* Linha com os selects básicos */}
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
                  
                  {/* Botão limpar */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                {/* Filtros Avançados (sem Importantes) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Filtros Avançados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltroLerDepois(!filtroLerDepois)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroLerDepois 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiClock className="w-4 h-4 mr-1" />
                      Ler Depois
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

          {/* Desktop */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              {/* ✅ SEM BOTÃO VOLTAR - apenas logo */}
              <LogoDisplay 
                className=""
                fallbackText="Indicadores Importantes"
                showFallback={true}
              />
              
              {/* Barra de busca - Desktop */}
              <div className="flex-1 max-w-md lg:max-w-lg mx-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    placeholder="Buscar indicadores importantes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Controles à direita */}
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
                      onClick={() => setFiltroLerDepois(!filtroLerDepois)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroLerDepois 
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiClock className="w-4 h-4 mr-1" />
                      Ler Depois
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
          {/* ✅ SIDEBAR DE NAVEGAÇÃO - Desktop (igual à página principal) */}
          <div className="hidden lg:block lg:w-64 lg:flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <nav className="space-y-2">
                <button
                  onClick={handleInicioClick}
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
                  onClick={() => {}} // ✅ ATIVO - não redireciona
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
            {/* Cabeçalho da seção */}
            <div className="mb-6">
              <div className="flex items-center mb-2">
                <FiStar className="w-6 h-6 text-yellow-500 mr-2" />
                <h2 className="text-2xl lg:text-3xl font-bold text-black">Indicadores Importantes</h2>
              </div>
              <p className="text-gray-600 text-sm">
                {projetosVinculados.length === 0 
                  ? 'Nenhum projeto vinculado encontrado' 
                  : `${indicadores.length} indicadores importantes encontrados`
                }
              </p>
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
            ) : indicadores.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FiStar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum indicador importante encontrado</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Não há indicadores marcados como importantes no momento. Marque indicadores como importantes na página principal para vê-los aqui.
                </p>
              </div>
            ) : (
              <div>
                {/* Mobile */}
                <div className="lg:hidden">
                  {indicadores.map((indicador, index) => {
                    const isKPI = isKpiOrNull(indicador);
                    const isGrafico = isGraficoBarras(indicador);
                    
                    return (
                      <div key={indicador.id} className={index > 0 ? "mt-4" : ""}>
                        <Link href={`/indicador/${indicador.id_controleindicador}`}>
                          <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow`}>
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="text-base font-bold text-gray-900 flex-1 pr-2">
                                {indicador.indicador || 'Sem indicador'}
                              </h3>
                              <div className="flex items-center space-x-2">
                                {getStatusIndicators(indicador)}
                                {shouldShowReadLaterIcon(indicador) && (
                                  <FiClock className="w-4 h-4 text-blue-600" />
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
                                
                                <div className="flex items-center text-gray-500 text-xs">
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
                  })}
                </div>

                {/* Desktop */}
                <div className="hidden lg:block">
                  {(() => {
                    const { kpis, graficos, outros } = separarIndicadoresPorTipo(indicadores);
                    
                    return (
                      <div>
                        {kpis.length > 0 && renderKPILayout(kpis)}
                        
                        {graficos.length > 0 && (
                          <div className="space-y-6 mb-6">
                            {graficos.map((indicador) => (
                              <div key={indicador.id} className="lg:col-span-2 xl:col-span-3">
                                <Link href={`/indicador/${indicador.id_controleindicador}`}>
                                  <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
                                    <div className="flex justify-between items-start mb-3">
                                      <h3 className="text-xl font-bold text-gray-900 flex-1 pr-2">
                                        {indicador.indicador || 'Sem indicador'}
                                      </h3>
                                      <div className="flex items-center space-x-2">
                                        {getStatusIndicators(indicador)}
                                        {shouldShowReadLaterIcon(indicador) && (
                                          <FiClock className="w-4 h-4 text-blue-600" />
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
                                      
                                      <div className="flex items-center text-gray-500 text-sm">
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
                        
                        {outros.length > 0 && (
                          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                            {outros.map((indicador) => (
                              <div key={indicador.id}>
                                <Link href={`/indicador/${indicador.id_controleindicador}`}>
                                  <div className={`bg-white rounded-lg border-l-4 ${getBorderColor(indicador)} p-4 shadow-sm hover:shadow-md transition-shadow h-full`}>
                                    <div className="flex justify-between items-start mb-3">
                                      <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">
                                        {indicador.indicador || 'Sem indicador'}
                                      </h3>
                                      <div className="flex items-center space-x-2">
                                        {getStatusIndicators(indicador)}
                                        {shouldShowReadLaterIcon(indicador) && (
                                          <FiClock className="w-4 h-4 text-blue-600" />
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
                                      
                                      <div className="flex items-center justify-end text-gray-500 text-xs">
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
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ✅ BARRA DE NAVEGAÇÃO INFERIOR - Mobile (igual à página principal) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-30">
        <div className="flex justify-around">
          <button
            onClick={handleInicioClick}
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
            onClick={() => {}} // ✅ ATIVO - não redireciona
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