// Arquivo: src/pages/indicador/[id].js
import { useState, useEffect, useRef, useMemo } from 'react'; // ✅ ADICIONADO useRef
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiStar, FiClock, FiArchive, FiHome, FiCalendar, FiArrowLeft, FiFilter, FiX, FiChevronDown, FiChevronUp, FiSettings, FiInfo } from 'react-icons/fi';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  ResponsiveContainer, 
  LabelList,
  Legend,
  Tooltip
} from 'recharts';

// ✅ NOVA CONFIGURAÇÃO: Definir limites máximos
const MAX_CHART_WIDTH = {
  mobile: 600,   // Máximo 600px no mobile
  desktop: 1000  // Máximo 1000px no desktop
};

// ✅ CONFIGURAÇÃO BASEADA EM 7 BARRAS COMO REFERÊNCIA MÁXIMA
const MAX_VISIBLE_BARS = 7;

export default function IndicadorDetalhe({ user }) {
  const router = useRouter();
  const { id } = router.query; // Este é o id_controleindicador
  const [indicadores, setIndicadores] = useState([]);
  const [indicadoresOriginais, setIndicadoresOriginais] = useState([]); // Para manter dados originais
  const [nomeIndicador, setNomeIndicador] = useState('');
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [infoGeral, setInfoGeral] = useState(null); // Para armazenar informações gerais do indicador
  const [marcandoComoLido, setMarcandoComoLido] = useState(false);
  const [todosMarcadosComoLidos, setTodosMarcadosComoLidos] = useState(false);
  const [atualizandoStatus, setAtualizandoStatus] = useState(false);
  
  // Estados para controlar status geral
  const [statusGeral, setStatusGeral] = useState({
    importante: false,
    ler_depois: false,
    arquivado: false
  });

  // Novo estado para controlar o modal de confirmação de arquivar
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Estados para filtro de período
  const [showFiltroPeriodo, setShowFiltroPeriodo] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos'); // 'todos', '7dias', '30dias', '90dias', 'especifico'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // ✅ NOVOS ESTADOS PARA CONFIGURAÇÕES
  const [configuracoes, setConfiguracoes] = useState({
    soma: false,
    media: false,
    desvio_padrao: false,
    mediana: false,
    mais_recente: false,
    minimo: false,
    maximo: false,
    contagem_registros: false
  });
  const [showConfiguracoes, setShowConfiguracoes] = useState(false);
  const [atualizandoConfiguracao, setAtualizandoConfiguracao] = useState(false);
  const [indicadorBaseId, setIndicadorBaseId] = useState(null); // Para armazenar o ID do controle_indicador

  // =====================================
  // FUNÇÕES PARA GRÁFICO ADAPTATIVO
  // =====================================

  // Função para calcular largura ideal por barra baseada na quantidade
  const calculateOptimalBarWidth = (dataLength, isMobile = false) => {
    // ✅ MODIFICADO: Sempre calcular baseado em no máximo 7 barras
    const effectiveDataLength = Math.min(dataLength, MAX_VISIBLE_BARS);
    
    if (isMobile) {
      // Mobile: adaptar baseado na quantidade (máximo 7)
      if (effectiveDataLength <= 3) return 60;      // Poucas barras = mais largas
      if (effectiveDataLength <= 5) return 45;      // Quantidade média
      if (effectiveDataLength <= 7) return 35;      // 7 barras = tamanho padrão
      return 35;                                     // Sempre 35 para mobile quando > 7
    } else {
      // Desktop: adaptar baseado na quantidade (máximo 7)
      if (effectiveDataLength <= 3) return 80;      // Poucas barras = mais largas
      if (effectiveDataLength <= 5) return 65;      // Quantidade média
      if (effectiveDataLength <= 7) return 50;      // 7 barras = tamanho padrão
      return 50;                                     // Sempre 50 para desktop quando > 7
    }
  };

  // Função para calcular espaçamento entre barras baseado na quantidade
  const calculateBarSpacing = (dataLength, isMobile = false) => {
    // ✅ MODIFICADO: Sempre calcular baseado em no máximo 7 barras
    const effectiveDataLength = Math.min(dataLength, MAX_VISIBLE_BARS);
    
    if (isMobile) {
      if (effectiveDataLength <= 3) return 15;      // Poucas barras = mais espaço
      if (effectiveDataLength <= 5) return 10;      // Quantidade média
      if (effectiveDataLength <= 7) return 5;       // 7 barras = espaçamento padrão
      return 5;                                      // Sempre 5 para mobile quando > 7
    } else {
      if (effectiveDataLength <= 3) return 20;      // Poucas barras = mais espaço
      if (effectiveDataLength <= 5) return 15;      // Quantidade média
      if (effectiveDataLength <= 7) return 10;      // 7 barras = espaçamento padrão
      return 10;                                     // Sempre 10 para desktop quando > 7
    }
  };

  // Função para calcular se precisa de scroll baseado na tela disponível
  const calculateNeedsScroll = (dataLength, isMobile = false) => {
    return dataLength > MAX_VISIBLE_BARS;
  };

  // ✅ FUNÇÃO CORRIGIDA: Calcular largura total com melhor centralização
  const calculateTotalWidth = (dataLength, isMobile = false) => {
    // Se temos 7 ou menos barras, calcular normalmente
    if (dataLength <= MAX_VISIBLE_BARS) {
      const barWidth = calculateOptimalBarWidth(dataLength, isMobile);
      const spacing = calculateBarSpacing(dataLength, isMobile);
      const margins = 40; // ✅ Aumentar margem para melhor espaçamento
      
      const calculatedWidth = (barWidth + spacing) * dataLength + margins;
      // ✅ Definir larguras mínimas mais adequadas
      const minWidth = isMobile ? 320 : 400;
      
      return {
        width: Math.max(calculatedWidth, minWidth),
        needsScroll: false,
        calculatedWidth: calculatedWidth,
        visibleBars: dataLength
      };
    } 
    // Se temos mais de 7 barras, usar largura fixa baseada em 7 barras
    else {
      const barWidth = calculateOptimalBarWidth(MAX_VISIBLE_BARS, isMobile);
      const spacing = calculateBarSpacing(MAX_VISIBLE_BARS, isMobile);
      const margins = 40; // ✅ Aumentar margem
      
      // Largura do container fixo (baseado em 7 barras)
      const containerWidth = (barWidth + spacing) * MAX_VISIBLE_BARS + margins;
      
      // Largura total do conteúdo (todas as barras)
      const totalContentWidth = (barWidth + spacing) * dataLength + margins;
      
      return {
        width: containerWidth,           // Container sempre do tamanho de 7 barras
        needsScroll: true,              // Sempre precisa de scroll quando > 7
        calculatedWidth: totalContentWidth,  // Largura real do conteúdo
        visibleBars: MAX_VISIBLE_BARS
      };
    }
  };

  // ✅ FUNÇÃO MODIFICADA: Gap baseado no efetivo número de barras visíveis
  const calculateCategoryGap = (dataLength) => {
    const effectiveDataLength = Math.min(dataLength, MAX_VISIBLE_BARS);
    
    if (effectiveDataLength <= 3) return "8%";     // Poucas barras = mais espaço
    if (effectiveDataLength <= 5) return "5%";     // Quantidade média
    if (effectiveDataLength <= 7) return "3%";     // 7 barras = espaçamento padrão
    return "3%";                                    // Sempre 3% quando > 7
  };

  // ✅ COMPONENTE CORRIGIDO: ScrollableChartContainer SEM a legenda de scroll
  const ScrollableChartContainer = ({ children, dataLength, isMobile = false }) => {
    const scrollRef = useRef(null);
    const [hasScrolled, setHasScrolled] = useState(false);

    // ✅ USAR NOVA FUNÇÃO baseada em 7 barras
    const { width, needsScroll, calculatedWidth, visibleBars } = calculateTotalWidth(dataLength, isMobile);

    // ✅ Fazer scroll automático para a direita quando há scroll
    useEffect(() => {
      if (scrollRef.current && !hasScrolled && needsScroll) {
        // Pequeno delay para garantir que o conteúdo foi renderizado
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
          // ✅ CSS personalizado para scroll mais suave
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch',
          // ✅ Largura 100% para centralização
          width: '100%',
          maxWidth: '100%'
        }}
      >
        <div 
          ref={scrollRef}
          className={needsScroll ? "overflow-x-auto" : ""}
          style={{
            // ✅ Aplicar largura fixa apenas ao container interno quando há scroll
            width: needsScroll ? `${width}px` : 'auto',
            maxWidth: needsScroll ? `${width}px` : '100%',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ 
            width: needsScroll ? `${calculatedWidth}px` : `${width}px`,
            minWidth: needsScroll ? `${calculatedWidth}px` : `${width}px`,
            margin: '0 auto' // ✅ SEMPRE centralizar o conteúdo
          }}>
            {children}
          </div>
        </div>
        
        {/* ✅ REMOVIDO: Indicador de scroll desnecessário */}
      </div>
    );
  };

  // ✅ FUNÇÃO MODIFICADA: Calcular KPIs - Realizado (soma + média) + Meta (soma + média)
  const calcularKPIs = () => {
    if (!indicadores || indicadores.length === 0) {
      return {
        // KPIs para Realizado (soma)
        somaRealizadoApresentado: 0,
        somaRealizadoIndicador: 0,
        // NOVO: KPIs para Realizado (média)
        mediaRealizadoApresentado: 0,
        mediaRealizadoIndicador: 0,
        // Soma e média dos valores Meta
        somaMetaApresentado: 0,
        somaMetaIndicador: 0,
        mediaMetaApresentado: 0,
        mediaMetaIndicador: 0,
        totalRealizado: 0,
        totalMeta: 0,
        // ✅ NOVOS KPIs ESTATÍSTICOS
        desvioPadraoRealizadoApresentado: 0,
        desvioPadraoRealizadoIndicador: 0,
        medianaRealizadoApresentado: 0,
        medianaRealizadoIndicador: 0,
        minimoRealizadoApresentado: 0,
        minimoRealizadoIndicador: 0,
        maximoRealizadoApresentado: 0,
        maximoRealizadoIndicador: 0,
        maisRecenteRealizadoApresentado: 0,
        maisRecenteRealizadoIndicador: 0,
        // ✅ ADICIONAR ESTAS LINHAS:
        maisRecenteMetaApresentado: 0,
        desvioPadraoMetaApresentado: 0,
        medianaMetaApresentado: 0,
        minimoMetaApresentado: 0,
        maximoMetaApresentado: 0,
        contagemRegistros: 0
      };
    }

    // Separar por tipo_indicador
    const realizados = indicadores.filter(ind => ind.tipo_indicador === 1);
    const metas = indicadores.filter(ind => ind.tipo_indicador === 2);

    // KPIs para Realizado
    const valoresRealizadoApresentado = realizados.map(ind => parseFloat(ind.valor_indicador_apresentado) || 0);
    const valoresRealizadoIndicador = realizados.map(ind => parseFloat(ind.valor_indicador) || 0);
    
    const somaRealizadoApresentado = valoresRealizadoApresentado.reduce((acc, val) => acc + val, 0);
    const somaRealizadoIndicador = valoresRealizadoIndicador.reduce((acc, val) => acc + val, 0);

    // ✅ NOVO: Calcular médias dos Realizado
    const mediaRealizadoApresentado = realizados.length > 0 ? somaRealizadoApresentado / realizados.length : 0;
    const mediaRealizadoIndicador = realizados.length > 0 ? somaRealizadoIndicador / realizados.length : 0;

    // Soma e média dos valores Meta
    const valoresMetaApresentado = metas.map(ind => parseFloat(ind.valor_indicador_apresentado) || 0);
    const valoresMetaIndicador = metas.map(ind => parseFloat(ind.valor_indicador) || 0);
    
    const somaMetaApresentado = valoresMetaApresentado.reduce((acc, val) => acc + val, 0);
    const somaMetaIndicador = valoresMetaIndicador.reduce((acc, val) => acc + val, 0);
    
    // ✅ NOVO: Calcular médias das Metas
    const mediaMetaApresentado = metas.length > 0 ? somaMetaApresentado / metas.length : 0;
    const mediaMetaIndicador = metas.length > 0 ? somaMetaIndicador / metas.length : 0;

    // ✅ NOVOS CÁLCULOS ESTATÍSTICOS
    // Desvio Padrão
    const calcularDesvioPadrao = (valores, media) => {
      if (valores.length <= 1) return 0;
      const variancia = valores.reduce((acc, val) => acc + Math.pow(val - media, 2), 0) / valores.length;
      return Math.sqrt(variancia);
    };

    // Mediana
    const calcularMediana = (valores) => {
      if (valores.length === 0) return 0;
      const sorted = [...valores].sort((a, b) => a - b);
      const meio = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 
        ? (sorted[meio - 1] + sorted[meio]) / 2 
        : sorted[meio];
    };

    // Mais recente (último por data)
    const maisRecenteRealizado = realizados.length > 0 
      ? realizados.sort((a, b) => new Date(b.periodo_referencia) - new Date(a.periodo_referencia))[0]
      : null;

    const maisRecenteMeta = metas.length > 0 
      ? metas.sort((a, b) => new Date(b.periodo_referencia) - new Date(a.periodo_referencia))[0]
      : null;

    return {
      // KPIs para Realizado (soma)
      somaRealizadoApresentado,
      somaRealizadoIndicador,
      // NOVO: KPIs para Realizado (média)
      mediaRealizadoApresentado,
      mediaRealizadoIndicador,
      // Soma e média dos valores Meta
      somaMetaApresentado,
      somaMetaIndicador,
      mediaMetaApresentado,
      mediaMetaIndicador,
      totalRealizado: realizados.length,
      totalMeta: metas.length,
      // ✅ NOVOS KPIs ESTATÍSTICOS
      desvioPadraoRealizadoApresentado: calcularDesvioPadrao(valoresRealizadoApresentado, mediaRealizadoApresentado),
      desvioPadraoRealizadoIndicador: calcularDesvioPadrao(valoresRealizadoIndicador, mediaRealizadoIndicador),
      medianaRealizadoApresentado: calcularMediana(valoresRealizadoApresentado),
      medianaRealizadoIndicador: calcularMediana(valoresRealizadoIndicador),
      minimoRealizadoApresentado: valoresRealizadoApresentado.length > 0 ? Math.min(...valoresRealizadoApresentado) : 0,
      minimoRealizadoIndicador: valoresRealizadoIndicador.length > 0 ? Math.min(...valoresRealizadoIndicador) : 0,
      maximoRealizadoApresentado: valoresRealizadoApresentado.length > 0 ? Math.max(...valoresRealizadoApresentado) : 0,
      maximoRealizadoIndicador: valoresRealizadoIndicador.length > 0 ? Math.max(...valoresRealizadoIndicador) : 0,
      maisRecenteRealizadoApresentado: maisRecenteRealizado ? parseFloat(maisRecenteRealizado.valor_indicador_apresentado) || 0 : 0,
      maisRecenteRealizadoIndicador: maisRecenteRealizado ? parseFloat(maisRecenteRealizado.valor_indicador) || 0 : 0,
      maisRecenteMetaApresentado: maisRecenteMeta ? parseFloat(maisRecenteMeta.valor_indicador_apresentado) || 0 : 0,
      // ✅ ADICIONAR ESTES NOVOS CÁLCULOS:
      desvioPadraoMetaApresentado: calcularDesvioPadrao(valoresMetaApresentado, mediaMetaApresentado),
      medianaMetaApresentado: calcularMediana(valoresMetaApresentado),
      minimoMetaApresentado: valoresMetaApresentado.length > 0 ? Math.min(...valoresMetaApresentado) : 0,
      maximoMetaApresentado: valoresMetaApresentado.length > 0 ? Math.max(...valoresMetaApresentado) : 0,
      contagemRegistros: indicadores.length
    };
  };

  // Função para formatar valores dos KPIs
  const formatKPIValue = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  };

  // ✅ NOVA FUNÇÃO: Carregar configurações do indicador
  const carregarConfiguracoes = async (indicadorBaseId) => {
    try {
      const { data, error } = await supabase
        .from('configuracao_pag_indicador_id')
        .select('*')
        .eq('indicador_base_id', indicadorBaseId)
        .single();

      if (error) {
        // Se não encontrar, criar configuração padrão
        if (error.code === 'PGRST116') {
          console.log('Configuração não encontrada, criando padrão...');
          await criarConfiguracaoPadrao(indicadorBaseId);
          return;
        }
        throw error;
      }

      // Atualizar estado com as configurações encontradas
      setConfiguracoes({
        soma: data.soma || false,
        media: data.media || false,
        desvio_padrao: data.desvio_padrao || false,
        mediana: data.mediana || false,
        mais_recente: data.mais_recente || false,
        minimo: data.minimo || false,
        maximo: data.maximo || false,
        contagem_registros: data.contagem_registros || false
      });
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao carregar configurações');
    }
  };

  // ✅ NOVA FUNÇÃO: Criar configuração padrão
  const criarConfiguracaoPadrao = async (indicadorBaseId) => {
    try {
      const { data, error } = await supabase
        .from('configuracao_pag_indicador_id')
        .insert({
          indicador_base_id: indicadorBaseId,
          soma: false,
          media: false,
          desvio_padrao: false,
          mediana: false,
          mais_recente: false,
          minimo: false,
          maximo: false,
          contagem_registros: false
        });

      if (error) throw error;

      // Definir configurações padrão
      setConfiguracoes({
        soma: false,
        media: false,
        desvio_padrao: false,
        mediana: false,
        mais_recente: false,
        minimo: false,
        maximo: false,
        contagem_registros: false
      });
    } catch (error) {
      console.error('Erro ao criar configuração padrão:', error);
    }
  };

  // ✅ NOVA FUNÇÃO: Atualizar configuração
  const atualizarConfiguracao = async (campo, valor) => {
    if (atualizandoConfiguracao) return;

    try {
      setAtualizandoConfiguracao(true);

      const { data, error } = await supabase
        .from('configuracao_pag_indicador_id')
        .update({ [campo]: valor })
        .eq('indicador_base_id', indicadorBaseId);

      if (error) throw error;

      // Atualizar estado local
      setConfiguracoes(prev => ({
        ...prev,
        [campo]: valor
      }));

      toast.success(`Configuração ${valor ? 'habilitada' : 'desabilitada'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      toast.error('Erro ao atualizar configuração');
    } finally {
      setAtualizandoConfiguracao(false);
    }
  };

  // Função CORRIGIDA para filtrar por período
  const filtrarPorPeriodo = (indicadoresOriginais) => {
    if (filtroPeriodo === 'todos') {
      return indicadoresOriginais;
    }

    // Função auxiliar para converter string de data em Date de forma segura
    const parseDate = (dateString) => {
      if (!dateString) return null;
      
      let date;
      
      if (dateString instanceof Date) {
        date = new Date(dateString);
      } else if (typeof dateString === 'string') {
        const cleanDate = dateString.split('T')[0];
        date = new Date(cleanDate + 'T00:00:00');
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return null;
      }
      
      return date;
    };

    // ✅ FUNÇÃO CORRIGIDA - deve estar ENTRE dataLimite e hoje
    const isWithinRange = (date, startDate, endDate) => {
      if (!date || !startDate || !endDate) return false;
      
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      // ✅ DEVE ESTAR ENTRE start E end (inclusive)
      return d >= start && d <= end;
    };

    const hoje = new Date();
    
    console.log('Data de hoje:', hoje.toLocaleDateString('pt-BR'));
    console.log('Filtro selecionado:', filtroPeriodo);
    
    let dataLimite;

    switch (filtroPeriodo) {
      case '7dias':
        dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 7);
        console.log('Data limite (7 dias):', dataLimite.toLocaleDateString('pt-BR'));
        console.log('Intervalo válido:', dataLimite.toLocaleDateString('pt-BR'), 'até', hoje.toLocaleDateString('pt-BR'));
        break;
        
      case '30dias':
        dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);
        console.log('Data limite (30 dias):', dataLimite.toLocaleDateString('pt-BR'));
        console.log('Intervalo válido:', dataLimite.toLocaleDateString('pt-BR'), 'até', hoje.toLocaleDateString('pt-BR'));
        break;
        
      case '90dias':
        dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 90);
        console.log('Data limite (90 dias):', dataLimite.toLocaleDateString('pt-BR'));
        console.log('Intervalo válido:', dataLimite.toLocaleDateString('pt-BR'), 'até', hoje.toLocaleDateString('pt-BR'));
        break;
        
      case 'especifico':
        if (dataInicio && dataFim) {
          const inicio = parseDate(dataInicio);
          const fim = parseDate(dataFim);
          
          if (!inicio || !fim) {
            console.warn('Datas de início ou fim inválidas');
            return indicadoresOriginais;
          }
          
          console.log('Período específico:', inicio.toLocaleDateString('pt-BR'), 'até', fim.toLocaleDateString('pt-BR'));
          
          return indicadoresOriginais.filter(ind => {
            const periodoRef = parseDate(ind.periodo_referencia);
            if (!periodoRef) return false;
            
            const dentroIntervalo = isWithinRange(periodoRef, inicio, fim);
            console.log('Indicador:', periodoRef.toLocaleDateString('pt-BR'), 'dentro do intervalo:', dentroIntervalo);
            
            return dentroIntervalo;
          });
        }
        return indicadoresOriginais;
        
      default:
        return indicadoresOriginais;
    }

    // ✅ FILTRAR: deve estar ENTRE dataLimite e hoje (não só >= dataLimite)
    const resultados = indicadoresOriginais.filter(ind => {
      const periodoRef = parseDate(ind.periodo_referencia);
      if (!periodoRef) {
        console.warn('Data do indicador inválida:', ind.periodo_referencia);
        return false;
      }
      
      // ✅ CORRIGIDO: deve estar no intervalo [dataLimite, hoje]
      const dentroIntervalo = isWithinRange(periodoRef, dataLimite, hoje);
      console.log('Indicador:', periodoRef.toLocaleDateString('pt-BR'), 'dentro do intervalo [' + 
                  dataLimite.toLocaleDateString('pt-BR') + ' até ' + 
                  hoje.toLocaleDateString('pt-BR') + ']:', dentroIntervalo);
      
      return dentroIntervalo;
    });
    
    console.log('Total de indicadores filtrados:', resultados.length, 'de', indicadoresOriginais.length);
    
    return resultados;
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Carregar categorias e projetos
  useEffect(() => {
    const fetchCategoriasProjetos = async () => {
      try {
        // Buscar categorias
        const { data: categoriasData, error: categoriasError } = await supabase
          .from('categorias')
          .select('id, nome');
        
        if (categoriasError) throw categoriasError;
        
        // Converter array em objeto para fácil acesso por ID
        const categoriasObj = {};
        categoriasData.forEach(cat => {
          categoriasObj[cat.id] = cat.nome;
        });
        
        setCategorias(categoriasObj);
        
        // Buscar projetos
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('id, nome');
        
        if (projetosError) throw projetosError;
        
        // Converter array em objeto para fácil acesso por ID
        const projetosObj = {};
        projetosData.forEach(proj => {
          projetosObj[proj.id] = proj.nome;
        });
        
        setProjetos(projetosObj);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    if (user) {
      fetchCategoriasProjetos();
    }
  }, [user]);

  // ✅ MODIFICADO: Buscar dados dos indicadores E carregar configurações
  useEffect(() => {
    const fetchIndicadores = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('controle_indicador_geral')
          .select('*')
          .eq('id_controleindicador', id)
          .not('periodo_referencia', 'is', null)  // Filtrar apenas registros com periodo_referencia não nulo
          .order('periodo_referencia', { ascending: false });
        
        if (error) throw error;
        
        // ✅ SEMPRE definir dados, mesmo se vazio
        const dadosIndicadores = data || [];
        
        // Armazenar dados originais
        setIndicadoresOriginais(dadosIndicadores);
        
        // Se não há dados, ainda assim configurar estados
        if (dadosIndicadores.length === 0) {
          setIndicadores([]);
          setNomeIndicador('Indicador sem dados');
          setTodosMarcadosComoLidos(false);
          setStatusGeral({
            importante: false,
            ler_depois: false,
            arquivado: false
          });
          setInfoGeral(null);
        } else {
          // Aplicar filtro de período
          const indicadoresFiltrados = filtrarPorPeriodo(dadosIndicadores);
          setIndicadores(indicadoresFiltrados);
          
          // O nome do indicador deve ser o mesmo em todos os registros
          setNomeIndicador(dadosIndicadores[0].indicador || 'Indicador sem nome');
          
          // Verificar se todos os registros estão marcados como lidos (usar dados filtrados)
          const todosLidos = indicadoresFiltrados.every(indicador => indicador.lido === true);
          setTodosMarcadosComoLidos(todosLidos);
          
          // Verificar status geral (importante, ler_depois, arquivado) (usar dados filtrados)
          // Considera que o status está ativo se PELO MENOS UM registro estiver marcado
          const statusGeral = {
            importante: indicadoresFiltrados.some(indicador => indicador.importante === true),
            ler_depois: indicadoresFiltrados.some(indicador => indicador.ler_depois === true),
            arquivado: indicadoresFiltrados.some(indicador => indicador.arquivado === true)
          };
          setStatusGeral(statusGeral);
          
          // Pegar as informações gerais do primeiro registro (projeto, categoria)
          setInfoGeral({
            projeto_id: dadosIndicadores[0].projeto_id,
            categoria_id: dadosIndicadores[0].categoria_id,
            created_at: dadosIndicadores[0].created_at
          });

          // ✅ NOVO: Buscar o indicador_base_id e carregar configurações
          // Primeiro, buscar o controle_indicador baseado no id_controleindicador
          const { data: controleData, error: controleError } = await supabase
            .from('controle_indicador')
            .select('id')
            .eq('id', id)
            .single();

          if (controleError) {
            console.error('Erro ao buscar controle_indicador:', controleError);
            return;
          }

          if (controleData) {
            setIndicadorBaseId(controleData.id);
            await carregarConfiguracoes(controleData.id);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        // ✅ Em caso de erro, não redirecionar, apenas definir estados vazios
        setIndicadores([]);
        setIndicadoresOriginais([]);
        setNomeIndicador('Erro ao carregar indicador');
        setTodosMarcadosComoLidos(false);
        setStatusGeral({
          importante: false,
          ler_depois: false,
          arquivado: false
        });
        setInfoGeral(null);
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchIndicadores();
    }
  }, [user, id, router]);

  // ✅ Aplicar filtro quando mudarem os critérios de filtro COM TOAST
  useEffect(() => {
    if (indicadoresOriginais.length > 0) {
      const indicadoresFiltrados = filtrarPorPeriodo(indicadoresOriginais);
      setIndicadores(indicadoresFiltrados);
      
      // ✅ Toast quando não há dados no período específico
      if (filtroPeriodo === 'especifico' && indicadoresFiltrados.length === 0 && indicadoresOriginais.length > 0) {
        toast('📅 Nenhum indicador encontrado no período selecionado', {
          duration: 4000,
          style: {
            background: '#FFF7ED',
            border: '1px solid #FB923C',
            borderLeft: '4px solid #EA580C',
          },
        });
      }
      
      // Recalcular status baseado nos dados filtrados
      const todosLidos = indicadoresFiltrados.every(indicador => indicador.lido === true);
      setTodosMarcadosComoLidos(todosLidos);
      
      const statusGeral = {
        importante: indicadoresFiltrados.some(indicador => indicador.importante === true),
        ler_depois: indicadoresFiltrados.some(indicador => indicador.ler_depois === true),
        arquivado: indicadoresFiltrados.some(indicador => indicador.arquivado === true)
      };
      setStatusGeral(statusGeral);
    }
  }, [filtroPeriodo, dataInicio, dataFim, indicadoresOriginais]);

  // Função para marcar todos os indicadores como lidos (toggle)
  const toggleLidoTodos = async () => {
    if (marcandoComoLido) return;
    
    try {
      setMarcandoComoLido(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Inverter o status atual
      const novoStatus = !todosMarcadosComoLidos;
      
      // Atualizar TODOS os registros com o mesmo id_controleindicador
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({ lido: novoStatus })
        .eq('id_controleindicador', id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setIndicadores(prev => 
        prev.map(ind => ({ ...ind, lido: novoStatus }))
      );
      
      // Atualizar dados originais também
      setIndicadoresOriginais(prev => 
        prev.map(ind => ({ ...ind, lido: novoStatus }))
      );
      
      setTodosMarcadosComoLidos(novoStatus);
      
      const mensagem = novoStatus 
        ? 'Todos os indicadores marcados como lidos!' 
        : 'Indicadores marcados como não lidos!';
      
      toast.success(mensagem);
    } catch (error) {
      console.error('Erro ao alterar status de lido:', error);
      toast.error('Erro ao alterar status dos indicadores');
    } finally {
      setMarcandoComoLido(false);
    }
  };

  // Função para alternar status (importante, ler_depois, arquivado) de todos os indicadores
  const alternarStatusTodos = async (campo, valorAtual) => {
    if (atualizandoStatus) return;
    
    // Se for arquivar e não está arquivado, mostrar confirmação
    if (campo === 'arquivado' && !valorAtual) {
      setShowArchiveConfirm(true);
      return;
    }
    
    try {
      setAtualizandoStatus(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      const novoValor = !valorAtual;
      
      // Atualizar TODOS os registros com o mesmo id_controleindicador
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({ [campo]: novoValor })
        .eq('id_controleindicador', id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setIndicadores(prev => 
        prev.map(ind => ({ ...ind, [campo]: novoValor }))
      );
      
      // Atualizar dados originais também
      setIndicadoresOriginais(prev => 
        prev.map(ind => ({ ...ind, [campo]: novoValor }))
      );
      
      // Atualizar status geral
      setStatusGeral(prev => ({ ...prev, [campo]: novoValor }));
      
      // Mensagens específicas para cada ação
      const mensagens = {
        importante: novoValor ? 'Marcado como importante!' : 'Removido dos importantes',
        ler_depois: novoValor ? 'Adicionado para ler depois!' : 'Removido de ler depois',
        arquivado: novoValor ? 'Indicadores arquivados!' : 'Indicadores desarquivados'
      };
      
      toast.success(mensagens[campo]);
    } catch (error) {
      console.error(`Erro ao alterar ${campo}:`, error);
      toast.error('Erro ao atualizar indicadores');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  // Função para confirmar o arquivamento
  const confirmarArquivamento = async () => {
    setShowArchiveConfirm(false);
    
    try {
      setAtualizandoStatus(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Atualizar TODOS os registros com o mesmo id_controleindicador - definir arquivado como TRUE
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update({ arquivado: true })
        .eq('id_controleindicador', id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o estado local
      setIndicadores(prev => 
        prev.map(ind => ({ ...ind, arquivado: true }))
      );
      
      // Atualizar dados originais também
      setIndicadoresOriginais(prev => 
        prev.map(ind => ({ ...ind, arquivado: true }))
      );
      
      // Atualizar status geral
      setStatusGeral(prev => ({ ...prev, arquivado: true }));
      
      toast.success('Indicadores arquivados!');
    } catch (error) {
      console.error('Erro ao arquivar indicadores:', error);
      toast.error('Erro ao arquivar indicadores');
    } finally {
      setAtualizandoStatus(false);
    }
  };

  // Função para navegar de volta para a página inicial
  const voltarParaInicio = () => {
    router.push('/visualizacao-indicadores');
  };

  // Função para navegar de volta (desktop)
  const voltarParaInicioDesktop = () => {
    router.push('/visualizacao-indicadores');
  };

  // Função para formatar data
  const formatDate = (dateString) => {
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

  // Função para formatar data para gráficos (formato DD-MM-AA)
  const formatDateGrafico = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2); // Últimos 2 dígitos do ano
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return '';
    }
  };

  // Função para formatar valor (número com separadores de milhares)
  const formatValue = (value) => {
    if (value === null || value === undefined || value === '') return '-';
    
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    return num.toLocaleString('pt-BR');
  };

  // ✅ FUNÇÃO MODIFICADA: Preparar dados para gráfico combinado com configurações adaptativas
  const prepararDadosGraficoCombinado = () => {
    if (!indicadores || indicadores.length === 0) return [];
    
    // Agrupar por período de referência
    const dadosAgrupados = {};
    
    indicadores.forEach(indicador => {
      const periodo = formatDateGrafico(indicador.periodo_referencia);
      const periodoCompleto = indicador.periodo_referencia;
      
      if (!dadosAgrupados[periodo]) {
        dadosAgrupados[periodo] = {
          periodo,
          periodoCompleto,
          // Inicializar valores
          realizadoApresentado: 0,
          realizadoIndicador: 0,
          metaApresentado: 0,
          metaIndicador: 0
        };
      }
      
      // Preencher baseado no tipo_indicador
      if (indicador.tipo_indicador === 1) { // Realizado
        dadosAgrupados[periodo].realizadoApresentado = parseFloat(indicador.valor_indicador_apresentado) || 0;
        dadosAgrupados[periodo].realizadoIndicador = parseFloat(indicador.valor_indicador) || 0;
      } else if (indicador.tipo_indicador === 2) { // Meta
        dadosAgrupados[periodo].metaApresentado = parseFloat(indicador.valor_indicador_apresentado) || 0;
        dadosAgrupados[periodo].metaIndicador = parseFloat(indicador.valor_indicador) || 0;
      }
    });
    
    // Converter para array e ordenar por data CRESCENTE (mais antigo primeiro)
    return Object.values(dadosAgrupados)
      .sort((a, b) => new Date(a.periodoCompleto) - new Date(b.periodoCompleto));
  };

  // ✅ FUNÇÃO CORRIGIDA: Preparar dados para tabela - TAMBÉM VOLTA À ORDEM CRESCENTE  
  const prepararDadosTabela = () => {
    if (!indicadores || indicadores.length === 0) return [];
    
    // Agrupar por período de referência
    const dadosAgrupados = {};
    
    indicadores.forEach(indicador => {
      const periodo = indicador.periodo_referencia;
      
      if (!dadosAgrupados[periodo]) {
        dadosAgrupados[periodo] = {
          periodo_referencia: periodo,
          valor_apresentado_realizado: null,
          valor_apresentado_meta: null
        };
      }
      
      // Preencher baseado no tipo_indicador
      if (indicador.tipo_indicador === 1) { // Realizado
        dadosAgrupados[periodo].valor_apresentado_realizado = indicador.valor_indicador_apresentado;
      } else if (indicador.tipo_indicador === 2) { // Meta
        dadosAgrupados[periodo].valor_apresentado_meta = indicador.valor_indicador_apresentado;
      }
    });
    
    // Converter para array e ordenar por data CRESCENTE
    return Object.values(dadosAgrupados)
      .sort((a, b) => new Date(a.periodo_referencia) - new Date(b.periodo_referencia));
  };

  // ✅ NOVA FUNÇÃO: KPIs mobile com cor azul escuro uniforme
  const renderKPIsHabilitadosMobile = () => {
    const kpis = calcularKPIs();
    const kpisHabilitados = [];

    // Verificar quais KPIs estão habilitados e adicionar ao array
    if (configuracoes.soma) {
      kpisHabilitados.push(
        <div key="soma-apresentado" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Soma - Valor Indicador</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.somaRealizadoApresentado)}</p>
          <p className="text-xs text-gray-400">Meta Total: {formatKPIValue(kpis.somaMetaApresentado)}</p>
        </div>
      );
    }

    if (configuracoes.media) {
      kpisHabilitados.push(
        <div key="media-apresentado" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Média - Valor Indicador</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.mediaRealizadoApresentado)}</p>
          <p className="text-xs text-gray-400">Meta Média: {formatKPIValue(kpis.mediaMetaApresentado)}</p>
        </div>
      );
    }

    if (configuracoes.desvio_padrao) {
      kpisHabilitados.push(
        <div key="desvio-apresentado" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Desvio Padrão - Valor Indicador</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.desvioPadraoRealizadoApresentado)}</p>
          <p className="text-xs text-gray-400">Meta: {formatKPIValue(kpis.desvioPadraoMetaApresentado)}</p>
        </div>
      );
    }

    if (configuracoes.mediana) {
      kpisHabilitados.push(
        <div key="mediana-apresentado" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Mediana - Valor Indicador</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.medianaRealizadoApresentado)}</p>
          <p className="text-xs text-gray-400">Meta: {formatKPIValue(kpis.medianaMetaApresentado)}</p>
        </div>
      );
    }

    if (configuracoes.minimo) {
      kpisHabilitados.push(
        <div key="minimo-apresentado" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Mínimo - Valor Indicador</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.minimoRealizadoApresentado)}</p>
          <p className="text-xs text-gray-400">Meta: {formatKPIValue(kpis.minimoMetaApresentado)}</p>
        </div>
      );
    }

    if (configuracoes.maximo) {
      kpisHabilitados.push(
        <div key="maximo-apresentado" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Máximo - Valor Indicador</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.maximoRealizadoApresentado)}</p>
          <p className="text-xs text-gray-400">Meta: {formatKPIValue(kpis.maximoMetaApresentado)}</p>
        </div>
      );
    }

    if (configuracoes.mais_recente) {
      kpisHabilitados.push(
        <div key="recente-apresentado" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Mais Recente - Valor Indicador</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.maisRecenteRealizadoApresentado)}</p>
          <p className="text-xs text-gray-400">Meta: {formatKPIValue(kpis.maisRecenteMetaApresentado)}</p>
        </div>
      );
    }

    if (configuracoes.contagem_registros) {
      kpisHabilitados.push(
        <div key="contagem" className="bg-white rounded-lg shadow-md p-3 border-l-4" style={{ borderLeftColor: '#012060' }}>
          <p className="text-xs font-medium text-gray-600 mb-1">Contagem de Registros</p>
          <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.contagemRegistros)}</p>
          <p className="text-xs text-gray-400">Total de períodos</p>
        </div>
      );
    }

    return kpisHabilitados;
  };

  // ✅ NOVA FUNÇÃO: Renderizar KPIs habilitados DESKTOP com cor azul uniforme
  const renderKPIsHabilitadosDesktop = () => {
    const kpis = calcularKPIs();
    const kpisHabilitados = [];

    // Verificar quais KPIs estão habilitados e adicionar ao array
    if (configuracoes.soma) {
      kpisHabilitados.push({
        key: "soma-apresentado",
        title: "Soma - Valor Indicador",
        value: formatKPIValue(kpis.somaRealizadoApresentado),
        subtitle: `Meta Total: ${formatKPIValue(kpis.somaMetaApresentado)}`
      });
    }

    if (configuracoes.media) {
      kpisHabilitados.push({
        key: "media-apresentado",
        title: "Média - Valor Indicador",
        value: formatKPIValue(kpis.mediaRealizadoApresentado),
        subtitle: `Meta Média: ${formatKPIValue(kpis.mediaMetaApresentado)}`
      });
    }

    if (configuracoes.desvio_padrao) {
      kpisHabilitados.push({
        key: "desvio-apresentado",
        title: "Desvio Padrão - Valor Indicador",
        value: formatKPIValue(kpis.desvioPadraoRealizadoApresentado),
        subtitle: `Meta: ${formatKPIValue(kpis.desvioPadraoMetaApresentado)}`
      });
    }

    if (configuracoes.mediana) {
      kpisHabilitados.push({
        key: "mediana-apresentado",
        title: "Mediana - Valor Indicador",
        value: formatKPIValue(kpis.medianaRealizadoApresentado),
        subtitle: `Meta: ${formatKPIValue(kpis.medianaMetaApresentado)}`
      });
    }

    if (configuracoes.minimo) {
      kpisHabilitados.push({
        key: "minimo-apresentado",
        title: "Mínimo - Valor Indicador",
        value: formatKPIValue(kpis.minimoRealizadoApresentado),
        subtitle: `Meta: ${formatKPIValue(kpis.minimoMetaApresentado)}`
      });
    }

    if (configuracoes.maximo) {
      kpisHabilitados.push({
        key: "maximo-apresentado",
        title: "Máximo - Valor Indicador",
        value: formatKPIValue(kpis.maximoRealizadoApresentado),
        subtitle: `Meta: ${formatKPIValue(kpis.maximoMetaApresentado)}`
      });
    }

    if (configuracoes.mais_recente) {
      kpisHabilitados.push({
        key: "recente-apresentado",
        title: "Mais Recente - Valor Indicador",
        value: formatKPIValue(kpis.maisRecenteRealizadoApresentado),
        subtitle: `Meta: ${formatKPIValue(kpis.maisRecenteMetaApresentado)}`
      });
    }

    if (configuracoes.contagem_registros) {
      kpisHabilitados.push({
        key: "contagem",
        title: "Contagem de Registros",
        value: formatKPIValue(kpis.contagemRegistros),
        subtitle: "Total de períodos"
      });
    }

    // ✅ LÓGICA MELHORADA PARA LAYOUT OTIMIZADO
    const renderKPILayout = () => {
      const count = kpisHabilitados.length;

      // Função para renderizar um KPI individual com cor azul uniforme
      const renderKPI = (kpi, className = "") => (
        <div 
          key={kpi.key} 
          className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${className}`}
          style={{ borderLeftColor: '#012060' }}
        >
          <p className="text-xs font-medium text-gray-600 mb-1">{kpi.title}</p>
          <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          <p className="text-xs text-gray-400">{kpi.subtitle}</p>
        </div>
      );

      // ✅ CASOS ESPECÍFICOS PARA LAYOUT OTIMIZADO
      switch (count) {
        case 1:
          return (
            <div className="grid grid-cols-1 gap-4">
              {renderKPI(kpisHabilitados[0])}
            </div>
          );
          
        case 2:
          return (
            <div className="grid grid-cols-2 gap-4">
              {kpisHabilitados.map(kpi => renderKPI(kpi))}
            </div>
          );
          
        case 3:
          return (
            <div className="grid grid-cols-3 gap-4">
              {kpisHabilitados.map(kpi => renderKPI(kpi))}
            </div>
          );
          
        case 4:
          return (
            <div className="grid grid-cols-4 gap-4">
              {kpisHabilitados.map(kpi => renderKPI(kpi))}
            </div>
          );
          
        case 5:
          // ✅ CASO ESPECIAL: 4 na primeira linha + 1 ocupando toda a segunda linha
          return (
            <div className="space-y-4">
              {/* Primeira linha: 4 KPIs */}
              <div className="grid grid-cols-4 gap-4">
                {kpisHabilitados.slice(0, 4).map(kpi => renderKPI(kpi))}
              </div>
              {/* Segunda linha: 1 KPI ocupando toda a largura */}
              <div className="grid grid-cols-1 gap-4">
                {renderKPI(kpisHabilitados[4])}
              </div>
            </div>
          );
          
        case 6:
          // ✅ CASO ESPECIAL: 4 na primeira linha + 2 na segunda linha
          return (
            <div className="space-y-4">
              {/* Primeira linha: 4 KPIs */}
              <div className="grid grid-cols-4 gap-4">
                {kpisHabilitados.slice(0, 4).map(kpi => renderKPI(kpi))}
              </div>
              {/* Segunda linha: 2 KPIs */}
              <div className="grid grid-cols-2 gap-4">
                {kpisHabilitados.slice(4, 6).map(kpi => renderKPI(kpi))}
              </div>
            </div>
          );
          
        case 7:
          // ✅ CASO ESPECIAL: 4 na primeira linha + 3 na segunda linha
          return (
            <div className="space-y-4">
              {/* Primeira linha: 4 KPIs */}
              <div className="grid grid-cols-4 gap-4">
                {kpisHabilitados.slice(0, 4).map(kpi => renderKPI(kpi))}
              </div>
              {/* Segunda linha: 3 KPIs */}
              <div className="grid grid-cols-3 gap-4">
                {kpisHabilitados.slice(4, 7).map(kpi => renderKPI(kpi))}
              </div>
            </div>
          );
          
        case 8:
          // ✅ CASO ESPECIAL: 4 na primeira linha + 4 na segunda linha
          return (
            <div className="space-y-4">
              {/* Primeira linha: 4 KPIs */}
              <div className="grid grid-cols-4 gap-4">
                {kpisHabilitados.slice(0, 4).map(kpi => renderKPI(kpi))}
              </div>
              {/* Segunda linha: 4 KPIs */}
              <div className="grid grid-cols-4 gap-4">
                {kpisHabilitados.slice(4, 8).map(kpi => renderKPI(kpi))}
              </div>
            </div>
          );
          
        default:
          // ✅ FALLBACK: Para mais de 8 KPIs, usar grid padrão de 4 colunas
          return (
            <div className="grid grid-cols-4 gap-4">
              {kpisHabilitados.map(kpi => renderKPI(kpi))}
            </div>
          );
      }
    };

    return renderKPILayout();
  };

  // ✅ NOVA FUNÇÃO: Renderizar seção de informações com valores dinâmicos
  const renderSecaoInformacoes = () => {
    const kpis = calcularKPIs(); // Obter os valores calculados
    
    const opcoes = [
      { 
        key: 'soma', 
        label: 'Soma',
        valorRealizado: formatKPIValue(kpis.somaRealizadoApresentado),
        valorMeta: formatKPIValue(kpis.somaMetaApresentado)
      },
      { 
        key: 'media', 
        label: 'Média',
        valorRealizado: formatKPIValue(kpis.mediaRealizadoApresentado),
        valorMeta: formatKPIValue(kpis.mediaMetaApresentado)
      },
      { 
        key: 'desvio_padrao', 
        label: 'Desvio Padrão',
        valorRealizado: formatKPIValue(kpis.desvioPadraoRealizadoApresentado),
        valorMeta: formatKPIValue(kpis.desvioPadraoMetaApresentado)
      },
      { 
        key: 'mediana', 
        label: 'Mediana',
        valorRealizado: formatKPIValue(kpis.medianaRealizadoApresentado),
        valorMeta: formatKPIValue(kpis.medianaMetaApresentado)
      },
      { 
        key: 'mais_recente', 
        label: 'Mais Recente',
        valorRealizado: formatKPIValue(kpis.maisRecenteRealizadoApresentado),
        valorMeta: formatKPIValue(kpis.maisRecenteMetaApresentado)
      },
      { 
        key: 'minimo', 
        label: 'Mínimo',
        valorRealizado: formatKPIValue(kpis.minimoRealizadoApresentado),
        valorMeta: formatKPIValue(kpis.minimoMetaApresentado)
      },
      { 
        key: 'maximo', 
        label: 'Máximo',
        valorRealizado: formatKPIValue(kpis.maximoRealizadoApresentado),
        valorMeta: formatKPIValue(kpis.maximoMetaApresentado)
      },
      { 
        key: 'contagem_registros', 
        label: 'Contagem de Registros',
        valorRealizado: formatKPIValue(kpis.contagemRegistros),
        valorMeta: 'Total de períodos' // Para este não há meta
      }
    ];

    return (
      <div className="mb-6">
        {/* ✅ CABEÇALHO MODIFICADO: Novo nome e ícone */}
        <button
          onClick={() => setShowConfiguracoes(!showConfiguracoes)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-center">
            <FiInfo className="w-5 h-5 text-gray-500 mr-3" /> {/* ✅ NOVO ÍCONE */}
            <h3 className="text-lg font-semibold text-gray-700">Informações</h3> {/* ✅ NOVO NOME */}
          </div>
          {showConfiguracoes ? (
            <FiChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {/* Conteúdo da seção (colapsado) */}
        {showConfiguracoes && (
          <div className="mt-3 p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-600 mb-4">
              Selecione quais estatísticas devem ser exibidas no resumo dos indicadores:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {opcoes.map((opcao) => (
                <label
                  key={opcao.key}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                    configuracoes[opcao.key]
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  } ${atualizandoConfiguracao ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {/* ✅ NOVO LAYOUT: Texto à esquerda */}
                  <div className="flex-1 mr-3">
                    <span className="text-sm font-medium block">
                      {opcao.key === 'contagem_registros' 
                        ? `${opcao.label}: ${opcao.valorRealizado}`
                        : `${opcao.label}: ${opcao.valorRealizado} (${opcao.valorMeta} Meta)`
                      }
                    </span>
                  </div>
                  
                  {/* ✅ NOVO LAYOUT: Checkbox à direita */}
                  <input
                    type="checkbox"
                    checked={configuracoes[opcao.key]}
                    onChange={(e) => atualizarConfiguracao(opcao.key, e.target.checked)}
                    disabled={atualizandoConfiguracao}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded flex-shrink-0"
                  />
                </label>
              ))}
            </div>

            {atualizandoConfiguracao && (
              <div className="mt-3 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                <span className="text-sm text-gray-600">Salvando configurações...</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Componente personalizado para Tooltip
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

  // ✅ DEPOIS (não causa reload):
  const dadosGraficoCombinado = useMemo(() => prepararDadosGraficoCombinado(), [indicadores]);
  const dadosTabela = useMemo(() => prepararDadosTabela(), [indicadores]);
  const kpisHabilitadosMobile = useMemo(() => renderKPIsHabilitadosMobile(), [configuracoes, indicadores]);

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // ✅ SEMPRE renderizar o layout completo, independente de ter dados ou não
  return (
    <div className="min-h-screen bg-white lg:bg-gray-50">
      <Head>
        <title>Indicador - {nomeIndicador}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* ✅ CSS para melhorar a scrollbar */}
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

      {/* Modal de confirmação para arquivar */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <FiArchive className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Arquivar Indicadores
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Tem certeza que deseja arquivar todos os períodos deste indicador? Você poderá encontrá-los na seção "Arquivados".
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarArquivamento}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                >
                  Arquivar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE: Layout com tabela */}
      <div className="lg:hidden pb-20">
        {/* Header fixo com título - Mobile */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-4 py-4 border-b">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center flex-1 min-w-0">
                <Link href="/visualizacao-indicadores" className="mr-3 flex-shrink-0">
                  <FiChevronLeft className="w-6 h-6 text-blue-600" />
                </Link>
                
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {nomeIndicador}
                </h1>
              </div>
              
              {/* Botão de filtro MELHORADO */}
              <button
                onClick={() => setShowFiltroPeriodo(!showFiltroPeriodo)}
                className={`p-3 rounded-lg transition-colors ${
                  showFiltroPeriodo || filtroPeriodo !== 'todos'
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>

            {/* Tags - Mobile */}
            <div className="flex space-x-2">
              {infoGeral?.projeto_id && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                  {projetos[infoGeral.projeto_id] || 'Projeto N/A'}
                </span>
              )}
              {infoGeral?.categoria_id && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {categorias[infoGeral.categoria_id] || 'Categoria N/A'}
                </span>
              )}
            </div>
            
            {/* Filtro de período - Mobile */}
            {showFiltroPeriodo && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Filtrar por Período
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFiltroPeriodo('todos')}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === 'todos'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('7dias')}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === '7dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('30dias')}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === '30dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Últimos 30 dias
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('90dias')}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === '90dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Últimos 90 dias
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('especifico')}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === 'especifico'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Período Específico
                  </button>
                </div>
                
                {/* Campos de data para período específico */}
                {filtroPeriodo === 'especifico' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>

        {/* Conteúdo da página - Mobile */}
        <div className="max-w-md mx-auto px-4 py-4">
          {/* ✅ KPIs DINÂMICOS - Mobile - Baseados nas configurações */}
          {kpisHabilitadosMobile.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Resumo dos Indicadores</h3>
              <div className="grid grid-cols-2 gap-3">
                {kpisHabilitadosMobile}
              </div>
            </div>
          )}

          {/* ✅ GRÁFICO ÚNICO COM CONFIGURAÇÕES ADAPTATIVAS - Mobile */}
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-md p-4 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Valor Indicador (Realizado vs Meta)</h3>
              
              {/* ✅ LEGENDA FIXA - Mobile */}
              <div className="mb-3 flex justify-center space-x-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
                  <span className="text-xs text-gray-600">Realizado</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded mr-2"></div>
                  <span className="text-xs text-gray-600">Meta</span>
                </div>
              </div>
              
              {/* ✅ GRÁFICO COM CONFIGURAÇÕES ADAPTATIVAS - Mobile */}
              <ScrollableChartContainer dataLength={dadosGraficoCombinado.length} isMobile={true}>
                <div style={{ height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={dadosGraficoCombinado} 
                      margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
                      barCategoryGap={calculateCategoryGap(dadosGraficoCombinado.length)}
                    >
                      <XAxis 
                        dataKey="periodo" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 8, fill: '#6B7280', textAnchor: 'middle' }}
                        interval={0}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="realizadoApresentado" 
                        fill="#3B82F6" 
                        name="Realizado"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={calculateOptimalBarWidth(dadosGraficoCombinado.length, true)}
                      >
                        <LabelList 
                          dataKey="realizadoApresentado" 
                          position="top" 
                          style={{ 
                            fontSize: '7px', 
                            fill: '#374151',
                            fontWeight: '500'
                          }}
                          formatter={(value) => {
                            if (value === 0) return '0';
                            return parseFloat(value).toLocaleString('pt-BR');
                          }}
                        />
                      </Bar>
                      <Line 
                        type="monotone" 
                        dataKey="metaApresentado" 
                        stroke="#6B7280" 
                        strokeWidth={2}
                        dot={{ fill: '#6B7280', strokeWidth: 2, r: 3 }}
                        name="Meta"
                        connectNulls={true}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ScrollableChartContainer>
            </div>
          </div>

          {/* ✅ SEÇÃO DE CONFIGURAÇÕES - Mobile */}
          {renderSecaoInformacoes()}

          {/* ✅ TABELA NOVA - Mobile */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Período de Referência
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Realizado
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meta
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {dadosTabela.map((linha, index) => (
                    <tr key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 border-r border-gray-200">
                        {formatDate(linha.periodo_referencia)}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 border-r border-gray-200">
                        {formatValue(linha.valor_apresentado_realizado)}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900">
                        {formatValue(linha.valor_apresentado_meta)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Botão Marcar como Lido - Mobile */}
          <div className="mt-4 mb-4">
            <button
              onClick={toggleLidoTodos}
              disabled={marcandoComoLido}
              className={`w-full py-3 rounded-md flex items-center justify-center font-medium transition-colors ${
                marcandoComoLido
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : todosMarcadosComoLidos
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {marcandoComoLido ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 mr-2"></div>
                  {todosMarcadosComoLidos ? 'Desmarcando...' : 'Marcando...'}
                </>
              ) : todosMarcadosComoLidos ? (
                '✓ Marcado como Lido'
              ) : (
                'Marcar como Lido'
              )}
            </button>
          </div>

          {/* Botão Voltar para Início */}
          <div className="mt-6">
            <button
              onClick={voltarParaInicio}
              className="w-full py-3 rounded-md flex items-center justify-center font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <FiHome className="mr-2" />
              Voltar para Início
            </button>
          </div>
        </div>

        {/* Barra fixa inferior com botões de ação - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-1 z-20">
          <div className="max-w-md mx-auto flex justify-center space-x-8">
            {/* Botão Importante */}
            <button
              onClick={() => alternarStatusTodos('importante', statusGeral.importante)}
              disabled={atualizandoStatus}
              className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 transition-colors ${
                atualizandoStatus ? 'opacity-50' : ''
              }`}
            >
              <FiStar className={`h-5 w-5 ${statusGeral.importante ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${statusGeral.importante ? 'text-blue-600' : 'text-gray-400'}`}>
                Importante
              </span>
            </button>

            {/* Botão Ler Depois */}
            <button
              onClick={() => alternarStatusTodos('ler_depois', statusGeral.ler_depois)}
              disabled={atualizandoStatus}
              className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 transition-colors ${
                atualizandoStatus ? 'opacity-50' : ''
              }`}
            >
              <FiClock className={`h-5 w-5 ${statusGeral.ler_depois ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${statusGeral.ler_depois ? 'text-blue-600' : 'text-gray-400'}`}>
                Ler Depois
              </span>
            </button>

            {/* Botão Arquivar */}
            <button
              onClick={() => alternarStatusTodos('arquivado', statusGeral.arquivado)}
              disabled={atualizandoStatus}
              className={`flex flex-col items-center space-y-0.5 py-1.5 px-3 transition-colors ${
                atualizandoStatus ? 'opacity-50' : ''
              }`}
            >
              <FiArchive className={`h-5 w-5 ${statusGeral.arquivado ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-xs font-medium ${statusGeral.arquivado ? 'text-blue-600' : 'text-gray-400'}`}>
                Arquivar
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* DESKTOP: Layout com tabela e KPIs responsivos */}
      <div className="hidden lg:block">
        {/* Header fixo com título e botão voltar - Desktop */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-8 py-6 border-b">
          <div className="max-w-6xl mx-auto">
            {/* Primeira linha: Botão Voltar + Título + Filtro */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <button 
                  onClick={voltarParaInicioDesktop}
                  className="mr-4 flex-shrink-0 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiArrowLeft className="w-6 h-6 mr-2" />
                  <span className="text-sm font-medium">Voltar</span>
                </button>
                
                <h1 className="text-2xl font-bold text-gray-900 truncate">
                  {nomeIndicador}
                </h1>
              </div>
              
              {/* Botão de filtro */}
              <button
                onClick={() => setShowFiltroPeriodo(!showFiltroPeriodo)}
                className={`p-3 rounded-lg transition-colors ${
                  showFiltroPeriodo || filtroPeriodo !== 'todos'
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>

            {/* Tags logo após o título */}
            <div className="flex space-x-3 mb-4">
              {infoGeral?.projeto_id && (
                <span className="px-3 py-1.5 bg-red-100 text-red-800 text-sm rounded-full font-medium">
                  {projetos[infoGeral.projeto_id] || 'Projeto N/A'}
                </span>
              )}
              {infoGeral?.categoria_id && (
                <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                  {categorias[infoGeral.categoria_id] || 'Categoria N/A'}
                </span>
              )}
            </div>

            {/* Filtro de período - Desktop */}
            {showFiltroPeriodo && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-600 mb-3">
                  Filtrar por Período
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setFiltroPeriodo('todos')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === 'todos'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('7dias')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === '7dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('30dias')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === '30dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Últimos 30 dias
                  </button>

                  <button
                    onClick={() => setFiltroPeriodo('90dias')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === '90dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Últimos 90 dias
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('especifico')}
                    className={`flex items-center px-4 py-2 rounded-lg text-sm transition-colors ${
                      filtroPeriodo === 'especifico'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Período Específico
                  </button>
                </div>
                
                {/* Campos de data para período específico */}
                {filtroPeriodo === 'especifico' && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Segunda linha - APENAS botões de ação */}
            <div className="flex items-center justify-end">
              {/* Botões de ação */}
              <div className="flex space-x-3">
                {/* Botão Importante */}
                <button
                  onClick={() => alternarStatusTodos('importante', statusGeral.importante)}
                  disabled={atualizandoStatus}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                    atualizandoStatus ? 'opacity-50' : ''
                  } ${
                    statusGeral.importante 
                      ? 'text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FiStar className="w-4 h-4" />
                  <span className="font-medium">Importante</span>
                </button>

                {/* Botão Ler Depois */}
                <button
                  onClick={() => alternarStatusTodos('ler_depois', statusGeral.ler_depois)}
                  disabled={atualizandoStatus}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                    atualizandoStatus ? 'opacity-50' : ''
                  } ${
                    statusGeral.ler_depois 
                      ? 'text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FiClock className="w-4 h-4" />
                  <span className="font-medium">Ler Depois</span>
                </button>

                {/* Botão Arquivar */}
                <button
                  onClick={() => alternarStatusTodos('arquivado', statusGeral.arquivado)}
                  disabled={atualizandoStatus}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md transition-colors text-sm ${
                    atualizandoStatus ? 'opacity-50' : ''
                  } ${
                    statusGeral.arquivado 
                      ? 'text-blue-600' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <FiArchive className="w-4 h-4" />
                  <span className="font-medium">Arquivar</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da página - Desktop */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* ✅ KPIs DINÂMICOS RESPONSIVOS - Desktop - Baseados nas configurações */}
          {renderKPIsHabilitadosDesktop() && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-gray-700 mb-6">Resumo dos Indicadores</h3>
              {renderKPIsHabilitadosDesktop()}
            </div>
          )}

          {/* ✅ GRÁFICO ÚNICO COM CONFIGURAÇÕES ADAPTATIVAS E CENTRALIZAÇÃO CORRIGIDA - Desktop */}
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 border">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Valor Indicador (Realizado vs Meta)</h3>
              
              {/* ✅ LEGENDA FIXA - Desktop */}
              <div className="mb-4 flex justify-center space-x-6">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Realizado</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-500 rounded mr-2"></div>
                  <span className="text-sm text-gray-600">Meta</span>
                </div>
              </div>
              
              {/* ✅ GRÁFICO COM CONFIGURAÇÕES ADAPTATIVAS E CENTRALIZAÇÃO CORRIGIDA - Desktop */}
              <ScrollableChartContainer dataLength={dadosGraficoCombinado.length} isMobile={false}>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart 
                      data={dadosGraficoCombinado} 
                      margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
                      barCategoryGap={calculateCategoryGap(dadosGraficoCombinado.length)}
                    >
                      <XAxis 
                        dataKey="periodo" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#6B7280', textAnchor: 'middle' }}
                        interval={0}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="realizadoApresentado" 
                        fill="#3B82F6" 
                        name="Realizado"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={calculateOptimalBarWidth(dadosGraficoCombinado.length, false)}
                      >
                        <LabelList 
                          dataKey="realizadoApresentado" 
                          position="top" 
                          style={{ 
                            fontSize: '9px', 
                            fill: '#374151',
                            fontWeight: '500'
                          }}
                          formatter={(value) => {
                            if (value === 0) return '0';
                            return parseFloat(value).toLocaleString('pt-BR');
                          }}
                        />
                      </Bar>
                      <Line 
                        type="monotone" 
                        dataKey="metaApresentado" 
                        stroke="#6B7280" 
                        strokeWidth={3}
                        dot={{ fill: '#6B7280', strokeWidth: 2, r: 4 }}
                        name="Meta"
                        connectNulls={true}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ScrollableChartContainer>
            </div>
          </div>

          {/* ✅ SEÇÃO DE CONFIGURAÇÕES - Desktop */}
          {renderSecaoInformacoes()}

          {/* ✅ TABELA NOVA - Desktop */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período de Referência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Realizado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Meta
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dadosTabela.map((linha, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatDate(linha.periodo_referencia)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatValue(linha.valor_apresentado_realizado)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatValue(linha.valor_apresentado_meta)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Botão Marcar como Lido - Desktop */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={toggleLidoTodos}
              disabled={marcandoComoLido}
              className={`px-4 py-2 rounded-md flex items-center font-medium transition-colors text-sm ${
                marcandoComoLido
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : todosMarcadosComoLidos
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {marcandoComoLido ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {todosMarcadosComoLidos ? 'Desmarcando...' : 'Marcando...'}
                </>
              ) : todosMarcadosComoLidos ? (
                '✓ Marcado como Lido'
              ) : (
                'Marcar como Lido'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}