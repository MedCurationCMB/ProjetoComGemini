import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { supabase } from "../utils/supabaseClient";
import { activateUser, deactivateUser } from "../utils/userUtils";

// Lista de emails de administradores
const ADMIN_EMAILS = ["rhuanmateuscmb@gmail.com"]; // Substitua pelo seu email de admin

export default function Admin({ user }) {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verificar se o usuário é administrador
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    // Redirecionar se não estiver logado ou não for admin
    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/welcome");
      toast.error("Você não tem permissão para acessar esta página");
      return;
    }

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

    fetchUsers();
  }, [user, isAdmin, router]);

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

  // Não renderizar nada se não for admin
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Administração de Usuários</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Administração de Usuários</h1>

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
                      colSpan="4"
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
      </main>
    </div>
  );
}
