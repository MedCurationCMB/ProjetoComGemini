// src/pages/historico-acessos.js
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { isUserAdmin } from '../utils/userUtils';
import { toast } from 'react-hot-toast';
import { FiChevronLeft, FiHome, FiCalendar, FiArrowLeft, FiFilter, FiX, FiUser, FiClock, FiRefreshCw } from 'react-icons/fi';

export default function HistoricoAcessos({ user }) {
  const router = useRouter();
  const [acessos, setAcessos] = useState([]);
  const [acessosOriginais, setAcessosOriginais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  
  // Estados para filtro de período
  const [showFiltroPeriodo, setShowFiltroPeriodo] = useState(false);
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos'); // 'todos', '7dias', '30dias', '90dias', 'especifico'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  // Estados para filtro de usuário
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Verificar se o usuário é administrador
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

  // Buscar dados do histórico de acessos
  useEffect(() => {
    const fetchHistoricoAcessos = async () => {
      if (!isAdmin) return;
      
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

        // Extrair lista única de usuários para filtro
        const usuariosUnicos = [...new Set(dadosAcessos.map(acesso => acesso.nome_usuario))]
          .filter(nome => nome)
          .sort();
        setUsuarios(usuariosUnicos);
        
      } catch (error) {
        console.error('Erro ao buscar histórico de acessos:', error);
        toast.error('Erro ao carregar histórico de acessos');
        setAcessos([]);
        setAcessosOriginais([]);
      } finally {
        setLoading(false);
      }
    };

    if (user && isAdmin) {
      fetchHistoricoAcessos();
    }
  }, [user, isAdmin]);

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
      acesso.nome_usuario && 
      acesso.nome_usuario.toLowerCase().includes(filtroUsuario.toLowerCase())
    );
  };

  // Aplicar filtros quando mudarem os critérios
  useEffect(() => {
    if (acessosOriginais.length > 0) {
      let acessosFiltrados = filtrarPorPeriodo(acessosOriginais);
      acessosFiltrados = filtrarPorUsuario(acessosFiltrados);
      setAcessos(acessosFiltrados);
    }
  }, [filtroPeriodo, dataInicio, dataFim, filtroUsuario, acessosOriginais]);

  // Função para navegar de volta para a página inicial
  const voltarParaInicio = () => {
    router.push('/welcome');
  };

  // Função para navegar de volta (desktop)
  const voltarParaInicioDesktop = () => {
    router.push('/welcome');
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

  // Função para calcular estatísticas
  const calcularEstatisticas = () => {
    const totalAcessos = acessos.length;
    const usuariosUnicos = new Set(acessos.map(acesso => acesso.usuario_id)).size;
    
    // Acessos por dia (últimos 7 dias)
    const hoje = new Date();
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(hoje.getDate() - 7);
    
    const acessosUltimos7Dias = acessos.filter(acesso => {
      const dataLogin = new Date(acesso.data_login);
      return dataLogin >= seteDiasAtras;
    }).length;

    return {
      totalAcessos,
      usuariosUnicos,
      acessosUltimos7Dias
    };
  };

  const estatisticas = useMemo(() => calcularEstatisticas(), [acessos]);

  // Mostrar loading enquanto verifica permissões
  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Não renderizar nada se não for admin
  if (!user || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:bg-gray-50">
      <Head>
        <title>Histórico de Acessos - Administração</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* MOBILE: Layout */}
      <div className="lg:hidden pb-20">
        {/* Header fixo com título - Mobile */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-4 py-4 border-b">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center flex-1 min-w-0">
                <Link href="/welcome" className="mr-3 flex-shrink-0">
                  <FiChevronLeft className="w-6 h-6 text-blue-600" />
                </Link>
                
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  Histórico de Acessos
                </h1>
              </div>
              
              {/* Botão de filtro */}
              <button
                onClick={() => setShowFiltroPeriodo(!showFiltroPeriodo)}
                className={`p-3 rounded-lg transition-colors ${
                  showFiltroPeriodo || filtroPeriodo !== 'todos' || filtroUsuario
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>
            
            {/* Filtros - Mobile */}
            {showFiltroPeriodo && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-4">
                {/* Filtro de período */}
                <div>
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

                {/* Filtro de usuário */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Filtrar por Usuário
                  </label>
                  <input
                    type="text"
                    placeholder="Digite o nome do usuário..."
                    value={filtroUsuario}
                    onChange={(e) => setFiltroUsuario(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo da página - Mobile */}
        <div className="max-w-md mx-auto px-4 py-4">
          {/* Estatísticas - Mobile */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Estatísticas</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-blue-600">
                <p className="text-xs font-medium text-gray-600 mb-1">Total de Acessos</p>
                <p className="text-lg font-bold text-gray-900">{estatisticas.totalAcessos}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-green-600">
                <p className="text-xs font-medium text-gray-600 mb-1">Usuários Únicos</p>
                <p className="text-lg font-bold text-gray-900">{estatisticas.usuariosUnicos}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-purple-600">
                <p className="text-xs font-medium text-gray-600 mb-1">Acessos (Últimos 7 dias)</p>
                <p className="text-lg font-bold text-gray-900">{estatisticas.acessosUltimos7Dias}</p>
              </div>
            </div>
          </div>

          {/* Tabela - Mobile */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden border">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Usuário
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                      Email
                    </th>
                    <th className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data/Hora do Login
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {acessos.map((acesso, index) => (
                    <tr key={acesso.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b border-gray-200`}>
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 border-r border-gray-200">
                        {acesso.nome_usuario || 'N/A'}
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-600 border-r border-gray-200">
                        {acesso.email_usuario || 'N/A'}
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-900">
                        {formatDateTime(acesso.data_login)}
                      </td>
                    </tr>
                  ))}
                  {acessos.length === 0 && (
                    <tr>
                      <td colSpan="3" className="px-2 py-8 text-center text-sm text-gray-500">
                        Nenhum acesso encontrado
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
      </div>

      {/* DESKTOP: Layout */}
      <div className="hidden lg:block">
        {/* Header fixo - Desktop */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-8 py-6 border-b">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <button 
                  onClick={voltarParaInicioDesktop}
                  className="mr-4 flex-shrink-0 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiArrowLeft className="w-6 h-6 mr-2" />
                  <span className="text-sm font-medium">Voltar</span>
                </button>
                
                <h1 className="text-2xl font-bold text-gray-900">
                  Histórico de Acessos
                </h1>
              </div>
              
              {/* Botão de filtro */}
              <button
                onClick={() => setShowFiltroPeriodo(!showFiltroPeriodo)}
                className={`p-3 rounded-lg transition-colors ${
                  showFiltroPeriodo || filtroPeriodo !== 'todos' || filtroUsuario
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-5 h-5" />
              </button>
            </div>

            {/* Filtros - Desktop */}
            {showFiltroPeriodo && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Filtro de período */}
                  <div>
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

                  {/* Filtro de usuário */}
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-3">
                      Filtrar por Usuário
                    </label>
                    <input
                      type="text"
                      placeholder="Digite o nome do usuário..."
                      value={filtroUsuario}
                      onChange={(e) => setFiltroUsuario(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo da página - Desktop */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Estatísticas - Desktop */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-700 mb-6">Estatísticas</h3>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-600">
                <div className="flex items-center">
                  <FiRefreshCw className="w-8 h-8 text-blue-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total de Acessos</p>
                    <p className="text-3xl font-bold text-gray-900">{estatisticas.totalAcessos}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-600">
                <div className="flex items-center">
                  <FiUser className="w-8 h-8 text-green-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Usuários Únicos</p>
                    <p className="text-3xl font-bold text-gray-900">{estatisticas.usuariosUnicos}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-600">
                <div className="flex items-center">
                  <FiClock className="w-8 h-8 text-purple-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Acessos (Últimos 7 dias)</p>
                    <p className="text-3xl font-bold text-gray-900">{estatisticas.acessosUltimos7Dias}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela - Desktop */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-700">
                Registros de Acesso ({acessos.length} {acessos.length === 1 ? 'registro' : 'registros'})
              </h3>
            </div>
            
            <div className="overflow-x-auto">
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
                  {acessos.map((acesso, index) => (
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
                              ID: {acesso.usuario_id}
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
                          {acesso.data_login ? new Date(acesso.data_login).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatDateTime(acesso.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {acessos.length === 0 && (
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
            
            {/* Rodapé da tabela com informações */}
            {acessos.length > 0 && (
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div>
                    Exibindo {acessos.length} de {acessosOriginais.length} {acessosOriginais.length === 1 ? 'registro' : 'registros'}
                  </div>
                  {(filtroPeriodo !== 'todos' || filtroUsuario) && (
                    <div className="flex items-center space-x-2">
                      <span>Filtros ativos:</span>
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
                      <button
                        onClick={() => {
                          setFiltroPeriodo('todos');
                          setFiltroUsuario('');
                          setDataInicio('');
                          setDataFim('');
                        }}
                        className="inline-flex items-center text-xs text-red-600 hover:text-red-800"
                      >
                        <FiX className="h-3 w-3 mr-1" />
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}