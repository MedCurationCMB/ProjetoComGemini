// Arquivo: src/pages/visualizacao-atividades.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiPlus,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiMenu, 
  FiHome, 
  FiStar, 
  FiClock, 
  FiClipboard,
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiCheck,
  FiFolder,
  FiEdit3,
  FiCpu,
  FiList,
  FiTrendingUp,
  FiRepeat,
  FiCheckCircle,
  FiMoreVertical,
  FiTrash2,
  FiEdit
} from 'react-icons/fi';

export default function VisualizacaoAtividades({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  
  // Estados para projetos
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  
  // Estados para data
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Estados para atividades
  const [novaAtividade, setNovaAtividade] = useState('');
  const [atividadesRotina, setAtividadesRotina] = useState([]);
  const [atividadesDia, setAtividadesDia] = useState([]);
  const [statusRotina, setStatusRotina] = useState({});
  
  // Estados de loading
  const [adicionandoAtividade, setAdicionandoAtividade] = useState(false);
  const [loadingAtividades, setLoadingAtividades] = useState(false);

  // Estados para menus de ações e edição
  const [menuAberto, setMenuAberto] = useState(null);
  const [editandoAtividade, setEditandoAtividade] = useState(null);
  const [textoEdicao, setTextoEdicao] = useState('');

  // ===========================================
  // FUNÇÕES UTILITÁRIAS
  // ===========================================

  const formatarData = (data) => {
    return data.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatarDiaSemana = (data) => {
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long'
    });
  };

  const formatarDataISO = (data) => {
    return data.toISOString().split('T')[0];
  };

  const isDataHoje = (data) => {
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString();
  };

  const diasDaSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

  const getDiaSemanaNumero = (data) => {
    // Convertendo: domingo = 7, segunda = 1, terça = 2, etc.
    const dia = data.getDay();
    return dia === 0 ? 7 : dia;
  };

  // ===========================================
  // FUNÇÕES DE CARREGAMENTO DE DADOS
  // ===========================================

  const fetchProjetosVinculados = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', userId);
      
      if (error) throw error;
      
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      if (projetoIds.length > 0) {
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('id, nome')
          .in('id', projetoIds)
          .order('nome');
        
        if (projetosError) throw projetosError;
        
        const projetosObj = {};
        projetosData.forEach(proj => {
          projetosObj[proj.id] = proj.nome;
        });
        
        setProjetos(projetosObj);
        
        // Selecionar primeiro projeto por padrão
        if (!projetoSelecionado && projetosData.length > 0) {
          setProjetoSelecionado(projetosData[0].id);
        }
      }
      
      return projetoIds;
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      return [];
    }
  };

  const fetchAtividadesRotina = async () => {
    if (!projetoSelecionado) return;
    
    try {
      const dataAtual = formatarDataISO(dataSelecionada);
      const diaSemana = getDiaSemanaNumero(dataSelecionada);
      
      // Buscar rotinas que devem aparecer na data selecionada
      const { data, error } = await supabase
        .from('routine_tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('projeto_id', projetoSelecionado)
        .lte('start_date', dataAtual)
        .or(`end_date.is.null,end_date.gte.${dataAtual}`);
      
      if (error) throw error;
      
      // Filtrar rotinas que devem aparecer hoje
      const rotinasValidas = data.filter(rotina => {
        if (rotina.recurrence_type === 'daily') {
          // Calcular se é um dia válido baseado no intervalo
          const startDate = new Date(rotina.start_date);
          const diffTime = dataSelecionada.getTime() - startDate.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays % rotina.recurrence_interval === 0;
        } else if (rotina.recurrence_type === 'weekly') {
          return rotina.recurrence_days && rotina.recurrence_days.includes(diaSemana);
        } else if (rotina.recurrence_type === 'monthly') {
          // Simplificado: mesmo dia do mês
          const startDate = new Date(rotina.start_date);
          return startDate.getDate() === dataSelecionada.getDate();
        }
        return false;
      });
      
      setAtividadesRotina(rotinasValidas);
      
      // Buscar status das rotinas para a data selecionada
      if (rotinasValidas.length > 0) {
        const rotinaIds = rotinasValidas.map(r => r.id);
        const { data: statusData, error: statusError } = await supabase
          .from('routine_tasks_status')
          .select('*')
          .in('routine_tasks_id', rotinaIds)
          .eq('date', dataAtual);
        
        if (statusError) throw statusError;
        
        const statusObj = {};
        statusData.forEach(status => {
          statusObj[status.routine_tasks_id] = status;
        });
        setStatusRotina(statusObj);
      }
      
    } catch (error) {
      console.error('Erro ao carregar atividades de rotina:', error);
      toast.error('Erro ao carregar atividades de rotina');
    }
  };

  const fetchAtividadesDia = async () => {
    if (!projetoSelecionado) return;
    
    try {
      const dataAtual = formatarDataISO(dataSelecionada);
      
      // Buscar atividades do dia atual
      const { data: atividadesHoje, error: erroHoje } = await supabase
        .from('tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('projeto_id', projetoSelecionado)
        .eq('date', dataAtual)
        .order('created_at', { ascending: false });
      
      if (erroHoje) throw erroHoje;
      
      // Buscar atividades pendentes de dias anteriores
      const { data: atividadesPendentes, error: erroPendentes } = await supabase
        .from('tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('projeto_id', projetoSelecionado)
        .eq('completed', false)
        .lt('date', dataAtual)
        .order('date', { ascending: false });
      
      if (erroPendentes) throw erroPendentes;
      
      // Combinar atividades
      const todasAtividades = [
        ...(atividadesHoje || []),
        ...(atividadesPendentes || [])
      ];
      
      setAtividadesDia(todasAtividades);
      
    } catch (error) {
      console.error('Erro ao carregar atividades do dia:', error);
      toast.error('Erro ao carregar atividades');
    }
  };

  // ===========================================
  // FUNÇÕES DE AÇÕES
  // ===========================================

  const adicionarAtividade = async () => {
    if (!novaAtividade.trim() || !projetoSelecionado) {
      toast.error('Digite uma atividade e selecione um projeto');
      return;
    }
    
    try {
      setAdicionandoAtividade(true);
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          usuario_id: user.id,
          projeto_id: projetoSelecionado,
          content: novaAtividade.trim(),
          date: formatarDataISO(dataSelecionada),
          completed: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setNovaAtividade('');
      toast.success('Atividade adicionada com sucesso!');
      
      // Recarregar atividades
      await fetchAtividadesDia();
      
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      toast.error('Erro ao adicionar atividade');
    } finally {
      setAdicionandoAtividade(false);
    }
  };

  const toggleAtividadeCompleta = async (taskId, completed) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success(!completed ? 'Atividade concluída!' : 'Atividade marcada como pendente');
      
      // Recarregar atividades
      await fetchAtividadesDia();
      
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      toast.error('Erro ao atualizar atividade');
    }
  };

  const iniciarEdicaoAtividade = (atividade) => {
    setEditandoAtividade(atividade.id);
    setTextoEdicao(atividade.content);
    setMenuAberto(null);
  };

  const cancelarEdicao = () => {
    setEditandoAtividade(null);
    setTextoEdicao('');
  };

  const salvarEdicaoAtividade = async (taskId) => {
    if (!textoEdicao.trim()) {
      toast.error('O texto da atividade não pode estar vazio');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ content: textoEdicao.trim() })
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success('Atividade atualizada com sucesso!');
      
      // Limpar estados de edição e recarregar atividades
      setEditandoAtividade(null);
      setTextoEdicao('');
      await fetchAtividadesDia();
      
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      toast.error('Erro ao atualizar atividade');
    }
  };

  const excluirAtividade = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success('Atividade excluída com sucesso!');
      
      // Fechar menu e recarregar atividades
      setMenuAberto(null);
      await fetchAtividadesDia();
      
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      toast.error('Erro ao excluir atividade');
    }
  };

  const toggleRotinaCompleta = async (rotinaId, completed) => {
    try {
      const dataAtual = formatarDataISO(dataSelecionada);
      
      if (!completed) {
        // Marcar como completa
        const { error } = await supabase
          .from('routine_tasks_status')
          .insert([{
            routine_tasks_id: rotinaId,
            date: dataAtual,
            completed: true
          }]);
        
        if (error) throw error;
        toast.success('Rotina concluída!');
      } else {
        // Marcar como incompleta
        const { error } = await supabase
          .from('routine_tasks_status')
          .update({ completed: false })
          .eq('routine_tasks_id', rotinaId)
          .eq('date', dataAtual);
        
        if (error) throw error;
        toast.success('Rotina marcada como pendente');
      }
      
      // Recarregar status das rotinas
      await fetchAtividadesRotina();
      
    } catch (error) {
      console.error('Erro ao atualizar rotina:', error);
      toast.error('Erro ao atualizar rotina');
    }
  };

  // ===========================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ===========================================

  const mudarData = (dias) => {
    const novaData = new Date(dataSelecionada);
    novaData.setDate(novaData.getDate() + dias);
    setDataSelecionada(novaData);
  };

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

  const handleInicioClick = () => {
    router.push('/inicio');
  };

  const handleConfiguracoesClick = () => {
    router.push('/configuracoes');
  };

  const handleHistoricoAcessos = () => {
    router.push('/historico-acessos');
  };

  const handleAnalisesIndicadoresClick = () => {
    router.push('/analise-multiplos-indicadores');
  };

  // ===========================================
  // EFFECTS
  // ===========================================

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    const carregarDados = async () => {
      if (user) {
        setLoading(true);
        await fetchProjetosVinculados(user.id);
        setLoading(false);
      }
    };
    
    carregarDados();
  }, [user]);

  useEffect(() => {
    const carregarAtividades = async () => {
      if (projetoSelecionado) {
        setLoadingAtividades(true);
        await Promise.all([
          fetchAtividadesRotina(),
          fetchAtividadesDia()
        ]);
        setLoadingAtividades(false);
      }
    };
    
    carregarAtividades();
  }, [projetoSelecionado, dataSelecionada]);

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickFora = (event) => {
      if (menuAberto && !event.target.closest('.menu-atividade')) {
        setMenuAberto(null);
      }
    };

    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, [menuAberto]);

  // ===========================================
  // RENDER
  // ===========================================

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Atividades</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile e Desktop */}
          <div className="flex items-center justify-between">
            <LogoDisplay 
              className=""
              fallbackText="Atividades"
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
                  
                  {/* ✅ Gestão de Rotinas */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push('/gestao-rotinas');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiRepeat className="mr-3 h-4 w-4" />
                    Gestão de Rotinas
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
      </div>

      {/* SEÇÃO FIXA MESCLADA: Seleção de projeto + Data */}
      <div className="sticky top-[72px] bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#012060]"></div>
            </div>
          ) : projetosVinculados.length === 0 ? (
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <FiFolder className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
              <p className="text-gray-500 text-sm">
                Entre em contato com o administrador para vincular você a projetos relevantes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Seleção de Projeto */}
              <div>
                <select
                  className="w-full px-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-sm"
                  value={projetoSelecionado}
                  onChange={(e) => setProjetoSelecionado(e.target.value)}
                >
                  <option value="">Selecione um projeto</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>

              {/* Navegação de Data */}
              {projetoSelecionado && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => mudarData(-1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <FiChevronLeft className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <FiCalendar className="w-6 h-6 text-[#012060]" />
                      </button>
                      
                      {showDatePicker && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border z-30 p-4">
                          <input
                            type="date"
                            value={formatarDataISO(dataSelecionada)}
                            onChange={(e) => {
                              setDataSelecionada(new Date(e.target.value + 'T12:00:00'));
                              setShowDatePicker(false);
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060]"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {formatarData(dataSelecionada)}
                      </h2>
                      <span className="text-sm text-[#012060] font-medium capitalize">
                        {formatarDiaSemana(dataSelecionada)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => mudarData(1)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <FiChevronRight className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL ROLÁVEL */}
      {projetoSelecionado && (
        <div className="flex-1 overflow-y-auto pt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
            {loadingAtividades ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#012060]"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Atividades do Dia */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center mb-4">
                    <FiCheckCircle className="w-5 h-5 text-[#012060] mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Atividades do Dia
                      {!isDataHoje(dataSelecionada) && (
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          ({formatarDataISO(dataSelecionada)})
                        </span>
                      )}
                    </h3>
                  </div>
                  
                  {atividadesDia.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                        <FiCheckCircle className="w-6 h-6 text-[#012060]" />
                      </div>
                      <p className="text-gray-500 text-sm">
                        {isDataHoje(dataSelecionada) 
                          ? 'Nenhuma atividade adicionada hoje'
                          : 'Nenhuma atividade para esta data'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {atividadesDia.map((atividade) => {
                        const isAtividadeHoje = atividade.date === formatarDataISO(dataSelecionada);
                        const dataAtividade = new Date(atividade.date + 'T12:00:00');
                        const isEditando = editandoAtividade === atividade.id;
                        
                        return (
                          <div
                            key={atividade.id}
                            className={`p-4 border rounded-lg transition-colors ${
                              atividade.completed 
                                ? 'bg-green-50 border-green-200' 
                                : isAtividadeHoje
                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                  : 'bg-yellow-50 border-yellow-200'
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <button
                                onClick={() => toggleAtividadeCompleta(atividade.id, atividade.completed)}
                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                                  atividade.completed
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-blue-100 text-[#012060] hover:bg-blue-200'
                                }`}
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                              
                              <div className="flex-1">
                                {isEditando ? (
                                  <div className="space-y-2">
                                    <input
                                      type="text"
                                      value={textoEdicao}
                                      onChange={(e) => setTextoEdicao(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          salvarEdicaoAtividade(atividade.id);
                                        } else if (e.key === 'Escape') {
                                          cancelarEdicao();
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-[#012060] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] text-sm"
                                      autoFocus
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => salvarEdicaoAtividade(atividade.id)}
                                        className="px-3 py-1 bg-[#012060] text-white rounded text-xs hover:bg-[#013080] transition-colors"
                                      >
                                        Salvar
                                      </button>
                                      <button
                                        onClick={cancelarEdicao}
                                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <h4 className={`font-medium ${
                                      atividade.completed 
                                        ? 'text-green-800 line-through' 
                                        : isAtividadeHoje 
                                          ? 'text-[#012060]'
                                          : 'text-yellow-800'
                                    }`}>
                                      {atividade.content}
                                    </h4>
                                    
                                    {!isAtividadeHoje && (
                                      <div className="flex items-center mt-1 text-xs">
                                        <FiClock className="w-3 h-3 mr-1 text-yellow-600" />
                                        <span className="text-yellow-600">
                                          Pendente desde {dataAtividade.toLocaleDateString('pt-BR')}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {atividade.completed && atividade.completed_at && (
                                      <div className="flex items-center mt-1 text-xs text-green-600">
                                        <FiCheckCircle className="w-3 h-3 mr-1" />
                                        <span>
                                          Concluída em {new Date(atividade.completed_at).toLocaleDateString('pt-BR')} às {new Date(atividade.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Menu de 3 pontos */}
                              <div className="relative menu-atividade">
                                <button
                                  onClick={() => setMenuAberto(menuAberto === atividade.id ? null : atividade.id)}
                                  className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                                >
                                  <FiMoreVertical className="w-4 h-4 text-gray-500" />
                                </button>
                                
                                {menuAberto === atividade.id && (
                                  <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border z-20 py-1 min-w-[120px]">
                                    <button
                                      onClick={() => iniciarEdicaoAtividade(atividade)}
                                      className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center text-[#012060] text-sm"
                                    >
                                      <FiEdit className="w-3 h-3 mr-2" />
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => excluirAtividade(atividade.id)}
                                      className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center text-red-600 text-sm"
                                    >
                                      <FiTrash2 className="w-3 h-3 mr-2" />
                                      Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Atividades de Rotina */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex items-center mb-4">
                    <FiRepeat className="w-5 h-5 text-[#012060] mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Atividades de Rotina</h3>
                  </div>
                  
                  {atividadesRotina.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                        <FiRepeat className="w-6 h-6 text-[#012060]" />
                      </div>
                      <p className="text-gray-500 text-sm">Não há atividades de rotina para hoje</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {atividadesRotina.map((rotina) => {
                        const status = statusRotina[rotina.id];
                        const isCompleted = status?.completed || false;
                        
                        return (
                          <div
                            key={rotina.id}
                            className={`p-4 border rounded-lg transition-colors ${
                              isCompleted 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-blue-50 border-blue-200 hover:bg-blue-100' // ✅ MUDOU: de purple para blue
                            }`}
                          >
                            <div className="flex items-start space-x-3">
                              <button
                                onClick={() => toggleRotinaCompleta(rotina.id, isCompleted)}
                                className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                                  isCompleted
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-blue-100 text-[#012060] hover:bg-blue-200' // ✅ MUDOU: de purple para blue
                                }`}
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                              
                              <div className="flex-1">
                                <h4 className={`font-medium ${
                                  isCompleted ? 'text-green-800 line-through' : 'text-[#012060]'
                                }`}>
                                  {rotina.content}
                                </h4>
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <FiRepeat className="w-3 h-3 mr-1" />
                                  <span>
                                    {rotina.recurrence_type === 'daily' && `Diária (a cada ${rotina.recurrence_interval} dia${rotina.recurrence_interval > 1 ? 's' : ''})`}
                                    {rotina.recurrence_type === 'weekly' && `Semanal (${rotina.recurrence_days?.map(d => diasDaSemana[d === 7 ? 0 : d]).join(', ')})`}
                                    {rotina.recurrence_type === 'monthly' && `Mensal (dia ${new Date(rotina.start_date).getDate()})`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEÇÃO FIXA 3: Adicionar nova atividade (parte inferior) */}
      {projetoSelecionado && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Adicionar Nova Atividade</h3>
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Digite a atividade..."
                value={novaAtividade}
                onChange={(e) => setNovaAtividade(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && adicionarAtividade()}
                className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-base"
              />
              <button
                onClick={adicionarAtividade}
                disabled={adicionandoAtividade || !novaAtividade.trim()}
                className="px-6 py-3 bg-[#012060] text-white rounded-full hover:bg-[#013080] focus:outline-none focus:ring-2 focus:ring-[#012060] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[60px] transition-colors"
              >
                {adicionandoAtividade ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <FiPlus className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menus quando clicar fora */}
      {(showMenu || showDatePicker) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-5"
          onClick={() => {
            setShowMenu(false);
            setShowDatePicker(false);
          }}
        />
      )}
    </div>
  );
}