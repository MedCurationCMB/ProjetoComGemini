// src/pages/admin.js (versão atualizada com novo layout)
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
  FiUserCheck
} from 'react-icons/fi';

export default function Admin({ user }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios', 'gemini', 'logo', 'vinculacoes'
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

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

  // Carregar lista de usuários se estiver na tab de usuários
  useEffect(() => {
    if (isAdmin && activeTab === 'usuarios') {
      fetchUsers();
    }
  }, [isAdmin, activeTab]);

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

  // Função para alternar status de admin do usuário
  const toggleAdminStatus = async (userId, currentAdminStatus, userEmail) => {
    const newAdminStatus = !currentAdminStatus;
    
    // Verificar se não está tentando alterar seu próprio status
    if (userId === user.id) {
      toast.error("Você não pode alterar seu próprio status de administrador");
      return;
    }

    // Confirmação para ações críticas
    const action = newAdminStatus ? 'promover como administrador' : 'remover privilégios de administrador';
    const confirmed = window.confirm(
      `Tem certeza que deseja ${action} o usuário ${userEmail}?\n\n${
        newAdminStatus 
          ? 'Este usuário terá acesso total ao sistema.' 
          : 'Este usuário perderá acesso às configurações administrativas.'
      }`
    );

    if (!confirmed) return;

    try {
      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Você precisa estar logado para esta ação");
        return;
      }

      // Chamar a API para alterar permissões
      const response = await fetch("/api/admin/manage-permissions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId,
          isAdmin: newAdminStatus
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao alterar permissões");
      }

      toast.success(data.message);

      // Atualizar lista de usuários
      setUsers(
        users.map((u) => (u.id === userId ? { ...u, admin: newAdminStatus } : u))
      );

    } catch (error) {
      console.error("Erro ao alterar permissões:", error);
      toast.error(error.message || "Não foi possível alterar as permissões do usuário");
    }
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
                      onClick={() => setShowMenu(false)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => handleNavigate('/analise-multiplos-indicadores')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiCpu className="mr-3 h-4 w-4" />
                      Análises Indicadores
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
                      onClick={() => setShowMenu(false)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => handleNavigate('/analise-multiplos-indicadores')}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiCpu className="mr-3 h-4 w-4" />
                      Análises Indicadores
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
              Vinculações
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
                          Admin
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.length > 0 ? (
                        users.map((item) => (
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
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  item.admin
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {item.admin ? "Admin" : "Usuário"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
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
                                
                                <button
                                  onClick={() => toggleAdminStatus(item.id, item.admin, item.email)}
                                  disabled={item.id === user.id}
                                  className={`px-3 py-1 rounded-lg text-sm transition-colors flex items-center ${
                                    item.id === user.id
                                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                      : item.admin
                                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                                        : "bg-purple-600 hover:bg-purple-700 text-white"
                                  }`}
                                  title={
                                    item.id === user.id 
                                      ? "Você não pode alterar seu próprio status" 
                                      : item.admin 
                                        ? "Remover privilégios de admin" 
                                        : "Promover a admin"
                                  }
                                >
                                  {item.admin ? (
                                    <>
                                      <FiUserCheck className="w-3 h-3 mr-1" />
                                      Remover Admin
                                    </>
                                  ) : (
                                    <>
                                      <FiShield className="w-3 h-3 mr-1" />
                                      Tornar Admin
                                    </>
                                  )}
                                </button>
                              </div>
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

      {/* Overlay para fechar menu quando clicar fora */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}