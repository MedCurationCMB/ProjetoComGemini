// Arquivo: src/pages/atividades-recorrentes.js - VERSÃO COMPLETA CORRIGIDA COM TODOS OS CAMPOS
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import ExcelImporter from '../components/ExcelImporter';
import HelpModal from '../components/HelpModal';
import { 
  FiSearch, 
  FiShield,
  FiFilter, 
  FiFolder,
  FiMenu, 
  FiHome, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiCalendar,
  FiTrendingUp,
  FiEdit3,
  FiPlus,
  FiTrash2,
  FiSave,
  FiRefreshCw,
  FiList,
  FiCpu,
  FiCheck,
  FiAlertCircle,
  FiClock,
  FiTarget,
  FiActivity,
  FiCheckCircle,
  FiDownload,
  FiUpload,
  FiChevronDown,
  FiChevronUp,
  FiHelpCircle
} from 'react-icons/fi';
import { MdOutlineStickyNote2 } from "react-icons/md";

export default function atividadesrecorrentes({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('atividades');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExcelImporter, setShowExcelImporter] = useState(false);
  const inputRef = useRef(null);

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [helpModalType, setHelpModalType] = useState('atividades');

  // ✅ NOVO: Estado para permissões do usuário
  const [userPermissions, setUserPermissions] = useState({
    admin: false,
    gestor: false,
    isRestricted: true // Por padrão, usuário é restrito
  });

  // Estado adicional para usuários colaboradores
  const [usuariosColaboradores, setUsuariosColaboradores] = useState({});
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');

  // Estados para dados base
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [projetos, setProjetos] = useState({});
  const [listas, setListas] = useState({});
  const [usuariosListas, setUsuariosListas] = useState({});
  const [usuarios, setUsuarios] = useState({});

  // Estados para filtros
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [listaSelecionada, setListaSelecionada] = useState('');
  const [completedFiltro, setCompletedFiltro] = useState(''); // Filtro baseado no campo completed

  // Estados para atividades
  const [atividades, setatividades] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState(null);

  // Estados para recorrentes
  const [recorrentes, setrecorrentes] = useState([]);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [newRoutine, setNewRoutine] = useState(null);

  // Estados para edição inline
  const [editando, setEditando] = useState(null); // { rowId, field, type }
  const [valorEdicao, setValorEdicao] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  // ✅ NOVO: Estado para opções avançadas de recorrentes
  const [mostrarOpcoesAvancadas, setMostrarOpcoesAvancadas] = useState({});

  // Opções para status das atividades (baseado no campo completed)
  const completedOptions = [
    { value: false, label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    { value: true, label: 'Concluída', color: 'bg-green-100 text-green-800', icon: '✅' }
  ];

  // Opções para filtro de status
  const statusFiltroOptions = [
    { value: '', label: 'Todas as atividades' },
    { value: 'false', label: '⏳ Pendentes' },
    { value: 'true', label: '✅ Concluídas' }
  ];

  // ✅ CORRIGIDO: Tipos de recorrência COMPLETOS (baseado no schema do BD)
  const recurrenceTypes = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal (dia fixo)' },
    { value: 'yearly', label: 'Anual' },
    { value: 'biweekly', label: 'A cada 2 semanas' },
    { value: 'triweekly', label: 'A cada 3 semanas' },
    { value: 'quadweekly', label: 'A cada 4 semanas' },
    { value: 'monthly_weekday', label: 'Padrão mensal (ex: 1ª segunda)' }
  ];

  // ✅ NOVO: Tipos básicos e avançados separados
  const tiposRecorrenciaBasicos = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal (dia fixo)' },
    { value: 'yearly', label: 'Anual' }
  ];

  const tiposRecorrenciaAvancados = [
    { value: 'biweekly', label: 'A cada 2 semanas' },
    { value: 'triweekly', label: 'A cada 3 semanas' },
    { value: 'quadweekly', label: 'A cada 4 semanas' },
    { value: 'monthly_weekday', label: 'Padrão mensal' }
  ];

  // ✅ NOVO: Ordinais para padrões mensais
  const ordinaisMensais = [
    { value: 1, label: 'Primeira' },
    { value: 2, label: 'Segunda' },
    { value: 3, label: 'Terceira' },
    { value: 4, label: 'Quarta' },
    { value: -1, label: 'Última' }
  ];

  // Opções para dias da semana
  const weekDays = [
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
    { value: 0, label: 'Domingo' }
  ];

  const diasDaSemana = [
    { valor: 1, nome: 'Segunda', abrev: 'SEG' },
    { valor: 2, nome: 'Terça', abrev: 'TER' },
    { valor: 3, nome: 'Quarta', abrev: 'QUA' },
    { valor: 4, nome: 'Quinta', abrev: 'QUI' },
    { valor: 5, nome: 'Sexta', abrev: 'SEX' },
    { valor: 6, nome: 'Sábado', abrev: 'SAB' },
    { valor: 0, nome: 'Domingo', abrev: 'DOM' }
  ];

  // =====================================
  // FUNÇÕES DE CARREGAMENTO DE DADOS
  // =====================================

  // ✅ FUNÇÃO MODIFICADA: Buscar usuários que compartilham projetos (com restrição)
  const fetchUsuariosColaboradores = async (projetoIds, permissions) => {
    if (projetoIds.length === 0) return {};
    
    try {
      // Buscar todos os usuários vinculados aos mesmos projetos
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select(`
          usuario_id,
          usuarios(id, nome, email)
        `)
        .in('projeto_id', projetoIds);
      
      if (error) throw error;
      
      const colaboradoresObj = {};
      
      data.forEach(relacao => {
        if (relacao.usuarios) {
          // ✅ NOVA LÓGICA: Se usuário é restrito, só inclui ele mesmo
          if (permissions.isRestricted) {
            if (relacao.usuario_id === user.id) {
              colaboradoresObj[relacao.usuarios.id] = {
                nome: relacao.usuarios.nome,
                email: relacao.usuarios.email
              };
            }
          } else {
            // Admins e gestores veem todos os usuários (exceto eles mesmos no dropdown)
            if (relacao.usuario_id !== user.id) {
              colaboradoresObj[relacao.usuarios.id] = {
                nome: relacao.usuarios.nome,
                email: relacao.usuarios.email
              };
            }
          }
        }
      });
      
      setUsuariosColaboradores(colaboradoresObj);
      return colaboradoresObj;
    } catch (error) {
      console.error('Erro ao carregar usuários colaboradores:', error);
      return {};
    }
  };

  // ✅ NOVA FUNÇÃO: Verificar permissões do usuário
  const checkUserPermissions = async (userId) => {
    try {
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('admin, gestor')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('Usuário não encontrado na tabela usuarios, usando permissões padrão');
        setUserPermissions({
          admin: false,
          gestor: false,
          isRestricted: true
        });
        return { admin: false, gestor: false, isRestricted: true };
      }

      const permissions = {
        admin: userData?.admin === true,
        gestor: userData?.gestor === true,
        isRestricted: !(userData?.admin === true || userData?.gestor === true)
      };

      setUserPermissions(permissions);
      return permissions;
    } catch (error) {
      console.error('Erro ao verificar permissões:', error);
      const defaultPermissions = {
        admin: false,
        gestor: false,
        isRestricted: true
      };
      setUserPermissions(defaultPermissions);
      return defaultPermissions;
    }
  };

  const fetchProjetosVinculados = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', userId);
      
      if (error) throw error;
      
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      return projetoIds;
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      return [];
    }
  };

  const fetchProjetos = async (projetoIds) => {
    if (projetoIds.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('id, nome')
        .in('id', projetoIds)
        .order('nome');
      
      if (error) throw error;
      
      const projetosObj = {};
      data.forEach(proj => {
        projetosObj[proj.id] = proj.nome;
      });
      
      setProjetos(projetosObj);
      return projetosObj;
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
      return {};
    }
  };

  const fetchListas = async (projetoIds) => {
    if (projetoIds.length === 0) return {};
    
    try {
      const { data, error } = await supabase
        .from('tasks_list')
        .select('id, projeto_id, nome_lista')
        .in('projeto_id', projetoIds)
        .order('nome_lista');
      
      if (error) throw error;
      
      const listasObj = {};
      data.forEach(lista => {
        listasObj[lista.id] = {
          nome: lista.nome_lista,
          projeto_id: lista.projeto_id
        };
      });
      
      setListas(listasObj);
      return listasObj;
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
      return {};
    }
  };

  const fetchUsuariosListas = async () => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuario_list')
        .select(`
          list_id,
          usuario_id,
          usuarios(id, nome)
        `);
      
      if (error) throw error;
      
      const usuariosListasObj = {};
      const usuariosObj = {};
      
      data.forEach(relacao => {
        if (!usuariosListasObj[relacao.list_id]) {
          usuariosListasObj[relacao.list_id] = [];
        }
        usuariosListasObj[relacao.list_id].push(relacao.usuario_id);
        
        if (relacao.usuarios) {
          usuariosObj[relacao.usuarios.id] = relacao.usuarios.nome;
        }
      });
      
      setUsuariosListas(usuariosListasObj);
      setUsuarios(usuariosObj);
      
      return { usuariosListasObj, usuariosObj };
    } catch (error) {
      console.error('Erro ao carregar usuários das listas:', error);
      return { usuariosListasObj: {}, usuariosObj: {} };
    }
  };

  // =====================================
  // FUNÇÕES PARA EDIÇÃO INLINE
  // =====================================

  // Focar no input quando entra em modo de edição
  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current.select) {
        inputRef.current.select();
      }
    }
  }, [editando]);

  // Iniciar edição inline
  const iniciarEdicao = (rowId, field, valorAtual, type = 'atividades') => {
    setEditando({ rowId, field, type });
    setValorEdicao(valorAtual);
    setValorOriginal(valorAtual);
  };

  // Cancelar edição inline
  const cancelarEdicao = () => {
    setEditando(null);
    setValorEdicao('');
    setValorOriginal('');
  };

  // Confirmar edição (detecta se houve mudança)
  const confirmarEdicao = () => {
    if (valorEdicao !== valorOriginal) {
      setMostrarModal(true);
    } else {
      cancelarEdicao();
    }
  };

  // Salvar alterações via edição inline
  const salvarEdicaoInline = async () => {
    setSalvando(true);
    setMostrarModal(false);

    try {
      const tabela = editando.type === 'atividades' ? 'tasks' : 'routine_tasks';
      let updateData = { [editando.field]: valorEdicao };

      // Conversões específicas para alguns campos
      if (editando.field === 'task_list_id' || editando.field === 'usuario_id') {
        updateData[editando.field] = valorEdicao;
      }
      
      if (editando.field === 'completed') {
        updateData[editando.field] = valorEdicao === 'true' || valorEdicao === true;
      }
      
      if (editando.field === 'recurrence_interval' || editando.field === 'weekly_interval' || 
          editando.field === 'selected_weekday' || editando.field === 'monthly_ordinal' || 
          editando.field === 'monthly_weekday') {
        updateData[editando.field] = parseInt(valorEdicao) || 1;
      }

      if (editando.field === 'persistent') {
        updateData[editando.field] = valorEdicao === 'true' || valorEdicao === true;
      }

      const { error } = await supabase
        .from(tabela)
        .update(updateData)
        .eq('id', editando.rowId);
      
      if (error) throw error;

      // Atualizar dados localmente
      if (editando.type === 'atividades') {
        setatividades(prevatividades => 
          prevatividades.map(atividade => 
            atividade.id === editando.rowId 
              ? { ...atividade, [editando.field]: updateData[editando.field] }
              : atividade
          )
        );
        toast.success('atividade atualizada com sucesso!');
      } else {
        setrecorrentes(prevrecorrentes => 
          prevrecorrentes.map(recorrente => 
            recorrente.id === editando.rowId 
              ? { ...recorrente, [editando.field]: updateData[editando.field] }
              : recorrente
          )
        );
        toast.success('recorrente atualizada com sucesso!');
      }

      cancelarEdicao();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvando(false);
    }
  };

  // Descartar alterações
  const descartarAlteracoes = () => {
    setMostrarModal(false);
    cancelarEdicao();
  };

  // Manipular teclas
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      confirmarEdicao();
    } else if (e.key === 'Escape') {
      cancelarEdicao();
    }
  };

  // =====================================
  // FUNÇÕES PARA atividades
  // =====================================

  const fetchatividades = async () => {
    if (projetosVinculados.length === 0) return;
    
    try {
      setLoading(true);
      
      const listasIds = Object.keys(listas).map(id => parseInt(id));
      
      if (listasIds.length === 0) {
        setatividades([]);
        return;
      }
      
      let query = supabase
        .from('tasks')
        .select(`
          *,
          tasks_list(nome_lista, projeto_id),
          usuarios(nome)
        `)
        .in('task_list_id', listasIds);
      
      // ✅ NOVA RESTRIÇÃO: Se usuário é restrito, só vê suas próprias atividades
      if (userPermissions.isRestricted) {
        query = query.eq('usuario_id', user.id);
      }
      
      // Aplicar filtros
      if (listaSelecionada) {
        query = query.eq('task_list_id', listaSelecionada);
      }
      
      if (completedFiltro !== '') {
        query = query.eq('completed', completedFiltro === 'true');
      }
      
      // ✅ FILTRO MODIFICADO: Por usuário (só para admins/gestores)
      if (usuarioSelecionado && !userPermissions.isRestricted) {
        query = query.eq('usuario_id', usuarioSelecionado);
      }
      
      if (searchTerm.trim()) {
        query = query.ilike('content', `%${searchTerm.trim()}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setatividades(data || []);
    } catch (error) {
      console.error('Erro ao carregar atividades:', error);
      toast.error('Erro ao carregar atividades');
    } finally {
      setLoading(false);
    }
  };

  const saveTask = async (task) => {
    try {
      if (task.id) {
        // Atualizar atividade existente
        const { error } = await supabase
          .from('tasks')
          .update({
            content: task.content,
            task_list_id: task.task_list_id,
            usuario_id: task.usuario_id,
            completed: task.completed || false,
            date: task.date || null,
            note: task.note || null
          })
          .eq('id', task.id);
        
        if (error) throw error;
        toast.success('atividade atualizada com sucesso!');
      } else {
        // Criar nova atividade
        const { error } = await supabase
          .from('tasks')
          .insert({
            content: task.content,
            task_list_id: task.task_list_id,
            usuario_id: task.usuario_id,
            completed: false,
            date: task.date || null,
            note: task.note || null
          });
        
        if (error) throw error;
        toast.success('atividade criada com sucesso!');
      }
      
      setEditingTask(null);
      setNewTask(null);
      fetchatividades();
    } catch (error) {
      console.error('Erro ao salvar atividade:', error);
      toast.error('Erro ao salvar atividade');
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Tem certeza que deseja excluir esta atividade?')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success('atividade excluída com sucesso!');
      fetchatividades();
    } catch (error) {
      console.error('Erro ao excluir atividade:', error);
      toast.error('Erro ao excluir atividade');
    }
  };

  // Função para alternar status completed rapidamente
  const toggleCompleted = async (taskId, currentCompleted) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentCompleted })
        .eq('id', taskId);
      
      if (error) throw error;
      
      setatividades(prevatividades => 
        prevatividades.map(atividade => 
          atividade.id === taskId 
            ? { ...atividade, completed: !currentCompleted }
            : atividade
        )
      );
      
      toast.success(`atividade ${!currentCompleted ? 'concluída' : 'reaberta'}!`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  // =====================================
  // FUNÇÕES PARA recorrentes
  // =====================================

  const fetchrecorrentes = async () => {
    if (projetosVinculados.length === 0) return;
    
    try {
      setLoading(true);
      
      const listasIds = Object.keys(listas).map(id => parseInt(id));
      
      if (listasIds.length === 0) {
        setrecorrentes([]);
        return;
      }
      
      let query = supabase
        .from('routine_tasks')
        .select(`
          *,
          tasks_list(nome_lista, projeto_id),
          usuarios(nome)
        `)
        .in('task_list_id', listasIds);
      
      // ✅ NOVA RESTRIÇÃO: Se usuário é restrito, só vê suas próprias recorrentes
      if (userPermissions.isRestricted) {
        query = query.eq('usuario_id', user.id);
      }
      
      // Aplicar filtros
      if (listaSelecionada) {
        query = query.eq('task_list_id', listaSelecionada);
      }
      
      // ✅ FILTRO MODIFICADO: Por usuário (só para admins/gestores)
      if (usuarioSelecionado && !userPermissions.isRestricted) {
        query = query.eq('usuario_id', usuarioSelecionado);
      }
      
      if (searchTerm.trim()) {
        query = query.ilike('content', `%${searchTerm.trim()}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setrecorrentes(data || []);
    } catch (error) {
      console.error('Erro ao carregar recorrentes:', error);
      toast.error('Erro ao carregar recorrentes');
    } finally {
      setLoading(false);
    }
  };

  const saveRoutine = async (routine) => {
    try {
      const routineData = {
        content: routine.content,
        task_list_id: routine.task_list_id,
        usuario_id: routine.usuario_id,
        recurrence_type: routine.recurrence_type,
        recurrence_interval: routine.recurrence_interval || 1,
        recurrence_days: routine.recurrence_type === 'weekly' ? routine.recurrence_days : null,
        start_date: routine.start_date,
        end_date: routine.end_date || null,
        persistent: routine.persistent !== undefined ? routine.persistent : true,
        note: routine.note || null,
        // ✅ NOVOS CAMPOS AVANÇADOS
        weekly_interval: routine.weekly_interval || null,
        selected_weekday: routine.selected_weekday || null,
        monthly_ordinal: routine.monthly_ordinal || null,
        monthly_weekday: routine.monthly_weekday || null
      };
      
      if (routine.id) {
        // Atualizar recorrente existente
        const { error } = await supabase
          .from('routine_tasks')
          .update(routineData)
          .eq('id', routine.id);
        
        if (error) throw error;
        toast.success('recorrente atualizada com sucesso!');
      } else {
        // Criar nova recorrente
        const { error } = await supabase
          .from('routine_tasks')
          .insert(routineData);
        
        if (error) throw error;
        toast.success('recorrente criada com sucesso!');
      }
      
      setEditingRoutine(null);
      setNewRoutine(null);
      fetchrecorrentes();
    } catch (error) {
      console.error('Erro ao salvar recorrente:', error);
      toast.error('Erro ao salvar recorrente');
    }
  };

  const deleteRoutine = async (routineId) => {
    if (!confirm('Tem certeza que deseja excluir esta recorrente?')) return;
    
    try {
      const { error } = await supabase
        .from('routine_tasks')
        .delete()
        .eq('id', routineId);
      
      if (error) throw error;
      
      toast.success('recorrente excluída com sucesso!');
      fetchrecorrentes();
    } catch (error) {
      console.error('Erro ao excluir recorrente:', error);
      toast.error('Erro ao excluir recorrente');
    }
  };

  // =====================================
  // FUNÇÕES PARA EXCEL IMPORTER
  // =====================================

  const handleExcelImportSuccess = () => {
    setShowExcelImporter(false);
    
    // Recarregar dados após importação
    if (activeTab === 'atividades') {
      fetchatividades();
    } else {
      fetchrecorrentes();
    }
    
    toast.success('Importação concluída com sucesso!');
  };

  // =====================================
  // FUNÇÕES AUXILIARES
  // =====================================

  const getListasPorProjeto = (projetoId) => {
    return Object.entries(listas).filter(([id, lista]) => 
      lista.projeto_id === projetoId
    );
  };

  const getUsuariosPorLista = (listaId) => {
    const usuariosIds = usuariosListas[listaId] || [];
    
    // ✅ NOVA LÓGICA: Se usuário é restrito, só retorna ele mesmo
    if (userPermissions.isRestricted) {
      // Verifica se o usuário atual está na lista
      if (usuariosIds.includes(user.id)) {
        return [{ id: user.id, nome: usuarios[user.id] || 'Você' }];
      } else {
        return []; // Se não estiver na lista, retorna vazio
      }
    }
    
    // Para admins/gestores, retorna todos os usuários da lista
    return usuariosIds.map(id => ({ id, nome: usuarios[id] || 'Usuário não encontrado' }));
  };

  // ✅ NOVA FUNÇÃO: Filtrar listas onde o usuário tem acesso
  const getListasAcessiveis = () => {
    if (!userPermissions.isRestricted) {
      // Admins e gestores veem todas as listas
      return Object.entries(listas);
    }
    
    // Usuários restritos só veem listas onde estão incluídos
    return Object.entries(listas).filter(([listaId, lista]) => {
      const usuariosIds = usuariosListas[listaId] || [];
      return usuariosIds.includes(user.id);
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch (e) {
      return '';
    }
  };

  const formatWeekDays = (days) => {
    if (!days || !Array.isArray(days)) return '';
    return days
      .map(day => weekDays.find(wd => wd.value === day)?.label || day)
      .join(', ');
  };

  const getCompletedStats = () => {
    // Aplicar todos os filtros nas estatísticas também
    let atividadesFiltradas = atividades;
    
    if (usuarioSelecionado) {
      atividadesFiltradas = atividadesFiltradas.filter(t => t.usuario_id === parseInt(usuarioSelecionado));
    }
    
    const total = atividadesFiltradas.length;
    const completed = atividadesFiltradas.filter(t => t.completed).length;
    const pending = total - completed;
    
    return {
      total,
      completed,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  };

  // ✅ NOVA FUNÇÃO: Formatar recorrência avançada
  const formatarRecorrenciaAvancada = (recorrente) => {
    switch(recorrente.recurrence_type) {
      case 'daily':
        return `Diária${recorrente.recurrence_interval > 1 ? ` (a cada ${recorrente.recurrence_interval} dias)` : ''}`;
        
      case 'weekly':
        const diasSelecionados = recorrente.recurrence_days?.map(d => 
          diasDaSemana.find(dia => dia.valor === d)?.abrev
        ).join(', ');
        return `Semanal (${diasSelecionados})`;
        
      case 'monthly':
        return `Mensal (dia ${new Date(recorrente.start_date).getDate()})`;
        
      case 'yearly':
        return `Anual`;
        
      case 'biweekly':
      case 'triweekly':  
      case 'quadweekly':
        const intervaloSemanas = recorrente.weekly_interval || 
          (recorrente.recurrence_type === 'biweekly' ? 2 : 
           recorrente.recurrence_type === 'triweekly' ? 3 : 4);
        const diaEscolhido = diasDaSemana.find(d => d.valor === recorrente.selected_weekday)?.nome || 'Não definido';
        return `A cada ${intervaloSemanas} semanas (${diaEscolhido})`;
        
      case 'monthly_weekday':
        const ordinal = ordinaisMensais.find(o => o.value === recorrente.monthly_ordinal)?.label || 'Primeira';
        const diaSemana = diasDaSemana.find(d => d.valor === recorrente.monthly_weekday)?.nome || 'Segunda';
        return `${ordinal} ${diaSemana} do mês`;
        
      default:
        return 'Não definida';
    }
  };

  // =====================================
  // EFFECTS
  // =====================================

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!user) return;
      
      try {
        // ✅ PRIMEIRO: Verificar permissões
        const permissions = await checkUserPermissions(user.id);
        
        const projetoIds = await fetchProjetosVinculados(user.id);
        await fetchProjetos(projetoIds);
        await fetchListas(projetoIds);
        await fetchUsuariosListas();
        
        // ✅ MODIFICADO: Passar permissões para função
        await fetchUsuariosColaboradores(projetoIds, permissions);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };

    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'atividades') {
      fetchatividades();
    } else {
      fetchrecorrentes();
    }
  }, [activeTab, projetosVinculados, listas, listaSelecionada, completedFiltro, searchTerm, usuarioSelecionado, userPermissions]);

  // =====================================
  // HANDLERS
  // =====================================

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

  const clearFilters = () => {
    setProjetoSelecionado('');
    setListaSelecionada('');
    setCompletedFiltro('');
    // ✅ MODIFICADO: Só limpa filtro de usuário se não for restrito
    if (!userPermissions.isRestricted) {
      setUsuarioSelecionado('');
    }
    setShowFilters(false);
  };

  const hasActiveFilters = projetoSelecionado || listaSelecionada || completedFiltro || (!userPermissions.isRestricted && usuarioSelecionado);

  // =====================================
  // ✅ FUNÇÕES DE RENDERIZAÇÃO INLINE ATUALIZADAS
  // =====================================

  const renderizarCelulaEditavel = (item, field, tipo = 'text', options = [], itemType = 'atividades') => {
    const isEditando = editando?.rowId === item.id && editando?.field === field && editando?.type === itemType;
    const valor = item[field];

    if (isEditando) {
      return (
        <div className="relative">
          {tipo === 'select' ? (
            <select
              ref={inputRef}
              value={valorEdicao}
              onChange={(e) => setValorEdicao(e.target.value)}
              onBlur={confirmarEdicao}
              onKeyDown={handleKeyPress}
              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
            >
              {options.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : tipo === 'date' ? (
            <input
              ref={inputRef}
              type="date"
              value={valorEdicao}
              onChange={(e) => setValorEdicao(e.target.value)}
              onBlur={confirmarEdicao}
              onKeyDown={handleKeyPress}
              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : tipo === 'number' ? (
            <input
              ref={inputRef}
              type="number"
              min="1"
              value={valorEdicao}
              onChange={(e) => setValorEdicao(e.target.value)}
              onBlur={confirmarEdicao}
              onKeyDown={handleKeyPress}
              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          ) : tipo === 'textarea' ? (
            <textarea
              ref={inputRef}
              value={valorEdicao}
              onChange={(e) => setValorEdicao(e.target.value)}
              onBlur={confirmarEdicao}
              onKeyDown={handleKeyPress}
              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
              rows={2}
            />
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={valorEdicao}
              onChange={(e) => setValorEdicao(e.target.value)}
              onBlur={confirmarEdicao}
              onKeyDown={handleKeyPress}
              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          )}
          <div className="absolute -top-6 left-0 text-xs text-gray-500 bg-white px-1 rounded">
            Enter ✓ • Esc ✕
          </div>
        </div>
      );
    }

    // Renderização específica por tipo de campo
    const renderizarValor = () => {
      switch (field) {
        case 'completed':
          const completedOption = completedOptions.find(s => s.value === valor);
          return (
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleCompleted(item.id, valor)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={`Clique para ${valor ? 'reabrir' : 'concluir'} atividade`}
              >
                {valor ? (
                  <FiCheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <FiClock className="w-5 h-5 text-yellow-600" />
                )}
              </button>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${completedOption?.color || 'bg-gray-100 text-gray-800'}`}>
                {completedOption?.label || (valor ? 'Concluída' : 'Pendente')}
              </span>
            </div>
          );
          
        case 'task_list_id':
          const lista = listas[valor];
          const projeto = projetos[lista?.projeto_id];
          return (
            <div className="text-sm">
              <div className="font-medium text-gray-900">{lista?.nome}</div>
              <div className="text-gray-500 text-xs">{projeto}</div>
            </div>
          );
          
        case 'usuario_id':
          return (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <FiUser className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm">
                {usuarios[valor] || 'Não atribuído'}
                {/* ✅ NOVO: Indicador visual se é o próprio usuário */}
                {userPermissions.isRestricted && valor === user.id && (
                  <span className="ml-1 text-xs text-blue-600">(Você)</span>
                )}
              </span>
            </div>
          );
          
        case 'date':
          return valor ? (
            <div className="flex items-center gap-2 text-sm">
              <FiCalendar className="w-4 h-4 text-gray-400" />
              {formatDate(valor)}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Sem prazo</span>
          );

        case 'recurrence_type':
          const recurrenceOption = recurrenceTypes.find(r => r.value === valor);
          return (
            <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              {recurrenceOption?.label || valor}
            </span>
          );
          
        case 'start_date':
        case 'end_date':
          return valor ? formatDate(valor) : (field === 'end_date' ? 'Sem fim' : '');

        // ✅ NOVO: Campo de nota
        case 'note':
          return valor && valor.trim() !== '' ? (
            <div className="flex items-center gap-2">
              <MdOutlineStickyNote2 className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-gray-700 truncate max-w-xs" title={valor}>
                {valor}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-400">
              <MdOutlineStickyNote2 className="w-4 h-4" />
              <span className="text-sm italic">Clique para adicionar</span>
            </div>
          );

        // ✅ NOVO: Campo de persistência (recorrentes)
        case 'persistent':
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              valor 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {valor ? 'Persistente' : 'Não Persistente'}
            </span>
          );

        // ✅ NOVO: Campo de updated_at
        case 'updated_at':
          return valor ? (
            <div className="text-xs text-gray-500">
              {new Date(valor).toLocaleDateString('pt-BR')} às {new Date(valor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          ) : (
            <span className="text-gray-400 text-xs">Nunca atualizada</span>
          );
          
        case 'content':
          return (
            <div className="min-w-[200px] max-w-md md:max-w-lg lg:max-w-xl">
              <span className="text-sm break-words whitespace-pre-wrap">{valor}</span>
            </div>
          );

        // ✅ NOVO: Campos avançados de recorrência
        case 'weekly_interval':
          return valor ? `${valor} semanas` : '-';

        case 'selected_weekday':
          const diaSemana = diasDaSemana.find(d => d.valor === valor);
          return diaSemana ? diaSemana.nome : '-';

        case 'monthly_ordinal':
          const ordinal = ordinaisMensais.find(o => o.value === valor);
          return ordinal ? ordinal.label : '-';

        case 'monthly_weekday':
          const diaSemanaM = diasDaSemana.find(d => d.valor === valor);
          return diaSemanaM ? diaSemanaM.nome : '-';
          
        default:
          return valor;
      }
    };

    return (
      <div
        onClick={() => iniciarEdicao(item.id, field, valor, itemType)}
        className="px-2 py-1 hover:bg-blue-50 hover:border hover:border-blue-200 rounded cursor-pointer transition-colors group min-h-[2rem] flex items-center"
        title="Clique para editar"
      >
        <div className="flex-1">
          {renderizarValor()}
        </div>
        <FiEdit3 className="ml-2 w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
      </div>
    );
  };

  // =====================================
  // ✅ COMPONENTES DE RENDERIZAÇÃO DE TABELAS ATUALIZADAS
  // =====================================

  const TaskRow = ({ task, isNew = false }) => {
    const [localTask, setLocalTask] = useState(task || {
      content: '',
      task_list_id: '',
      usuario_id: '',
      completed: false,
      date: '',
      note: '' // ✅ NOVO CAMPO
    });

    const handleSave = () => {
      if (!localTask.content.trim() || !localTask.task_list_id || !localTask.usuario_id) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      
      // ✅ NOVA VALIDAÇÃO: Verificar se usuário restrito está tentando atribuir a outra pessoa
      if (userPermissions.isRestricted && localTask.usuario_id !== user.id) {
        toast.error('Você só pode atribuir atividades para si mesmo');
        return;
      }
      
      saveTask(localTask);
    };

    const handleCancel = () => {
      if (isNew) {
        setNewTask(null);
      } else {
        setEditingTask(null);
      }
    };

    return (
      <tr className="border-b border-gray-200 hover:bg-gray-50 bg-blue-50">
        <td className="px-4 py-3">
          <textarea
            value={localTask.content}
            onChange={(e) => setLocalTask({...localTask, content: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descrição da atividade"
            rows={2}
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={localTask.task_list_id}
            onChange={(e) => {
              const novoUsuarioId = userPermissions.isRestricted ? user.id : '';
              setLocalTask({...localTask, task_list_id: e.target.value, usuario_id: novoUsuarioId});
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {/* ✅ MODIFICADO: Usar listas acessíveis */}
            {getListasAcessiveis().map(([id, lista]) => (
              <option key={id} value={id}>
                {lista.nome} ({projetos[lista.projeto_id]})
                {userPermissions.isRestricted && ' - Acesso Permitido'}
              </option>
            ))}
          </select>
          
          {/* ✅ NOVO: Aviso se não há listas acessíveis */}
          {userPermissions.isRestricted && getListasAcessiveis().length === 0 && (
            <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
              <FiShield className="w-3 h-3" />
              Você não tem acesso a nenhuma lista
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <select
            value={localTask.usuario_id}
            onChange={(e) => setLocalTask({...localTask, usuario_id: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!localTask.task_list_id}
          >
            <option value="">Selecione...</option>
            {localTask.task_list_id && getUsuariosPorLista(localTask.task_list_id).map(usuario => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
          
          {/* ✅ NOVO: Indicador para usuários restritos */}
          {userPermissions.isRestricted && localTask.task_list_id && getUsuariosPorLista(localTask.task_list_id).length === 0 && (
            <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
              <FiShield className="w-3 h-3" />
              Você não tem acesso a esta lista
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <input
            type="date"
            value={localTask.date || ''}
            onChange={(e) => setLocalTask({...localTask, date: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={localTask.completed}
            onChange={(e) => setLocalTask({...localTask, completed: e.target.value === 'true'})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={false}>⏳ Pendente</option>
            <option value={true}>✅ Concluída</option>
          </select>
        </td>
        {/* ✅ NOVA COLUNA: Nota */}
        <td className="px-4 py-3">
          <textarea
            value={localTask.note || ''}
            onChange={(e) => setLocalTask({...localTask, note: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Nota opcional..."
            rows={2}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Salvar"
            >
              <FiSave className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cancelar"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const RoutineRow = ({ routine, isNew = false }) => {
    const [localRoutine, setLocalRoutine] = useState(routine || {
      content: '',
      task_list_id: '',
      usuario_id: '',
      recurrence_type: 'daily',
      recurrence_interval: 1,
      recurrence_days: [],
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      persistent: true, // ✅ NOVO CAMPO
      note: '', // ✅ NOVO CAMPO
      // ✅ NOVOS CAMPOS AVANÇADOS
      weekly_interval: 2,
      selected_weekday: 1,
      monthly_ordinal: 1,
      monthly_weekday: 1
    });

    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleSave = () => {
      if (!localRoutine.content.trim() || !localRoutine.task_list_id || !localRoutine.usuario_id) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      
      // ✅ NOVA VALIDAÇÃO: Verificar se usuário restrito está tentando atribuir a outra pessoa
      if (userPermissions.isRestricted && localRoutine.usuario_id !== user.id) {
        toast.error('Você só pode atribuir atividades recorrentes para si mesmo');
        return;
      }
      
      if (localRoutine.recurrence_type === 'weekly' && (!localRoutine.recurrence_days || localRoutine.recurrence_days.length === 0)) {
        toast.error('Selecione pelo menos um dia da semana para recorrência semanal');
        return;
      }

      // ✅ Validações para tipos avançados
      if (['biweekly', 'triweekly', 'quadweekly'].includes(localRoutine.recurrence_type) && !localRoutine.selected_weekday) {
        toast.error('Selecione um dia da semana');
        return;
      }

      if (localRoutine.recurrence_type === 'monthly_weekday') {
        if (!localRoutine.monthly_ordinal || !localRoutine.monthly_weekday) {
          toast.error('Configure a ocorrência e o dia da semana');
          return;
        }
      }
      
      saveRoutine(localRoutine);
    };

    const handleCancel = () => {
      if (isNew) {
        setNewRoutine(null);
      } else {
        setEditingRoutine(null);
      }
    };

    const handleWeekDayChange = (day, checked) => {
      const currentDays = localRoutine.recurrence_days || [];
      let newDays;
      
      if (checked) {
        newDays = [...currentDays, day].sort();
      } else {
        newDays = currentDays.filter(d => d !== day);
      }
      
      setLocalRoutine({...localRoutine, recurrence_days: newDays});
    };

    const toggleAdvanced = () => {
      setShowAdvanced(!showAdvanced);
    };

    return (
      <tr className="border-b border-gray-200 hover:bg-gray-50 bg-purple-50">
        <td className="px-4 py-3">
          <textarea
            value={localRoutine.content}
            onChange={(e) => setLocalRoutine({...localRoutine, content: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descrição da recorrente"
            rows={2}
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={localRoutine.task_list_id}
            onChange={(e) => {
              const novoUsuarioId = userPermissions.isRestricted ? user.id : '';
              setLocalRoutine({...localRoutine, task_list_id: e.target.value, usuario_id: novoUsuarioId});
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {/* ✅ MODIFICADO: Usar listas acessíveis */}
            {getListasAcessiveis().map(([id, lista]) => (
              <option key={id} value={id}>
                {lista.nome} ({projetos[lista.projeto_id]})
                {userPermissions.isRestricted && ' - Acesso Permitido'}
              </option>
            ))}
          </select>
          
          {/* ✅ NOVO: Aviso se não há listas acessíveis */}
          {userPermissions.isRestricted && getListasAcessiveis().length === 0 && (
            <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
              <FiShield className="w-3 h-3" />
              Você não tem acesso a nenhuma lista
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <select
            value={localRoutine.usuario_id}
            onChange={(e) => setLocalRoutine({...localRoutine, usuario_id: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!localRoutine.task_list_id}
          >
            <option value="">Selecione...</option>
            {localRoutine.task_list_id && getUsuariosPorLista(localRoutine.task_list_id).map(usuario => (
              <option key={usuario.id} value={usuario.id}>
                {usuario.nome}
              </option>
            ))}
          </select>
          
          {/* ✅ NOVO: Indicador para usuários restritos */}
          {userPermissions.isRestricted && localRoutine.task_list_id && getUsuariosPorLista(localRoutine.task_list_id).length === 0 && (
            <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
              <FiShield className="w-3 h-3" />
              Você não tem acesso a esta lista
            </div>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="space-y-2">
            {/* ✅ Tipos básicos */}
            <select
              value={localRoutine.recurrence_type}
              onChange={(e) => setLocalRoutine({...localRoutine, recurrence_type: e.target.value, recurrence_days: []})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tiposRecorrenciaBasicos.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            
            {/* ✅ Toggle para tipos avançados */}
            <button
              type="button"
              onClick={toggleAdvanced}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
            >
              {showAdvanced ? (
                <FiChevronUp className="w-3 h-3 mr-1" />
              ) : (
                <FiChevronDown className="w-3 h-3 mr-1" />
              )}
              Opções Avançadas
            </button>
            
            {/* ✅ Tipos avançados (colapsáveis) */}
            {showAdvanced && (
              <select
                value={tiposRecorrenciaAvancados.some(t => t.value === localRoutine.recurrence_type) ? localRoutine.recurrence_type : ''}
                onChange={(e) => e.target.value && setLocalRoutine({...localRoutine, recurrence_type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              >
                <option value="">Selecione avançado...</option>
                {tiposRecorrenciaAvancados.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {/* ✅ Renderização condicional baseada no tipo */}
          {localRoutine.recurrence_type === 'weekly' ? (
            <div className="flex flex-wrap gap-1">
              {weekDays.map(day => (
                <label key={day.value} className="flex items-center text-xs">
                  <input
                    type="checkbox"
                    checked={(localRoutine.recurrence_days || []).includes(day.value)}
                    onChange={(e) => handleWeekDayChange(day.value, e.target.checked)}
                    className="mr-1"
                  />
                  {day.label.slice(0, 3)}
                </label>
              ))}
            </div>
          ) : ['biweekly', 'triweekly', 'quadweekly'].includes(localRoutine.recurrence_type) ? (
            <div className="space-y-2">
              <select
                value={localRoutine.selected_weekday || 1}
                onChange={(e) => setLocalRoutine({...localRoutine, selected_weekday: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {diasDaSemana.map(dia => (
                  <option key={dia.valor} value={dia.valor}>
                    {dia.nome}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500">
                A cada {localRoutine.recurrence_type === 'biweekly' ? '2' : 
                        localRoutine.recurrence_type === 'triweekly' ? '3' : '4'} semanas
              </div>
            </div>
          ) : localRoutine.recurrence_type === 'monthly_weekday' ? (
            <div className="space-y-2">
              <select
                value={localRoutine.monthly_ordinal || 1}
                onChange={(e) => setLocalRoutine({...localRoutine, monthly_ordinal: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {ordinaisMensais.map(ordinal => (
                  <option key={ordinal.value} value={ordinal.value}>
                    {ordinal.label}
                  </option>
                ))}
              </select>
              <select
                value={localRoutine.monthly_weekday || 1}
                onChange={(e) => setLocalRoutine({...localRoutine, monthly_weekday: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {diasDaSemana.map(dia => (
                  <option key={dia.valor} value={dia.valor}>
                    {dia.nome}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              type="number"
              min="1"
              value={localRoutine.recurrence_interval}
              onChange={(e) => setLocalRoutine({...localRoutine, recurrence_interval: parseInt(e.target.value) || 1})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </td>
        <td className="px-4 py-3">
          <input
            type="date"
            value={localRoutine.start_date}
            onChange={(e) => setLocalRoutine({...localRoutine, start_date: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="date"
            value={localRoutine.end_date || ''}
            onChange={(e) => setLocalRoutine({...localRoutine, end_date: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </td>
        {/* ✅ NOVA COLUNA: Persistente */}
        <td className="px-4 py-3">
          <select
            value={localRoutine.persistent}
            onChange={(e) => setLocalRoutine({...localRoutine, persistent: e.target.value === 'true'})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={true}>Persistente</option>
            <option value={false}>Não Persistente</option>
          </select>
        </td>
        {/* ✅ NOVA COLUNA: Nota */}
        <td className="px-4 py-3">
          <textarea
            value={localRoutine.note || ''}
            onChange={(e) => setLocalRoutine({...localRoutine, note: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Nota opcional..."
            rows={2}
          />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Salvar"
            >
              <FiSave className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cancelar"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (!user) {
    return null;
  }

  const completedStats = getCompletedStats();

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Atividades - Gestão Inteligente</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="atividades e recorrentes"
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
                        router.push('/inicio');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                    >
                      <FiHome className="mr-3 h-4 w-4" />
                      Início
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push('/visualizacao-atividades');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiCheckCircle className="mr-3 h-4 w-4" />
                      Visualizar Atividades
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
                        router.push('/perfil');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push('/configuracoes');
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
            
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  placeholder="Buscar atividades ou recorrentes..."
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
            
            {showFilters && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Projeto
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={projetoSelecionado}
                      onChange={(e) => {
                        setProjetoSelecionado(e.target.value);
                        setListaSelecionada('');
                      }}
                    >
                      <option value="">Todos</option>
                      {Object.entries(projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Lista
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={listaSelecionada}
                      onChange={(e) => setListaSelecionada(e.target.value)}
                      disabled={!projetoSelecionado}
                    >
                      <option value="">Todas</option>
                      {projetoSelecionado && getListasPorProjeto(projetoSelecionado).map(([id, lista]) => (
                        <option key={id} value={id}>{lista.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ✅ FILTRO DE USUÁRIO MODIFICADO: Só aparece para admins/gestores */}
                {!userPermissions.isRestricted && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Usuário Responsável
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={usuarioSelecionado}
                      onChange={(e) => setUsuarioSelecionado(e.target.value)}
                    >
                      <option value="">Todos os usuários</option>
                      {Object.entries(usuariosColaboradores).map(([id, usuario]) => (
                        <option key={id} value={id}>
                          {usuario.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeTab === 'atividades' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Status
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={completedFiltro}
                      onChange={(e) => setCompletedFiltro(e.target.value)}
                    >
                      {statusFiltroOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                  >
                    Limpar Filtros
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Desktop */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="atividades e recorrentes"
                showFallback={true}
              />
              
              <div className="flex-1 max-w-md lg:max-w-lg mx-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    placeholder="Buscar atividades ou recorrentes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
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
                          router.push('/inicio');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                      >
                        <FiHome className="mr-3 h-4 w-4" />
                        Início
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/visualizacao-atividades');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiCheckCircle className="mr-3 h-4 w-4" />
                        Visualizar Atividades
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
                          router.push('/perfil');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                      >
                        <FiUser className="mr-3 h-4 w-4" />
                        Perfil
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/configuracoes');
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
            
            {showFilters && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Projeto
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={projetoSelecionado}
                      onChange={(e) => {
                        setProjetoSelecionado(e.target.value);
                        setListaSelecionada('');
                      }}
                    >
                      <option value="">Todos os projetos</option>
                      {Object.entries(projetos).map(([id, nome]) => (
                        <option key={id} value={id}>{nome}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Lista
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={listaSelecionada}
                      onChange={(e) => setListaSelecionada(e.target.value)}
                      disabled={!projetoSelecionado}
                    >
                      <option value="">Todas as listas</option>
                      {projetoSelecionado && getListasPorProjeto(projetoSelecionado).map(([id, lista]) => (
                        <option key={id} value={id}>{lista.nome}</option>
                      ))}
                    </select>
                  </div>

                  {/* ✅ FILTRO DE USUÁRIO MODIFICADO: Só aparece para admins/gestores */}
                  {!userPermissions.isRestricted && (
                    <div className="w-full sm:flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Usuário Responsável
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={usuarioSelecionado}
                        onChange={(e) => setUsuarioSelecionado(e.target.value)}
                      >
                        <option value="">Todos os usuários</option>
                        {Object.entries(usuariosColaboradores).map(([id, usuario]) => (
                          <option key={id} value={id}>
                            {usuario.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {activeTab === 'atividades' && (
                    <div className="w-full sm:flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={completedFiltro}
                        onChange={(e) => setCompletedFiltro(e.target.value)}
                      >
                        {statusFiltroOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Estatísticas rápidas - VERSÃO MOBILE COMPACTA */}
        {activeTab === 'atividades' && atividades.length > 0 && (
          <div className="mb-6 grid grid-cols-3 gap-2 md:gap-4">
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
              <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
                <div className="md:flex-1">
                  <div className="text-xl md:text-2xl font-bold text-gray-900">{completedStats.total}</div>
                  <div className="text-xs md:text-sm font-medium text-gray-600 mt-1">
                    <span className="block md:hidden">Total</span>
                    <span className="hidden md:block">Total de atividades</span>
                  </div>
                </div>
                <div className="p-2 rounded-full bg-gray-100 mt-2 md:mt-0 md:ml-2">
                  <FiTarget className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
              <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
                <div className="md:flex-1">
                  <div className="text-xl md:text-2xl font-bold text-yellow-600">{completedStats.pending}</div>
                  <div className="text-xs md:text-sm font-medium text-yellow-700 mt-1">Pendentes</div>
                </div>
                <div className="p-2 rounded-full bg-yellow-100 mt-2 md:mt-0 md:ml-2">
                  <FiClock className="w-4 h-4 md:w-5 md:h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-3 md:p-4 rounded-lg shadow-sm">
              <div className="flex flex-col items-center text-center md:flex-row md:items-center md:justify-between md:text-left">
                <div className="md:flex-1">
                  <div className="text-xl md:text-2xl font-bold text-green-600">{completedStats.completed}</div>
                  <div className="text-xs md:text-sm font-medium text-green-700 mt-1">Concluídas</div>
                </div>
                <div className="p-2 rounded-full bg-green-100 mt-2 md:mt-0 md:ml-2">
                  <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('atividades')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'atividades'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiTarget className="w-4 h-4" />
                Atividades
                {atividades.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {atividades.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('recorrentes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'recorrentes'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiRefreshCw className="w-4 h-4" />
                Recorrentes
                {recorrentes.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {recorrentes.length}
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo das abas */}
        {projetosVinculados.length === 0 ? (
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
          <div className="bg-white rounded-lg shadow-sm">
            {/* Header da tabela - RESPONSIVO */}
            <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 md:gap-3 mb-1 md:mb-2">
                    <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-1 md:gap-2">
                      {activeTab === 'atividades' ? (
                        <>
                          <FiTarget className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                          <span className="hidden sm:inline">Atividades</span>
                          <span className="sm:hidden">Atividades</span>
                        </>
                      ) : (
                        <>
                          <FiRefreshCw className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
                          <span className="hidden sm:inline">Atividades Recorrentes</span>
                          <span className="sm:hidden">Recorrentes</span>
                        </>
                      )}
                      
                      {/* ✅ NOVO: Indicador visual de restrição */}
                      {userPermissions.isRestricted && (
                        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                          <FiShield className="w-3 h-3" />
                          <span className="hidden md:inline">Visualização Restrita</span>
                          <span className="md:hidden">Restrita</span>
                        </div>
                      )}
                    </h2>
                    
                    {/* Ícone de Ajuda */}
                    <button
                      onClick={() => {
                        setHelpModalType(activeTab);
                        setShowHelpModal(true);
                      }}
                      className="p-1 md:p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors group relative"
                      title={`Ajuda sobre ${activeTab === 'atividades' ? 'Atividades' : 'Atividades Recorrentes'}`}
                    >
                      <FiHelpCircle className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </div>
                  
                  {/* Descrição - apenas no desktop */}
                  <p className="hidden md:block text-sm text-gray-500">
                    {activeTab === 'atividades' 
                      ? 'Gerencie suas atividades com edição inline - clique para editar'
                      : 'Configure suas atividades recorrentes com edição inline - suporte completo a tipos avançados'
                    }
                  </p>
                </div>
                
                {/* Botão Adicionar - Compacto no mobile */}
                <div className="relative group ml-2 md:ml-4">
                  <button className="flex items-center px-2 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base">
                    <FiPlus className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">
                      Adicionar {activeTab === 'atividades' ? 'atividade' : 'recorrente'}
                    </span>
                    <span className="sm:hidden">
                      Add
                    </span>
                    <svg className="w-3 h-3 md:w-4 md:h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-56 md:w-64 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          if (activeTab === 'atividades') {
                            setNewTask({});
                            setEditingTask('new');
                          } else {
                            setNewRoutine({});
                            setEditingRoutine('new');
                          }
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-gray-700"
                      >
                        <FiEdit3 className="w-4 h-4 mr-3" />
                        <div>
                          <div className="font-medium text-sm">Adicionar Individual</div>
                          <div className="text-xs text-gray-500">
                            Criar uma {activeTab === 'atividades' ? 'atividade' : 'recorrente'} por vez
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => setShowExcelImporter(true)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-gray-700"
                      >
                        <FiUpload className="w-4 h-4 mr-3" />
                        <div>
                          <div className="font-medium text-sm">Importar via Excel</div>
                          <div className="text-xs text-gray-500">
                            Adicionar múltiplas {activeTab} de uma vez
                          </div>
                        </div>
                      </button>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ TABELA DE atividades ATUALIZADA COM NOVAS COLUNAS */}
            {activeTab === 'atividades' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2 md:w-1/2 lg:w-2/5 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <FiEdit3 className="w-3 h-3" />
                          Descrição
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lista (Projeto)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responsável
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data Limite
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      {/* ✅ NOVA COLUNA: Nota */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <MdOutlineStickyNote2 className="w-3 h-3" />
                          Nota
                        </div>
                      </th>
                      {/* ✅ NOVA COLUNA: Atualizada em */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <FiClock className="w-3 h-3" />
                          Atualizada em
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Nova atividade */}
                    {editingTask === 'new' && newTask && (
                      <TaskRow task={newTask} isNew={true} />
                    )}
                    
                    {/* atividades existentes */}
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center">
                          <div className="flex justify-center items-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            <span className="text-gray-500 text-sm">Carregando atividades...</span>
                          </div>
                        </td>
                      </tr>
                    ) : atividades.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center">
                          <div className="py-4">
                            <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                              <FiTarget className="w-6 h-6 text-blue-600" />
                            </div>
                            <h4 className="text-lg font-medium text-gray-900 mb-2">
                              {searchTerm.trim() || completedFiltro
                                ? 'Nenhuma atividade encontrada'
                                : 'Nenhuma atividade criada ainda'
                              }
                            </h4>
                            <p className="text-gray-500 text-sm max-w-sm mx-auto">
                              {searchTerm.trim() || completedFiltro
                                ? 'Tente ajustar os filtros ou termo de busca para encontrar suas atividades'
                                : 'Clique em "Adicionar atividade" para criar sua primeira atividade'
                              }
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      atividades.map((task) => (
                        editingTask === task.id ? (
                          <TaskRow key={task.id} task={task} />
                        ) : (
                          <tr key={task.id} className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${task.completed ? 'opacity-75' : ''}`}>
                            {/* ✅ COLUNA: Descrição */}
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'content', 'textarea', [], 'atividades')}
                            </td>
                            
                            {/* ✅ COLUNA: Lista (Projeto) */}
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'task_list_id', 'select', 
                                getListasAcessiveis().map(([id, lista]) => ({
                                  value: parseInt(id),
                                  label: `${lista.nome} (${projetos[lista.projeto_id]})`
                                })), 'atividades'
                              )}
                            </td>
                            
                            {/* ✅ COLUNA: Responsável */}
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'usuario_id', 'select',
                                getUsuariosPorLista(task.task_list_id).map(usuario => ({
                                  value: usuario.id,
                                  label: usuario.nome
                                })), 'atividades'
                              )}
                            </td>
                            
                            {/* ✅ COLUNA: Data Limite */}
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'date', 'date', [], 'atividades')}
                            </td>
                            
                            {/* ✅ COLUNA: Status */}
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'completed', 'select', 
                                completedOptions.map(option => ({
                                  value: option.value.toString(),
                                  label: `${option.icon} ${option.label}`
                                })), 'atividades'
                              )}
                            </td>
                            
                            {/* ✅ NOVA COLUNA: Nota */}
                            <td className="px-4 py-3 min-w-[200px]">
                              <div
                                onClick={() => iniciarEdicao(task.id, 'note', task.note || '', 'atividades')}
                                className="px-2 py-1 hover:bg-blue-50 hover:border hover:border-blue-200 rounded cursor-pointer transition-colors group min-h-[2rem] flex items-center"
                                title="Clique para editar nota"
                              >
                                <div className="flex-1">
                                  {task.note && task.note.trim() !== '' ? (
                                    <div className="flex items-start gap-2">
                                      <MdOutlineStickyNote2 className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm text-gray-700 line-clamp-2 break-words" title={task.note}>
                                          {task.note.length > 50 ? `${task.note.substring(0, 50)}...` : task.note}
                                        </span>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-gray-400">
                                      <MdOutlineStickyNote2 className="w-4 h-4" />
                                      <span className="text-sm italic">Clique para adicionar</span>
                                    </div>
                                  )}
                                </div>
                                <FiEdit3 className="ml-2 w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity flex-shrink-0" />
                              </div>
                            </td>
                            
                            {/* ✅ NOVA COLUNA: Atualizada em */}
                            <td className="px-4 py-3 min-w-[140px]">
                              <div className="text-xs text-gray-500">
                                {task.updated_at ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1">
                                      <FiCalendar className="w-3 h-3" />
                                      <span>{new Date(task.updated_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <FiClock className="w-3 h-3" />
                                      <span>{new Date(task.updated_at).toLocaleTimeString('pt-BR', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}</span>
                                    </div>
                                  </div>
                                ) : task.created_at ? (
                                  <div className="space-y-1">
                                    <div className="text-gray-400">Nunca atualizada</div>
                                    <div className="flex items-center gap-1">
                                      <FiPlus className="w-3 h-3" />
                                      <span>Criada: {new Date(task.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400 italic">Sem informação</span>
                                )}
                              </div>
                            </td>
                            
                            {/* ✅ COLUNA: Ações */}
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                {/* Botão de editar */}
                                <button
                                  onClick={() => setEditingTask(task.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors group relative"
                                  title="Editar completo"
                                >
                                  <FiEdit3 className="w-4 h-4" />
                                </button>
                                
                                {/* Botão de toggle status rápido */}
                                <button
                                  onClick={() => toggleCompleted(task.id, task.completed)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    task.completed
                                      ? 'text-green-600 hover:bg-green-100'
                                      : 'text-yellow-600 hover:bg-yellow-100'
                                  }`}
                                  title={task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
                                >
                                  {task.completed ? (
                                    <FiCheckCircle className="w-4 h-4" />
                                  ) : (
                                    <FiClock className="w-4 h-4" />
                                  )}
                                </button>
                                
                                {/* Botão de excluir */}
                                <button
                                  onClick={() => deleteTask(task.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Excluir atividade"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ✅ TABELA DE recorrentes ATUALIZADA COM NOVAS COLUNAS E TIPOS AVANÇADOS */}
            {activeTab === 'recorrentes' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2 md:w-1/2 lg:w-2/5 min-w-[200px]">
                        <div className="flex items-center gap-2">
                          <FiEdit3 className="w-3 h-3" />
                          Descrição
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lista (Projeto)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Responsável
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo de Recorrência
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Configuração
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Início
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fim
                      </th>
                      {/* ✅ NOVA COLUNA: Persistente */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Persistência
                      </th>
                      {/* ✅ NOVA COLUNA: Nota */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <MdOutlineStickyNote2 className="w-3 h-3" />
                          Nota
                        </div>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Nova recorrente */}
                    {editingRoutine === 'new' && newRoutine && (
                      <RoutineRow routine={newRoutine} isNew={true} />
                    )}
                    
                    {/* recorrentes existentes */}
                    {loading ? (
                      <tr>
                        <td colSpan="10" className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          </div>
                        </td>
                      </tr>
                    ) : recorrentes.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                          {searchTerm.trim() 
                            ? `Nenhuma recorrente encontrada para "${searchTerm}"`
                            : 'Nenhuma recorrente encontrada'
                          }
                        </td>
                      </tr>
                    ) : (
                      recorrentes.map((routine) => (
                        editingRoutine === routine.id ? (
                          <RoutineRow key={routine.id} routine={routine} />
                        ) : (
                          <tr key={routine.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'content', 'textarea', [], 'recorrentes')}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'task_list_id', 'select', 
                                getListasAcessiveis().map(([id, lista]) => ({
                                  value: parseInt(id),
                                  label: `${lista.nome} (${projetos[lista.projeto_id]})`
                                })), 'recorrentes'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'usuario_id', 'select',
                                getUsuariosPorLista(routine.task_list_id).map(usuario => ({
                                  value: usuario.id,
                                  label: usuario.nome
                                })), 'recorrentes'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'recurrence_type', 'select', recurrenceTypes, 'recorrentes')}
                            </td>
                            <td className="px-4 py-3">
                              {/* ✅ Exibição da configuração formatada */}
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">
                                  {formatarRecorrenciaAvancada(routine)}
                                </div>
                                {/* ✅ Detalhes específicos por tipo */}
                                {routine.recurrence_type === 'weekly' && routine.recurrence_days && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Dias: {routine.recurrence_days.map(d => 
                                      diasDaSemana.find(dia => dia.valor === d)?.abrev
                                    ).join(', ')}
                                  </div>
                                )}
                                {['biweekly', 'triweekly', 'quadweekly'].includes(routine.recurrence_type) && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Intervalo: {routine.weekly_interval || 2} semanas
                                    <br />
                                    Dia: {diasDaSemana.find(d => d.valor === routine.selected_weekday)?.nome}
                                  </div>
                                )}
                                {routine.recurrence_type === 'monthly_weekday' && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {ordinaisMensais.find(o => o.value === routine.monthly_ordinal)?.label} {diasDaSemana.find(d => d.valor === routine.monthly_weekday)?.nome}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'start_date', 'date', [], 'recorrentes')}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'end_date', 'date', [], 'recorrentes')}
                            </td>
                            {/* ✅ NOVA COLUNA: Persistente */}
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'persistent', 'select', [
                                { value: 'true', label: 'Persistente' },
                                { value: 'false', label: 'Não Persistente' }
                              ], 'recorrentes')}
                            </td>
                            {/* ✅ NOVA COLUNA: Nota */}
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'note', 'textarea', [], 'recorrentes')}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingRoutine(routine.id)}
                                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                  title="Editar completo"
                                >
                                  <FiEdit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteRoutine(routine.id)}
                                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <FiTrash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        
      </div>

      {/* Excel Importer Modal */}
      {showExcelImporter && (
        <ExcelImporter
          onClose={() => setShowExcelImporter(false)}
          onSuccess={handleExcelImportSuccess}
          type={activeTab}
          listas={listas}
          projetos={projetos}
          usuarios={usuarios}
          usuariosListas={usuariosListas}
        />
      )}

      {/* Modal de Confirmação para Edição Inline */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center mb-4">
              <FiAlertCircle className="w-6 h-6 text-orange-500 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">
                Salvar Alterações?
              </h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                Você alterou o campo <strong>
                  {editando?.field === 'content' ? 'Descrição' : 
                   editando?.field === 'task_list_id' ? 'Lista/Projeto' :
                   editando?.field === 'usuario_id' ? 'Responsável' :
                   editando?.field === 'date' ? 'Data Limite' :
                   editando?.field === 'completed' ? 'Status' :
                   editando?.field === 'recurrence_type' ? 'Tipo de Recorrência' :
                   editando?.field === 'start_date' ? 'Data de Início' :
                   editando?.field === 'end_date' ? 'Data de Fim' :
                   editando?.field === 'note' ? 'Nota' :
                   editando?.field === 'persistent' ? 'Persistência' :
                   editando?.field === 'weekly_interval' ? 'Intervalo Semanal' :
                   editando?.field === 'selected_weekday' ? 'Dia da Semana' :
                   editando?.field === 'monthly_ordinal' ? 'Ordinal Mensal' :
                   editando?.field === 'monthly_weekday' ? 'Dia da Semana Mensal' :
                   editando?.field}
                </strong>:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-16">De:</span>
                  <span className="text-sm font-medium text-red-600 truncate">
                    {valorOriginal === 'true' ? '✅ Sim/Ativado' :
                     valorOriginal === 'false' ? '❌ Não/Desativado' :
                     valorOriginal || 'Vazio'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-16">Para:</span>
                  <span className="text-sm font-medium text-green-600 truncate">
                    {valorEdicao === 'true' ? '✅ Sim/Ativado' :
                     valorEdicao === 'false' ? '❌ Não/Desativado' :
                     valorEdicao || 'Vazio'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={descartarAlteracoes}
                disabled={salvando}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <FiX className="w-4 h-4 inline mr-1" />
                Descartar
              </button>
              <button
                onClick={salvarEdicaoInline}
                disabled={salvando}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {salvando ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4 mr-1" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menus quando clicar fora */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <HelpModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          type={helpModalType}
        />
      )}
    </div>
  );
}