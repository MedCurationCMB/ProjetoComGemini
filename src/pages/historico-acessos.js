// src/pages/historico-acessos.js
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { supabase } from "../utils/supabaseClient";
import { isUserAdmin } from "../utils/userUtils";
import LogoDisplay from "../components/LogoDisplay";
import { 
  FiMenu,
  FiUser,
  FiHome,
  FiSettings,
  FiLogOut,
  FiArrowLeft,
  FiCpu,
  FiFilter,
  FiRefreshCw,
  FiClock,
  FiX,
  FiCalendar,
  FiDownload
} from "react-icons/fi";

export default function HistoricoAcessos({ user }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  
  // Estados para administrador
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  // Estados para dados
  const [acessos, setAcessos] = useState([]);
  const [acessosOriginais, setAcessosOriginais] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para filtros
  const [showFiltros, setShowFiltros] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos'); // 'todos', '7dias', '30dias', '90dias', 'especifico'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');

  // Estados para estatísticas
  const [estatisticas, setEstatisticas] = useState({
    totalAcessos: 0,
    usuariosUnicos: 0,
    acessosUltimos7Dias: 0,
    acessosHoje: 0
  });

  // Função para voltar para a página de indicadores
  const handleVoltarClick = () => {
    router.push('/welcome');
  };

  const handleInicioClick = () => {
    router.push('/welcome');
  };

  const handleAnalisesIndicadoresClick = () => {
    router.push('/analise-multiplos-indicadores');
  };

  const handleAdminClick = () => {
    router.push('/admin');
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

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  // Verificar se é admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setCheckingAdmin(true);
        const adminStatus = await isUserAdmin(user.id);
        setIsAdmin(adminStatus);
        
        if (!adminStatus) {
          router.replace("/welcome");
          toast.error("Você não tem permissão para acessar esta página");
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar status de admin:', error);
        router.replace("/welcome");
        toast.error("Erro ao verificar permissões");
        return;
      } finally {
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, router]);

  // Carregar dados quando o componente monta
  useEffect(() => {
    if (user && isAdmin) {
      fetchHistoricoAcessos();
    }
  }, [user, isAdmin]);

  // Aplicar filtros quando mudarem os critérios
  useEffect(() => {
    if (acessosOriginais.length > 0) {
      let acessosFiltrados = filtrarPorPeriodo(acessosOriginais);
      acessosFiltrados = filtrarPorUsuario(acessosFiltrados);
      setAcessos(acessosFiltrados);
      calcularEstatisticas(acessosFiltrados);
    }
  }, [filtroPeriodo, dataInicio, dataFim, filtroUsuario, acessosOriginais]);

  // Função para buscar histórico de acessos
  const fetchHistoricoAcessos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('historico_logins')
        .select('*')
        .order('data_login', { ascending: false });
      
      if (error) throw error;
      
      const dadosAcessos = data || [];
      
      // Armazenar dados originais
      setAcessosOriginais(dadosAcessos);
      setAcessos(dadosAcessos);
      calcularEstatisticas(dadosAcessos);
      
    } catch (error) {
      console.error('Erro ao buscar histórico de acessos:', error);
      toast.error('Erro ao carregar histórico de acessos');
      setAcessos([]);
      setAcessosOriginais([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular estatísticas
  const calcularEstatisticas = (dadosAcessos) => {
    const totalAcessos = dadosAcessos.length;
    const usuariosUnicos = new Set(dadosAcessos.map(acesso => acesso.usuario_id)).size;
    
    // Acessos últimos 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
    
    const acessosUltimos7Dias = dadosAcessos.filter(acesso => {
      const dataLogin = new Date(acesso.data_login);
      return dataLogin >= seteDiasAtras;
    }).length;

    // Acessos hoje
    const hoje = new Date();
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1);
    
    const acessosHoje = dadosAcessos.filter(acesso => {
      const dataLogin = new Date(acesso.data_login);
      return dataLogin >= inicioHoje && dataLogin < fimHoje;
    }).length;

    setEstatisticas({
      totalAcessos,
      usuariosUnicos,
      acessosUltimos7Dias,
      acessosHoje
    });
  };

  // Função para filtrar por período
  const filtrarPorPeriodo = (acessosOriginais) => {
    if (filtroPeriodo === 'todos') {
      return acessosOriginais;
    }

    const parseDate = (dateString) => {
      if (!dateString) return null;
      
      let date;
      
      if (dateString instanceof Date) {
        date = new Date(dateString);
      } else if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else {
        date = new Date(dateString);
      }
      
      if (isNaN(date.getTime())) {
        console.warn('Data inválida:', dateString);
        return null;
      }
      
      return date;
    };

    const isWithinRange = (date, startDate, endDate) => {
      if (!date || !startDate || !endDate) return false;
      
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      
      return d >= start && d <= end;
    };

    const hoje = new Date();
    let dataLimite;

    switch (filtroPeriodo) {
      case '7dias':
        dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 7);
        break;
        
      case '30dias':
        dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 30);
        break;
        
      case '90dias':
        dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - 90);
        break;
        
      case 'especifico':
        if (dataInicio && dataFim) {
          const inicio = parseDate(dataInicio);
          const fim = parseDate(dataFim);
          
          if (!inicio || !fim) {
            return acessosOriginais;
          }
          
          return acessosOriginais.filter(acesso => {
            const dataLogin = parseDate(acesso.data_login);
            if (!dataLogin) return false;
            
            return isWithinRange(dataLogin, inicio, fim);
          });
        }
        return acessosOriginais;
        
      default:
        return acessosOriginais;
    }

    return acessosOriginais.filter(acesso => {
      const dataLogin = parseDate(acesso.data_login);
      if (!dataLogin) return false;
      
      return isWithinRange(dataLogin, dataLimite, hoje);
    });
  };

  // Função para filtrar por usuário
  const filtrarPorUsuario = (acessos) => {
    if (!filtroUsuario) return acessos;
    
    return acessos.filter(acesso => 
      (acesso.nome_usuario && acesso.nome_usuario.toLowerCase().includes(filtroUsuario.toLowerCase())) ||
      (acesso.email_usuario && acesso.email_usuario.toLowerCase().includes(filtroUsuario.toLowerCase()))
    );
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltroPeriodo('todos');
    setFiltroUsuario('');
    setDataInicio('');
    setDataFim('');
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

  // Função para formatar data e hora
  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  // Função para formatar hora
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  // Função para exportar dados (placeholder)
  const exportarDados = () => {
    toast.success('Funcionalidade de exportação será implementada em breve');
  };

  // Mostrar loading enquanto verifica permissões
  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Não renderizar nada se não for admin
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Histórico de Acessos - Administração</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              {/* Botão Voltar + Logo */}
              <div className="flex items-center">
                <button
                  onClick={handleVoltarClick}
                  className="mr-3 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Voltar"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <LogoDisplay 
                  className=""
                  fallbackText="Histórico de Acessos"
                  showFallback={true}
                />
              </div>
              
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
                        handleAdminClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiSettings className="mr-3 h-4 w-4" />
                      Administração
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

          {/* Desktop */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              {/* Botão Voltar + Logo */}
              <div className="flex items-center">
                <button
                  onClick={handleVoltarClick}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Voltar para Início"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <LogoDisplay 
                  className=""
                  fallbackText="Histórico de Acessos"
                  showFallback={true}
                />
              </div>
              
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
                        handleAdminClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiSettings className="mr-3 h-4 w-4" />
                      Administração
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
        </div>
      </div>

      {/* Layout principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cabeçalho da seção */}
        <div className="mb-6">
          <div className="lg:hidden">
            <h2 className="text-2xl font-bold text-black mb-2">Histórico de Acessos</h2>
            <p className="text-gray-600 text-sm">
              Monitoramento e auditoria de acessos ao sistema
            </p>
          </div>
          
          <div className="hidden lg:block">
            <h1 className="text-2xl lg:text-3xl font-bold text-black">Histórico de Acessos</h1>
            <p className="text-gray-600 text-sm mt-1">
              Monitoramento e auditoria de acessos ao sistema para administradores
            </p>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFiltros(!showFiltros)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showFiltros || filtroPeriodo !== 'todos' || filtroUsuario
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FiFilter className="mr-2 h-4 w-4" />
              Filtros
              {(filtroPeriodo !== 'todos' || filtroUsuario) && (
                <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded-full text-xs">
                  Ativo
                </span>
              )}
            </button>
            
            <button
              onClick={fetchHistoricoAcessos}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          
          <button
            onClick={exportarDados}
            className="flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <FiDownload className="mr-2 h-4 w-4" />
            Exportar
          </button>
        </div>

        {/* Painel de filtros */}
        {showFiltros && (
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Filtro de período */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Filtrar por Período
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                  <button
                    onClick={() => setFiltroPeriodo('todos')}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      filtroPeriodo === 'todos'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('7dias')}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      filtroPeriodo === '7dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    7 dias
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('30dias')}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      filtroPeriodo === '30dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    30 dias
                  </button>

                  <button
                    onClick={() => setFiltroPeriodo('90dias')}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      filtroPeriodo === '90dias'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    90 dias
                  </button>
                  
                  <button
                    onClick={() => setFiltroPeriodo('especifico')}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      filtroPeriodo === 'especifico'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Específico
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

              {/* Filtro de usuário */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Filtrar por Usuário
                </label>
                <input
                  type="text"
                  placeholder="Digite o nome ou email do usuário..."
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {(filtroPeriodo !== 'todos' || filtroUsuario) && (
                  <button
                    onClick={limparFiltros}
                    className="mt-3 inline-flex items-center text-sm text-red-600 hover:text-red-800"
                  >
                    <FiX className="h-4 w-4 mr-1" />
                    Limpar filtros
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-600">
            <div className="flex items-center">
              <FiRefreshCw className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1">Total</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{estatisticas.totalAcessos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-600">
            <div className="flex items-center">
              <FiUser className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1">Usuários</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{estatisticas.usuariosUnicos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-600">
            <div className="flex items-center">
              <FiClock className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1">7 dias</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{estatisticas.acessosUltimos7Dias}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-600">
            <div className="flex items-center">
              <FiCalendar className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-xs lg:text-sm font-medium text-gray-600 mb-1">Hoje</p>
                <p className="text-lg lg:text-2xl font-bold text-gray-900">{estatisticas.acessosHoje}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela de acessos */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
            <h2 className="text-lg lg:text-xl font-bold">Registros de Acesso</h2>
            
            <div className="flex items-center text-sm text-gray-500">
              Exibindo {acessos.length} de {acessosOriginais.length} {acessosOriginais.length === 1 ? 'registro' : 'registros'}
            </div>
          </div>

          {/* Indicadores de filtros ativos */}
          {(filtroPeriodo !== 'todos' || filtroUsuario) && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600">Filtros ativos:</span>
              
              {filtroPeriodo !== 'todos' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {filtroPeriodo === 'especifico' ? 'Período específico' : 
                   filtroPeriodo === '7dias' ? 'Últimos 7 dias' :
                   filtroPeriodo === '30dias' ? 'Últimos 30 dias' :
                   filtroPeriodo === '90dias' ? 'Últimos 90 dias' : filtroPeriodo}
                </span>
              )}
              
              {filtroUsuario && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Usuário: {filtroUsuario}
                </span>
              )}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                {/* Tabela Mobile */}
                <div className="lg:hidden">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data/Hora
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {acessos.length > 0 ? (
                        acessos.map((acesso, index) => (
                          <tr key={acesso.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <FiUser className="h-4 w-4 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {acesso.nome_usuario || 'Nome não disponível'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {acesso.email_usuario || 'Email não disponível'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="text-sm text-gray-900">
                                {formatDate(acesso.data_login)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatTime(acesso.data_login)}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="px-3 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <FiClock className="h-12 w-12 text-gray-400 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhum acesso encontrado
                              </h3>
                              <p className="text-sm text-gray-500">
                                {filtroPeriodo !== 'todos' || filtroUsuario 
                                  ? 'Tente ajustar os filtros para ver mais resultados.'
                                  : 'Ainda não há registros de acesso no sistema.'
                                }
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Tabela Desktop */}
                <div className="hidden lg:block">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data do Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hora do Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registro Criado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {acessos.length > 0 ? (
                        acessos.map((acesso, index) => (
                          <tr key={acesso.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <FiUser className="h-5 w-5 text-blue-600" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {acesso.nome_usuario || 'Nome não disponível'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    ID: {acesso.usuario_id ? acesso.usuario_id.substring(0, 8) + '...' : 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {acesso.email_usuario || 'Email não disponível'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {formatDate(acesso.data_login)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {formatTime(acesso.data_login)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDateTime(acesso.created_at)}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <FiClock className="h-12 w-12 text-gray-400 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhum acesso encontrado
                              </h3>
                              <p className="text-sm text-gray-500">
                                {filtroPeriodo !== 'todos' || filtroUsuario 
                                  ? 'Tente ajustar os filtros para ver mais resultados.'
                                  : 'Ainda não há registros de acesso no sistema.'
                                }
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Informações adicionais */}
        {acessos.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Informações</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Primeiro acesso:</span>
                <div className="mt-1">
                  {formatDateTime(acessosOriginais[acessosOriginais.length - 1]?.data_login)}
                </div>
              </div>
              <div>
                <span className="font-medium">Último acesso:</span>
                <div className="mt-1">
                  {formatDateTime(acessosOriginais[0]?.data_login)}
                </div>
              </div>
              <div>
                <span className="font-medium">Período analisado:</span>
                <div className="mt-1">
                  {filtroPeriodo === 'todos' ? 'Todos os registros' :
                   filtroPeriodo === '7dias' ? 'Últimos 7 dias' :
                   filtroPeriodo === '30dias' ? 'Últimos 30 dias' :
                   filtroPeriodo === '90dias' ? 'Últimos 90 dias' :
                   filtroPeriodo === 'especifico' && dataInicio && dataFim 
                     ? `${formatDate(dataInicio)} até ${formatDate(dataFim)}`
                     : 'Período específico'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
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