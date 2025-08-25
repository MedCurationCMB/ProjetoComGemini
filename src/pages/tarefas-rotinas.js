// Arquivo: src/pages/tarefas-rotinas.js
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
  FiCpu
} from 'react-icons/fi';

export default function TarefasRotinas({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tarefas');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Estados para dados base
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [projetos, setProjetos] = useState({});
  const [listas, setListas] = useState({});
  const [usuariosListas, setUsuariosListas] = useState({});
  const [usuarios, setUsuarios] = useState({});

  // Estados para filtros
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [listaSelecionada, setListaSelecionada] = useState('');

  // Estados para tarefas
  const [tarefas, setTarefas] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState(null);

  // Estados para rotinas
  const [rotinas, setRotinas] = useState([]);
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [newRoutine, setNewRoutine] = useState(null);

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
  }, [activeTab, projetosVinculados, listas, listaSelecionada, searchTerm]);

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
    setShowFilters(false);
  };

  const hasActiveFilters = projetoSelecionado || listaSelecionada;

  // =====================================
  // COMPONENTES DE RENDERIZAÇÃO
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
      <tr className="border-b border-gray-200 hover:bg-gray-50">
        <td className="px-4 py-3">
            <input
                type="text"
                value={localTask.content}
                onChange={(e) => setLocalTask({...localTask, content: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição da tarefa"
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
      <tr className="border-b border-gray-200 hover:bg-gray-50">
        <td className="px-4 py-3">
          <input
            type="text"
            value={localRoutine.content}
            onChange={(e) => setLocalRoutine({...localRoutine, content: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descrição da rotina"
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Tarefas e Rotinas</title>
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
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
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
                  
                  <div className="flex-1">
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
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
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
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('tarefas')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tarefas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tarefas
              </button>
              <button
                onClick={() => setActiveTab('rotinas')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rotinas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Rotinas
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
                  <h2 className="text-lg font-semibold text-gray-900">
                    {activeTab === 'tarefas' ? 'Tarefas' : 'Rotinas'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'tarefas' 
                      ? 'Gerencie suas tarefas pendentes'
                      : 'Configure suas rotinas recorrentes'
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

            {/* Tabela de Tarefas */}
            {activeTab === 'tarefas' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
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
                        <td colSpan="5" className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          </div>
                        </td>
                      </tr>
                    ) : tarefas.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          {searchTerm.trim() 
                            ? `Nenhuma tarefa encontrada para "${searchTerm}"`
                            : 'Nenhuma tarefa encontrada'
                          }
                        </td>
                      </tr>
                    ) : (
                      tarefas.map((task) => (
                        editingTask === task.id ? (
                          <TaskRow key={task.id} task={task} />
                        ) : (
                          <tr key={task.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="px-4 py-3">
                                <span className="text-sm">{task.content}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">
                                {task.tasks_list?.nome_lista} ({projetos[task.tasks_list?.projeto_id]})
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{task.usuarios?.nome}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{formatDate(task.date)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingTask(task.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Editar"
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

            {/* Tabela de Rotinas */}
            {activeTab === 'rotinas' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
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
                              <span className="text-sm">{routine.content}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">
                                {routine.tasks_list?.nome_lista} ({projetos[routine.tasks_list?.projeto_id]})
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{routine.usuarios?.nome}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">
                                {recurrenceTypes.find(t => t.value === routine.recurrence_type)?.label}
                              </span>
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
                              <span className="text-sm">{formatDate(routine.start_date)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{formatDate(routine.end_date)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingRoutine(routine.id)}
                                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Editar"
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