// Arquivo: src/pages/visualizacao-atividades.js
import { useState, useEffect, useRef } from 'react';
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
  FiChevronDown,
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
  FiEdit,
  FiCircle
} from 'react-icons/fi';
import { LuCalendarPlus } from "react-icons/lu";

export default function VisualizacaoAtividades({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  
  // ✅ SOLUÇÃO 2: useRef para controlar carregamentos desnecessários
  const dadosCarregadosRef = useRef(false);
  const userIdRef = useRef(null);
  const atividadesCarregadasRef = useRef(false);
  const ultimaListaRef = useRef(null);
  const ultimaDataRef = useRef(null);
  
  // ✅ Estados para listas (substituindo projetos)
  const [listas, setListas] = useState({});
  const [listasVinculadas, setListasVinculadas] = useState([]);
  const [listaSelecionada, setListaSelecionada] = useState('');
  
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

  // Estados para o popup de calendário
  const [showPopupCalendario, setShowPopupCalendario] = useState(false);
  const [atividadePopup, setAtividadePopup] = useState('');
  const [dataPopup, setDataPopup] = useState(new Date());
  const [adicionandoAtividadePopup, setAdicionandoAtividadePopup] = useState(false);

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
  // ✅ FUNÇÕES DE CARREGAMENTO DE DADOS (ATUALIZADAS PARA LISTAS)
  // ===========================================

  const fetchListasVinculadas = async (userId) => {
    try {
      console.log('🔄 Carregando listas vinculadas...');
      
      // ✅ Buscar listas vinculadas ao usuário
      const { data, error } = await supabase
        .from('relacao_usuario_list')
        .select('list_id')
        .eq('usuario_id', userId);
      
      if (error) throw error;
      
      const listIds = data.map(item => item.list_id);
      setListasVinculadas(listIds);
      
      if (listIds.length > 0) {
        // ✅ Buscar dados das listas
        const { data: listasData, error: listasError } = await supabase
          .from('tasks_list')
          .select('id, nome_lista')
          .in('id', listIds)
          .order('nome_lista');
        
        if (listasError) throw listasError;
        
        const listasObj = {};
        listasData.forEach(lista => {
          listasObj[lista.id] = lista.nome_lista;
        });
        
        setListas(listasObj);
        
        // Selecionar primeira lista por padrão
        if (!listaSelecionada && listasData.length > 0) {
          setListaSelecionada(listasData[0].id);
        }
      }
      
      console.log('✅ Listas carregadas com sucesso');
      return listIds;
    } catch (error) {
      console.error('Erro ao carregar listas vinculadas:', error);
      return [];
    }
  };

  const fetchAtividadesRotina = async () => {
    if (!listaSelecionada) return;
    
    try {
      const dataAtual = formatarDataISO(dataSelecionada);
      const diaSemana = getDiaSemanaNumero(dataSelecionada);
      
      // ✅ Buscar rotinas da lista selecionada
      const { data, error } = await supabase
        .from('routine_tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('task_list_id', listaSelecionada) // ✅ Mudança aqui
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
    if (!listaSelecionada) return;
    
    try {
      const dataAtual = formatarDataISO(dataSelecionada);
      
      // ✅ Buscar atividades do dia atual da lista selecionada
      const { data: atividadesHoje, error: erroHoje } = await supabase
        .from('tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('task_list_id', listaSelecionada) // ✅ Mudança aqui
        .eq('date', dataAtual)
        .order('created_at', { ascending: false });
      
      if (erroHoje) throw erroHoje;
      
      // ✅ Buscar atividades pendentes de dias anteriores da lista selecionada
      const { data: atividadesPendentes, error: erroPendentes } = await supabase
        .from('tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('task_list_id', listaSelecionada) // ✅ Mudança aqui
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
  // ✅ FUNÇÕES DE AÇÕES (ATUALIZADAS PARA LISTAS)
  // ===========================================

  const adicionarAtividade = async () => {
    if (!novaAtividade.trim() || !listaSelecionada) {
      toast.error('Digite uma atividade e selecione uma lista');
      return;
    }
    
    try {
      setAdicionandoAtividade(true);
      
      // ✅ Inserir com task_list_id
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          usuario_id: user.id,
          task_list_id: listaSelecionada, // ✅ Mudança aqui
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

  const adicionarAtividadeComData = async () => {
    if (!atividadePopup.trim() || !listaSelecionada) {
      toast.error('Digite uma atividade e selecione uma lista');
      return;
    }
    
    try {
      setAdicionandoAtividadePopup(true);
      
      // ✅ Inserir com task_list_id
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          usuario_id: user.id,
          task_list_id: listaSelecionada, // ✅ Mudança aqui
          content: atividadePopup.trim(),
          date: formatarDataISO(dataPopup),
          completed: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Limpar estados do popup
      setAtividadePopup('');
      setDataPopup(new Date());
      setShowPopupCalendario(false);
      
      toast.success('Atividade adicionada com sucesso!');
      
      // Recarregar atividades se a data selecionada for a mesma da data atual
      if (formatarDataISO(dataPopup) === formatarDataISO(dataSelecionada)) {
        await fetchAtividadesDia();
      }
      
    } catch (error) {
      console.error('Erro ao adicionar atividade:', error);
      toast.error('Erro ao adicionar atividade');
    } finally {
      setAdicionandoAtividadePopup(false);
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

  // Funções do popup
  const abrirPopupCalendario = () => {
    setDataPopup(new Date());
    setAtividadePopup('');
    setShowPopupCalendario(true);
  };

  const fecharPopupCalendario = () => {
    setShowPopupCalendario(false);
    setAtividadePopup('');
    setDataPopup(new Date());
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

  // ===========================================
  // ✅ EFFECTS OTIMIZADOS (COM SOLUÇÃO useRef)
  // ===========================================

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // ✅ EFFECT PRINCIPAL: Carregamento de dados do usuário (OTIMIZADO)
  useEffect(() => {
    const carregarDados = async () => {
      // ✅ Só carrega se:
      // 1. Tem usuário
      // 2. Nunca carregou antes OU o usuário mudou (login/logout real)
      if (user && (!dadosCarregadosRef.current || user.id !== userIdRef.current)) {
        console.log('🔄 Carregando dados do usuário...', user.id);
        setLoading(true);
        await fetchListasVinculadas(user.id);
        setLoading(false);
        
        // ✅ Marcar como carregado
        dadosCarregadosRef.current = true;
        userIdRef.current = user.id;
      } else if (user) {
        console.log('✅ Dados já carregados, pulando recarregamento desnecessário');
      }
    };
    
    carregarDados();
  }, [user]);

  // ✅ EFFECT: Reset quando usuário faz logout
  useEffect(() => {
    if (!user) {
      console.log('🚪 Usuário fez logout, resetando refs');
      dadosCarregadosRef.current = false;
      userIdRef.current = null;
      atividadesCarregadasRef.current = false;
      ultimaListaRef.current = null;
      ultimaDataRef.current = null;
    }
  }, [user]);

  // ✅ EFFECT: Carregamento de atividades (OTIMIZADO)
  useEffect(() => {
    const carregarAtividades = async () => {
      // ✅ Só carrega se:
      // 1. Tem lista selecionada
      // 2. Nunca carregou OU a lista/data mudou realmente
      const dataISO = formatarDataISO(dataSelecionada);
      const mudouLista = listaSelecionada !== ultimaListaRef.current;
      const mudouData = dataISO !== ultimaDataRef.current;
      
      if (listaSelecionada && (!atividadesCarregadasRef.current || mudouLista || mudouData)) {
        console.log('🔄 Carregando atividades...', {
          lista: listaSelecionada,
          data: dataISO,
          mudouLista,
          mudouData
        });
        
        setLoadingAtividades(true);
        await Promise.all([
          fetchAtividadesRotina(),
          fetchAtividadesDia()
        ]);
        setLoadingAtividades(false);
        
        // ✅ Marcar como carregado
        atividadesCarregadasRef.current = true;
        ultimaListaRef.current = listaSelecionada;
        ultimaDataRef.current = dataISO;
      } else if (listaSelecionada) {
        console.log('✅ Atividades já carregadas para esta lista/data, pulando...');
      }
    };
    
    carregarAtividades();
  }, [listaSelecionada, dataSelecionada]);

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

      {/* Header responsivo - MANTIDO COMO ESTÁ */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
                      router.push('/gestao-listas');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiList className="mr-3 h-4 w-4" />
                    Gestão de Listas
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

      {/* Container com zoom 75% para mobile (exclui o header) */}
      <div className="md:scale-100 scale-75 origin-top">
        {/* ✅ NOVA SEÇÃO REDESENHADA: Com ajustes de tamanho */}
        <div className="sticky top-[72px] bg-white border-b border-gray-200 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#012060]"></div>
              </div>
            ) : listasVinculadas.length === 0 ? (
              <div className="text-center py-8">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <FiList className="w-6 h-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma lista vinculada</h3>
                <p className="text-gray-500 text-sm">
                  Entre em contato com o administrador para vincular você a listas relevantes.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* ✅ SEÇÃO DA DATA - Estilo grande e destaque inspirado no design */}
                <div className="flex items-center justify-between">
                  {/* Data principal - Estilo grande como no design do chefe */}
                  <div className="flex-1">
                    <h1 className="text-xl md:text-4xl font-bold text-gray-900 leading-tight">
                      {dataSelecionada.getDate()} de {dataSelecionada.toLocaleDateString('pt-BR', { month: 'long' })}
                    </h1>
                    <p className="text-sm md:text-lg text-gray-500 capitalize mt-1">
                      {formatarDiaSemana(dataSelecionada)}, {dataSelecionada.getFullYear()}
                    </p>
                  </div>

                  {/* Controles de navegação */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => mudarData(-1)}
                      className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                      title="Dia anterior"
                    >
                      <FiChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    
                    <div className="relative">
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="p-3 hover:bg-blue-50 rounded-full transition-colors bg-blue-100"
                        title="Selecionar data"
                      >
                        <FiCalendar className="w-6 h-6 text-[#012060]" />
                      </button>
                      
                      {showDatePicker && (
                        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border z-30 p-4">
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
                    
                    <button
                      onClick={() => mudarData(1)}
                      className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                      title="Próximo dia"
                    >
                      <FiChevronRight className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* ✅ SELEÇÃO DE LISTA - REDUZIDA PARA 1/3 DO TAMANHO */}
                <div className="flex items-center justify-between">
                  <div className="relative w-1/3">
                    <select
                      className="w-full pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-sm font-medium text-gray-700 appearance-none cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm"
                      value={listaSelecionada}
                      onChange={(e) => setListaSelecionada(e.target.value)}
                    >
                      <option value="">Selecione uma lista</option>
                      {Object.entries(listas).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                    
                    {/* Ícone de lista à esquerda */}
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <FiList className="w-4 h-4 text-[#012060]" />
                    </div>
                    
                    {/* Ícone de dropdown à direita */}
                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <FiChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Badge opcional com contador de atividades */}
                  {listaSelecionada && (atividadesDia.length > 0 || atividadesRotina.length > 0) && (
                    <div className="bg-gray-500 text-white px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap">
                      {atividadesDia.length + atividadesRotina.length} atividade{(atividadesDia.length + atividadesRotina.length) !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL ROLÁVEL */}
        {listaSelecionada && (
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
                      <h3 className="text-base md:text-lg font-semibold text-gray-900">
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
                                {/* ✅ BOTÃO PARA MARCAR/DESMARCAR - sempre visível */}
                                <button
                                  onClick={() => toggleAtividadeCompleta(atividade.id, atividade.completed)}
                                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                                    atividade.completed
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-[#012060]'
                                  }`}
                                  title={atividade.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
                                >
                                  {atividade.completed ? <FiCheck className="w-4 h-4" /> : <FiCircle className="w-4 h-4" />}
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
                                      <h4 className={`text-sm md:text-base font-medium ${
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
                      <h3 className="text-base md:text-lg font-semibold text-gray-900">Atividades de Rotina</h3>
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
                                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                {/* ✅ BOTÃO PARA MARCAR/DESMARCAR ROTINA - sempre visível */}
                                <button
                                  onClick={() => toggleRotinaCompleta(rotina.id, isCompleted)}
                                  className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                                    isCompleted
                                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                      : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-[#012060]'
                                  }`}
                                  title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                                >
                                  {isCompleted ? <FiCheck className="w-4 h-4" /> : <FiCircle className="w-4 h-4" />}
                                </button>
                                
                                <div className="flex-1">
                                  <h4 className={`text-sm md:text-base font-medium ${
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

        {/* POPUP PARA ADICIONAR ATIVIDADE COM DATA ESPECÍFICA */}
        {showPopupCalendario && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              {/* Header do Popup */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Nova Atividade</h3>
                <button
                  onClick={fecharPopupCalendario}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <FiX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Conteúdo do Popup */}
              <div className="p-6 space-y-4">
                {/* Campo de texto para a atividade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição da Atividade
                  </label>
                  <textarea
                    value={atividadePopup}
                    onChange={(e) => setAtividadePopup(e.target.value)}
                    placeholder="Digite a descrição da atividade..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-[#012060] resize-none"
                  />
                </div>
                
                {/* Seletor de data */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data da Atividade
                  </label>
                  <input
                    type="date"
                    value={formatarDataISO(dataPopup)}
                    onChange={(e) => setDataPopup(new Date(e.target.value + 'T12:00:00'))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-[#012060]"
                  />
                </div>
                
                {/* Mostrar lista e data selecionada */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center">
                      <FiList className="w-4 h-4 text-[#012060] mr-2" />
                      <span className="text-gray-700">
                        Lista: <strong>{listas[listaSelecionada]}</strong>
                      </span>
                    </div>
                    <div className="flex items-center">
                      <FiCalendar className="w-4 h-4 text-[#012060] mr-2" />
                      <span className="text-gray-700">
                        Data: <strong>{formatarData(dataPopup)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer do Popup */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={fecharPopupCalendario}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={adicionarAtividadeComData}
                  disabled={adicionandoAtividadePopup || !atividadePopup.trim()}
                  className="px-4 py-2 bg-[#012060] text-white rounded-lg hover:bg-[#013080] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                >
                  {adicionandoAtividadePopup ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FiPlus className="w-4 h-4" />
                      <span>Adicionar Atividade</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO FIXA: Adicionar nova atividade (parte inferior) */}
        {listaSelecionada && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex space-x-3">
                {/* Botão de calendário */}
                <button
                  onClick={abrirPopupCalendario}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-[#012060] flex items-center justify-center transition-colors"
                  title="Adicionar atividade para data específica"
                >
                  <LuCalendarPlus className="w-5 h-5" />
                </button>
                
                <input
                  type="text"
                  placeholder="Digite a atividade que deseja adicionar..."
                  value={novaAtividade}
                  onChange={(e) => setNovaAtividade(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && adicionarAtividade()}
                  className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-sm md:text-base"
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
    </div>
  );
}