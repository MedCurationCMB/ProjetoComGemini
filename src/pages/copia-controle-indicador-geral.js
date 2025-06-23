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
  FiFilter,
  FiX
} from 'react-icons/fi';

export default function CopiaControleIndicadorGeral({ user }) {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState('todos'); // 'todos', 'realizado', 'meta'
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filtroValorPendente, setFiltroValorPendente] = useState(false);
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

  // Função para obter o título da aba ativa
  const getTituloAba = () => {
    switch (abaAtiva) {
      case 'realizado':
        return 'Indicadores - Realizado';
      case 'meta':
        return 'Indicadores - Meta';
      default:
        return 'Todos os Indicadores';
    }
  };

  // Função para obter a descrição da aba ativa
  const getDescricaoAba = () => {
    switch (abaAtiva) {
      case 'realizado':
        return 'Visualizando apenas indicadores do tipo "Realizado"';
      case 'meta':
        return 'Visualizando apenas indicadores do tipo "Meta"';
      default:
        return 'Visualizando todos os tipos de indicadores';
    }
  };

  // Função para gerar texto descritivo baseado nos filtros
  const gerarTextoDescritivo = () => {
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

    return textoBase + textoPeriodo;
  };

  // Verificar se há filtros ativos
  const hasFiltrosAtivos = () => {
    return filtroValorPendente || 
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
    setShowFilters(false);
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Cópia - Controle de Indicadores Geral</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Header com logo e menu */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Controle de Indicadores"
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

          {/* Desktop: Header */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Controle de Indicadores"
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

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-black">Cópia - Controle de Indicadores Geral</h1>
            <p className="text-gray-600 text-sm mt-1">
              {gerarTextoDescritivo()}
              {hasFiltrosAtivos() && (
                <span className="ml-2 text-blue-600 font-medium">• Filtros aplicados</span>
              )}
            </p>
          </div>
          
          <div className="flex space-x-4">
            <Link 
              href="/controle-indicador-geral" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Versão Completa
            </Link>
            
            <Link 
              href="/welcome" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Voltar
            </Link>
          </div>
        </div>

        {/* Sistema de Abas */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {/* Aba: Todos */}
              <button
                onClick={() => setAbaAtiva('todos')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'todos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Todos os Indicadores
                {abaAtiva === 'todos' && (
                  <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>

              {/* Aba: Realizado */}
              <button
                onClick={() => setAbaAtiva('realizado')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'realizado'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ✅ Realizado
                {abaAtiva === 'realizado' && (
                  <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>

              {/* Aba: Meta */}
              <button
                onClick={() => setAbaAtiva('meta')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'meta'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 Meta
                {abaAtiva === 'meta' && (
                  <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div className="p-6">
            <div className="mb-4">
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
                  <span className="text-sm text-gray-600">
                    {abaAtiva === 'todos' && 'Mostrando todos os tipos de indicadores'}
                    {abaAtiva === 'realizado' && 'Filtrando apenas indicadores do tipo "Realizado"'}
                    {abaAtiva === 'meta' && 'Filtrando apenas indicadores do tipo "Meta"'}
                  </span>
                </div>
              </div>
            </div>

            {/* Componente da Tabela Simplificada com filtros */}
            <CopiaControleIndicadorGeralTable 
              user={user} 
              filtroTipoIndicador={abaAtiva}
              filtroValorPendente={filtroValorPendente}
              setFiltroValorPendente={setFiltroValorPendente}
              filtrosPrazo={filtrosPrazo}
              setFiltrosPrazo={setFiltrosPrazo}
            />
          </div>
        </div>
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