// ✅ VERSÃO DEFINITIVA: src/pages/gestao-tarefas-rotinas.js
// Gestão de Tarefas e Rotinas com Edição Inline - Acesso: Admin ou Gestor

import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { hasAdminPermissions } from '../utils/userUtils';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiHome, FiMenu, FiUser, FiSettings, FiLogOut, FiList, FiFolder, FiEdit3,
  FiTrendingUp, FiSave, FiX, FiCheck, FiAlertCircle, FiRepeat, FiCheckCircle,
  FiFilter, FiCalendar, FiClock, FiUsers, FiEdit, FiTrash2, FiEye
} from 'react-icons/fi';

export default function GestaoTarefasRotinas({ user }) {
  const router = useRouter();
  
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('tarefas');
  
  // Estados de dados
  const [tarefas, setTarefas] = useState([]);
  const [rotinas, setRotinas] = useState([]);
  const [listas, setListas] = useState({});
  const [usuarios, setUsuarios] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosPermitidos, setProjetosPermitidos] = useState([]);
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    projeto_id: '',
    lista_id: '',
    usuario_id: '',
    status: '',
    data_inicio: '',
    data_fim: ''
  });
  const [showFiltros, setShowFiltros] = useState(false);
  
  // Estados de edição inline
  const [editando, setEditando] = useState(null);
  const [valorEdicao, setValorEdicao] = useState('');
  const [valorOriginal, setValorOriginal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  const inputRef = useRef(null);

  // ===========================================
  // VERIFICAÇÃO DE PERMISSÕES
  // ===========================================

  const verificarPermissoes = () => {
    if (!user || !hasAdminPermissions(user)) {
      toast.error('Você não tem permissão para acessar esta página');
      router.push('/inicio');
      return false;
    }
    return true;
  };

  // ===========================================
  // FUNÇÕES DE CARREGAMENTO DE DADOS
  // ===========================================

  const carregarProjetosPermitidos = async () => {
    try {
      if (user.admin) {
        // Admin pode ver todos os projetos
        const { data: todosProj, error } = await supabase
          .from('projetos')
          .select('id, nome')
          .order('nome');
        
        if (error) throw error;
        return todosProj.map(p => p.id);
      } else {
        // Gestor pode ver apenas projetos vinculados
        const { data, error } = await supabase
          .from('relacao_usuarios_projetos')
          .select('projeto_id')
          .eq('usuario_id', user.id);
        
        if (error) throw error;
        return data.map(rel => rel.projeto_id);
      }
    } catch (error) {
      console.error('Erro ao carregar projetos permitidos:', error);
      return [];
    }
  };

  const carregarDadosBasicos = async () => {
    try {
      const projetosIds = await carregarProjetosPermitidos();
      setProjetosPermitidos(projetosIds);

      if (projetosIds.length === 0) {
        toast.error('Você não tem acesso a nenhum projeto');
        return;
      }

      // Carregar projetos
      const { data: projData, error: projError } = await supabase
        .from('projetos')
        .select('id, nome')
        .in('id', projetosIds)
        .order('nome');
      
      if (projError) throw projError;
      
      const projObj = {};
      projData.forEach(proj => {
        projObj[proj.id] = proj.nome;
      });
      setProjetos(projObj);

      // Carregar listas dos projetos permitidos
      const { data: listasData, error: listasError } = await supabase
        .from('tasks_list')
        .select('id, nome_lista, projeto_id')
        .in('projeto_id', projetosIds)
        .order('nome_lista');
      
      if (listasError) throw listasError;
      
      const listasObj = {};
      listasData.forEach(lista => {
        listasObj[lista.id] = {
          nome: lista.nome_lista,
          projeto_id: lista.projeto_id
        };
      });
      setListas(listasObj);

      // Carregar usuários
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('ativo', true)
        .order('nome');
      
      if (usersError) throw usersError;
      
      const usersObj = {};
      usersData.forEach(u => {
        usersObj[u.id] = u;
      });
      setUsuarios(usersObj);

      // Selecionar primeiro projeto por padrão
      if (projData.length > 0 && !filtros.projeto_id) {
        setFiltros(prev => ({ ...prev, projeto_id: projData[0].id }));
      }

    } catch (error) {
      console.error('Erro ao carregar dados básicos:', error);
      toast.error('Erro ao carregar dados iniciais');
    }
  };

  const carregarTarefas = async () => {
    try {
      // Buscar listas do projeto selecionado
      const listasIds = Object.entries(listas)
        .filter(([id, lista]) => !filtros.projeto_id || lista.projeto_id === filtros.projeto_id)
        .map(([id]) => parseInt(id));

      if (listasIds.length === 0) return;

      let query = supabase
        .from('tasks')
        .select(`
          *,
          usuarios!inner(nome, email),
          tasks_list!inner(nome_lista, projeto_id)
        `)
        .in('task_list_id', listasIds)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.lista_id) {
        query = query.eq('task_list_id', filtros.lista_id);
      }
      if (filtros.usuario_id) {
        query = query.eq('usuario_id', filtros.usuario_id);
      }
      if (filtros.status !== '') {
        query = query.eq('completed', filtros.status === 'completed');
      }
      if (filtros.data_inicio) {
        query = query.gte('date', filtros.data_inicio);
      }
      if (filtros.data_fim) {
        query = query.lte('date', filtros.data_fim);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTarefas(data || []);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast.error('Erro ao carregar tarefas');
    }
  };

  const carregarRotinas = async () => {
    try {
      // Buscar listas do projeto selecionado
      const listasIds = Object.entries(listas)
        .filter(([id, lista]) => !filtros.projeto_id || lista.projeto_id === filtros.projeto_id)
        .map(([id]) => parseInt(id));

      if (listasIds.length === 0) return;

      let query = supabase
        .from('routine_tasks')
        .select(`
          *,
          usuarios!inner(nome, email),
          tasks_list!inner(nome_lista, projeto_id)
        `)
        .in('task_list_id', listasIds)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtros.lista_id) {
        query = query.eq('task_list_id', filtros.lista_id);
      }
      if (filtros.usuario_id) {
        query = query.eq('usuario_id', filtros.usuario_id);
      }
      if (filtros.data_inicio) {
        query = query.gte('start_date', filtros.data_inicio);
      }
      if (filtros.data_fim) {
        query = query.lte('start_date', filtros.data_fim);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRotinas(data || []);
    } catch (error) {
      console.error('Erro ao carregar rotinas:', error);
      toast.error('Erro ao carregar rotinas');
    }
  };

  // ===========================================
  // FUNÇÕES DE EDIÇÃO INLINE
  // ===========================================

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);

  const iniciarEdicao = (rowId, field, valorAtual, tableName) => {
    setEditando({ rowId, field, tableName });
    setValorEdicao(valorAtual || '');
    setValorOriginal(valorAtual || '');
  };

  const cancelarEdicao = () => {
    setEditando(null);
    setValorEdicao('');
    setValorOriginal('');
  };

  const confirmarEdicao = () => {
    if (valorEdicao !== valorOriginal) {
      setMostrarModal(true);
    } else {
      cancelarEdicao();
    }
  };

  const salvarAlteracoes = async () => {
    if (!editando) return;

    setSalvando(true);
    setMostrarModal(false);

    try {
      let dadosAtualizacao = {};
      
      // Converter valores conforme necessário
      if (editando.field === 'completed') {
        dadosAtualizacao[editando.field] = valorEdicao === 'true';
      } else if (editando.field === 'recurrence_interval') {
        dadosAtualizacao[editando.field] = parseInt(valorEdicao) || 1;
      } else {
        dadosAtualizacao[editando.field] = valorEdicao;
      }

      // Atualizar no Supabase
      const { error } = await supabase
        .from(editando.tableName)
        .update(dadosAtualizacao)
        .eq('id', editando.rowId);

      if (error) throw error;

      // Atualizar estado local
      if (editando.tableName === 'tasks') {
        setTarefas(prev => 
          prev.map(item => 
            item.id === editando.rowId 
              ? { ...item, [editando.field]: dadosAtualizacao[editando.field] }
              : item
          )
        );
      } else if (editando.tableName === 'routine_tasks') {
        setRotinas(prev => 
          prev.map(item => 
            item.id === editando.rowId 
              ? { ...item, [editando.field]: dadosAtualizacao[editando.field] }
              : item
          )
        );
      }

      toast.success('Alteração salva com sucesso!');
      cancelarEdicao();

    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvando(false);
    }
  };

  const descartarAlteracoes = () => {
    setMostrarModal(false);
    cancelarEdicao();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmarEdicao();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelarEdicao();
    }
  };

  // ===========================================
  // FUNÇÕES DE RENDERIZAÇÃO
  // ===========================================

  const validarCampo = (field, valor) => {
    switch (field) {
      case 'content':
        return valor.trim().length > 0;
      case 'recurrence_interval':
        return parseInt(valor) > 0;
      case 'date':
      case 'start_date':
      case 'end_date':
        return valor === '' || /^\d{4}-\d{2}-\d{2}$/.test(valor);
      default:
        return true;
    }
  };

  const renderizarCelula = (item, field, tipo = 'text', opcoes = [], tableName = 'tasks') => {
    const isEditando = editando?.rowId === item.id && editando?.field === field;
    const valor = item[field];

    // Campos não editáveis
    const camposNaoEditaveis = ['id', 'created_at', 'updated_at', 'completed_at', 'usuario_id', 'task_list_id'];
    if (camposNaoEditaveis.includes(field)) {
      return <span className="text-gray-500">{formatarValor(valor, field)}</span>;
    }

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
              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {opcoes.map(opcao => (
                <option key={opcao.value} value={opcao.value}>
                  {opcao.label}
                </option>
              ))}
            </select>
          ) : tipo === 'textarea' ? (
            <textarea
              ref={inputRef}
              value={valorEdicao}
              onChange={(e) => setValorEdicao(e.target.value)}
              onBlur={confirmarEdicao}
              onKeyDown={handleKeyPress}
              rows={2}
              className="w-full px-2 py-1 border-2 border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          ) : (
            <input
              ref={inputRef}
              type={tipo}
              value={valorEdicao}
              onChange={(e) => setValorEdicao(e.target.value)}
              onBlur={confirmarEdicao}
              onKeyDown={handleKeyPress}
              className={`w-full px-2 py-1 border-2 rounded focus:outline-none focus:ring-2 ${
                validarCampo(field, valorEdicao)
                  ? 'border-blue-500 focus:ring-blue-300'
                  : 'border-red-500 focus:ring-red-300'
              }`}
            />
          )}
          <div className="absolute -top-6 left-0 text-xs text-gray-500 whitespace-nowrap">
            Enter ✓ • Esc ✗
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => iniciarEdicao(item.id, field, valor, tableName)}
        className="px-2 py-1 hover:bg-blue-50 hover:border hover:border-blue-200 rounded cursor-pointer transition-colors group min-h-[32px] flex items-center"
        title={`Clique para editar ${field}`}
      >
        <span className="group-hover:text-blue-600 flex-1">
          {formatarValor(valor, field)}
        </span>
        <FiEdit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity ml-1" />
      </div>
    );
  };

  const formatarValor = (valor, field) => {
    switch (field) {
      case 'completed':
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            valor ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {valor ? 'Concluída' : 'Pendente'}
          </span>
        );
      case 'recurrence_type':
        const tipos = { daily: 'Diária', weekly: 'Semanal', monthly: 'Mensal' };
        return tipos[valor] || valor;
      case 'recurrence_days':
        if (!valor || valor.length === 0) return '-';
        const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return valor.map(d => dias[d === 7 ? 0 : d]).join(', ');
      case 'date':
      case 'start_date':
      case 'end_date':
      case 'created_at':
      case 'updated_at':
      case 'completed_at':
        return valor ? new Date(valor).toLocaleDateString('pt-BR') : '-';
      default:
        return valor || '-';
    }
  };

  const getListasFiltradas = () => {
    if (!filtros.projeto_id) return {};
    return Object.fromEntries(
      Object.entries(listas).filter(([id, lista]) => lista.projeto_id === filtros.projeto_id)
    );
  };

  // ===========================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ===========================================

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
  // EFFECTS
  // ===========================================

  useEffect(() => {
    if (!verificarPermissoes()) return;
  }, [user, router]);

  useEffect(() => {
    const carregarDados = async () => {
      if (user && hasAdminPermissions(user)) {
        setLoading(true);
        await carregarDadosBasicos();
        setLoading(false);
      }
    };
    
    carregarDados();
  }, [user]);

  useEffect(() => {
    if (filtros.projeto_id) {
      if (abaAtiva === 'tarefas') {
        carregarTarefas();
      } else {
        carregarRotinas();
      }
    }
  }, [filtros, abaAtiva, listas]);

  // ===========================================
  // RENDER
  // ===========================================

  if (!user || !hasAdminPermissions(user)) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Gestão de Tarefas e Rotinas</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <LogoDisplay 
              className=""
              fallbackText="Gestão de Tarefas e Rotinas"
              showFallback={true}
            />
            
            <div className="flex items-center space-x-3">
              {/* Botão de filtros */}
              <button
                onClick={() => setShowFiltros(!showFiltros)}
                className={`p-3 rounded-lg transition-colors ${
                  showFiltros ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
      </div>

      {/* Filtros */}
      {showFiltros && (
        <div className="sticky top-[72px] bg-white border-b border-gray-200 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Projeto */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Projeto</label>
                <select
                  value={filtros.projeto_id}
                  onChange={(e) => setFiltros(prev => ({ 
                    ...prev, 
                    projeto_id: e.target.value,
                    lista_id: '' // Resetar lista quando mudar projeto
                  }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os projetos</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>

              {/* Lista */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Lista</label>
                <select
                  value={filtros.lista_id}
                  onChange={(e) => setFiltros(prev => ({ ...prev, lista_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!filtros.projeto_id}
                >
                  <option value="">Todas as listas</option>
                  {Object.entries(getListasFiltradas()).map(([id, lista]) => (
                    <option key={id} value={id}>{lista.nome}</option>
                  ))}
                </select>
              </div>

              {/* Usuário */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Usuário</label>
                <select
                  value={filtros.usuario_id}
                  onChange={(e) => setFiltros(prev => ({ ...prev, usuario_id: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os usuários</option>
                  {Object.entries(usuarios).map(([id, usuario]) => (
                    <option key={id} value={id}>{usuario.nome}</option>
                  ))}
                </select>
              </div>

              {/* Status (apenas para tarefas) */}
              {abaAtiva === 'tarefas' && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={filtros.status}
                    onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="completed">Concluídas</option>
                    <option value="pending">Pendentes</option>
                  </select>
                </div>
              )}

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Data Início</label>
                <input
                  type="date"
                  value={filtros.data_inicio}
                  onChange={(e) => setFiltros(prev => ({ ...prev, data_inicio: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data Fim */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={filtros.data_fim}
                  onChange={(e) => setFiltros(prev => ({ ...prev, data_fim: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Botão para limpar filtros */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setFiltros({
                  projeto_id: '',
                  lista_id: '',
                  usuario_id: '',
                  status: '',
                  data_inicio: '',
                  data_fim: ''
                })}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="ml-3 text-gray-600">Carregando dados...</p>
          </div>
        ) : (
          <>
            {/* Header da página */}
            <div className="mb-6">
              <h1 className="text-2xl lg:text-3xl font-bold text-black">
                Gestão de Tarefas e Rotinas
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {user.admin ? 'Visualização administrativa' : 'Visualização gerencial'} - 
                Gerencie tarefas e rotinas dos projetos vinculados
              </p>
            </div>

            {/* Abas */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setAbaAtiva('tarefas')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      abaAtiva === 'tarefas'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <FiCheckCircle className="w-4 h-4 mr-2" />
                      Tarefas ({tarefas.length})
                    </div>
                  </button>
                  <button
                    onClick={() => setAbaAtiva('rotinas')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      abaAtiva === 'rotinas'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <FiRepeat className="w-4 h-4 mr-2" />
                      Rotinas ({rotinas.length})
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Estatísticas */}
            {abaAtiva === 'tarefas' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FiCheckCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Total</p>
                      <p className="text-xl font-bold text-gray-900">{tarefas.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiCheck className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Concluídas</p>
                      <p className="text-xl font-bold text-gray-900">
                        {tarefas.filter(t => t.completed).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FiClock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Pendentes</p>
                      <p className="text-xl font-bold text-gray-900">
                        {tarefas.filter(t => !t.completed).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FiUsers className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Usuários</p>
                      <p className="text-xl font-bold text-gray-900">
                        {new Set(tarefas.map(t => t.usuario_id)).size}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FiRepeat className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Total</p>
                      <p className="text-xl font-bold text-gray-900">{rotinas.length}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FiCalendar className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Ativas</p>
                      <p className="text-xl font-bold text-gray-900">
                        {rotinas.filter(r => !r.end_date || new Date(r.end_date) >= new Date()).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FiX className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Expiradas</p>
                      <p className="text-xl font-bold text-gray-900">
                        {rotinas.filter(r => r.end_date && new Date(r.end_date) < new Date()).length}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm border">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FiUsers className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-500">Usuários</p>
                      <p className="text-xl font-bold text-gray-900">
                        {new Set(rotinas.map(r => r.usuario_id)).size}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabela de Tarefas */}
            {abaAtiva === 'tarefas' && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Tarefas - Edição Inline
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em qualquer célula editável para modificar diretamente
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Conteúdo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lista/Projeto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Criada em
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tarefas.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <FiCheckCircle className="w-12 h-12 text-gray-300 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhuma tarefa encontrada
                              </h3>
                              <p className="text-gray-500 text-sm">
                                Ajuste os filtros ou selecione um projeto diferente
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        tarefas.map((tarefa) => (
                          <tr key={tarefa.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                              {renderizarCelula(tarefa, 'content', 'textarea', [], 'tasks')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {usuarios[tarefa.usuario_id]?.nome?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {usuarios[tarefa.usuario_id]?.nome || 'Usuário não encontrado'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {usuarios[tarefa.usuario_id]?.email || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <div className="font-medium">
                                  {tarefa.tasks_list?.nome_lista || 'Lista não encontrada'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {projetos[tarefa.tasks_list?.projeto_id] || 'Projeto não encontrado'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderizarCelula(tarefa, 'date', 'date', [], 'tasks')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderizarCelula(tarefa, 'completed', 'select', [
                                { value: 'false', label: 'Pendente' },
                                { value: 'true', label: 'Concluída' }
                              ], 'tasks')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatarValor(tarefa.created_at, 'created_at')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {tarefas.length} tarefa{tarefas.length !== 1 ? 's' : ''} encontrada{tarefas.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Tabela de Rotinas */}
            {abaAtiva === 'rotinas' && (
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Rotinas - Edição Inline
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Clique em qualquer célula editável para modificar diretamente
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Conteúdo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lista/Projeto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Intervalo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dias da Semana
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Início
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data Fim
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {rotinas.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center">
                              <FiRepeat className="w-12 h-12 text-gray-300 mb-4" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">
                                Nenhuma rotina encontrada
                              </h3>
                              <p className="text-gray-500 text-sm">
                                Ajuste os filtros ou selecione um projeto diferente
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        rotinas.map((rotina) => (
                          <tr key={rotina.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                              {renderizarCelula(rotina, 'content', 'textarea', [], 'routine_tasks')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {usuarios[rotina.usuario_id]?.nome?.charAt(0)?.toUpperCase() || '?'}
                                    </span>
                                  </div>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {usuarios[rotina.usuario_id]?.nome || 'Usuário não encontrado'}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {usuarios[rotina.usuario_id]?.email || ''}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <div className="font-medium">
                                  {rotina.tasks_list?.nome_lista || 'Lista não encontrada'}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {projetos[rotina.tasks_list?.projeto_id] || 'Projeto não encontrado'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderizarCelula(rotina, 'recurrence_type', 'select', [
                                { value: 'daily', label: 'Diária' },
                                { value: 'weekly', label: 'Semanal' },
                                { value: 'monthly', label: 'Mensal' }
                              ], 'routine_tasks')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderizarCelula(rotina, 'recurrence_interval', 'number', [], 'routine_tasks')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatarValor(rotina.recurrence_days, 'recurrence_days')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderizarCelula(rotina, 'start_date', 'date', [], 'routine_tasks')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {renderizarCelula(rotina, 'end_date', 'date', [], 'routine_tasks')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    {rotinas.length} rotina{rotinas.length !== 1 ? 's' : ''} encontrada{rotinas.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Confirmação */}
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
                Você alterou o campo <strong>{editando?.field}</strong>:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-16">De:</span>
                  <span className="text-sm font-medium text-red-600">
                    {valorOriginal || '(vazio)'}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 w-16">Para:</span>
                  <span className="text-sm font-medium text-green-600">
                    {valorEdicao || '(vazio)'}
                  </span>
                </div>
              </div>
              
              {!validarCampo(editando?.field, valorEdicao) && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">
                    ⚠️ Valor inválido para este campo
                  </p>
                </div>
              )}
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
                onClick={salvarAlteracoes}
                disabled={salvando || !validarCampo(editando?.field, valorEdicao)}
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
      {(showMenu || showFiltros) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-5"
          onClick={() => {
            setShowMenu(false);
            setShowFiltros(false);
          }}
        />
      )}
    </div>
  );
}