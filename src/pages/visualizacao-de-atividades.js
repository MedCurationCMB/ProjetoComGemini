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
  FiCircle,
  FiAlertCircle,
  FiInfo
} from 'react-icons/fi';
import { LuCalendarPlus } from "react-icons/lu";
import { MdOutlineStickyNote2 } from "react-icons/md";

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

  // Estados para edição de data
  const [editandoData, setEditandoData] = useState(null);
  const [novaDataEdicao, setNovaDataEdicao] = useState('');

  // Estados para seleção de data rápida
  const [opcaoData, setOpcaoData] = useState('hoje');
  const [showOpcoesData, setShowOpcoesData] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  // Ref para controlar timeout
  const timeoutRef = useRef(null);

  // Estado para data inline do campo "Outro"
  const [dataInlineOutro, setDataInlineOutro] = useState(new Date().toISOString().split('T')[0]);
  
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
  
  // Estados para as notas
  const [showNotePopup, setShowNotePopup] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [editandoNota, setEditandoNota] = useState(null);
  const [textoNota, setTextoNota] = useState('');

  // Estados para notas das rotinas
  const [editandoNotaRotina, setEditandoNotaRotina] = useState(null);
  const [textoNotaRotina, setTextoNotaRotina] = useState('');
  const [showNotePopupRotina, setShowNotePopupRotina] = useState(false);
  const [noteContentRotina, setNoteContentRotina] = useState('');

  // Estados para popup de informações
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [infoAtividade, setInfoAtividade] = useState(null);
  const [showInfoPopupRotina, setShowInfoPopupRotina] = useState(false);
  const [infoRotina, setInfoRotina] = useState(null);

  // ===========================================
  // FUNÇÕES UTILITÁRIAS
  // ===========================================
  
  // ✅ NOVA FUNÇÃO: Formatar data no formato DD/MMM (05/set)
  const formatarDataBotaoCompacto = (dataISO) => {
    const data = new Date(dataISO + 'T12:00:00');
    const dia = data.getDate().toString().padStart(2, '0');
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 
                  'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const mes = meses[data.getMonth()];
    return `${dia} ${mes}`;
  };

  // Funções para controlar as opções de data
  const handleInputFocus = () => {
    setInputFocused(true);
    setShowOpcoesData(true);
    // Cancelar timeout pendente
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleInputBlur = () => {
    setInputFocused(false);
    // Se "outro" estiver selecionado, manter opções abertas
    if (opcaoData === 'outro') {
      return; // Não fechar as opções
    }
    // Timer mais longo para dar tempo do usuário clicar nas opções
    timeoutRef.current = setTimeout(() => {
      setShowOpcoesData(false);
    }, 300);
  };

  const handleOpcaoClick = (opcao) => {
    // Cancelar timeout para não fechar as opções
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setOpcaoData(opcao);
    
    // Se for outro, manter opções abertas para mostrar campo de data
    if (opcao === 'outro') {
      // Não fechar opções, apenas manter tudo aberto
      setDataInlineOutro(formatarDataISO(new Date())); // Reset para hoje
    }
    // ✅ REMOVIDO: Timeout para fechar após outras opções
    // As opções agora ficam abertas até o usuário fazer blur do campo ou clicar fora
  };

  const toggleOpcoesData = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowOpcoesData(!showOpcoesData);
  };

  const verificarPermissaoGestaoListas = async (userId) => {
    try {
      if (!userId) {
        console.error('ID do usuário não fornecido');
        return false;
      }

      console.log('Verificando permissões para gestão de listas:', userId.substring(0, 8));
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('admin, gestor')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Erro ao verificar permissões:', error);
        return false;
      }
      
      const temPermissao = data?.admin === true || data?.gestor === true;
      console.log('Resultado da verificação - Admin:', data?.admin, 'Gestor:', data?.gestor, 'Tem permissão:', temPermissao);
      
      return temPermissao;
    } catch (error) {
      console.error('Falha ao verificar permissões para gestão de listas:', error);
      return false;
    }
  };

  // Cleanup do timeout no useEffect
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Função para calcular data da próxima semana
  const calcularProximaSemana = () => {
    const data = new Date(dataSelecionada);
    data.setDate(data.getDate() + 7);
    return formatarDataISO(data);
  };

  // Função para calcular data de amanhã
  const calcularAmanha = () => {
    const data = new Date(dataSelecionada);
    data.setDate(data.getDate() + 1);
    return formatarDataISO(data);
  };

  // Função para formatar data em formato brasileiro para os botões
  const formatarDataBotao = (dataISO) => {
    const data = new Date(dataISO + 'T12:00:00');
    return data.toLocaleDateString('pt-BR');
  };

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

  const getOrdinalName = (ordinal) => {
    const ordinais = {
      1: 'Primeira',
      2: 'Segunda', 
      3: 'Terceira',
      4: 'Quarta',
      '-1': 'Última'
    };
    return ordinais[ordinal] || 'Primeira';
  };

  const getDiaSemanaNumero = (data) => {
    // Convertendo: domingo = 7, segunda = 1, terça = 2, etc.
    const dia = data.getDay();
    return dia === 0 ? 7 : dia;
  };

  // ✅ FUNÇÃO ATUALIZADA: Gera todas as datas previstas para uma rotina (com suporte aos novos tipos)
  const gerarDatasRecorrencia = (rotina) => {
    const datas = [];
    const start = new Date(rotina.start_date + 'T12:00:00');
    
    const hoje = new Date();
    const end = rotina.end_date 
      ? new Date(rotina.end_date + 'T12:00:00')
      : new Date(hoje.getTime() + (365 * 24 * 60 * 60 * 1000));
    
    let current = new Date(start);
    let iteracoes = 0;
    const MAX_ITERACOES = 3650;
    
    console.log('🔄 Gerando datas para rotina:', rotina.content, {
      start: rotina.start_date,
      end: rotina.end_date,
      type: rotina.recurrence_type
    });
    
    while (current <= end && iteracoes < MAX_ITERACOES) {
      iteracoes++;
      let adicionarData = false;
      
      if (rotina.recurrence_type === "daily") {
        adicionarData = true;
        
      } else if (rotina.recurrence_type === "weekly") {
        const diaSemana = current.getDay() === 0 ? 7 : current.getDay();
        adicionarData = rotina.recurrence_days && rotina.recurrence_days.includes(diaSemana);
        
      } else if (rotina.recurrence_type === "monthly") {
        adicionarData = current.getDate() === start.getDate();
      
      // ✅ NOVOS TIPOS AVANÇADOS
      } else if (["biweekly", "triweekly", "quadweekly"].includes(rotina.recurrence_type)) {
        const diaSemana = current.getDay() === 0 ? 7 : current.getDay();
        if (diaSemana === rotina.selected_weekday) {
          // Verificar se está no intervalo correto de semanas
          const diffTime = current.getTime() - start.getTime();
          const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
          const intervalo = rotina.weekly_interval || (
            rotina.recurrence_type === 'biweekly' ? 2 :
            rotina.recurrence_type === 'triweekly' ? 3 : 4
          );
          adicionarData = diffWeeks % intervalo === 0;
        }
        
      } else if (rotina.recurrence_type === "monthly_weekday") {
        const diaSemana = current.getDay() === 0 ? 7 : current.getDay();
        if (diaSemana === rotina.monthly_weekday) {
          // Verificar se é a ocorrência correta do mês
          const ultimoDiaDoMes = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          
          if (rotina.monthly_ordinal === -1) {
            // Última ocorrência do mês
            let ultimaOcorrencia = null;
            for (let d = ultimoDiaDoMes.getDate(); d >= 1; d--) {
              const data = new Date(current.getFullYear(), current.getMonth(), d);
              if ((data.getDay() === 0 ? 7 : data.getDay()) === rotina.monthly_weekday) {
                ultimaOcorrencia = data;
                break;
              }
            }
            adicionarData = ultimaOcorrencia && current.getDate() === ultimaOcorrencia.getDate();
          } else {
            // 1ª, 2ª, 3ª ou 4ª ocorrência
            let contador = 0;
            for (let d = 1; d <= ultimoDiaDoMes.getDate(); d++) {
              const data = new Date(current.getFullYear(), current.getMonth(), d);
              if ((data.getDay() === 0 ? 7 : data.getDay()) === rotina.monthly_weekday) {
                contador++;
                if (contador === rotina.monthly_ordinal && current.getDate() === d) {
                  adicionarData = true;
                  break;
                }
              }
            }
          }
        }
      }
      
      if (adicionarData) {
        datas.push(current.toISOString().split("T")[0]);
      }
      
      // ✅ INCREMENTO BASEADO NO TIPO DE RECORRÊNCIA
      if (rotina.recurrence_type === "daily") {
        current.setDate(current.getDate() + (rotina.recurrence_interval || 1));
      } else if (["weekly", "biweekly", "triweekly", "quadweekly", "monthly_weekday"].includes(rotina.recurrence_type)) {
        current.setDate(current.getDate() + 1); // Avança dia por dia
      } else if (rotina.recurrence_type === "monthly") {
        current.setMonth(current.getMonth() + (rotina.recurrence_interval || 1));
      }
    }
    
    if (iteracoes >= MAX_ITERACOES) {
      console.warn('⚠️ Limite de iterações atingido para rotina:', rotina.content);
    }
    
    console.log('✅ Datas geradas:', datas);
    return datas;
  };

  // ✅ NOVA FUNÇÃO: Calcular diferença em dias (corrigida)
  const calcularDiasAtraso = (dataRotina) => {
    const hoje = new Date();
    hoje.setHours(12, 0, 0, 0); // Meio-dia para evitar problemas de timezone
    
    const dataRot = new Date(dataRotina + 'T12:00:00');
    
    const diffTime = hoje.getTime() - dataRot.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // ✅ NOVA FUNÇÃO: Formatar data específica (substituindo formatarTextoAtraso)
  const formatarDataEspecifica = (dataRotina) => {
    const data = new Date(dataRotina + 'T12:00:00');
    return data.toLocaleDateString('pt-BR'); // Formato: 30/08/2025
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

  // ✅ VERSÃO CORRIGIDA: fetchAtividadesRotina com lógica granular para rotinas persistentes
  const fetchAtividadesRotina = async () => {
    if (!listaSelecionada) return;
    
    try {
      const dataAtual = formatarDataISO(dataSelecionada); // Data selecionada pelo usuário
      const diaSemana = getDiaSemanaNumero(dataSelecionada);
      const hoje = formatarDataISO(new Date()); // Data real de hoje
      
      console.log('🔄 Carregando rotinas para:', { dataAtual, hoje, lista: listaSelecionada });
      
      // ✅ Buscar TODAS as rotinas da lista selecionada (ativas)
      const { data: todasRotinas, error } = await supabase
        .from('routine_tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('task_list_id', listaSelecionada)
        .lte('start_date', dataAtual) // ✅ Rotinas que começaram até a data selecionada
        .or(`persistent.eq.true,end_date.is.null,end_date.gte.${dataAtual}`); // Persistentes sempre + não persistentes válidas
      
      if (error) throw error;
      
      console.log('📋 Rotinas encontradas:', todasRotinas.length);
      
      // ✅ Separar rotinas por tipo de persistência
      const rotinasNaoPersistentes = [];
      const rotinasPersistentes = [];
      
      todasRotinas.forEach(rotina => {
        if (rotina.persistent) {
          rotinasPersistentes.push(rotina);
        } else {
          rotinasNaoPersistentes.push(rotina);
        }
      });
      
      console.log('📊 Distribuição:', {
        persistentes: rotinasPersistentes.length,
        naoPersistentes: rotinasNaoPersistentes.length
      });
      
      // ✅ LÓGICA PARA ROTINAS NÃO PERSISTENTES (persistent = false)
      // Comportamento atual mantido: só aparecem no dia específico da recorrência
      const rotinasNaoPersistentesValidas = rotinasNaoPersistentes.filter(rotina => {
        if (rotina.recurrence_type === 'daily') {
          const startDate = new Date(rotina.start_date + 'T12:00:00');
          const currentDate = new Date(dataAtual + 'T12:00:00');
          
          if (currentDate < startDate) return false;
          if (rotina.end_date) {
            const endDate = new Date(rotina.end_date + 'T12:00:00');
            if (currentDate > endDate) return false;
          }
          
          const diffTime = currentDate.getTime() - startDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          return diffDays % (rotina.recurrence_interval || 1) === 0;
          
        } else if (rotina.recurrence_type === 'weekly') {
          const currentDate = new Date(dataAtual + 'T12:00:00');
          const startDate = new Date(rotina.start_date + 'T12:00:00');
          
          if (currentDate < startDate) return false;
          if (rotina.end_date) {
            const endDate = new Date(rotina.end_date + 'T12:00:00');
            if (currentDate > endDate) return false;
          }
          
          return rotina.recurrence_days && rotina.recurrence_days.includes(diaSemana);
          
        } else if (rotina.recurrence_type === 'monthly') {
          const currentDate = new Date(dataAtual + 'T12:00:00');
          const startDate = new Date(rotina.start_date + 'T12:00:00');
          
          if (currentDate < startDate) return false;
          if (rotina.end_date) {
            const endDate = new Date(rotina.end_date + 'T12:00:00');
            if (currentDate > endDate) return false;
          }
          
          return startDate.getDate() === currentDate.getDate();
        
        // ✅ NOVOS TIPOS AVANÇADOS
        } else if (["biweekly", "triweekly", "quadweekly"].includes(rotina.recurrence_type)) {
          const currentDate = new Date(dataAtual + 'T12:00:00');
          const startDate = new Date(rotina.start_date + 'T12:00:00');
          
          if (currentDate < startDate) return false;
          if (rotina.end_date) {
            const endDate = new Date(rotina.end_date + 'T12:00:00');
            if (currentDate > endDate) return false;
          }
          
          // Verificar se é o dia da semana correto
          if (diaSemana !== rotina.selected_weekday) return false;
          
          // Verificar se está no intervalo correto de semanas
          const diffTime = currentDate.getTime() - startDate.getTime();
          const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
          const intervalo = rotina.weekly_interval || (
            rotina.recurrence_type === 'biweekly' ? 2 :
            rotina.recurrence_type === 'triweekly' ? 3 : 4
          );
          return diffWeeks % intervalo === 0;
          
        } else if (rotina.recurrence_type === 'monthly_weekday') {
          const currentDate = new Date(dataAtual + 'T12:00:00');
          const startDate = new Date(rotina.start_date + 'T12:00:00');
          
          if (currentDate < startDate) return false;
          if (rotina.end_date) {
            const endDate = new Date(rotina.end_date + 'T12:00:00');
            if (currentDate > endDate) return false;
          }
          
          // Verificar se é o dia da semana correto
          if (diaSemana !== rotina.monthly_weekday) return false;
          
          // Verificar se é a ocorrência correta do mês
          const ultimoDiaDoMes = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          
          if (rotina.monthly_ordinal === -1) {
            // Última ocorrência do mês
            let ultimaOcorrencia = null;
            for (let d = ultimoDiaDoMes.getDate(); d >= 1; d--) {
              const data = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
              if ((data.getDay() === 0 ? 7 : data.getDay()) === rotina.monthly_weekday) {
                ultimaOcorrencia = data;
                break;
              }
            }
            return ultimaOcorrencia && currentDate.getDate() === ultimaOcorrencia.getDate();
          } else {
            // 1ª, 2ª, 3ª ou 4ª ocorrência
            let contador = 0;
            for (let d = 1; d <= ultimoDiaDoMes.getDate(); d++) {
              const data = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
              if ((data.getDay() === 0 ? 7 : data.getDay()) === rotina.monthly_weekday) {
                contador++;
                if (contador === rotina.monthly_ordinal && currentDate.getDate() === d) {
                  return true;
                }
              }
            }
            return false;
          }
        }
        return false;
      });
      
      // ✅ NOVA LÓGICA PARA ROTINAS PERSISTENTES - SEGUINDO DATA SELECIONADA
      let atividadesPersistentesVisiveis = [];
      
      if (rotinasPersistentes.length > 0) {
        const rotinasPersistentesIds = rotinasPersistentes.map(r => r.id);
        
        // Buscar TODOS os status de conclusão já registrados
        const { data: statusData, error: statusError } = await supabase
          .from('routine_tasks_status')
          .select('routine_tasks_id, date, completed')
          .in('routine_tasks_id', rotinasPersistentesIds)
          .eq('completed', true); // Só nos interessam as que foram concluídas
        
        if (statusError) throw statusError;
        
        console.log('📈 Status encontrados:', statusData?.length || 0);
        
        // ✅ Para cada rotina persistente, gerar todas as datas e verificar o que não foi concluído
        rotinasPersistentes.forEach(rotina => {
          console.log('🔍 Processando rotina persistente:', rotina.content);
          
          const datasRecorrencia = gerarDatasRecorrencia(rotina);
          
          console.log('📅 Datas de recorrência:', datasRecorrencia);
          
          datasRecorrencia.forEach(data => {
            // Verificar se já foi concluída nesta data específica
            const jaConcluida = statusData && statusData.some(s => 
              s.routine_tasks_id === rotina.id && 
              s.date === data && 
              s.completed
            );
            
            // ✅ CORREÇÃO: Mostrar apenas datas até a data selecionada
            if (!jaConcluida && data <= dataAtual) {
              atividadesPersistentesVisiveis.push({
                ...rotina,
                visible_date: data // NOVA PROPRIEDADE: data específica desta linha
              });
            }
          });
        });
      }
      
      // ✅ Combinar rotinas não persistentes (lógica atual) com persistentes (nova lógica)
      const todasAtividadesRotina = [
        ...rotinasNaoPersistentesValidas,
        ...atividadesPersistentesVisiveis
      ];
      
      console.log('📋 Total de atividades de rotina:', todasAtividadesRotina.length);
      
      // ✅ Ordenar por data (mais antigas primeiro para rotinas persistentes)
      todasAtividadesRotina.sort((a, b) => {
        const dataA = a.visible_date || dataAtual;
        const dataB = b.visible_date || dataAtual;
        return new Date(dataA) - new Date(dataB);
      });
      
      setAtividadesRotina(todasAtividadesRotina);
      
      // ✅ Buscar status das rotinas para a data selecionada (para rotinas não persistentes)
      if (rotinasNaoPersistentesValidas.length > 0) {
        const rotinaIds = rotinasNaoPersistentesValidas.map(r => r.id);
        const { data: statusHoje, error: statusHojeError } = await supabase
          .from('routine_tasks_status')
          .select('*')
          .in('routine_tasks_id', rotinaIds)
          .eq('date', dataAtual);
        
        if (statusHojeError) throw statusHojeError;
        
        const statusObj = {};
        if (statusHoje) {
          statusHoje.forEach(status => {
            statusObj[status.routine_tasks_id] = status;
          });
        }
        setStatusRotina(statusObj);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar atividades de rotina:', error);
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
        .eq('task_list_id', listaSelecionada)
        .eq('date', dataAtual)
        .order('created_at', { ascending: false });
      
      if (erroHoje) throw erroHoje;
      
      // ✅ Buscar atividades pendentes de dias anteriores da lista selecionada
      const { data: atividadesPendentes, error: erroPendentes } = await supabase
        .from('tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('task_list_id', listaSelecionada)
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
  // ✅ FUNÇÕES DE AÇÕES (ATUALIZADAS)
  // ===========================================

  const adicionarAtividade = async () => {
    if (!novaAtividade.trim() || !listaSelecionada) {
      toast.error('Digite uma atividade e selecione uma lista');
      return;
    }
    
    try {
      setAdicionandoAtividade(true);
      
      // Determinar a data baseado na opção selecionada
      let dataParaAdicionar;
      switch(opcaoData) {
        case 'hoje':
          dataParaAdicionar = formatarDataISO(dataSelecionada);
          break;
        case 'amanha':
          dataParaAdicionar = calcularAmanha();
          break;
        case 'proximaSemana':
          dataParaAdicionar = calcularProximaSemana();
          break;
        case 'outro':
          dataParaAdicionar = dataInlineOutro;
          break;
        default:
          dataParaAdicionar = formatarDataISO(dataSelecionada);
      }

      console.log('📅 Data selecionada para adicionar:', {
        opcao: opcaoData,
        data: dataParaAdicionar,
        dataPopup: formatarDataISO(dataPopup),
        dataSelecionada: formatarDataISO(dataSelecionada)
      });

      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          usuario_id: user.id,
          task_list_id: listaSelecionada,
          content: novaAtividade.trim(),
          date: dataParaAdicionar,
          completed: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setNovaAtividade('');
      setOpcaoData('hoje'); // Reset para padrão
      setShowOpcoesData(false);
      toast.success('Atividade adicionada com sucesso!');
      
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
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          usuario_id: user.id,
          task_list_id: listaSelecionada,
          content: atividadePopup.trim(),
          date: formatarDataISO(dataPopup),
          completed: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      setAtividadePopup('');
      setDataPopup(new Date());
      setShowPopupCalendario(false);
      
      toast.success('Atividade adicionada com sucesso!');
      
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
      
      await fetchAtividadesDia();
      
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      toast.error('Erro ao atualizar atividade');
    }
  };

  const iniciarEdicaoAtividade = (atividade) => {
    setEditandoAtividade(atividade.id);
    setTextoEdicao(atividade.content);
    setNovaDataEdicao(atividade.date); // Definir a data atual da atividade
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
        .update({ 
          content: textoEdicao.trim(),
          date: novaDataEdicao // Atualizar a data também
        })
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success('Atividade atualizada com sucesso!');
      
      setEditandoAtividade(null);
      setTextoEdicao('');
      setNovaDataEdicao('');
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
      
      setMenuAberto(null);
      await fetchAtividadesDia();
      
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      toast.error('Erro ao excluir atividade');
    }
  };

  const abrirNotePopup = (atividade) => {
    setNoteContent(atividade.note || '');
    setShowNotePopup(true);
  };

  const fecharNotePopup = () => {
    setShowNotePopup(false);
    setNoteContent('');
  };

  const iniciarEdicaoNota = (atividade) => {
    setEditandoNota(atividade.id);
    setTextoNota(atividade.note || '');
    setMenuAberto(null);
  };

  const cancelarEdicaoNota = () => {
    setEditandoNota(null);
    setTextoNota('');
  };

  const salvarNota = async (taskId) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ note: textoNota.trim() || null })
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success('Nota salva com sucesso!');
      
      setEditandoNota(null);
      setTextoNota('');
      await fetchAtividadesDia();
      
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      toast.error('Erro ao salvar nota');
    }
  };

  // Funções para notas das rotinas
  const abrirNotePopupRotina = (rotina) => {
    setNoteContentRotina(rotina.note || '');
    setShowNotePopupRotina(true);
  };

  const fecharNotePopupRotina = () => {
    setShowNotePopupRotina(false);
    setNoteContentRotina('');
  };

  const iniciarEdicaoNotaRotina = (rotina) => {
    setEditandoNotaRotina(rotina.id);
    setTextoNotaRotina(rotina.note || '');
    setMenuAberto(null);
  };

  const cancelarEdicaoNotaRotina = () => {
    setEditandoNotaRotina(null);
    setTextoNotaRotina('');
  };

  const salvarNotaRotina = async (rotinaId) => {
    try {
      const { error } = await supabase
        .from('routine_tasks')
        .update({ note: textoNotaRotina.trim() || null })
        .eq('id', rotinaId);
      
      if (error) throw error;
      
      toast.success('Nota da rotina salva com sucesso!');
      
      setEditandoNotaRotina(null);
      setTextoNotaRotina('');
      await fetchAtividadesRotina();
      
    } catch (error) {
      console.error('Erro ao salvar nota da rotina:', error);
      toast.error('Erro ao salvar nota da rotina');
    }
  };

  // Funções para popup de informações
  const abrirInfoPopup = (atividade) => {
    setInfoAtividade(atividade);
    setShowInfoPopup(true);
    setMenuAberto(null);
  };

  const fecharInfoPopup = () => {
    setShowInfoPopup(false);
    setInfoAtividade(null);
  };

  const abrirInfoPopupRotina = async (rotina) => {
    try {
      // Buscar todas as conclusões desta rotina
      const { data: conclusoes, error } = await supabase
        .from('routine_tasks_status')
        .select('date, completed_at')
        .eq('routine_tasks_id', rotina.id)
        .eq('completed', true)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      
      // Adicionar as conclusões ao objeto da rotina
      const rotinaComConclusoes = {
        ...rotina,
        conclusoes: conclusoes || []
      };
      
      setInfoRotina(rotinaComConclusoes);
      setShowInfoPopupRotina(true);
      setMenuAberto(null);
      
    } catch (error) {
      console.error('Erro ao buscar conclusões da rotina:', error);
      // Em caso de erro, abrir popup mesmo assim sem as conclusões
      setInfoRotina({ ...rotina, conclusoes: [] });
      setShowInfoPopupRotina(true);
      setMenuAberto(null);
    }
  };

  const fecharInfoPopupRotina = () => {
    setShowInfoPopupRotina(false);
    setInfoRotina(null);
  };

  // ✅ VERSÃO CORRIGIDA: toggleRotinaCompleta com suporte a datas específicas
  const toggleRotinaCompleta = async (rotina, completed) => {
    try {
      // ✅ Para rotinas persistentes, usar a data específica (visible_date)
      // Para rotinas não persistentes, usar a data selecionada atual
      const dataParaStatus = rotina.visible_date || formatarDataISO(dataSelecionada);
      
      if (!completed) {
        // ✅ MARCAR COMO COMPLETA
        const { error } = await supabase
          .from('routine_tasks_status')
          .insert([{
            routine_tasks_id: rotina.id,
            date: dataParaStatus,
            completed: true
          }]);
        
        if (error) throw error;
        
        if (rotina.persistent && rotina.visible_date) {
          toast.success(`Rotina concluída para o dia ${formatarDataEspecifica(rotina.visible_date)}!`);
        } else {
          toast.success('Rotina concluída!');
        }
        
      } else {
        // ✅ MARCAR COMO INCOMPLETA (desmarcar)
        const { error } = await supabase
          .from('routine_tasks_status')
          .update({ completed: false })
          .eq('routine_tasks_id', rotina.id)
          .eq('date', dataParaStatus);
        
        if (error) throw error;
        toast.success('Rotina marcada como pendente');
      }
      
      // ✅ Recarregar rotinas
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

  const handleGestaoListasClick = async () => {
    try {
      const temPermissao = await verificarPermissaoGestaoListas(user.id);
      
      if (temPermissao) {
        setShowMenu(false);
        router.push('/gestao-listas');
      } else {
        setShowMenu(false);
        toast.error('Você não tem permissão para acessar essa página!');
      }
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      toast.error('Erro ao verificar permissões');
    }
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
      if (user && (!dadosCarregadosRef.current || user.id !== userIdRef.current)) {
        console.log('🔄 Carregando dados do usuário...', user.id);
        setLoading(true);
        await fetchListasVinculadas(user.id);
        setLoading(false);
        
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

      {/* Header responsivo */}
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
                      router.push('/gestao-de-atividades-recorrentes');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiRepeat className="mr-3 h-4 w-4" />
                    Gestão Atividades Recorrentes
                  </button>

                  <button
                    onClick={handleGestaoListasClick}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiList className="mr-3 h-4 w-4" />
                    Gestão de Listas
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
                {/* Data principal - Tamanhos reduzidos para mobile */}
                <div className="flex-1">
                  <h1 className="text-lg md:text-4xl font-bold text-gray-900 leading-tight">
                    {dataSelecionada.getDate()} de {dataSelecionada.toLocaleDateString('pt-BR', { month: 'long' })}
                  </h1>
                  <p className="text-xs md:text-lg text-gray-500 capitalize mt-1">
                    {formatarDiaSemana(dataSelecionada)}, {dataSelecionada.getFullYear()}
                  </p>
                </div>

                {/* Controles de navegação - Dimensões reduzidas */}
                <div className="flex items-center space-x-1 sm:space-x-3">
                  <button
                    onClick={() => mudarData(-1)}
                    className="p-2 sm:p-3 hover:bg-gray-100 rounded-full transition-colors"
                    title="Dia anterior"
                  >
                    <FiChevronLeft className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" />
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className="p-2 sm:p-3 hover:bg-blue-50 rounded-full transition-colors bg-blue-100"
                      title="Selecionar data"
                    >
                      <FiCalendar className="w-4 h-4 sm:w-6 sm:h-6 text-[#012060]" />
                    </button>
                    
                    {showDatePicker && (
                      <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border z-30 p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selecione a data que deseja visualizar
                        </label>
                        <input
                          type="date"
                          value={formatarDataISO(dataSelecionada)}
                          onChange={(e) => {
                            setDataSelecionada(new Date(e.target.value + 'T12:00:00'));
                            setShowDatePicker(false);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] w-full"
                        />
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => mudarData(1)}
                    className="p-2 sm:p-3 hover:bg-gray-100 rounded-full transition-colors"
                    title="Próximo dia"
                  >
                    <FiChevronRight className="w-4 h-4 sm:w-6 sm:h-6 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* ✅ SELEÇÃO DE LISTA - REDUZIDA PARA 1/3 DO TAMANHO */}
              <div className="flex items-center justify-between">
                {/* ✅ SELETOR DE LISTA - MAIOR NO MOBILE */}
                <div className="relative w-2/3 sm:w-1/3">
                  <select
                    className="w-full pl-10 sm:pl-12 pr-8 sm:pr-10 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-xs sm:text-sm font-medium text-gray-700 appearance-none cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm"
                    value={listaSelecionada}
                    onChange={(e) => setListaSelecionada(e.target.value)}
                  >
                    <option value="">Selecione uma lista</option>
                    {Object.entries(listas).map(([id, nome]) => (
                      <option key={id} value={id}>{nome}</option>
                    ))}
                  </select>
                  
                  {/* Ícone de lista à esquerda - AJUSTADO PARA MOBILE */}
                  <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <FiList className="w-3 h-3 sm:w-4 sm:h-4 text-[#012060]" />
                  </div>
                  
                  {/* Ícone de dropdown à direita - AJUSTADO PARA MOBILE */}
                  <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <FiChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                  </div>
                </div>

                {/* ✅ BADGE CONTADOR - MENOR NO MOBILE */}
                {listaSelecionada && (atividadesDia.length > 0 || atividadesRotina.length > 0) && (
                  <div className="bg-gray-500 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
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
                    <FiCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#012060] mr-2" />
                    <h3 className="text-sm md:text-lg font-semibold text-gray-900">
                      Atividades
                      {!isDataHoje(dataSelecionada) && (
                        <span className="text-xs sm:text-sm font-normal text-gray-500 ml-2">
                          ({formatarDataISO(dataSelecionada)})
                        </span>
                      )}
                    </h3>
                  </div>
                  
                  {atividadesDia.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                        <FiCheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-[#012060]" />
                      </div>
                      <p className="text-gray-500 text-xs sm:text-sm">
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
                                    
                                    {/* NOVO CAMPO: Seletor de data */}
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Data da atividade:
                                      </label>
                                      <input
                                        type="date"
                                        value={novaDataEdicao}
                                        onChange={(e) => setNovaDataEdicao(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] text-sm"
                                      />
                                    </div>
                                    
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
                                    <div className="flex items-center space-x-2">
                                      <h4 className={`text-xs sm:text-base font-medium ${
                                        atividade.completed 
                                          ? 'text-green-800 line-through' 
                                          : isAtividadeHoje 
                                            ? 'text-[#012060]'
                                            : 'text-yellow-800'
                                      }`}>
                                        {atividade.content}
                                      </h4>
                                      {atividade.note && atividade.note.trim() !== '' && (
                                        <button
                                          onClick={() => abrirNotePopup(atividade)}
                                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                                          title="Ver nota"
                                        >
                                          <MdOutlineStickyNote2 className="w-4 h-4 text-yellow-600" />
                                        </button>
                                      )}
                                    </div>
                                    
                                    {/* {atividade.completed && atividade.completed_at && (
                                      <div className="flex items-center mt-1 text-xs text-green-600">
                                        <FiCheckCircle className="w-3 h-3 mr-1" />
                                        <span>
                                          Concluída em {new Date(atividade.completed_at).toLocaleDateString('pt-BR')} às {new Date(atividade.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    )} */}
                                    <div className="flex items-center mt-1 text-xs text-gray-500">
                                      <FiCalendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                      <span className="text-xs sm:text-xs">
                                        {new Date(atividade.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                  </>
                                )}

                                {editandoNota === atividade.id && (
                                  <div className="mt-3 space-y-2 border-t pt-3">
                                    <label className="block text-xs font-medium text-gray-700">
                                      Nota da atividade:
                                    </label>
                                    <textarea
                                      value={textoNota}
                                      onChange={(e) => setTextoNota(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                          salvarNota(atividade.id);
                                        } else if (e.key === 'Escape') {
                                          cancelarEdicaoNota();
                                        }
                                      }}
                                      className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm"
                                      placeholder="Digite a nota para esta atividade..."
                                      rows={3}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => salvarNota(atividade.id)}
                                        className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors"
                                      >
                                        Salvar Nota
                                      </button>
                                      <button
                                        onClick={cancelarEdicaoNota}
                                        className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
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
                                      onClick={() => iniciarEdicaoNota(atividade)}
                                      className="w-full px-3 py-2 text-left hover:bg-yellow-50 flex items-center text-yellow-600 text-sm"
                                    >
                                      <MdOutlineStickyNote2 className="w-3 h-3 mr-2" />
                                      {atividade.note ? 'Editar Nota' : 'Adicionar Nota'}
                                    </button>
                                    <button
                                      onClick={() => abrirInfoPopup(atividade)}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center text-gray-600 text-sm"
                                    >
                                      <FiInfo className="w-3 h-3 mr-2" />
                                      Informações
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

                {/* ✅ ATIVIDADES RECORRENTES - VERSÃO FINAL COM NOVA EXIBIÇÃO DE DATAS */}
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center">
                      <FiRepeat className="w-4 h-4 sm:w-5 sm:h-5 text-[#012060] mr-2" />
                      <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Atividades Recorrentes</h3>
                    </div>
                    <button
                      onClick={() => router.push('/gestao-de-atividades-recorrentes')}
                      className="p-1.5 sm:p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                      title="Gerenciar atividades recorrentes"
                    >
                      <FiSettings className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                  
                  {atividadesRotina.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <div className="mx-auto w-8 h-8 sm:w-12 sm:h-12 bg-blue-50 rounded-full flex items-center justify-center mb-2 sm:mb-3">
                        <FiRepeat className="w-4 h-4 sm:w-6 sm:h-6 text-[#012060]" />
                      </div>
                      <p className="text-gray-500 text-xs sm:text-sm">Não há atividades recorrentes para hoje</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      {atividadesRotina.map((rotina) => {
                        // ✅ Para rotinas persistentes, verificar se já foi concluída na data específica
                        // Para rotinas não persistentes, usar a lógica atual (statusRotina)
                        const isCompleted = rotina.persistent ? false : (statusRotina[rotina.id]?.completed || false);
                        const diasAtraso = rotina.visible_date ? calcularDiasAtraso(rotina.visible_date) : 0;
                        
                        // ✅ Definir cores baseadas no atraso (para rotinas persistentes)
                        let corCard = 'bg-blue-50 border-blue-200 hover:bg-blue-100';
                        let corTexto = 'text-[#012060]';
                        let iconeAtraso = null;
                        
                        if (rotina.persistent && rotina.visible_date) {
                          if (diasAtraso > 3) {
                            corCard = 'bg-red-50 border-red-200 hover:bg-red-100';
                            corTexto = 'text-red-800';
                            iconeAtraso = <FiAlertCircle className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-red-500 mr-1" />;
                          } else if (diasAtraso > 1) {
                            corCard = 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
                            corTexto = 'text-yellow-800';
                            iconeAtraso = <FiClock className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-yellow-500 mr-1" />;
                          }
                        }
                        
                        if (isCompleted) {
                          corCard = 'bg-green-50 border-green-200';
                          corTexto = 'text-green-800';
                        }
                        
                        return (
                          <div
                            key={`${rotina.id}-${rotina.visible_date || 'current'}`}
                            className={`p-3 sm:p-4 border rounded-lg transition-colors ${corCard}`}
                          >
                            <div className="flex items-start space-x-2 sm:space-x-3">
                              {/* ✅ BOTÃO PARA MARCAR/DESMARCAR ROTINA */}
                              <button
                                onClick={() => toggleRotinaCompleta(rotina, isCompleted)}
                                className={`p-1.5 sm:p-2 rounded-full transition-colors flex-shrink-0 ${
                                  isCompleted
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-[#012060]'
                                }`}
                                title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                              >
                                {isCompleted ? <FiCheck className="w-3 h-3 sm:w-4 sm:h-4" /> : <FiCircle className="w-3 h-3 sm:w-4 sm:h-4" />}
                              </button>
                              
                              <div className="flex-1">
                                {/* ✅ MUDANÇA: Título com ícone de nota */}
                                <div className="flex items-center space-x-1 sm:space-x-2">
                                  <h4 className={`text-xs sm:text-sm md:text-base font-medium ${
                                    isCompleted ? 'text-green-800 line-through' : corTexto
                                  }`}>
                                    {rotina.content}
                                  </h4>
                                  {rotina.note && rotina.note.trim() !== '' && (
                                    <button
                                      onClick={() => abrirNotePopupRotina(rotina)}
                                      className="p-0.5 sm:p-1 hover:bg-gray-200 rounded transition-colors"
                                      title="Ver nota da rotina"
                                    >
                                      <MdOutlineStickyNote2 className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-600" />
                                    </button>
                                  )}
                                </div>
                                
                                {/* ✅ Informações da recorrência */}
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  {iconeAtraso}
                                  <FiRepeat className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                  <span className="text-xs sm:text-xs">
                                    {rotina.recurrence_type === 'daily' && `Diária (a cada ${rotina.recurrence_interval} dia${rotina.recurrence_interval > 1 ? 's' : ''})`}
                                    {rotina.recurrence_type === 'weekly' && `Semanal (${rotina.recurrence_days?.map(d => diasDaSemana[d === 7 ? 0 : d]).join(', ')})`}
                                    {rotina.recurrence_type === 'monthly' && `Mensal (dia ${new Date(rotina.start_date).getDate()})`}
                                    
                                    {/* ✅ NOVOS TIPOS AVANÇADOS */}
                                    {["biweekly", "triweekly", "quadweekly"].includes(rotina.recurrence_type) && 
                                      `A cada ${rotina.weekly_interval || (rotina.recurrence_type === 'biweekly' ? 2 : rotina.recurrence_type === 'triweekly' ? 3 : 4)} semanas (${diasDaSemana[rotina.selected_weekday === 7 ? 0 : (rotina.selected_weekday || 1) - 1]})`
                                    }
                                    {rotina.recurrence_type === 'monthly_weekday' && 
                                      `${getOrdinalName(rotina.monthly_ordinal)} ${diasDaSemana[(rotina.monthly_weekday === 7 ? 0 : (rotina.monthly_weekday || 1) - 1)]} do mês`
                                    }
                                  </span>
                                  {rotina.persistent && (
                                    <span className="ml-1 sm:ml-2 px-1 sm:px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                      Persistente
                                    </span>
                                  )}
                                </div>
                                
                                {/* ✅ MUDANÇA: Substituir "Criado em" por "Data" */}
                                <div className="flex items-center mt-1 text-xs text-gray-500">
                                  <FiCalendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                                  <span className="text-xs sm:text-xs">
                                    {rotina.visible_date ? formatarDataEspecifica(rotina.visible_date) : formatarDataEspecifica(formatarDataISO(dataSelecionada))}
                                  </span>
                                </div>
                                {/* ✅ NOVA SEÇÃO: Edição de nota inline */}
                                {editandoNotaRotina === rotina.id && (
                                  <div className="mt-2 sm:mt-3 space-y-2 border-t pt-2 sm:pt-3">
                                    <label className="block text-xs font-medium text-gray-700">
                                      Nota da rotina:
                                    </label>
                                    <textarea
                                      value={textoNotaRotina}
                                      onChange={(e) => setTextoNotaRotina(e.target.value)}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter' && e.ctrlKey) {
                                          salvarNotaRotina(rotina.id);
                                        } else if (e.key === 'Escape') {
                                          cancelarEdicaoNotaRotina();
                                        }
                                      }}
                                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 text-xs sm:text-sm"
                                      placeholder="Digite a nota para esta rotina..."
                                      rows={3}
                                    />
                                    <div className="flex space-x-2">
                                      <button
                                        onClick={() => salvarNotaRotina(rotina.id)}
                                        className="px-2 py-1 sm:px-3 sm:py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors"
                                      >
                                        Salvar Nota
                                      </button>
                                      <button
                                        onClick={cancelarEdicaoNotaRotina}
                                        className="px-2 py-1 sm:px-3 sm:py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* ✅ NOVO: Menu de 3 pontos para rotinas */}
                              <div className="relative menu-atividade">
                                <button
                                  onClick={() => setMenuAberto(menuAberto === `rotina-${rotina.id}-${rotina.visible_date || 'current'}` ? null : `rotina-${rotina.id}-${rotina.visible_date || 'current'}`)}
                                  className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                                >
                                  <FiMoreVertical className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                                </button>
                                
                                {menuAberto === `rotina-${rotina.id}-${rotina.visible_date || 'current'}` && (
                                  <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border z-20 py-1 min-w-[120px] sm:min-w-[140px]">
                                    <button
                                      onClick={() => iniciarEdicaoNotaRotina(rotina)}
                                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-left hover:bg-yellow-50 flex items-center text-yellow-600 text-xs sm:text-sm"
                                    >
                                      <MdOutlineStickyNote2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-2" />
                                      {rotina.note ? 'Editar Nota' : 'Adicionar Nota'}
                                    </button>
                                    <button
                                      onClick={() => abrirInfoPopupRotina(rotina)}
                                      className="w-full px-2 py-1.5 sm:px-3 sm:py-2 text-left hover:bg-gray-50 flex items-center text-gray-600 text-xs sm:text-sm"
                                    >
                                      <FiInfo className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1 sm:mr-2" />
                                      Informações
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP PARA SELECIONAR DATA PERSONALIZADA */}
      {showPopupCalendario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header do Popup */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Selecionar Data</h3>
              <button
                onClick={fecharPopupCalendario}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Conteúdo do Popup - SOMENTE calendário */}
            <div className="p-6 space-y-4">
              {/* Seletor de data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione a data:
                </label>
                <input
                  type="date"
                  value={formatarDataISO(dataPopup)}
                  onChange={(e) => setDataPopup(new Date(e.target.value + 'T12:00:00'))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-[#012060]"
                />
              </div>
              
              {/* Mostrar data selecionada */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center">
                    <FiCalendar className="w-4 h-4 text-[#012060] mr-2" />
                    <span className="text-gray-700">
                      Data selecionada: <strong>{formatarData(dataPopup)}</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer do Popup */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  fecharPopupCalendario();
                  // Manter a data selecionada, não resetar
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setOpcaoData('personalizado');
                  fecharPopupCalendario();
                  // Manter a data selecionada no dataPopup
                }}
                className="px-4 py-2 bg-[#012060] text-white rounded-lg hover:bg-[#013080] transition-colors"
              >
                Confirmar Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PARA VISUALIZAR NOTA */}
      {showNotePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header do Popup */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <MdOutlineStickyNote2 className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-gray-900">Nota da Atividade</h3>
              </div>
              <button
                onClick={fecharNotePopup}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Conteúdo do Popup */}
            <div className="p-6">
              {noteContent && noteContent.trim() !== '' ? (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {noteContent}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <MdOutlineStickyNote2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Esta atividade não possui nenhuma nota.</p>
                </div>
              )}
            </div>
            
            {/* Footer do Popup */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={fecharNotePopup}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ NOVO: POPUP PARA VISUALIZAR NOTA DA ROTINA */}
      {showNotePopupRotina && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <MdOutlineStickyNote2 className="w-5 h-5 text-yellow-600" />
                <h3 className="text-lg font-semibold text-gray-900">Nota da Rotina</h3>
              </div>
              <button
                onClick={fecharNotePopupRotina}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="p-6">
              {noteContentRotina && noteContentRotina.trim() !== '' ? (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {noteContentRotina}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <MdOutlineStickyNote2 className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Esta rotina não possui nenhuma nota.</p>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={fecharNotePopupRotina}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE INFORMAÇÕES - ATIVIDADES DO DIA */}
      {showInfoPopup && infoAtividade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header do Popup */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <FiInfo className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Informações da Atividade</h3>
              </div>
              <button
                onClick={fecharInfoPopup}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Conteúdo do Popup */}
            <div className="p-6 space-y-4">
              {/* Nome da Atividade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atividade
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {infoAtividade.content}
                </p>
              </div>
              
              {/* Data de Conclusão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Conclusão
                </label>
                {infoAtividade.completed && infoAtividade.completed_at ? (
                  <div className="flex items-center space-x-2 text-sm text-gray-900 bg-green-50 p-3 rounded-lg">
                    <FiCheckCircle className="w-4 h-4 text-green-600" />
                    <span>
                      {new Date(infoAtividade.completed_at).toLocaleDateString('pt-BR')} às {' '}
                      {new Date(infoAtividade.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <FiCircle className="w-4 h-4 text-gray-400" />
                    <span>Atividade ainda não foi concluída</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer do Popup */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={fecharInfoPopup}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP DE INFORMAÇÕES - ATIVIDADES RECORRENTES */}
      {showInfoPopupRotina && infoRotina && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Header do Popup */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <FiInfo className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Informações da Rotina</h3>
              </div>
              <button
                onClick={fecharInfoPopupRotina}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Conteúdo do Popup */}
            <div className="p-6 space-y-4">
              {/* Nome da Rotina */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atividade Recorrente
                </label>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                  {infoRotina.content}
                </p>
              </div>
              
              {/* Datas de Conclusão */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Datas de Conclusão
                </label>
                {infoRotina.conclusoes && infoRotina.conclusoes.length > 0 ? (
                  <div className="space-y-2">
                    {infoRotina.conclusoes.map((conclusao, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-900 bg-green-50 p-3 rounded-lg">
                        <FiCheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span>
                          {new Date(conclusao.date + 'T12:00:00').toLocaleDateString('pt-BR')} às {' '}
                          {new Date(conclusao.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    <FiCircle className="w-4 h-4 text-gray-400" />
                    <span>Esta rotina nunca foi concluída</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer do Popup */}
            <div className="flex items-center justify-end p-6 border-t border-gray-200">
              <button
                onClick={fecharInfoPopupRotina}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO FIXA: Adicionar nova atividade (parte inferior) */}
      {listaSelecionada && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col space-y-2 sm:space-y-3">
              {/* Opções de data - TAMANHOS RESPONSIVOS */}
              {showOpcoesData && (
                <div className="flex space-x-1 sm:space-x-2 flex-wrap items-center">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleOpcaoClick('hoje')}
                    className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-full text-xs sm:text-sm transition-colors ${
                      opcaoData === 'hoje'
                        ? 'bg-[#012060] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatarDataBotaoCompacto(formatarDataISO(dataSelecionada))}
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleOpcaoClick('amanha')}
                    className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-full text-xs sm:text-sm transition-colors ${
                      opcaoData === 'amanha'
                        ? 'bg-[#012060] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatarDataBotaoCompacto(calcularAmanha())}
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleOpcaoClick('proximaSemana')}
                    className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-full text-xs sm:text-sm transition-colors ${
                      opcaoData === 'proximaSemana'
                        ? 'bg-[#012060] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {formatarDataBotaoCompacto(calcularProximaSemana())}
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleOpcaoClick('outro')}
                    className={`px-2 py-1.5 sm:px-3 sm:py-2 rounded-full text-xs sm:text-sm transition-colors ${
                      opcaoData === 'outro'
                        ? 'bg-[#012060] text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Outro
                  </button>
                  
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (timeoutRef.current) {
                        clearTimeout(timeoutRef.current);
                      }
                      setShowOpcoesData(false);
                      router.push('/gestao-de-atividades-recorrentes');
                    }}
                    className="p-1.5 sm:p-2 rounded-full text-xs sm:text-sm transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-[#012060]"
                    title="Gestão de Atividades Recorrentes"
                  >
                    <FiRepeat className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )}

              {/* ✅ NOVO LAYOUT: Container flex para campo de data e input/botão */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Campo de data inline - POSICIONAMENTO FIXO para não afetar o layout */}
                {opcaoData === 'outro' && (
                  <input
                    type="date"
                    value={dataInlineOutro}
                    onChange={(e) => setDataInlineOutro(e.target.value)}
                    className="px-2 py-2 sm:px-3 sm:py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-xs sm:text-sm w-24 sm:w-auto flex-shrink-0"
                  />
                )}
                
                {/* Container do input e botão - SEMPRE MANTÉM O MESMO ESPAÇO */}
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                  <input
                    type="text"
                    placeholder="Digite a atividade que deseja adicionar..."
                    value={novaAtividade}
                    onChange={(e) => setNovaAtividade(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && adicionarAtividade()}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    className="px-3 py-2 sm:px-4 sm:py-3 pr-3 sm:pr-12 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-xs sm:text-sm md:text-base transition-all flex-1"
                  />
                  
                  {/* ✅ BOTÃO + SEMPRE VISÍVEL - Tamanho responsivo */}
                  <button
                    onClick={adicionarAtividade}
                    disabled={adicionandoAtividade || !novaAtividade.trim()}
                    className="px-4 py-2 sm:px-6 sm:py-3 bg-[#012060] text-white rounded-full hover:bg-[#013080] focus:outline-none focus:ring-2 focus:ring-[#012060] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px] sm:min-w-[60px] transition-colors flex-shrink-0"
                  >
                    {adicionandoAtividade ? (
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      <FiPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </button>
                </div>
              </div>
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