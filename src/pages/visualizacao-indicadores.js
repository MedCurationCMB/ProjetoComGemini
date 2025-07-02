// Arquivo: src/pages/visualizacao-indicadores.js - Versão com gráfico adaptativo
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
  FiClock, // ✅ MANTIDO para filtros avançados
  FiClipboard, // ✅ ÍCONE PARA CONTROLE
  FiEye, 
  FiEyeOff, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiCalendar,
  FiBarChart 
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi'; // ✅ NOVO ÍCONE PARA REGISTROS

export default function VisualizacaoIndicadores({ user }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [indicadores, setIndicadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]); // Novo estado para projetos vinculados
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  // ✅ ESTADOS PARA FILTROS AVANÇADOS - com filtroLerDepois mantido
  const [filtroImportantes, setFiltroImportantes] = useState(false);
  const [filtroLerDepois, setFiltroLerDepois] = useState(false); // ✅ MANTIDO
  const [filtroArquivados, setFiltroArquivados] = useState(false);
  
  // ✅ MODIFICADO: Estados para controlar a navegação - substituído 'ver_todos' por 'registros'
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio', 'importantes', 'controle', 'registros'
  const [showAllContent, setShowAllContent] = useState(false); // Para o toggle "Ver todos" na seção Início

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
      // Mobile: adaptar baseado na quantidade
      if (dataLength <= 3) return 60;      // Poucas barras = mais largas
      if (dataLength <= 5) return 45;      // Quantidade média
      if (dataLength <= 8) return 35;      // Mais barras = mais estreitas
      return 25;                           // Muitas barras = bem estreitas
    } else {
      // Desktop: adaptar baseado na quantidade
      if (dataLength <= 3) return 80;      // Poucas barras = mais largas
      if (dataLength <= 5) return 65;      // Quantidade média
      if (dataLength <= 8) return 50;      // Mais barras = mais estreitas
      if (dataLength <= 12) return 40;     // Muitas barras
      return 30;                           // Muitas barras = bem estreitas
    }
  };

  // Função para calcular espaçamento entre barras baseado na quantidade
  const calculateBarSpacing = (dataLength, isMobile = false) => {
    if (isMobile) {
      if (dataLength <= 3) return 15;      // Poucas barras = mais espaço
      if (dataLength <= 5) return 10;      // Quantidade média
      if (dataLength <= 8) return 5;       // Mais barras = menos espaço
      return 2;                            // Muitas barras = espaço mínimo
    } else {
      if (dataLength <= 3) return 20;      // Poucas barras = mais espaço
      if (dataLength <= 5) return 15;      // Quantidade média
      if (dataLength <= 8) return 10;      // Mais barras = menos espaço
      if (dataLength <= 12) return 5;      // Muitas barras
      return 2;                            // Muitas barras = espaço mínimo
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
    
    // Largura total = (largura da barra + espaçamento) * número de barras + margens
    const totalWidth = (barWidth + spacing) * dataLength + margins;
    
    // Largura mínima baseada na tela
    const minWidth = isMobile ? 300 : 500;
    
    return Math.max(totalWidth, minWidth);
  };

  // Função para calcular barCategoryGap dinâmico
  const calculateCategoryGap = (dataLength) => {
    if (dataLength <= 3) return "8%";     // Poucas barras = mais espaço
    if (dataLength <= 5) return "5%";     // Quantidade média
    if (dataLength <= 8) return "3%";     // Mais barras = menos espaço
    if (dataLength <= 12) return "1%";     // Muitas barras
    return "2%";                           // Muitas barras = espaço mínimo
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
        
        // Preparar dados para o gráfico
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

    // Estados de loading e dados vazios
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

    // Cálculos adaptativos
    const dataLength = graficoData.length;
    const needsScroll = calculateNeedsScroll(dataLength, isMobile);
    const totalWidth = calculateTotalWidth(dataLength, isMobile);
    const optimalBarWidth = calculateOptimalBarWidth(dataLength, isMobile);
    const categoryGap = calculateCategoryGap(dataLength);
    
    // Configurações responsivas
    const altura = isMobile ? 120 : 160;
    const fontSize = isMobile ? 8 : 10;
    const labelFontSize = isMobile ? 7 : 9;

    return (
      <div className="mb-3">
        {/* Container com scroll condicional */}
        <div className={needsScroll ? "overflow-x-auto" : ""}>
          <div 
            style={{ 
              width: `${totalWidth}px`,        // ✅ SEMPRE largura calculada
              minWidth: `${totalWidth}px`,     // ✅ SEMPRE largura calculada
              margin: needsScroll ? '0' : '0 auto'  // ✅ Centrar quando não há scroll
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
                    interval={0} // Mostrar todas as labels
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
        
        {/* Indicador de scroll (opcional) */}
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
  // FUNÇÕES EXISTENTES (mantidas)
  // =====================================

  // 2. FUNÇÃO PARA VERIFICAR SE É TIPO KPI OU NULL
  const isKpiOrNull = (indicador) => {
    if (!indicador.controle_indicador) return false;
    
    const tipoApresentacao = indicador.controle_indicador.tipos_apresentacao?.nome;
    
    // Se tipo_apresentacao é NULL ou se o nome é 'KPI'
    return !tipoApresentacao || tipoApresentacao === 'KPI';
  };

  // 3. FUNÇÃO PARA FORMATAR VALOR DO INDICADOR
  const formatarValorIndicador = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    
    const num = parseFloat(valor);
    if (isNaN(num)) return valor;
    
    return num.toLocaleString('pt-BR');
  };

  // 4. FUNÇÃO PARA VERIFICAR SE É TIPO GRÁFICO DE BARRAS
  const isGraficoBarras = (indicador) => {
    if (!indicador.controle_indicador) return false;
    
    const tipoApresentacao = indicador.controle_indicador.tipos_apresentacao?.nome;
    
    return tipoApresentacao === 'Gráfico de Barras';
  };

  // ✅ NOVA FUNÇÃO: Separar indicadores por tipo
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

  // ✅ NOVA FUNÇÃO: Renderizar layout responsivo de KPIs (LIMITE 3 POR LINHA)
  const renderKPILayout = (kpis) => {
    if (kpis.length === 0) return null;

    const count = kpis.length;

    // Função para renderizar um card KPI individual
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
            
            {/* Valor KPI */}
            <div className="mb-4">
              <div className="text-5xl font-bold text-black">
                {formatarValorIndicador(indicador.valor_indicador_apresentado)}
              </div>
            </div>
            
            {/* Tags e data */}
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

    // ✅ LÓGICA DE LAYOUT OTIMIZADO BASEADA NA QUANTIDADE (LIMITE 3 POR LINHA)
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
        // ✅ CASO ESPECIAL: 3 na primeira linha + 1 ocupando toda a segunda linha
        return (
          <div className="space-y-6 mb-6">
            {/* Primeira linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Segunda linha: 1 KPI ocupando toda a largura */}
            <div className="grid grid-cols-1 gap-6">
              {renderKPICard(kpis[3])}
            </div>
          </div>
        );
        
      case 5:
        // ✅ CASO ESPECIAL: 3 na primeira linha + 2 na segunda linha
        return (
          <div className="space-y-6 mb-6">
            {/* Primeira linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Segunda linha: 2 KPIs */}
            <div className="grid grid-cols-2 gap-6">
              {kpis.slice(3, 5).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
        
      case 6:
        // ✅ CASO ESPECIAL: 3 na primeira linha + 3 na segunda linha
        return (
          <div className="space-y-6 mb-6">
            {/* Primeira linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Segunda linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
        
      case 7:
        // ✅ CASO ESPECIAL: 3 na primeira linha + 3 na segunda linha + 1 na terceira linha (largura total)
        return (
          <div className="space-y-6 mb-6">
            {/* Primeira linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Segunda linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Terceira linha: 1 KPI ocupando toda a largura */}
            <div className="grid grid-cols-1 gap-6">
              {renderKPICard(kpis[6])}
            </div>
          </div>
        );
        
      case 8:
        // ✅ CASO ESPECIAL: 3 + 3 + 2 KPIs
        return (
          <div className="space-y-6 mb-6">
            {/* Primeira linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Segunda linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Terceira linha: 2 KPIs */}
            <div className="grid grid-cols-2 gap-6">
              {kpis.slice(6, 8).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
        
      case 9:
        // ✅ CASO ESPECIAL: 3 + 3 + 3 KPIs
        return (
          <div className="space-y-6 mb-6">
            {/* Primeira linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(0, 3).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Segunda linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(3, 6).map(kpi => renderKPICard(kpi))}
            </div>
            {/* Terceira linha: 3 KPIs */}
            <div className="grid grid-cols-3 gap-6">
              {kpis.slice(6, 9).map(kpi => renderKPICard(kpi))}
            </div>
          </div>
        );
        
      default:
        // ✅ FALLBACK: Para mais de 9 KPIs, usar grid padrão de 3 colunas
        return (
          <div className="grid grid-cols-3 gap-6 mb-6">
            {kpis.map(kpi => renderKPICard(kpi))}
          </div>
        );
    }
  };

  // Função para buscar dados de apresentação
  const fetchApresentacaoVariaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('apresentacao_variaveis')
        .select('*');
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por nome_variavel
      const apresentacaoObj = {};
      data.forEach(item => {
        apresentacaoObj[item.nome_variavel] = item.nome_apresentacao;
      });
      
      setApresentacaoVariaveis(apresentacaoObj);
    } catch (error) {
      console.error('Erro ao carregar apresentação das variáveis:', error);
    }
  };

  // Função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', userId);
      
      if (error) throw error;
      
      // Extrair apenas os IDs dos projetos
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      return projetoIds;
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      return [];
    }
  };

  // Função para determinar a cor da borda baseada no status de leitura
  const getBorderColor = (indicador) => {
    return indicador.lido ? 'border-gray-300' : 'border-blue-500';
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

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

  // ✅ FUNÇÃO: Navegar para página de controle
  const handleControleClick = () => {
    router.push('/visualizacao-geral-indicadores');
  };

  // ✅ NOVA FUNÇÃO: Navegar para página de registros
  const handleRegistrosClick = () => {
    router.push('/controle-indicador-geral');
  };

  // 1. ADICIONAR nova função de navegação (após handleRegistrosClick):
  const handleImportantesClick = () => {
    router.push('/visualizacao-indicadores-importantes');
  };

  // Carregar categorias, projetos e projetos vinculados
  useEffect(() => {
    const fetchCategoriasProjetos = async () => {
      try {
        // Buscar projetos vinculados primeiro
        const projetoIds = await fetchProjetosVinculados(user.id);
        
        // ✅ LÓGICA CORRIGIDA: Buscar categorias de controles visíveis E de projetos vinculados
        if (projetoIds.length > 0) {
          // Buscar quais categorias têm controles visíveis EM PROJETOS VINCULADOS
          const { data: categoriasComControles, error: categoriasControlesError } = await supabase
            .from('controle_indicador_geral')
            .select('categoria_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds) // ✅ NOVA RESTRIÇÃO: apenas projetos vinculados
            .not('categoria_id', 'is', null); // Excluir registros sem categoria
          
          if (categoriasControlesError) throw categoriasControlesError;
          
          // Extrair IDs únicos de categorias que têm controles visíveis em projetos vinculados
          const categoriasComControlesVisiveis = [...new Set(
            categoriasComControles.map(item => item.categoria_id)
          )];
          
          console.log('Projetos vinculados:', projetoIds);
          console.log('Categorias com controles visíveis em projetos vinculados:', categoriasComControlesVisiveis);
          
          // Buscar apenas as categorias que atendem aos dois critérios
          if (categoriasComControlesVisiveis.length > 0) {
            const { data: categoriasData, error: categoriasError } = await supabase
              .from('categorias')
              .select('id, nome')
              .in('id', categoriasComControlesVisiveis) // Apenas categorias com controles visíveis em projetos vinculados
              .order('nome');
            
            if (categoriasError) throw categoriasError;
            
            // Converter array em objeto para fácil acesso por ID
            const categoriasObj = {};
            categoriasData.forEach(cat => {
              categoriasObj[cat.id] = cat.nome;
            });
            
            setCategorias(categoriasObj);
            console.log('Categorias carregadas para dropdown:', categoriasData?.length || 0);
          } else {
            // Se não há categorias que atendem aos critérios, definir como objeto vazio
            setCategorias({});
            console.log('Nenhuma categoria possui controles visíveis em projetos vinculados');
          }
          
          // ✅ LÓGICA DOS PROJETOS (mantida igual)
          // Buscar quais projetos têm controles visíveis
          const { data: projetosComControles, error: controlesError } = await supabase
            .from('controle_indicador_geral')
            .select('projeto_id')
            .eq('visivel', true)
            .in('projeto_id', projetoIds); // Apenas dos projetos vinculados
          
          if (controlesError) throw controlesError;
          
          // Extrair IDs únicos de projetos que têm controles visíveis
          const projetosComControlesVisiveis = [...new Set(
            projetosComControles.map(item => item.projeto_id)
          )];
          
          console.log('Projetos com controles visíveis:', projetosComControlesVisiveis);
          
          // Buscar apenas os projetos que estão nas duas listas
          if (projetosComControlesVisiveis.length > 0) {
            const { data: projetosData, error: projetosError } = await supabase
              .from('projetos')
              .select('id, nome')
              .in('id', projetosComControlesVisiveis) // Apenas projetos com controles visíveis
              .order('nome');
            
            if (projetosError) throw projetosError;
            
            // Converter array em objeto para fácil acesso por ID
            const projetosObj = {};
            projetosData.forEach(proj => {
              projetosObj[proj.id] = proj.nome;
            });
            
            setProjetos(projetosObj);
            console.log('Projetos carregados para dropdown:', projetosData?.length || 0);
          } else {
            // Se não há projetos com controles visíveis, definir como objeto vazio
            setProjetos({});
            console.log('Nenhum projeto vinculado possui controles visíveis');
          }
        } else {
          // Se não há projetos vinculados, não há categorias nem projetos para mostrar
          setCategorias({});
          setProjetos({});
          console.log('Usuário não possui projetos vinculados');
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

  // ✅ MODIFICADO: Buscar indicadores com base nos filtros e navegação (incluindo filtroLerDepois)
  useEffect(() => {
    const fetchIndicadores = async () => {
      try {
        setLoading(true);
        
        // Se o usuário não tem projetos vinculados, não mostrar nenhum indicador
        if (projetosVinculados.length === 0) {
          setIndicadores([]);
          setLoading(false);
          return;
        }
        
        // Iniciar a consulta com filtros básicos obrigatórios E join com tabelas relacionadas
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
          .eq('visivel', true)  // ← PRIMEIRO: verificar se é visível
          .not('indicador', 'is', null)  // ← SEGUNDO: não pode ser null
          .not('indicador', 'eq', '')    // ← TERCEIRO: não pode ser string vazia
          .not('periodo_referencia', 'is', null)  // ← QUARTO: periodo_referencia não pode ser null
          .in('projeto_id', projetosVinculados); // ← NOVO: Filtrar apenas projetos vinculados
          
        // Aplicar filtros de projeto e categoria se selecionados
        if (projetoSelecionado) {
          query = query.eq('projeto_id', projetoSelecionado);
        }
        
        if (categoriaSelecionada) {
          query = query.eq('categoria_id', categoriaSelecionada);
        }
        
        // ✅ MODIFICADO: Aplicar filtros baseados na aba ativa (alterado ver_todos para registros)
        switch (activeTab) {
          case 'inicio':
            if (!showAllContent) {
              // Mostrar apenas não lidos
              query = query.eq('lido', false);
            }
            // Se showAllContent for true, mostra todos (sem filtro adicional)
            break;
          case 'importantes':
            query = query.eq('importante', true);
            break;
          case 'controle': // ✅ ABA: redireciona para outra página, mas mantemos a lógica
            // Na aba "Controle", não aplicar filtros específicos (ou redirecionar)
            break;
          case 'registros': // ✅ NOVO: substituiu ver_todos
            // Na aba "Registros", não aplicar filtros automáticos da aba
            break;
        }

        // ✅ APLICAR FILTROS AVANÇADOS EM TODAS AS ABAS (incluindo filtroLerDepois)
        if (filtroImportantes) {
          query = query.eq('importante', true);
        }
        if (filtroLerDepois) { // ✅ MANTIDO
          query = query.eq('ler_depois', true);
        }
        if (filtroArquivados) {
          query = query.eq('arquivado', true);
        }
        
        // Aplicar termo de pesquisa se existir
        if (searchTerm.trim()) {
          query = query.ilike('indicador', `%${searchTerm.trim()}%`);
        }
        
        // ALTERAÇÃO: Ordenar por periodo_referencia se existir, caso contrário por created_at
        // Primeiro tentativa: ordenar por periodo_referencia (nulls last) e depois por created_at
        query = query.order('periodo_referencia', { ascending: false, nullsLast: true })
            .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) throw error;

        // ✅ NOVA LÓGICA: Agrupar por id_controleindicador e manter apenas o mais recente
        const indicadoresAgrupados = {};
        (data || []).forEach(indicador => {
          const controlId = indicador.id_controleindicador;
          
          // Se não existe esse id_controleindicador ainda, ou se este tem data mais recente
          if (!indicadoresAgrupados[controlId] || 
              new Date(indicador.periodo_referencia) > new Date(indicadoresAgrupados[controlId].periodo_referencia)) {
              indicadoresAgrupados[controlId] = indicador;
          }
        });

        // Converter de volta para array e ordenar novamente
        const indicadoresFinais = Object.values(indicadoresAgrupados)
          .sort((a, b) => new Date(b.periodo_referencia) - new Date(a.periodo_referencia));

        setIndicadores(indicadoresFinais);
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user && projetosVinculados.length >= 0) { // Permitir execução mesmo se não há projetos vinculados
      fetchIndicadores();
    }
  }, [user, searchTerm, categoriaSelecionada, projetoSelecionado, activeTab, showAllContent, filtroImportantes, filtroLerDepois, filtroArquivados, projetosVinculados]); // ✅ INCLUÍDO: filtroLerDepois

  // ✅ MODIFICADO: Limpar filtros (incluindo filtroLerDepois)
  const clearFilters = () => {
    setCategoriaSelecionada('');
    setProjetoSelecionado('');
    setFiltroImportantes(false);
    setFiltroLerDepois(false); // ✅ MANTIDO
    setFiltroArquivados(false);
    setShowFilters(false);
  };

  // ✅ MODIFICADO: Verificar se há filtros ativos (incluindo filtroLerDepois)
  const hasActiveFilters = categoriaSelecionada || projetoSelecionado || filtroImportantes || filtroLerDepois || filtroArquivados;

  // ✅ MODIFICADO: Obter título da seção (alterado ver_todos para registros)
  const getSectionTitle = () => {
    switch (activeTab) {
      case 'inicio':
        return 'Indicadores';
      case 'importantes':
        return 'Importantes';
      case 'controle':
        return 'Controle';
      case 'registros': // ✅ MODIFICADO
        return 'Registros';
      default:
        return 'Indicadores';
    }
  };

  // Obter subtítulo da seção
  const getSectionSubtitle = () => {
    if (projetosVinculados.length === 0) {
      return 'Nenhum projeto vinculado encontrado';
    }
    
    if (activeTab === 'inicio') {
      return showAllContent ? 'Todos os Indicadores' : 'Indicadores não lidos';
    }
    return `${indicadores.length} indicadores encontrados`;
  };

  // ✅ MODIFICADO: Obter indicadores de status do indicador (mantida lógica de ler_depois)
  const getStatusIndicators = (indicador) => {
    const indicators = [];
    
    // Adicionar bolinha azul se não foi lido
    if (!indicador.lido) {
      indicators.push(
        <div key="nao-lido" className="w-3 h-3 bg-blue-500 rounded-full"></div>
      );
    }
    
    // Adicionar estrela se é importante
    if (indicador.importante) {
      indicators.push(
        <FiStar key="importante" className="w-4 h-4 text-blue-600" />
      );
    }
    
    // Adicionar ícone de arquivo se está arquivado
    if (indicador.arquivado) {
      indicators.push(
        <FiArchive key="arquivado" className="w-4 h-4 text-blue-600" />
      );
    }
    
    return indicators;
  };

  // ✅ MANTIDA: Função para verificar se deve mostrar ícone de ler depois
  const shouldShowReadLaterIcon = (indicador) => {
    return indicador.ler_depois;
  };

  // ALTERAÇÃO: Formatar data - priorizar periodo_referencia, fallback para created_at
  const formatDate = (indicador) => {
    // Priorizar periodo_referencia se existir, caso contrário usar created_at
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

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Visualização de Indicadores</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Estrutura igual ao mobile */}
          <div className="lg:hidden">
            {/* Primeira linha: Logo e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Indicadores"
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
            
            {/* Segunda linha: Busca e Filtro */}
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
            
            {/* ✅ Terceira linha: Filtros (incluindo filtroLerDepois) */}
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
                  
                  {/* Botão limpar - aparece só se houver filtros ativos */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                {/* ✅ Filtros Avançados (incluindo Ler Depois) */}
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
                    
                    {/* ✅ MANTIDO: Filtro Ler Depois */}
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

          {/* Desktop: Layout original */}
          <div className="hidden lg:block">
            {/* Primeira linha: Logo, Busca e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Indicadores"
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
                    placeholder="Buscar indicadores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Controles à direita */}
              <div className="flex items-center space-x-3">
                {/* Botão de filtro */}
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
            
            {/* ✅ Segunda linha: Filtros (incluindo filtroLerDepois) */}
            {showFilters && (
              <div className="space-y-3">
                {/* Linha com os selects básicos */}
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
                  
                  {/* Botão limpar - aparece só se houver filtros ativos */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                {/* ✅ Filtros Avançados (incluindo Ler Depois) */}
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
                    
                    {/* ✅ MANTIDO: Filtro Ler Depois */}
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
          {/* ✅ MODIFICADO: Sidebar de navegação - Desktop apenas (substituído Ver Todos por Registros) */}
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
                  onClick={handleImportantesClick} // ✅ MODIFICADO: era setActiveTab('importantes')
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

                {/* ✅ MODIFICADO: Substituído Ver Todos por Registros */}
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
            {/* Mobile: Cabeçalho da seção igual ao mobile */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black">{getSectionTitle()}</h2>
                
                {/* Botão Ver todos - apenas na seção Início */}
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

            {/* Desktop: Cabeçalho da seção original */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl lg:text-3xl font-bold text-black">{getSectionTitle()}</h2>
                <p className="text-gray-600 text-sm mt-1">{getSectionSubtitle()}</p>
              </div>
              
              {/* Botão Ver todos - apenas na seção Início */}
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
                {/* Mobile: Layout sem card de destaque */}
                <div className="lg:hidden">
                  {/* Cards regulares - Mobile */}
                  {indicadores.length > 0 ? (
                    indicadores.map((indicador, index) => {
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
                              
                              {/* NOVO: Mostrar valor KPI ou Gráfico de Barras baseado no tipo */}
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
                              
                              {/* Layout condicional para as tags e data */}
                              {(isKPI || isGrafico) ? (
                                // Para KPI/Gráfico: tags e data na mesma linha
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
                                // Para outros tipos: layout original
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

                {/* ✅ DESKTOP: Layout com sistema KPI responsivo */}
                <div className="hidden lg:block">
                  {indicadores.length > 0 ? (
                    (() => {
                      // Separar indicadores por tipo
                      const { kpis, graficos, outros } = separarIndicadoresPorTipo(indicadores);
                      
                      return (
                        <div>
                          {/* ✅ SEÇÃO DE KPIs COM LAYOUT RESPONSIVO */}
                          {kpis.length > 0 && renderKPILayout(kpis)}
                          
                          {/* ✅ SEÇÃO DE GRÁFICOS DE BARRAS (largura total) */}
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
                                      
                                      {/* Gráfico de Barras Adaptativo */}
                                      <GraficoBarrasAdaptativo indicador={indicador} isMobile={false} />
                                      
                                      {/* Tags e data */}
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
                          
                          {/* ✅ SEÇÃO DE OUTROS TIPOS (grid normal) */}
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
                                      
                                      {/* Layout para outros tipos */}
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

      {/* ✅ MODIFICADO: Barra de navegação inferior - Mobile apenas (substituído Ver Todos por Registros) */}
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
            onClick={handleImportantesClick} // ✅ MODIFICADO: era setActiveTab('importantes')
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

          {/* ✅ MODIFICADO: Substituído Ver Todos por Registros */}
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