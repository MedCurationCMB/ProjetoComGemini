// Arquivo: src/pages/indicador/[id].js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiStar, FiClock, FiArchive, FiHome, FiCalendar, FiArrowLeft } from 'react-icons/fi';
import { BarChart, Bar, XAxis, ResponsiveContainer, LabelList } from 'recharts';

export default function IndicadorDetalhe({ user }) {
  const router = useRouter();
  const { id } = router.query; // Este é o id_controleindicador
  const [indicadores, setIndicadores] = useState([]);
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

  // Função para calcular o tamanho ideal das barras
  const calculateBarSize = (dataLength) => {
    // Tamanho fixo baseado na visualização de 7 barras
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    return isMobile ? 35 : 50; // Tamanho fixo
  };

  // Função para calcular largura do container quando há muitos dados
  const calculateContainerWidth = (dataLength) => {
    const barWidth = calculateBarSize(dataLength);
    const spacing = 15; // Espaçamento entre barras
    const margins = 40; // Margens totais
    
    return Math.max(300, (barWidth + spacing) * dataLength + margins);
  };

  // Função para calcular os KPIs
  const calcularKPIs = () => {
    if (!indicadores || indicadores.length === 0) {
      return {
        somaValorIndicador: 0,
        mediaValorIndicador: 0,
        somaValorApresentado: 0,
        mediaValorApresentado: 0
      };
    }

    const valoresIndicador = indicadores.map(ind => parseFloat(ind.valor_indicador) || 0);
    const valoresApresentado = indicadores.map(ind => parseFloat(ind.valor_indicador_apresentado) || 0);

    const somaValorIndicador = valoresIndicador.reduce((acc, val) => acc + val, 0);
    const somaValorApresentado = valoresApresentado.reduce((acc, val) => acc + val, 0);

    return {
      somaValorIndicador,
      mediaValorIndicador: indicadores.length > 0 ? somaValorIndicador / indicadores.length : 0,
      somaValorApresentado,
      mediaValorApresentado: indicadores.length > 0 ? somaValorApresentado / indicadores.length : 0
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

  // Buscar dados dos indicadores
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
        
        if (!data || data.length === 0) {
          router.push('/visualizacao-indicadores');
          return;
        }
        
        setIndicadores(data);
        // O nome do indicador deve ser o mesmo em todos os registros
        setNomeIndicador(data[0].indicador || 'Indicador sem nome');
        
        // Verificar se todos os registros estão marcados como lidos
        const todosLidos = data.every(indicador => indicador.lido === true);
        setTodosMarcadosComoLidos(todosLidos);
        
        // Verificar status geral (importante, ler_depois, arquivado)
        // Considera que o status está ativo se PELO MENOS UM registro estiver marcado
        const statusGeral = {
          importante: data.some(indicador => indicador.importante === true),
          ler_depois: data.some(indicador => indicador.ler_depois === true),
          arquivado: data.some(indicador => indicador.arquivado === true)
        };
        setStatusGeral(statusGeral);
        
        // Pegar as informações gerais do primeiro registro (projeto, categoria)
        setInfoGeral({
          projeto_id: data[0].projeto_id,
          categoria_id: data[0].categoria_id,
          created_at: data[0].created_at
        });
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        router.push('/visualizacao-indicadores');
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchIndicadores();
    }
  }, [user, id, router]);

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

  // Função para preparar dados para os gráficos
  const prepararDadosGrafico = () => {
    if (!indicadores || indicadores.length === 0) return [];
    
    return indicadores
      .map(indicador => ({
        periodo: formatDateGrafico(indicador.periodo_referencia), // Usando formato DD-MM-AA para gráficos
        periodoCompleto: indicador.periodo_referencia,
        valorApresentado: parseFloat(indicador.valor_indicador_apresentado) || 0,
        valorIndicador: parseFloat(indicador.valor_indicador) || 0
      }))
      .sort((a, b) => new Date(a.periodoCompleto) - new Date(b.periodoCompleto)); // Ordenar por data crescente para o gráfico
  };

  const dadosGrafico = prepararDadosGrafico();
  const kpis = calcularKPIs();

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

  if (!indicadores || indicadores.length === 0) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <p className="text-gray-500">Indicadores não encontrados</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:bg-gray-50">
      <Head>
        <title>Indicador - {nomeIndicador}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

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
            </div>
            
            {/* Tags e data - Mobile */}
            <div className="flex items-center justify-between">
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
              
              <div className="flex items-center text-gray-500 text-xs">
                <FiCalendar className="w-3 h-3 mr-1" />
                {formatDate(infoGeral?.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da página - Mobile */}
        <div className="max-w-md mx-auto px-4 py-4">
          {/* KPIs - Mobile */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Resumo dos Indicadores</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-blue-500">
                <p className="text-xs font-medium text-gray-600 mb-1">Soma Valor Indicador</p>
                <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.somaValorIndicador)}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-green-500">
                <p className="text-xs font-medium text-gray-600 mb-1">Média Valor Indicador</p>
                <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.mediaValorIndicador)}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-purple-500">
                <p className="text-xs font-medium text-gray-600 mb-1">Soma Valor Apresentado</p>
                <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.somaValorApresentado)}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-orange-500">
                <p className="text-xs font-medium text-gray-600 mb-1">Média Valor Apresentado</p>
                <p className="text-lg font-bold text-gray-900">{formatKPIValue(kpis.mediaValorApresentado)}</p>
              </div>
            </div>
          </div>

          {/* Gráficos - Mobile */}
          <div className="mb-6 space-y-6">
            {/* Gráfico Valor Apresentado */}
            <div className="bg-white rounded-lg shadow-md p-4 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Valor Apresentado por Período</h3>
              <div className="overflow-x-auto">
                <div style={{ minWidth: dadosGrafico.length > 6 ? calculateContainerWidth(dadosGrafico.length) : '100%' }}>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={dadosGrafico} 
                        margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                        maxBarSize={calculateBarSize(dadosGrafico.length)}
                        barCategoryGap="15%"
                      >
                        <XAxis 
                          dataKey="periodo" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 8, fill: '#6B7280' }}
                        />
                        <Bar 
                          dataKey="valorApresentado" 
                          fill="#3B82F6"
                          radius={[2, 2, 0, 0]}
                        >
                          <LabelList 
                            dataKey="valorApresentado" 
                            position="top" 
                            style={{ fontSize: '10px', fill: '#374151' }}
                            formatter={(value) => parseFloat(value).toLocaleString('pt-BR')}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico Valor do Indicador */}
            <div className="bg-white rounded-lg shadow-md p-4 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Valor do Indicador por Período</h3>
              <div className="overflow-x-auto">
                <div style={{ minWidth: dadosGrafico.length > 6 ? calculateContainerWidth(dadosGrafico.length) : '100%' }}>
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={dadosGrafico} 
                        margin={{ top: 20, right: 5, left: 5, bottom: 5 }}
                        maxBarSize={calculateBarSize(dadosGrafico.length)}
                        barCategoryGap="15%"
                      >
                        <XAxis 
                          dataKey="periodo" 
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 8, fill: '#6B7280' }}
                        />
                        <Bar 
                          dataKey="valorIndicador" 
                          fill="#10B981"
                          radius={[2, 2, 0, 0]}
                        >
                          <LabelList 
                            dataKey="valorIndicador" 
                            position="top" 
                            style={{ fontSize: '10px', fill: '#374151' }}
                            formatter={(value) => parseFloat(value).toLocaleString('pt-BR')}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela - Mobile - Compacta e Responsiva */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Período
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Valor Apresentado
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Indicador
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {indicadores.map((indicador, index) => (
                    <tr key={indicador.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 border-r border-gray-200">
                        {formatDate(indicador.periodo_referencia)}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 border-r border-gray-200">
                        {formatValue(indicador.valor_indicador_apresentado)}
                      </td>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900">
                        {formatValue(indicador.valor_indicador)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Rodapé com total - Mobile */}
            <div className="px-4 py-3 bg-gray-50 text-center text-gray-500 text-xs border-t">
              Total de períodos: {indicadores.length}
            </div>
          </div>

          {/* Botão Marcar como Lido - Mobile (abaixo da tabela) */}
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

      {/* DESKTOP: Layout com tabela */}
      <div className="hidden lg:block">
        {/* Header fixo com título e botão voltar - Desktop */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-8 py-6 border-b">
          <div className="max-w-6xl mx-auto">
            {/* Primeira linha: Botão Voltar + Título + Data */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center flex-1 min-w-0">
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
              
              {/* Data no lado direito */}
              <div className="flex items-center text-gray-500 text-base ml-6 flex-shrink-0">
                <FiCalendar className="w-5 h-5 mr-2" />
                {formatDate(infoGeral?.created_at)}
              </div>
            </div>
            
            {/* Segunda linha: Tags */}
            <div className="flex items-center justify-between">
              {/* Lado esquerdo: Tags */}
              <div className="flex space-x-3">
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
              
              {/* Lado direito: Botões de ação */}
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
          {/* KPIs - Desktop */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-6">Resumo dos Indicadores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                <p className="text-sm font-medium text-gray-600">Soma Valor Indicador</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatKPIValue(kpis.somaValorIndicador)}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                <p className="text-sm font-medium text-gray-600">Média Valor Indicador</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatKPIValue(kpis.mediaValorIndicador)}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                <p className="text-sm font-medium text-gray-600">Soma Valor Apresentado</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatKPIValue(kpis.somaValorApresentado)}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
                <p className="text-sm font-medium text-gray-600">Média Valor Apresentado</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatKPIValue(kpis.mediaValorApresentado)}</p>
              </div>
            </div>
          </div>

          {/* Gráficos - Desktop */}
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico Valor Apresentado */}
              <div className="bg-white rounded-lg shadow-md p-6 border">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Valor Apresentado por Período</h3>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: dadosGrafico.length > 7 ? calculateContainerWidth(dadosGrafico.length) : '100%' }}>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={dadosGrafico} 
                          margin={{ top: 30, right: 5, left: 5, bottom: 5 }}
                          maxBarSize={calculateBarSize(dadosGrafico.length)}
                          barCategoryGap="12%"
                        >
                          <XAxis 
                            dataKey="periodo" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                          />
                          <Bar 
                            dataKey="valorApresentado" 
                            fill="#3B82F6"
                            radius={[4, 4, 0, 0]}
                          >
                            <LabelList 
                              dataKey="valorApresentado" 
                              position="top" 
                              style={{ fontSize: '12px', fill: '#374151' }}
                              formatter={(value) => parseFloat(value).toLocaleString('pt-BR')}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico Valor do Indicador */}
              <div className="bg-white rounded-lg shadow-md p-6 border">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Valor do Indicador por Período</h3>
                <div className="overflow-x-auto">
                  <div style={{ minWidth: dadosGrafico.length > 7 ? calculateContainerWidth(dadosGrafico.length) : '100%' }}>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={dadosGrafico} 
                          margin={{ top: 30, right: 5, left: 5, bottom: 5 }}
                          maxBarSize={calculateBarSize(dadosGrafico.length)}
                          barCategoryGap="12%"
                        >
                          <XAxis 
                            dataKey="periodo" 
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fill: '#6B7280' }}
                          />
                          <Bar 
                            dataKey="valorIndicador" 
                            fill="#10B981"
                            radius={[4, 4, 0, 0]}
                          >
                            <LabelList 
                              dataKey="valorIndicador" 
                              position="top" 
                              style={{ fontSize: '12px', fill: '#374151' }}
                              formatter={(value) => parseFloat(value).toLocaleString('pt-BR')}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela - Desktop */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período de Referência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Apresentado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor do Indicador
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {indicadores.map((indicador, index) => (
                  <tr key={indicador.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatDate(indicador.periodo_referencia)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatValue(indicador.valor_indicador_apresentado)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatValue(indicador.valor_indicador)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Botão Marcar como Lido - Desktop (abaixo da tabela, canto direito) */}
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
          
          {/* Informações adicionais */}
          <div className="mt-4 text-center text-gray-500 text-sm">
            Total de períodos: {indicadores.length}
          </div>
        </div>
      </div>
    </div>
  );
}