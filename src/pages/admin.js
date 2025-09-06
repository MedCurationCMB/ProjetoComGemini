// src/pages/admin.js (versão atualizada com seletor de tipo de usuário)
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { supabase } from "../utils/supabaseClient";
import { activateUser, deactivateUser, isUserAdmin } from "../utils/userUtils";
import GeminiApiKeyManager from "../components/GeminiApiKeyManager";
import LogoManager from "../components/LogoManager";
import GerenciarVinculacoes from "../components/GerenciarVinculacoes";
import LogoDisplay from "../components/LogoDisplay";
import { 
  FiUsers, 
  FiKey, 
  FiImage, 
  FiLink, 
  FiMenu, 
  FiHome, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiUser,
  FiFolder,
  FiTrendingUp,
  FiCpu,
  FiList,
  FiShield,
  FiUserCheck,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiEdit,
  FiSave,
  FiCheck
} from 'react-icons/fi';

export default function Admin({ user }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios', 'gemini', 'logo', 'vinculacoes', 'listas'
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // Estados para vinculações de listas
  const [vinculacoesListas, setVinculacoesListas] = useState([]);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [todasListas, setTodasListas] = useState([]);
  const [loadingListas, setLoadingListas] = useState(false);
  const [showNovaVinculacao, setShowNovaVinculacao] = useState(false);
  const [novaVinculacao, setNovaVinculacao] = useState({ usuario_id: '', list_id: '' });
  const [salvandoVinculacao, setSalvandoVinculacao] = useState(false);

  // Estados para alteração de tipo de usuário
  const [updatingUserType, setUpdatingUserType] = useState(null);

  // Verificar se o usuário é administrador
  useEffect(() => {
    const checkAdminStatus = async () => {
      // Redirecionar se não estiver logado
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

  // Carregar dados baseado na tab ativa
  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'usuarios') {
        fetchUsers();
      } else if (activeTab === 'listas') {
        fetchVinculacoesListas();
      }
    }
  }, [isAdmin, activeTab]);

  // ===========================================
  // FUNÇÕES PARA USUÁRIOS
  // ===========================================

  // Carregar lista de usuários
  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Obter sessão atual
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Você precisa estar logado para esta ação");
        return;
      }

      // Chamar a API para buscar todos os usuários
      const response = await fetch("/api/admin/get-users", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao buscar usuários");
      }

      const data = await response.json();
      console.log("Usuários recuperados:", data.length);
      setUsers(data || []);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Não foi possível carregar a lista de usuários");
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar status ativo/inativo do usuário
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      
      console.log('Usuário ID:', userId);
      console.log('Status atual:', currentStatus);
      console.log('Novo status:', newStatus);

      const result = newStatus 
        ? await activateUser(userId) 
        : await deactivateUser(userId);

      console.log('Resultado da operação:', result);

      if (result) {
        toast.success(
          `Usuário ${newStatus ? 'ativado' : 'desativado'} com sucesso`
        );

        // Atualizar lista de usuários
        setUsers(
          users.map((u) => (u.id === userId ? { ...u, ativo: newStatus } : u))
        );
      } else {
        toast.error("Não foi possível modificar o status do usuário");
      }
    } catch (error) {
      console.error("Erro ao modificar status do usuário:", error);
      toast.error("Não foi possível modificar o status do usuário");
    }
  };

  // Função para obter o tipo de usuário baseado nas flags admin e gestor
  const getUserType = (admin, gestor) => {
    if (admin) return 'admin';
    if (gestor) return 'gestor';
    return 'user';
  };

  // Função para obter o label do tipo de usuário
  const getUserTypeLabel = (userType) => {
    switch (userType) {
      case 'admin': return 'Administrador';
      case 'gestor': return 'Gestor';
      case 'user': return 'Usuário';
      default: return 'Usuário';
    }
  };

  // Função para obter as classes CSS do tipo de usuário
  const getUserTypeClasses = (userType) => {
    switch (userType) {
      case 'admin': 
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'gestor': 
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user': 
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default: 
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Função para alterar o tipo de usuário
  const changeUserType = async (userId, newUserType, userEmail) => {
    // Verificar se não está tentando alterar seu próprio tipo
    if (userId === user.id) {
      toast.error("Você não pode alterar seu próprio tipo de usuário");
      return;
    }

    // Determinar os valores das flags baseado no tipo selecionado
    let adminFlag = false;
    let gestorFlag = false;

    switch (newUserType) {
      case 'admin':
        adminFlag = true;
        gestorFlag = false;
        break;
      case 'gestor':
        adminFlag = false;
        gestorFlag = true;
        break;
      case 'user':
        adminFlag = false;
        gestorFlag = false;
        break;
    }

    // Confirmação para ações críticas
    const typeLabel = getUserTypeLabel(newUserType);
    const confirmed = window.confirm(
      `Tem certeza que deseja alterar o tipo do usuário ${userEmail} para "${typeLabel}"?\n\n${
        newUserType === 'admin' 
          ? 'Este usuário terá acesso total ao sistema.' 
          : newUserType === 'gestor'
            ? 'Este usuário terá privilégios de gestão.'
            : 'Este usuário terá acesso básico ao sistema.'
      }`
    );

    if (!confirmed) return;

    try {
      setUpdatingUserType(userId);

      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Você precisa estar logado para esta ação");
        return;
      }

      // Chamar a API para alterar o tipo de usuário
      const response = await fetch("/api/admin/change-user-type", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId,
          admin: adminFlag,
          gestor: gestorFlag
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar tipo de usuário");
      }

      toast.success(data.message);

      // Atualizar lista de usuários
      setUsers(
        users.map((u) => (u.id === userId ? { 
          ...u, 
          admin: adminFlag, 
          gestor: gestorFlag 
        } : u))
      );

    } catch (error) {
      console.error("Erro ao alterar tipo de usuário:", error);
      toast.error(error.message || "Não foi possível alterar o tipo do usuário");
    } finally {
      setUpdatingUserType(null);
    }
  };

  // ===========================================
  // FUNÇÕES PARA VINCULAÇÕES DE LISTAS
  // ===========================================

  // Carregar vinculações de listas
  const fetchVinculacoesListas = async () => {
    try {
      setLoadingListas(true);

      // Carregar vinculações com dados dos usuários e listas
      const { data: vinculacoes, error: vinculacoesError } = await supabase
        .from('relacao_usuario_list')
        .select(`
          id,
          usuario_id,
          list_id,
          created_at,
          usuarios(id, nome, email),
          tasks_list(id, nome_lista, projeto_id, projetos(nome))
        `)
        .order('created_at', { ascending: false });

      if (vinculacoesError) throw vinculacoesError;

      setVinculacoesListas(vinculacoes || []);

      // Carregar todos os usuários para dropdown
      const { data: usuarios, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, nome, email, ativo')
        .eq('ativo', true)
        .order('nome');

      if (usuariosError) throw usuariosError;

      setTodosUsuarios(usuarios || []);

      // Carregar todas as listas para dropdown
      const { data: listas, error: listasError } = await supabase
        .from('tasks_list')
        .select(`
          id, 
          nome_lista, 
          projeto_id,
          projetos(nome)
        `)
        .order('nome_lista');

      if (listasError) throw listasError;

      setTodasListas(listas || []);

    } catch (error) {
      console.error('Erro ao carregar vinculações de listas:', error);
      toast.error('Erro ao carregar vinculações de listas');
    } finally {
      setLoadingListas(false);
    }
  };

  // Criar nova vinculação
  const criarVinculacao = async () => {
    if (!novaVinculacao.usuario_id || !novaVinculacao.list_id) {
      toast.error('Selecione um usuário e uma lista');
      return;
    }

    // Verificar se vinculação já existe
    const vinculacaoExistente = vinculacoesListas.find(v => 
      v.usuario_id === novaVinculacao.usuario_id && v.list_id === parseInt(novaVinculacao.list_id)
    );

    if (vinculacaoExistente) {
      toast.error('Esta vinculação já existe');
      return;
    }

    try {
      setSalvandoVinculacao(true);

      const { error } = await supabase
        .from('relacao_usuario_list')
        .insert([{
          usuario_id: novaVinculacao.usuario_id,
          list_id: parseInt(novaVinculacao.list_id)
        }]);

      if (error) throw error;

      toast.success('Vinculação criada com sucesso!');
      setShowNovaVinculacao(false);
      setNovaVinculacao({ usuario_id: '', list_id: '' });
      
      // Recarregar dados
      await fetchVinculacoesListas();

    } catch (error) {
      console.error('Erro ao criar vinculação:', error);
      toast.error('Erro ao criar vinculação');
    } finally {
      setSalvandoVinculacao(false);
    }
  };

  // Remover vinculação
  const removerVinculacao = async (vinculacaoId, usuarioNome, listaNome) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja remover a vinculação entre ${usuarioNome} e a lista "${listaNome}"?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('relacao_usuario_list')
        .delete()
        .eq('id', vinculacaoId);

      if (error) throw error;

      toast.success('Vinculação removida com sucesso!');
      
      // Recarregar dados
      await fetchVinculacoesListas();

    } catch (error) {
      console.error('Erro ao remover vinculação:', error);
      toast.error('Erro ao remover vinculação');
    }
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

  const handleNavigate = (path) => {
    setShowMenu(false);
    router.push(path);
  };

  // Função para obter informações da tab ativa
  const getTabInfo = () => {
    switch (activeTab) {
      case 'usuarios':
        return {
          title: 'Gerenciamento de Usuários',
          subtitle: 'Controle o acesso e permissões dos usuários do sistema',
          icon: FiUsers
        };
      case 'vinculacoes':
        return {
          title: 'Vinculações Usuário-Projeto',
          subtitle: 'Gerencie as vinculações entre usuários e projetos',
          icon: FiLink
        };
      case 'listas':
        return {
          title: 'Vinculações Usuário-Lista',
          subtitle: 'Gerencie as vinculações entre usuários e listas de tarefas',
          icon: FiList
        };
      case 'gemini':
        return {
          title: 'Configurações da IA',
          subtitle: 'Configure as chaves da API do Google Gemini',
          icon: FiKey
        };
      case 'logo':
        return {
          title: 'Gerenciamento da Logo',
          subtitle: 'Configure a logo exibida no sistema',
          icon: FiImage
        };
      default:
        return {
          title: 'Administração',
          subtitle: 'Painel de controle do sistema',
          icon: FiSettings
        };
    }
  };

  // Mostrar loading enquanto verifica permissões
  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Não renderizar nada se não for admin
  if (!user || !isAdmin) {
    return null;
  }

  const tabInfo = getTabInfo();
  const IconComponent = tabInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Administração - {tabInfo.title}</title>
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
                fallbackText="Admin"
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
                      onClick={() => handleNavigate('/inicio')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                    >
                      <FiHome className="mr-3 h-4 w-4" />
                      Início
                    </button>
                    <button
                      onClick={() => handleNavigate('/visualizacao-indicadores')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiTrendingUp className="mr-3 h-4 w-4" />
                      Gestão Indicadores
                    </button>
                    <button
                      onClick={() => handleNavigate('/documentos')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiFolder className="mr-3 h-4 w-4" />
                      Gestão Documentos
                    </button>
                    <button
                      onClick={() => handleNavigate('/visualizacao-atividades')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiCheckCircle className="mr-3 h-4 w-4" />
                      Visualizar Atividades
                    </button>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => handleNavigate('/historico-acessos')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiList className="mr-3 h-4 w-4" />
                      Histórico Acessos (admin)
                    </button>
                    <button
                      onClick={() => handleNavigate('/configuracoes')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiSettings className="mr-3 h-4 w-4" />
                      Configurações
                    </button>
                    <button
                      onClick={handleLogout}
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
            <div className="flex items-center justify-between">
              <LogoDisplay 
                className=""
                fallbackText="Admin"
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
                      onClick={() => handleNavigate('/inicio')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                    >
                      <FiHome className="mr-3 h-4 w-4" />
                      Início
                    </button>
                    <button
                      onClick={() => handleNavigate('/visualizacao-indicadores')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiTrendingUp className="mr-3 h-4 w-4" />
                      Gestão Indicadores
                    </button>
                    <button
                      onClick={() => handleNavigate('/documentos')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiFolder className="mr-3 h-4 w-4" />
                      Gestão Documentos
                    </button>
                    <button
                      onClick={() => handleNavigate('/visualizacao-atividades')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                    >
                      <FiCheckCircle className="mr-3 h-4 w-4" />
                      Visualizar Atividades
                    </button>
                    <button
                      onClick={() => setShowMenu(false)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => handleNavigate('/historico-acessos')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiList className="mr-3 h-4 w-4" />
                      Histórico Acessos
                    </button>
                    <button
                      onClick={() => handleNavigate('/configuracoes')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiSettings className="mr-3 h-4 w-4" />
                      Configurações
                    </button>
                    <button
                      onClick={handleLogout}
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
          <div className="flex items-center mb-2">
            <IconComponent className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl lg:text-3xl font-bold text-black">{tabInfo.title}</h1>
          </div>
          <p className="text-gray-600 text-sm">{tabInfo.subtitle}</p>
        </div>

        {/* Tabs de navegação horizontal */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`flex-shrink-0 flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors mr-1 ${
                activeTab === 'usuarios'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiUsers className="mr-2 h-4 w-4" />
              Usuários
            </button>
            
            <button
              onClick={() => setActiveTab('vinculacoes')}
              className={`flex-shrink-0 flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors mr-1 ${
                activeTab === 'vinculacoes'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiLink className="mr-2 h-4 w-4" />
              Proj. Usuários
            </button>
            
            <button
              onClick={() => setActiveTab('listas')}
              className={`flex-shrink-0 flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors mr-1 ${
                activeTab === 'listas'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiList className="mr-2 h-4 w-4" />
              Listas Usuários
            </button>
            
            <button
              onClick={() => setActiveTab('gemini')}
              className={`flex-shrink-0 flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors mr-1 ${
                activeTab === 'gemini'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiKey className="mr-2 h-4 w-4" />
              IA
            </button>
            
            <button
              onClick={() => setActiveTab('logo')}
              className={`flex-shrink-0 flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'logo'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FiImage className="mr-2 h-4 w-4" />
              Logo
            </button>
          </div>
        </div>

        {/* Conteúdo da tab atual */}
        <div className="min-h-[60vh]">
          {activeTab === 'usuarios' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data de Cadastro
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tipo de Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.length > 0 ? (
                        users.map((item) => {
                          const currentUserType = getUserType(item.admin, item.gestor);
                          const isUpdating = updatingUserType === item.id;
                          
                          return (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                    <FiUser className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {item.nome || "Nome não disponível"}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {item.email}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(item.created_at).toLocaleDateString('pt-BR')}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    item.ativo
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {item.ativo ? "Ativo" : "Inativo"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {item.id === user.id ? (
                                  // Usuário atual não pode alterar seu próprio tipo
                                  <span
                                    className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getUserTypeClasses(currentUserType)}`}
                                  >
                                    {getUserTypeLabel(currentUserType)} (Você)
                                  </span>
                                ) : (
                                  // Dropdown para outros usuários
                                  <div className="relative">
                                    <select
                                      value={currentUserType}
                                      onChange={(e) => changeUserType(item.id, e.target.value, item.email)}
                                      disabled={isUpdating}
                                      className={`text-xs font-medium rounded-full border px-3 py-1 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                        isUpdating 
                                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                                          : `${getUserTypeClasses(currentUserType)} hover:opacity-80`
                                      }`}
                                    >
                                      <option value="user">Usuário</option>
                                      <option value="gestor">Gestor</option>
                                      <option value="admin">Administrador</option>
                                    </select>
                                    
                                    {isUpdating && (
                                      <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                        <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-transparent"></div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => toggleUserStatus(item.id, item.ativo)}
                                  className={`text-white px-3 py-1 rounded-lg text-sm transition-colors ${
                                    item.ativo
                                      ? "bg-red-600 hover:bg-red-700"
                                      : "bg-green-600 hover:bg-green-700"
                                  }`}
                                >
                                  {item.ativo ? "Desativar" : "Ativar"}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-6 py-8 text-center text-sm text-gray-500"
                          >
                            <div className="flex flex-col items-center">
                              <FiUsers className="w-12 h-12 text-gray-300 mb-2" />
                              Nenhum usuário encontrado
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Legenda dos tipos de usuário */}
              <div className="mt-6 border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Tipos de Usuário:</h4>
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center">
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 border border-gray-200 mr-2">
                      Usuário
                    </span>
                    <span className="text-gray-600">Acesso básico ao sistema</span>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200 mr-2">
                      Gestor
                    </span>
                    <span className="text-gray-600">Privilégios de gestão e coordenação</span>
                  </div>
                  <div className="flex items-center">
                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 mr-2">
                      Administrador
                    </span>
                    <span className="text-gray-600">Acesso total e configurações do sistema</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'listas' && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Vinculações Usuário-Lista</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Gerencie quais usuários têm acesso a quais listas de tarefas
                  </p>
                </div>
                
                <button
                  onClick={() => setShowNovaVinculacao(true)}
                  className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <FiPlus className="mr-2 h-4 w-4" />
                  Nova Vinculação
                </button>
              </div>

              {/* Estatísticas rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FiUsers className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm font-medium text-blue-800">Total de Usuários</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 mt-1">
                    {todosUsuarios.length}
                  </div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FiList className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">Total de Listas</span>
                  </div>
                  <div className="text-2xl font-bold text-green-900 mt-1">
                    {todasListas.length}
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <FiLink className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-800">Vinculações Ativas</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-900 mt-1">
                    {vinculacoesListas.length}
                  </div>
                </div>
              </div>

              {loadingListas ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuário
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Lista
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Projeto
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Data de Criação
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vinculacoesListas.length > 0 ? (
                        vinculacoesListas.map((vinculacao) => (
                          <tr key={vinculacao.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                  <FiUser className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {vinculacao.usuarios?.nome || "Nome não disponível"}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {vinculacao.usuarios?.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <FiList className="w-4 h-4 text-gray-400 mr-2" />
                                <div className="text-sm font-medium text-gray-900">
                                  {vinculacao.tasks_list?.nome_lista || "Lista não encontrada"}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {vinculacao.tasks_list?.projetos?.nome || "Projeto não encontrado"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {new Date(vinculacao.created_at).toLocaleDateString('pt-BR')}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => removerVinculacao(
                                  vinculacao.id,
                                  vinculacao.usuarios?.nome || 'Usuário',
                                  vinculacao.tasks_list?.nome_lista || 'Lista'
                                )}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remover vinculação"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan="5"
                            className="px-6 py-8 text-center text-sm text-gray-500"
                          >
                            <div className="flex flex-col items-center">
                              <FiLink className="w-12 h-12 text-gray-300 mb-2" />
                              <p className="font-medium mb-1">Nenhuma vinculação encontrada</p>
                              <p className="text-xs">Crie uma nova vinculação para começar</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vinculacoes' && (
            <GerenciarVinculacoes />
          )}

          {activeTab === 'gemini' && (
            <GeminiApiKeyManager />
          )}

          {activeTab === 'logo' && (
            <LogoManager />
          )}
        </div>
      </div>

      {/* Modal para nova vinculação de lista */}
      {showNovaVinculacao && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Nova Vinculação Usuário-Lista
                </h3>
                <button 
                  onClick={() => {
                    setShowNovaVinculacao(false);
                    setNovaVinculacao({ usuario_id: '', list_id: '' });
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Usuário *
                  </label>
                  <select
                    value={novaVinculacao.usuario_id}
                    onChange={(e) => setNovaVinculacao(prev => ({ ...prev, usuario_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={salvandoVinculacao}
                  >
                    <option value="">Selecione um usuário</option>
                    {todosUsuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nome} ({usuario.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lista *
                  </label>
                  <select
                    value={novaVinculacao.list_id}
                    onChange={(e) => setNovaVinculacao(prev => ({ ...prev, list_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={salvandoVinculacao}
                  >
                    <option value="">Selecione uma lista</option>
                    {todasListas.map((lista) => (
                      <option key={lista.id} value={lista.id}>
                        {lista.nome_lista} ({lista.projetos?.nome || 'Projeto não encontrado'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Dica:</strong> O usuário terá acesso à lista selecionada e poderá visualizar e gerenciar as tarefas dentro dela.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowNovaVinculacao(false);
                    setNovaVinculacao({ usuario_id: '', list_id: '' });
                  }}
                  disabled={salvandoVinculacao}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={criarVinculacao}
                  disabled={salvandoVinculacao || !novaVinculacao.usuario_id || !novaVinculacao.list_id}
                  className={`px-4 py-2 rounded-md text-white transition-colors flex items-center ${
                    salvandoVinculacao || !novaVinculacao.usuario_id || !novaVinculacao.list_id
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {salvandoVinculacao ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4 mr-2" />
                      Criar Vinculação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menu quando clicar fora */}
      {(showMenu || showNovaVinculacao) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowMenu(false);
            if (showNovaVinculacao) {
              setShowNovaVinculacao(false);
              setNovaVinculacao({ usuario_id: '', list_id: '' });
            }
          }}
        />
      )}
    </div>
  );
}