// Arquivo: src/pages/tarefas-rotinas.js - VERSÃO CORRIGIDA PARA SCHEMA REAL
import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiSearch, 
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
  FiCheckCircle
} from 'react-icons/fi';

export default function TarefasRotinas({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tarefas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const inputRef = useRef(null);

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

  // Estados para tarefas
  const [tarefas, setTarefas] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState(null);

  // Estados para rotinas
  const [rotinas, setRotinas] = useState([]);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [newRoutine, setNewRoutine] = useState(null);

  // Estados para edição inline
  const [editando, setEditando] = useState(null); // { rowId, field, type }
  const [valorEdicao, setValorEdicao] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);

  // Opções para status das tarefas (baseado no campo completed)
  const completedOptions = [
    { value: false, label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    { value: true, label: 'Concluída', color: 'bg-green-100 text-green-800', icon: '✅' }
  ];

  // Opções para filtro de status
  const statusFiltroOptions = [
    { value: '', label: 'Todas as tarefas' },
    { value: 'false', label: '⏳ Pendentes' },
    { value: 'true', label: '✅ Concluídas' }
  ];

  // Opções para tipo de recorrência
  const recurrenceTypes = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' }
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

  // =====================================
  // FUNÇÕES DE CARREGAMENTO DE DADOS
  // =====================================

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
  const iniciarEdicao = (rowId, field, valorAtual, type = 'tarefas') => {
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
      const tabela = editando.type === 'tarefas' ? 'tasks' : 'routine_tasks';
      let updateData = { [editando.field]: valorEdicao };

      // Conversões específicas para alguns campos
      if (editando.field === 'task_list_id' || editando.field === 'usuario_id') {
        updateData[editando.field] = valorEdicao;
      }
      
      if (editando.field === 'completed') {
        updateData[editando.field] = valorEdicao === 'true' || valorEdicao === true;
      }
      
      if (editando.field === 'recurrence_interval') {
        updateData[editando.field] = parseInt(valorEdicao) || 1;
      }

      const { error } = await supabase
        .from(tabela)
        .update(updateData)
        .eq('id', editando.rowId);
      
      if (error) throw error;

      // Atualizar dados localmente
      if (editando.type === 'tarefas') {
        setTarefas(prevTarefas => 
          prevTarefas.map(tarefa => 
            tarefa.id === editando.rowId 
              ? { ...tarefa, [editando.field]: updateData[editando.field] }
              : tarefa
          )
        );
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        setRotinas(prevRotinas => 
          prevRotinas.map(rotina => 
            rotina.id === editando.rowId 
              ? { ...rotina, [editando.field]: updateData[editando.field] }
              : rotina
          )
        );
        toast.success('Rotina atualizada com sucesso!');
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
  // FUNÇÕES PARA TAREFAS
  // =====================================

  const fetchTarefas = async () => {
    if (projetosVinculados.length === 0) return;
    
    try {
      setLoading(true);
      
      // Buscar listas dos projetos vinculados
      const listasIds = Object.keys(listas).map(id => parseInt(id));
      
      if (listasIds.length === 0) {
        setTarefas([]);
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
      
      // Aplicar filtros
      if (listaSelecionada) {
        query = query.eq('task_list_id', listaSelecionada);
      }
      
      if (completedFiltro !== '') {
        query = query.eq('completed', completedFiltro === 'true');
      }
      
      if (searchTerm.trim()) {
        query = query.ilike('content', `%${searchTerm.trim()}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const saveTask = async (task) => {
    try {
      if (task.id) {
        // Atualizar tarefa existente
        const { error } = await supabase
          .from('tasks')
          .update({
            content: task.content,
            task_list_id: task.task_list_id,
            usuario_id: task.usuario_id,
            completed: task.completed || false,
            date: task.date || null
          })
          .eq('id', task.id);
        
        if (error) throw error;
        toast.success('Tarefa atualizada com sucesso!');
      } else {
        // Criar nova tarefa
        const { error } = await supabase
          .from('tasks')
          .insert({
            content: task.content,
            task_list_id: task.task_list_id,
            usuario_id: task.usuario_id,
            completed: false,
            date: task.date || null
          });
        
        if (error) throw error;
        toast.success('Tarefa criada com sucesso!');
      }
      
      setEditingTask(null);
      setNewTask(null);
      fetchTarefas();
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error('Erro ao salvar tarefa');
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      
      if (error) throw error;
      
      toast.success('Tarefa excluída com sucesso!');
      fetchTarefas();
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
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
      
      setTarefas(prevTarefas => 
        prevTarefas.map(tarefa => 
          tarefa.id === taskId 
            ? { ...tarefa, completed: !currentCompleted }
            : tarefa
        )
      );
      
      toast.success(`Tarefa ${!currentCompleted ? 'concluída' : 'reaberta'}!`);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  // =====================================
  // FUNÇÕES PARA ROTINAS
  // =====================================

  const fetchRotinas = async () => {
    if (projetosVinculados.length === 0) return;
    
    try {
      setLoading(true);
      
      // Buscar listas dos projetos vinculados
      const listasIds = Object.keys(listas).map(id => parseInt(id));
      
      if (listasIds.length === 0) {
        setRotinas([]);
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
      
      // Aplicar filtros
      if (listaSelecionada) {
        query = query.eq('task_list_id', listaSelecionada);
      }
      
      if (searchTerm.trim()) {
        query = query.ilike('content', `%${searchTerm.trim()}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setRotinas(data || []);
    } catch (error) {
      console.error('Erro ao carregar rotinas:', error);
      toast.error('Erro ao carregar rotinas');
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
        end_date: routine.end_date || null
      };
      
      if (routine.id) {
        // Atualizar rotina existente
        const { error } = await supabase
          .from('routine_tasks')
          .update(routineData)
          .eq('id', routine.id);
        
        if (error) throw error;
        toast.success('Rotina atualizada com sucesso!');
      } else {
        // Criar nova rotina
        const { error } = await supabase
          .from('routine_tasks')
          .insert(routineData);
        
        if (error) throw error;
        toast.success('Rotina criada com sucesso!');
      }
      
      setEditingRoutine(null);
      setNewRoutine(null);
      fetchRotinas();
    } catch (error) {
      console.error('Erro ao salvar rotina:', error);
      toast.error('Erro ao salvar rotina');
    }
  };

  const deleteRoutine = async (routineId) => {
    if (!confirm('Tem certeza que deseja excluir esta rotina?')) return;
    
    try {
      const { error } = await supabase
        .from('routine_tasks')
        .delete()
        .eq('id', routineId);
      
      if (error) throw error;
      
      toast.success('Rotina excluída com sucesso!');
      fetchRotinas();
    } catch (error) {
      console.error('Erro ao excluir rotina:', error);
      toast.error('Erro ao excluir rotina');
    }
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
    return usuariosIds.map(id => ({ id, nome: usuarios[id] || 'Usuário não encontrado' }));
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
    const total = tarefas.length;
    const completed = tarefas.filter(t => t.completed).length;
    const pending = total - completed;
    
    return {
      total,
      completed,
      pending,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
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
        const projetoIds = await fetchProjetosVinculados(user.id);
        await fetchProjetos(projetoIds);
        await fetchListas(projetoIds);
        await fetchUsuariosListas();
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };

    loadInitialData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'tarefas') {
      fetchTarefas();
    } else {
      fetchRotinas();
    }
  }, [activeTab, projetosVinculados, listas, listaSelecionada, completedFiltro, searchTerm]);

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
    setShowFilters(false);
  };

  const hasActiveFilters = projetoSelecionado || listaSelecionada || completedFiltro;

  // =====================================
  // COMPONENTES DE RENDERIZAÇÃO INLINE
  // =====================================

  const renderizarCelulaEditavel = (item, field, tipo = 'text', options = [], itemType = 'tarefas') => {
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
                title={`Clique para ${valor ? 'reabrir' : 'concluir'} tarefa`}
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
              <span className="text-sm">{usuarios[valor] || 'Não atribuído'}</span>
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
          
        case 'content':
          return (
            <div className="max-w-xs">
              <span className="text-sm">{valor}</span>
            </div>
          );
          
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
  // COMPONENTES DE RENDERIZAÇÃO DE TABELAS
  // =====================================

  const TaskRow = ({ task, isNew = false }) => {
    const [localTask, setLocalTask] = useState(task || {
      content: '',
      task_list_id: '',
      usuario_id: '',
      completed: false,
      date: ''
    });

    const handleSave = () => {
      if (!localTask.content.trim() || !localTask.task_list_id || !localTask.usuario_id) {
        toast.error('Preencha todos os campos obrigatórios');
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
            placeholder="Descrição da tarefa"
            rows={2}
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={localTask.task_list_id}
            onChange={(e) => {
              setLocalTask({...localTask, task_list_id: e.target.value, usuario_id: ''});
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {Object.entries(listas).map(([id, lista]) => (
              <option key={id} value={id}>
                {lista.nome} ({projetos[lista.projeto_id]})
              </option>
            ))}
          </select>
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
      end_date: ''
    });

    const handleSave = () => {
      if (!localRoutine.content.trim() || !localRoutine.task_list_id || !localRoutine.usuario_id) {
        toast.error('Preencha todos os campos obrigatórios');
        return;
      }
      
      if (localRoutine.recurrence_type === 'weekly' && (!localRoutine.recurrence_days || localRoutine.recurrence_days.length === 0)) {
        toast.error('Selecione pelo menos um dia da semana para recorrência semanal');
        return;
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

    return (
      <tr className="border-b border-gray-200 hover:bg-gray-50 bg-purple-50">
        <td className="px-4 py-3">
          <textarea
            value={localRoutine.content}
            onChange={(e) => setLocalRoutine({...localRoutine, content: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descrição da rotina"
            rows={2}
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={localRoutine.task_list_id}
            onChange={(e) => {
              setLocalRoutine({...localRoutine, task_list_id: e.target.value, usuario_id: ''});
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecione...</option>
            {Object.entries(listas).map(([id, lista]) => (
              <option key={id} value={id}>
                {lista.nome} ({projetos[lista.projeto_id]})
              </option>
            ))}
          </select>
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
        </td>
        <td className="px-4 py-3">
          <select
            value={localRoutine.recurrence_type}
            onChange={(e) => setLocalRoutine({...localRoutine, recurrence_type: e.target.value, recurrence_days: []})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {recurrenceTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
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
        <title>Tarefas e Rotinas - Gestão Inteligente</title>
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
                fallbackText="Tarefas e Rotinas"
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
                        router.push('/controle-indicador');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiEdit3 className="mr-3 h-4 w-4" />
                      Criar Indicador Base
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push('/analise-multiplos-indicadores');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiCpu className="mr-3 h-4 w-4" />
                      Análises Indicadores
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push('/historico-acessos');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiList className="mr-3 h-4 w-4" />
                      Histórico Acessos (admin)
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
                  placeholder="Buscar tarefas ou rotinas..."
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

                {activeTab === 'tarefas' && (
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
                fallbackText="Tarefas e Rotinas"
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
                    placeholder="Buscar tarefas ou rotinas..."
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
                          router.push('/controle-indicador');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiEdit3 className="mr-3 h-4 w-4" />
                        Criar Indicador Base
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/analise-multiplos-indicadores');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiCpu className="mr-3 h-4 w-4" />
                        Análises Indicadores
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          router.push('/historico-acessos');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                      >
                        <FiList className="mr-3 h-4 w-4" />
                        Histórico Acessos (admin)
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

                  {activeTab === 'tarefas' && (
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
        {/* Estatísticas rápidas - Apenas para tarefas */}
        {activeTab === 'tarefas' && tarefas.length > 0 && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{completedStats.total}</div>
                  <div className="text-sm font-medium text-gray-600">Total de Tarefas</div>
                </div>
                <div className="p-2 rounded-full bg-gray-100">
                  <FiTarget className="w-5 h-5 text-gray-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{completedStats.pending}</div>
                  <div className="text-sm font-medium text-yellow-700">Pendentes</div>
                </div>
                <div className="p-2 rounded-full bg-yellow-100">
                  <FiClock className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{completedStats.completed}</div>
                  <div className="text-sm font-medium text-green-700">Concluídas</div>
                </div>
                <div className="p-2 rounded-full bg-green-100">
                  <FiCheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progresso das tarefas */}
        {activeTab === 'tarefas' && completedStats.total > 0 && (
          <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Progresso Geral</h3>
              <span className="text-sm text-gray-500">{completedStats.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{width: `${completedStats.percentage}%`}}
              ></div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('tarefas')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'tarefas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiTarget className="w-4 h-4" />
                Tarefas
                {tarefas.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {tarefas.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('rotinas')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'rotinas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FiRefreshCw className="w-4 h-4" />
                Rotinas
                {rotinas.length > 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                    {rotinas.length}
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
            {/* Header da tabela */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {activeTab === 'tarefas' ? (
                      <>
                        <FiTarget className="w-5 h-5 text-blue-600" />
                        Tarefas
                      </>
                    ) : (
                      <>
                        <FiRefreshCw className="w-5 h-5 text-purple-600" />
                        Rotinas
                      </>
                    )}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'tarefas' 
                      ? 'Gerencie suas tarefas com edição inline - clique para editar'
                      : 'Configure suas rotinas recorrentes com edição inline'
                    }
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    if (activeTab === 'tarefas') {
                      setNewTask({});
                      setEditingTask('new');
                    } else {
                      setNewRoutine({});
                      setEditingRoutine('new');
                    }
                  }}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Adicionar {activeTab === 'tarefas' ? 'Tarefa' : 'Rotina'}
                </button>
              </div>
            </div>

            {/* Tabela de Tarefas com Edição Inline */}
            {activeTab === 'tarefas' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Nova tarefa */}
                    {editingTask === 'new' && newTask && (
                      <TaskRow task={newTask} isNew={true} />
                    )}
                    
                    {/* Tarefas existentes */}
                    {loading ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          </div>
                        </td>
                      </tr>
                    ) : tarefas.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          {searchTerm.trim() || completedFiltro
                            ? 'Nenhuma tarefa encontrada com os filtros aplicados'
                            : 'Nenhuma tarefa encontrada'
                          }
                        </td>
                      </tr>
                    ) : (
                      tarefas.map((task) => (
                        editingTask === task.id ? (
                          <TaskRow key={task.id} task={task} />
                        ) : (
                          <tr key={task.id} className={`border-b border-gray-200 hover:bg-gray-50 ${task.completed ? 'opacity-75' : ''}`}>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'content', 'textarea', [], 'tarefas')}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'task_list_id', 'select', 
                                Object.entries(listas).map(([id, lista]) => ({
                                  value: parseInt(id),
                                  label: `${lista.nome} (${projetos[lista.projeto_id]})`
                                })), 'tarefas'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'usuario_id', 'select',
                                getUsuariosPorLista(task.task_list_id).map(usuario => ({
                                  value: usuario.id,
                                  label: usuario.nome
                                })), 'tarefas'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'date', 'date', [], 'tarefas')}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(task, 'completed', 'select', 
                                completedOptions.map(option => ({
                                  value: option.value.toString(),
                                  label: `${option.icon} ${option.label}`
                                })), 'tarefas'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingTask(task.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Editar completo"
                                >
                                  <FiEdit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteTask(task.id)}
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

            {/* Tabela de Rotinas com Edição Inline */}
            {activeTab === 'rotinas' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recorrência
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Início
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fim
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Nova rotina */}
                    {editingRoutine === 'new' && newRoutine && (
                      <RoutineRow routine={newRoutine} isNew={true} />
                    )}
                    
                    {/* Rotinas existentes */}
                    {loading ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          </div>
                        </td>
                      </tr>
                    ) : rotinas.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                          {searchTerm.trim() 
                            ? `Nenhuma rotina encontrada para "${searchTerm}"`
                            : 'Nenhuma rotina encontrada'
                          }
                        </td>
                      </tr>
                    ) : (
                      rotinas.map((routine) => (
                        editingRoutine === routine.id ? (
                          <RoutineRow key={routine.id} routine={routine} />
                        ) : (
                          <tr key={routine.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'content', 'textarea', [], 'rotinas')}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'task_list_id', 'select', 
                                Object.entries(listas).map(([id, lista]) => ({
                                  value: parseInt(id),
                                  label: `${lista.nome} (${projetos[lista.projeto_id]})`
                                })), 'rotinas'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'usuario_id', 'select',
                                getUsuariosPorLista(routine.task_list_id).map(usuario => ({
                                  value: usuario.id,
                                  label: usuario.nome
                                })), 'rotinas'
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'recurrence_type', 'select', recurrenceTypes, 'rotinas')}
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">
                                {routine.recurrence_type === 'weekly' 
                                  ? formatWeekDays(routine.recurrence_days)
                                  : `A cada ${routine.recurrence_interval} ${routine.recurrence_type === 'daily' ? 'dia(s)' : routine.recurrence_type === 'monthly' ? 'mês(es)' : 'ano(s)'}`
                                }
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'start_date', 'date', [], 'rotinas')}
                            </td>
                            <td className="px-4 py-3">
                              {renderizarCelulaEditavel(routine, 'end_date', 'date', [], 'rotinas')}
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

        {/* Instruções de uso */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
            <FiTarget className="w-4 h-4" />
            💡 Como usar a edição inline:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <ul className="space-y-1">
              <li>• <strong>Clique</strong> em qualquer célula editável para começar</li>
              <li>• Use <kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Enter</kbd> para confirmar</li>
              <li>• Use <kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Esc</kbd> para cancelar</li>
            </ul>
            <ul className="space-y-1">
              <li>• <strong>Clique fora</strong> do campo para confirmar automaticamente</li>
              <li>• Modal aparece apenas se houver mudanças</li>
              <li>• Ícone <FiEdit3 className="inline w-3 h-3" /> aparece no hover</li>
              <li>• <strong>Status:</strong> Clique no ícone ✅/⏳ para alternar rapidamente</li>
            </ul>
          </div>
        </div>
      </div>

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
                   editando?.field}
                </strong>:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-16">De:</span>
                  <span className="text-sm font-medium text-red-600 truncate">
                    {valorOriginal === 'true' ? '✅ Concluída' :
                     valorOriginal === 'false' ? '⏳ Pendente' :
                     valorOriginal || 'Vazio'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-16">Para:</span>
                  <span className="text-sm font-medium text-green-600 truncate">
                    {valorEdicao === 'true' ? '✅ Concluída' :
                     valorEdicao === 'false' ? '⏳ Pendente' :
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
    </div>
  );
}