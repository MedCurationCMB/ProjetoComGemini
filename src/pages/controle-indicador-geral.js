import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import CopiaControleIndicadorGeralTable from '../components/CopiaControleIndicadorGeralTable';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiMenu,
  FiUser,
  FiSettings,
  FiLogOut,
  FiHome,
  FiFilter,
  FiX,
  FiBarChart,
  FiStar,
  FiClipboard,
  FiSearch,
  FiClock
} from 'react-icons/fi';
import { TfiPencil } from 'react-icons/tfi';

export default function CopiaControleIndicadorGeral({ user }) {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState('todos'); // 'todos', 'realizado', 'meta', 'pendentes'
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtroValorPendente, setFiltroValorPendente] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // ✅ NOVO: Termo de busca
  const [filtrosPrazo, setFiltrosPrazo] = useState(() => {
    const hoje = new Date();
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    dataFim.setDate(dataFim.getDate() + 30);
    
    const formatarDataLocal = (data) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    return {
      periodo: '30dias',
      data_inicio: formatarDataLocal(dataInicio),
      data_fim: formatarDataLocal(dataFim)
    };
  });

  // ✅ NOVO: Estado para controlar a navegação (fixo em 'registros')
  const [activeTab] = useState('registros');

  // ✅ NOVAS FUNÇÕES DE NAVEGAÇÃO
  const handleIndicadoresClick = () => {
    router.push('/visualizacao-indicadores');
  };

  const handleImportantesClick = () => {
    router.push('/visualizacao-indicadores-importantes');
  };

  const handleControleClick = () => {
    router.push('/visualizacao-geral-indicadores');
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

    const formatarDataLocal = (data) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    return {
      dataInicio: formatarDataLocal(dataInicio),
      dataFim: formatarDataLocal(dataFim)
    };
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // ✅ NOVA FUNÇÃO: Obter título da aba ativa com nova aba Pendentes
  const getTituloAba = () => {
    switch (abaAtiva) {
      case 'realizado':
        return 'Indicadores - Realizado';
      case 'meta':
        return 'Indicadores - Meta';
      case 'pendentes':
        return 'Indicadores - Pendentes';
      default:
        return 'Todos os Indicadores';
    }
  };

  // ✅ NOVA FUNÇÃO: Obter descrição da aba ativa com nova aba Pendentes
  const getDescricaoAba = () => {
    switch (abaAtiva) {
      case 'realizado':
        return 'Visualizando apenas indicadores do tipo "Realizado"';
      case 'meta':
        return 'Visualizando apenas indicadores do tipo "Meta"';
      case 'pendentes':
        return 'Visualizando apenas indicadores sem valor apresentado (independente da data)';
      default:
        return 'Visualizando todos os tipos de indicadores';
    }
  };

  // Função para gerar texto descritivo baseado nos filtros
  const gerarTextoDescritivo = () => {
    // ✅ PARA ABA PENDENTES: Não mostrar filtros de prazo pois são ignorados
    if (abaAtiva === 'pendentes') {
      let textoBase = getDescricaoAba();
      
      if (searchTerm) {
        textoBase += ` • Busca: "${searchTerm}"`;
      }
      
      return textoBase;
    }

    if (!filtrosPrazo.periodo) {
      return getDescricaoAba();
    }

    let dataInicio, dataFim;

    if (filtrosPrazo.periodo === 'personalizado') {
      if (!filtrosPrazo.data_inicio || !filtrosPrazo.data_fim) {
        return getDescricaoAba();
      }
      dataInicio = filtrosPrazo.data_inicio;
      dataFim = filtrosPrazo.data_fim;
    } else {
      const periodo = calcularPeriodo(filtrosPrazo.periodo);
      dataInicio = periodo.dataInicio;
      dataFim = periodo.dataFim;
    }

    const formatarData = (dataString) => {
      const partes = dataString.split('-');
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    let textoBase = getDescricaoAba();
    let textoPeriodo = ` • Prazo: ${formatarData(dataInicio)} a ${formatarData(dataFim)}`;
    
    if (filtroValorPendente) {
      textoPeriodo += ' • Apenas sem valor apresentado';
    }
    
    if (searchTerm) {
      textoPeriodo += ` • Busca: "${searchTerm}"`;
    }

    return textoBase + textoPeriodo;
  };

  // Verificar se há filtros ativos
  const hasFiltrosAtivos = () => {
    // ✅ PARA ABA PENDENTES: Só considerar busca como filtro ativo
    if (abaAtiva === 'pendentes') {
      return searchTerm.trim() !== '';
    }

    return filtroValorPendente || 
           searchTerm.trim() !== '' ||
           filtrosPrazo.periodo !== '30dias' ||
           filtrosPrazo.data_inicio !== calcularPeriodo('30dias').dataInicio ||
           filtrosPrazo.data_fim !== calcularPeriodo('30dias').dataFim;
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    const periodoPadrao = calcularPeriodo('30dias');
    setFiltrosPrazo({
      periodo: '30dias',
      data_inicio: periodoPadrao.dataInicio,
      data_fim: periodoPadrao.dataFim
    });
    setFiltroValorPendente(false);
    setSearchTerm(''); // ✅ NOVO: Limpar busca
    setShowFilters(false);
  };

  // ✅ NOVA FUNÇÃO: Lidar com mudança de aba
  const handleAbaChange = (novaAba) => {
    setAbaAtiva(novaAba);
    
    // ✅ Para aba Pendentes, limpar filtros de prazo já que são ignorados
    if (novaAba === 'pendentes') {
      setFiltroValorPendente(false); // Filtro redundante na aba Pendentes
    }
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Controle de Indicadores Geral</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* ✅ MOBILE: Header similar ao visualizacao-indicadores */}
          <div className="lg:hidden">
            {/* Primeira linha: Logo e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Registros"
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
            
            {/* ✅ NOVA Segunda linha: Busca e Filtro */}
            <div className="flex items-center space-x-3 mb-4">
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
              
              {/* ✅ FILTROS: Desabilitar para aba Pendentes */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                disabled={abaAtiva === 'pendentes'}
                className={`p-3 rounded-lg transition-colors ${
                  abaAtiva === 'pendentes'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : showFilters || hasFiltrosAtivos() 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>

            {/* ✅ MOBILE: Filtros melhorados - Ocultar para aba Pendentes */}
            {showFilters && abaAtiva !== 'pendentes' && (
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
                  {/* Filtro por Valor Pendente */}
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="filtroValorPendenteMobile"
                        checked={filtroValorPendente}
                        onChange={(e) => setFiltroValorPendente(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="filtroValorPendenteMobile" className="ml-2 block text-sm text-gray-700">
                        Apenas sem valor apresentado
                      </label>
                    </div>
                  </div>

                  {/* Filtro de Período */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Filtro por Prazo</label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodo('15dias');
                          setFiltrosPrazo({
                            periodo: '15dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          });
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosPrazo.periodo === '15dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 15 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodo('30dias');
                          setFiltrosPrazo({
                            periodo: '30dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          });
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosPrazo.periodo === '30dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 30 dias
                      </button>
                      
                      <button
                        onClick={() => {
                          const periodo = calcularPeriodo('60dias');
                          setFiltrosPrazo({
                            periodo: '60dias',
                            data_inicio: periodo.dataInicio,
                            data_fim: periodo.dataFim
                          });
                        }}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosPrazo.periodo === '60dias'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Próximos 60 dias
                      </button>
                      
                      <button
                        onClick={() => setFiltrosPrazo(prev => ({ 
                          ...prev, 
                          periodo: 'personalizado'
                        }))}
                        className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                          filtrosPrazo.periodo === 'personalizado'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Período Personalizado
                      </button>
                    </div>
                  </div>

                  {/* Campos de data personalizada */}
                  {filtrosPrazo.periodo === 'personalizado' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data Início</label>
                        <input
                          type="date"
                          value={filtrosPrazo.data_inicio}
                          onChange={(e) => setFiltrosPrazo(prev => ({ ...prev, data_inicio: e.target.value }))}
                          className="w-full px-2 py-2 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data Fim</label>
                        <input
                          type="date"
                          value={filtrosPrazo.data_fim}
                          onChange={(e) => setFiltrosPrazo(prev => ({ ...prev, data_fim: e.target.value }))}
                          className="w-full px-2 py-2 bg-white border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ✅ DESKTOP: Header melhorado com busca */}
          <div className="hidden lg:block">
            {/* Primeira linha: Logo, Busca e Menu */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Registros"
                showFallback={true}
              />
              
              {/* ✅ NOVA: Barra de busca - Desktop */}
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
              
              {/* Controles à direita - Desktop */}
              <div className="flex items-center space-x-3">
                {/* Botão de filtro - Desabilitar para aba Pendentes */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  disabled={abaAtiva === 'pendentes'}
                  className={`p-3 rounded-lg transition-colors ${
                    abaAtiva === 'pendentes'
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : showFilters || hasFiltrosAtivos() 
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

            {/* Filtros Desktop - Ocultar para aba Pendentes */}
            {showFilters && abaAtiva !== 'pendentes' && (
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filtro por Valor Pendente */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Filtrar por Pendência</label>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        id="filtroValorPendenteDesktop"
                        checked={filtroValorPendente}
                        onChange={(e) => setFiltroValorPendente(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="filtroValorPendenteDesktop" className="ml-2 block text-sm text-gray-700">
                        Apenas sem valor apresentado
                      </label>
                    </div>
                  </div>

                  {/* Campos de data personalizada */}
                  {filtrosPrazo.periodo === 'personalizado' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Data Início</label>
                        <input
                          type="date"
                          value={filtrosPrazo.data_inicio}
                          onChange={(e) => setFiltrosPrazo(prev => ({ ...prev, data_inicio: e.target.value }))}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Data Fim</label>
                        <input
                          type="date"
                          value={filtrosPrazo.data_fim}
                          onChange={(e) => setFiltrosPrazo(prev => ({ ...prev, data_fim: e.target.value }))}
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
                      onClick={() => {
                        const periodo = calcularPeriodo('15dias');
                        setFiltrosPrazo({
                          periodo: '15dias',
                          data_inicio: periodo.dataInicio,
                          data_fim: periodo.dataFim
                        });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtrosPrazo.periodo === '15dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Próximos 15 dias
                    </button>
                    
                    <button
                      onClick={() => {
                        const periodo = calcularPeriodo('30dias');
                        setFiltrosPrazo({
                          periodo: '30dias',
                          data_inicio: periodo.dataInicio,
                          data_fim: periodo.dataFim
                        });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtrosPrazo.periodo === '30dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Próximos 30 dias
                    </button>
                    
                    <button
                      onClick={() => {
                        const periodo = calcularPeriodo('60dias');
                        setFiltrosPrazo({
                          periodo: '60dias',
                          data_inicio: periodo.dataInicio,
                          data_fim: periodo.dataFim
                        });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtrosPrazo.periodo === '60dias'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Próximos 60 dias
                    </button>
                    
                    <button
                      onClick={() => setFiltrosPrazo(prev => ({ 
                        ...prev, 
                        periodo: 'personalizado'
                      }))}
                      className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                        filtrosPrazo.periodo === 'personalizado'
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
          {/* ✅ NOVO: Sidebar de navegação - Desktop apenas */}
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
            {/* ✅ MOBILE: Cabeçalho da seção */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-black">Controle de Indicadores Geral</h2>
              </div>
              
              <p className="text-gray-600 text-sm mb-6">{gerarTextoDescritivo()}</p>
            </div>

            {/* ✅ DESKTOP: Cabeçalho da seção */}
            <div className="hidden lg:block">
              <div className="mb-6">
                <h1 className="text-2xl lg:text-3xl font-bold text-black">Controle de Indicadores Geral</h1>
                <p className="text-gray-600 text-sm mt-1">
                  {gerarTextoDescritivo()}
                  {hasFiltrosAtivos() && (
                    <span className="ml-2 text-blue-600 font-medium">• Filtros aplicados</span>
                  )}
                </p>
              </div>
            </div>

            {/* Sistema de Abas */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="border-b border-gray-200">
                {/* ✅ MOBILE: Navegação por abas horizontal com scroll - NOVA ABA PENDENTES */}
                <div className="lg:hidden">
                  <div className="overflow-x-auto">
                    <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
                      {/* Aba: Todos */}
                      <button
                        onClick={() => handleAbaChange('todos')}
                        className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                          abaAtiva === 'todos'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Todos
                        {abaAtiva === 'todos' && (
                          <span className="ml-1 bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full text-xs">
                            ✓
                          </span>
                        )}
                      </button>

                      {/* Aba: Realizado */}
                      <button
                        onClick={() => handleAbaChange('realizado')}
                        className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                          abaAtiva === 'realizado'
                            ? 'border-green-500 text-green-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Realizado
                        {abaAtiva === 'realizado' && (
                          <span className="ml-1 bg-green-100 text-green-600 px-1 py-0.5 rounded-full text-xs">
                            ✓
                          </span>
                        )}
                      </button>

                      {/* Aba: Meta */}
                      <button
                        onClick={() => handleAbaChange('meta')}
                        className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                          abaAtiva === 'meta'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Meta
                        {abaAtiva === 'meta' && (
                          <span className="ml-1 bg-orange-100 text-orange-600 px-1 py-0.5 rounded-full text-xs">
                            ✓
                          </span>
                        )}
                      </button>

                      {/* ✅ NOVA ABA: Pendentes */}
                      <button
                        onClick={() => handleAbaChange('pendentes')}
                        className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                          abaAtiva === 'pendentes'
                            ? 'border-red-500 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        Pendentes
                        {abaAtiva === 'pendentes' && (
                          <span className="ml-1 bg-red-100 text-red-600 px-1 py-0.5 rounded-full text-xs">
                            ✓
                          </span>
                        )}
                      </button>
                    </nav>
                  </div>
                </div>

                {/* ✅ DESKTOP: Navegação por abas normal - NOVA ABA PENDENTES */}
                <div className="hidden lg:block">
                  <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                    {/* Aba: Todos */}
                    <button
                      onClick={() => handleAbaChange('todos')}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        abaAtiva === 'todos'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Todos os Indicadores
                      {abaAtiva === 'todos' && (
                        <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                          Ativo
                        </span>
                      )}
                    </button>

                    {/* Aba: Realizado */}
                    <button
                      onClick={() => handleAbaChange('realizado')}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        abaAtiva === 'realizado'
                          ? 'border-green-500 text-green-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Realizado
                      {abaAtiva === 'realizado' && (
                        <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                          Ativo
                        </span>
                      )}
                    </button>

                    {/* Aba: Meta */}
                    <button
                      onClick={() => handleAbaChange('meta')}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        abaAtiva === 'meta'
                          ? 'border-orange-500 text-orange-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Meta
                      {abaAtiva === 'meta' && (
                        <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                          Ativo
                        </span>
                      )}
                    </button>

                    {/* ✅ NOVA ABA: Pendentes */}
                    <button
                      onClick={() => handleAbaChange('pendentes')}
                      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                        abaAtiva === 'pendentes'
                          ? 'border-red-500 text-red-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Pendentes
                      {abaAtiva === 'pendentes' && (
                        <span className="ml-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                          Ativo
                        </span>
                      )}
                    </button>
                  </nav>
                </div>
              </div>

              {/* Conteúdo da Aba Ativa */}
              <div className="p-4 lg:p-6">
                {/* ✅ MOBILE: Cabeçalho de aba compacto - NOVA ABA PENDENTES */}
                <div className="lg:hidden mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {getTituloAba()}
                  </h2>
                  <div className="flex items-center">
                    {abaAtiva === 'todos' && (
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    )}
                    {abaAtiva === 'realizado' && (
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    )}
                    {abaAtiva === 'meta' && (
                      <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                    )}
                    {abaAtiva === 'pendentes' && (
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                    )}
                    <span className="text-sm text-gray-600">
                      {abaAtiva === 'todos' && 'Todos os tipos'}
                      {abaAtiva === 'realizado' && 'Tipo "Realizado"'}
                      {abaAtiva === 'meta' && 'Tipo "Meta"'}
                      {abaAtiva === 'pendentes' && 'Sem valor apresentado'}
                    </span>
                  </div>
                </div>

                {/* ✅ DESKTOP: Cabeçalho de aba completo - NOVA ABA PENDENTES */}
                <div className="hidden lg:block mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {getTituloAba()}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      {abaAtiva === 'todos' && (
                        <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      )}
                      {abaAtiva === 'realizado' && (
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      )}
                      {abaAtiva === 'meta' && (
                        <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                      )}
                      {abaAtiva === 'pendentes' && (
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      )}
                      <span className="text-sm text-gray-600">
                        {abaAtiva === 'todos' && 'Mostrando todos os tipos de indicadores'}
                        {abaAtiva === 'realizado' && 'Filtrando apenas indicadores do tipo "Realizado"'}
                        {abaAtiva === 'meta' && 'Filtrando apenas indicadores do tipo "Meta"'}
                        {abaAtiva === 'pendentes' && 'Mostrando apenas indicadores sem valor apresentado (independente da data)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ✅ COMPONENTE DA TABELA: Passando searchTerm como filtro */}
                <CopiaControleIndicadorGeralTable 
                  user={user} 
                  filtroTipoIndicador={abaAtiva}
                  filtroValorPendente={abaAtiva === 'pendentes' ? true : filtroValorPendente} // ✅ FORÇAR true para aba Pendentes
                  setFiltroValorPendente={setFiltroValorPendente}
                  filtrosPrazo={abaAtiva === 'pendentes' ? null : filtrosPrazo} // ✅ IGNORAR filtros de prazo para aba Pendentes
                  setFiltrosPrazo={setFiltrosPrazo}
                  searchTerm={searchTerm} // ✅ NOVO: Passar termo de busca
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NOVO: Barra de navegação inferior - Mobile apenas */}
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