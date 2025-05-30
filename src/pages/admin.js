// src/pages/admin.js (versão atualizada)
import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { supabase } from "../utils/supabaseClient";
import { activateUser, deactivateUser, isUserAdmin } from "../utils/userUtils";
import GeminiApiKeyManager from "../components/GeminiApiKeyManager";
import LogoManager from "../components/LogoManager";

export default function Admin({ user }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios', 'gemini' ou 'logo'
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

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

  // Mostrar loading enquanto verifica permissões
  if (checkingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Não renderizar nada se não for admin
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Administração</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Painel de Administração</h1>

        {/* Tabs de navegação */}
        <div className="border-b border-gray-200 mb-6">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('usuarios')}
                className={`inline-block py-4 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'usuarios'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Usuários
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('gemini')}
                className={`inline-block py-4 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'gemini'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Configurações da IA
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('logo')}
                className={`inline-block py-4 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'logo'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Logo
              </button>
            </li>
          </ul>
        </div>

        {/* Conteúdo da tab atual */}
        {activeTab === 'usuarios' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Gerenciamento de Usuários</h2>
            
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
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
                              {new Date(item.created_at).toLocaleDateString()}
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
                            <button
                              onClick={() => toggleUserStatus(item.id, item.ativo)}
                              className={`text-white px-3 py-1 rounded ${
                                item.ativo
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {item.ativo ? "Desativar" : "Ativar"}
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="5"
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gemini' && (
          <div>
            <GeminiApiKeyManager />
          </div>
        )}

        {activeTab === 'logo' && (
          <div>
            <LogoManager />
          </div>
        )}
      </main>
    </div>
  );
}