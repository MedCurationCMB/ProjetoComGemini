import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { supabase } from "../utils/supabaseClient";
import { hasAdminPermissions, getUserCompleteData } from "../utils/userUtils";
import { toast } from "react-hot-toast";
import Head from "next/head";
import {
  FiList,
  FiPlus,
  FiEdit3,
  FiTrash2,
  FiCheck,
  FiX,
  FiHome,
  FiMenu,
  FiLogOut,
  FiFolder,
  FiSearch,
  FiFilter,
  FiUsers,
  FiLink,
} from "react-icons/fi";
import LogoDisplay from "../components/LogoDisplay";

export default function GestaoListas({ user }) {
  const router = useRouter();

  // Estados principais
  const [loading, setLoading] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("listas");

  // Estados para os dados (ABA LISTAS)
  const [listas, setListas] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [dadosOriginais, setDadosOriginais] = useState([]);

  // Estados para busca e filtros (ABA LISTAS)
  const [searchTerm, setSearchTerm] = useState("");
  const [filtrarPorProjeto, setFiltrarPorProjeto] = useState("");
  const [showFiltros, setShowFiltros] = useState(false);

  // Estados para edição (ABA LISTAS)
  const [editandoItem, setEditandoItem] = useState(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [projetoEditado, setProjetoEditado] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Estados para cadastro (ABA LISTAS)
  const [showCadastroDialog, setShowCadastroDialog] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoProjetoId, setNovoProjetoId] = useState("");
  const [cadastrando, setCadastrando] = useState(false);

  // Estados para vinculações (ABA VINCULAÇÕES)
  const [vinculacoesListas, setVinculacoesListas] = useState([]);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [todasListas, setTodasListas] = useState([]);
  const [loadingVinculacoes, setLoadingVinculacoes] = useState(false);
  const [showNovaVinculacao, setShowNovaVinculacao] = useState(false);
  const [novaVinculacao, setNovaVinculacao] = useState({
    usuario_id: "",
    list_id: "",
  });
  const [salvandoVinculacao, setSalvandoVinculacao] = useState(false);

  // Dados filtrados (ABA LISTAS)
  const dadosAtivos = listas.filter((item) => {
    let matches = true;

    // Filtro de busca
    if (searchTerm.trim()) {
      matches =
        matches &&
        item.nome_lista.toLowerCase().includes(searchTerm.toLowerCase());
    }

    // Filtro por projeto
    if (filtrarPorProjeto) {
      matches = matches && item.projeto_id === filtrarPorProjeto;
    }

    return matches;
  });

  // Verificar permissões e redirecionar se necessário
  useEffect(() => {
    const checkUserPermissions = async () => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        setCheckingPermissions(true);

        // Buscar dados completos do usuário do Supabase
        const userData = await getUserCompleteData(user.id);

        if (!userData) {
          router.replace("/login");
          toast.error("Erro ao verificar permissões do usuário");
          return;
        }

        // Verificar se tem permissões (admin OU gestor)
        const permissions = hasAdminPermissions(userData);
        setHasPermissions(permissions);

        if (!permissions) {
          router.replace("/visualizacao-de-atividades");
          toast.error("Você não tem permissão para acessar esta página");
          return;
        }

        console.log("✅ Usuário tem permissões para gestão de listas");
      } catch (error) {
        console.error("Erro ao verificar permissões:", error);
        router.replace("/visualizacao-de-atividades");
        toast.error("Erro ao verificar permissões");
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkUserPermissions();
  }, [user, router]);

  // Carregar dados quando as permissões forem confirmadas
  useEffect(() => {
    if (hasPermissions && user) {
      if (activeTab === "listas") {
        fetchDataListas();
      } else if (activeTab === "vinculacoes") {
        fetchVinculacoesListas();
      }
    }
  }, [hasPermissions, user, activeTab]);

  // ===========================================
  // FUNÇÕES PARA ABA LISTAS
  // ===========================================

  // Função para buscar dados das listas
  const fetchDataListas = async () => {
    try {
      setLoading(true);

      // PASSO 1: Buscar projetos vinculados ao usuário
      const { data: vinculacoesData, error: vinculacoesError } = await supabase
        .from("relacao_usuarios_projetos")
        .select("projeto_id")
        .eq("usuario_id", user.id);

      if (vinculacoesError) throw vinculacoesError;

      const projetosVinculados =
        vinculacoesData?.map((item) => item.projeto_id) || [];

      if (projetosVinculados.length === 0) {
        // Se não tem projetos vinculados, não carrega nada
        setListas([]);
        setDadosOriginais([]);
        setProjetos([]);
        setLoading(false);
        return;
      }

      // PASSO 2: Carregar listas apenas dos projetos vinculados
      const { data: listasData, error: listasError } = await supabase
        .from("tasks_list")
        .select(
          `
          id,
          nome_lista,
          projeto_id,
          created_at,
          projetos (
            id,
            nome
          )
        `
        )
        .in("projeto_id", projetosVinculados)
        .order("nome_lista", { ascending: true });

      if (listasError) throw listasError;

      setListas(listasData || []);
      setDadosOriginais(listasData || []);

      // PASSO 3: Carregar apenas os projetos vinculados para dropdown
      const { data: projetosData, error: projetosError } = await supabase
        .from("projetos")
        .select("id, nome")
        .in("id", projetosVinculados)
        .order("nome", { ascending: true });

      if (projetosError) throw projetosError;

      setProjetos(projetosData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados das listas");
    } finally {
      setLoading(false);
    }
  };

  // Função para iniciar edição
  const iniciarEdicao = (item) => {
    setEditandoItem(item.id);
    setNomeEditado(item.nome_lista);
    setProjetoEditado(item.projeto_id);
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setEditandoItem(null);
    setNomeEditado("");
    setProjetoEditado("");
  };

  // Função para salvar edição
  const salvarEdicao = async () => {
    if (!nomeEditado.trim()) {
      toast.error("O nome da lista não pode estar vazio");
      return;
    }

    if (!projetoEditado) {
      toast.error("Selecione um projeto");
      return;
    }

    try {
      setSalvando(true);

      const { error } = await supabase
        .from("tasks_list")
        .update({
          nome_lista: nomeEditado.trim(),
          projeto_id: projetoEditado,
        })
        .eq("id", editandoItem);

      if (error) throw error;

      toast.success("Lista atualizada com sucesso!");
      await fetchDataListas();
      cancelarEdicao();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSalvando(false);
    }
  };

  // Função para excluir item
  const excluirItem = async (id, nome) => {
    if (
      !confirm(
        `Tem certeza que deseja excluir a lista "${nome}"?\n\nISTO IRÁ EXCLUIR TODAS AS TAREFAS ASSOCIADAS A ESTA LISTA!`
      )
    ) {
      return;
    }

    try {
      // Primeiro excluir tarefas relacionadas
      const { error: tasksError } = await supabase
        .from("tasks")
        .delete()
        .eq("task_list_id", id);

      if (tasksError) throw tasksError;

      // Depois excluir rotinas relacionadas
      const { error: routinesError } = await supabase
        .from("routine_tasks")
        .delete()
        .eq("task_list_id", id);

      if (routinesError) throw routinesError;

      // Excluir vinculações de usuários
      const { error: vinculacoesError } = await supabase
        .from("relacao_usuario_list")
        .delete()
        .eq("list_id", id);

      if (vinculacoesError) throw vinculacoesError;

      // Por fim excluir a lista
      const { error } = await supabase.from("tasks_list").delete().eq("id", id);

      if (error) throw error;

      toast.success("Lista excluída com sucesso!");
      await fetchDataListas();
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir a lista");
    }
  };

  // Função para cadastrar nova lista
  const cadastrarNovaLista = async (e) => {
    e.preventDefault();

    if (!novoNome.trim()) {
      toast.error("Digite o nome da lista");
      return;
    }

    if (!novoProjetoId) {
      toast.error("Selecione um projeto");
      return;
    }

    try {
      setCadastrando(true);

      const { error } = await supabase.from("tasks_list").insert([
        {
          nome_lista: novoNome.trim(),
          projeto_id: novoProjetoId,
        },
      ]);

      if (error) throw error;

      toast.success("Lista cadastrada com sucesso!");
      setShowCadastroDialog(false);
      setNovoNome("");
      setNovoProjetoId("");
      await fetchDataListas();
    } catch (error) {
      console.error("Erro ao cadastrar:", error);
      toast.error("Erro ao cadastrar a lista");
    } finally {
      setCadastrando(false);
    }
  };

  // ===========================================
  // FUNÇÕES PARA ABA VINCULAÇÕES
  // ===========================================

  // Carregar vinculações de listas
    const fetchVinculacoesListas = async () => {
    try {
      setLoadingVinculacoes(true);

      // Carregar vinculações com dados dos usuários e listas
      const { data: vinculacoes, error: vinculacoesError } = await supabase
        .from("relacao_usuario_list")
        .select(
          `
        id,
        usuario_id,
        list_id,
        created_at,
        usuarios(id, nome, email),
        tasks_list(id, nome_lista, projeto_id, projetos(nome))
      `
        )
        .order("created_at", { ascending: false });

      if (vinculacoesError) throw vinculacoesError;

      setVinculacoesListas(vinculacoes || []);

      // PASSO 1: Buscar projetos vinculados ao usuário atual (gestor)
      const { data: projetosVinculados, error: projetosError } = await supabase
        .from("relacao_usuarios_projetos")
        .select("projeto_id")
        .eq("usuario_id", user.id);

      if (projetosError) throw projetosError;

      const projetoIds =
        projetosVinculados?.map((item) => item.projeto_id) || [];

      if (projetoIds.length === 0) {
        // Se gestor não tem projetos vinculados, não mostra usuários
        setTodosUsuarios([]);
      } else {
        // PASSO 2: Buscar usuários vinculados aos mesmos projetos
        const { data: usuariosDosProjetos, error: usuariosProjetosError } =
          await supabase
            .from("relacao_usuarios_projetos")
            .select("usuario_id")
            .in("projeto_id", projetoIds);

        if (usuariosProjetosError) throw usuariosProjetosError;

        // Extrair IDs únicos dos usuários
        const usuarioIds = [
          ...new Set(usuariosDosProjetos?.map((item) => item.usuario_id) || []),
        ];

        if (usuarioIds.length === 0) {
          setTodosUsuarios([]);
        } else {
          // PASSO 3: Buscar dados completos apenas desses usuários
          const { data: usuarios, error: usuariosError } = await supabase
            .from("usuarios")
            .select("id, nome, email, ativo")
            .in("id", usuarioIds)
            .eq("ativo", true)
            .order("nome");

          if (usuariosError) throw usuariosError;

          setTodosUsuarios(usuarios || []);
        }
      }

      // Carregar todas as listas para dropdown
      const { data: listas, error: listasError } = await supabase
        .from("tasks_list")
        .select(
          `
        id, 
        nome_lista, 
        projeto_id,
        projetos(nome)
      `
        )
        .order("nome_lista");

      if (listasError) throw listasError;

      setTodasListas(listas || []);
    } catch (error) {
      console.error("Erro ao carregar vinculações de listas:", error);
      toast.error("Erro ao carregar vinculações de listas");
    } finally {
      setLoadingVinculacoes(false);
    }
  };

  // Criar nova vinculação
  const criarVinculacao = async () => {
    if (!novaVinculacao.usuario_id || !novaVinculacao.list_id) {
      toast.error("Selecione um usuário e uma lista");
      return;
    }

    // Verificar se vinculação já existe
    const vinculacaoExistente = vinculacoesListas.find(
      (v) =>
        v.usuario_id === novaVinculacao.usuario_id &&
        v.list_id === parseInt(novaVinculacao.list_id)
    );

    if (vinculacaoExistente) {
      toast.error("Esta vinculação já existe");
      return;
    }

    try {
      setSalvandoVinculacao(true);

      const { error } = await supabase.from("relacao_usuario_list").insert([
        {
          usuario_id: novaVinculacao.usuario_id,
          list_id: parseInt(novaVinculacao.list_id),
        },
      ]);

      if (error) throw error;

      toast.success("Vinculação criada com sucesso!");
      setShowNovaVinculacao(false);
      setNovaVinculacao({ usuario_id: "", list_id: "" });

      // Recarregar dados
      await fetchVinculacoesListas();
    } catch (error) {
      console.error("Erro ao criar vinculação:", error);
      toast.error("Erro ao criar vinculação");
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
        .from("relacao_usuario_list")
        .delete()
        .eq("id", vinculacaoId);

      if (error) throw error;

      toast.success("Vinculação removida com sucesso!");

      // Recarregar dados
      await fetchVinculacoesListas();
    } catch (error) {
      console.error("Erro ao remover vinculação:", error);
      toast.error("Erro ao remover vinculação");
    }
  };

  // ===========================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ===========================================

  const handleInicioClick = () => {
    router.push("/inicio");
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Logout realizado com sucesso!");
      router.push("/login");
    } catch (error) {
      toast.error(error.message || "Erro ao fazer logout");
    }
  };

  // Loading de verificação de permissões
  if (checkingPermissions) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não tem permissões, a página já redirecionou
  if (!hasPermissions) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Gestão de Listas</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0"
        />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              {/* Logo */}
              <div className="flex items-center">
                <LogoDisplay
                  className=""
                  fallbackText="Gestão de Listas"
                  showFallback={true}
                />
              </div>

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

          {/* Desktop */}
          <div className="hidden lg:flex lg:items-center lg:justify-between">
            <div className="flex items-center">
              <LogoDisplay
                className=""
                fallbackText="Gestão de Listas"
                showFallback={true}
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors text-red-600"
                title="Logout"
              >
                <FiLogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Layout principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cabeçalho da seção */}
        <div className="mb-6">
          <div className="lg:hidden">
            <h2 className="text-2xl font-bold text-black mb-2">
              Gestão de Listas
            </h2>
            <p className="text-gray-600 text-sm">
              Gerenciamento de listas de tarefas e vinculações
            </p>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-2xl lg:text-3xl font-bold text-black">
              Gestão de Listas
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Gerenciamento completo de listas de tarefas e vinculações com
              usuários
            </p>
          </div>
        </div>

        {/* Tabs de navegação */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            {/* Mobile - Tabs com scroll horizontal */}
            <div className="lg:hidden">
              <div className="overflow-x-auto">
                <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab("listas")}
                    className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === "listas"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <FiList className="inline mr-2" />
                    Listas
                  </button>
                  <button
                    onClick={() => setActiveTab("vinculacoes")}
                    className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === "vinculacoes"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <FiLink className="inline mr-2" />
                    Vinculações
                  </button>
                </nav>
              </div>
            </div>

            {/* Desktop - Tabs em linha */}
            <div className="hidden lg:block">
              <ul className="flex flex-wrap -mb-px">
                <li className="mr-2">
                  <button
                    onClick={() => setActiveTab("listas")}
                    className={`inline-flex items-center py-4 px-4 border-b-2 font-medium text-sm ${
                      activeTab === "listas"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <FiList className="mr-2 h-4 w-4" />
                    Gerenciar Listas
                    {activeTab === "listas" && (
                      <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                        Ativo
                      </span>
                    )}
                  </button>
                </li>
                <li className="mr-2">
                  <button
                    onClick={() => setActiveTab("vinculacoes")}
                    className={`inline-flex items-center py-4 px-4 border-b-2 font-medium text-sm ${
                      activeTab === "vinculacoes"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <FiUsers className="mr-2 h-4 w-4" />
                    Vinculações Usuário-Lista
                    {activeTab === "vinculacoes" && (
                      <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                        Ativo
                      </span>
                    )}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Conteúdo das abas */}
        {activeTab === "listas" && (
          <>
            {/* Controles de busca e filtros */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Busca */}
                <div className="flex-1 max-w-md">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Buscar listas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Filtros e ações */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFiltros(!showFiltros)}
                    className={`flex items-center px-3 py-2 rounded-lg border transition-colors ${
                      showFiltros
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <FiFilter className="w-4 h-4 mr-2" />
                    Filtros
                  </button>

                  <button
                    onClick={() => setShowCadastroDialog(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FiPlus className="w-4 h-4 mr-2" />
                    Nova Lista
                  </button>
                </div>
              </div>

              {/* Filtros expandidos */}
              {showFiltros && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Filtrar por Projeto
                      </label>
                      <select
                        value={filtrarPorProjeto}
                        onChange={(e) => setFiltrarPorProjeto(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Todos os projetos</option>
                        {projetos.map((projeto) => (
                          <option key={projeto.id} value={projeto.id}>
                            {projeto.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          setFiltrarPorProjeto("");
                          setShowFiltros(false);
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Conteúdo principal - Listas */}
            <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
              {/* Informações */}
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    <FiList className="inline mr-2" />
                    <strong>Dica:</strong> As listas ajudam a organizar tarefas
                    dentro de projetos. Certifique-se de que o nome está correto
                    antes de cadastrar.
                    <span className="block mt-1">
                      <strong>Listas:</strong> As listas são vinculadas a
                      projetos específicos e permitem organizar tarefas de forma
                      mais detalhada.
                    </span>
                  </p>
                </div>
              </div>

              {/* Tabela */}
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Nome da Lista
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Projeto
                          </th>
                          <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {dadosAtivos.length > 0 ? (
                          dadosAtivos.map((item, index) => (
                            <tr
                              key={item.id}
                              className={
                                index % 2 === 0 ? "bg-white" : "bg-gray-50"
                              }
                            >
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                {editandoItem === item.id ? (
                                  <input
                                    type="text"
                                    value={nomeEditado}
                                    onChange={(e) =>
                                      setNomeEditado(e.target.value)
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    disabled={salvando}
                                    autoFocus
                                  />
                                ) : (
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.nome_lista}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                {editandoItem === item.id ? (
                                  <select
                                    value={projetoEditado}
                                    onChange={(e) =>
                                      setProjetoEditado(e.target.value)
                                    }
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    disabled={salvando}
                                  >
                                    <option value="">
                                      Selecione um projeto
                                    </option>
                                    {projetos.map((projeto) => (
                                      <option
                                        key={projeto.id}
                                        value={projeto.id}
                                      >
                                        {projeto.nome}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <div className="text-sm text-gray-600">
                                    {item.projetos?.nome ||
                                      "Projeto não encontrado"}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {editandoItem === item.id ? (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={salvarEdicao}
                                      disabled={salvando}
                                      className={`text-green-600 hover:text-green-900 ${
                                        salvando
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      title="Salvar"
                                    >
                                      <FiCheck className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={cancelarEdicao}
                                      disabled={salvando}
                                      className={`text-gray-600 hover:text-gray-900 ${
                                        salvando
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }`}
                                      title="Cancelar"
                                    >
                                      <FiX className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex justify-end space-x-2">
                                    <button
                                      onClick={() => iniciarEdicao(item)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="Editar"
                                    >
                                      <FiEdit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        excluirItem(item.id, item.nome_lista)
                                      }
                                      className="text-red-600 hover:text-red-900"
                                      title="Excluir"
                                    >
                                      <FiTrash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="3"
                              className="px-4 lg:px-6 py-8 text-center text-gray-500"
                            >
                              {searchTerm || filtrarPorProjeto
                                ? "Nenhuma lista encontrada com os filtros aplicados"
                                : "Nenhuma lista cadastrada"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Conteúdo da aba Vinculações */}
        {activeTab === "vinculacoes" && (
          <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Vinculações Usuário-Lista
                </h2>
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
                  <span className="text-sm font-medium text-blue-800">
                    Total de Usuários
                  </span>
                </div>
                <div className="text-2xl font-bold text-blue-900 mt-1">
                  {todosUsuarios.length}
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FiList className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Total de Listas
                  </span>
                </div>
                <div className="text-2xl font-bold text-green-900 mt-1">
                  {todasListas.length}
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <FiLink className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm font-medium text-purple-800">
                    Vinculações Ativas
                  </span>
                </div>
                <div className="text-2xl font-bold text-purple-900 mt-1">
                  {vinculacoesListas.length}
                </div>
              </div>
            </div>

            {loadingVinculacoes ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-lg">
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
                          Data da Vinculação
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {vinculacoesListas.length > 0 ? (
                        vinculacoesListas.map((vinculacao, index) => (
                          <tr
                            key={vinculacao.id}
                            className={
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <FiUsers className="h-4 w-4 text-gray-600" />
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {vinculacao.usuarios?.nome ||
                                      "Nome não disponível"}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {vinculacao.usuarios?.email ||
                                      "Email não disponível"}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {vinculacao.tasks_list?.nome_lista ||
                                  "Lista não encontrada"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-600">
                                {vinculacao.tasks_list?.projetos?.nome ||
                                  "Projeto não encontrado"}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                vinculacao.created_at
                              ).toLocaleDateString("pt-BR")}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() =>
                                  removerVinculacao(
                                    vinculacao.id,
                                    vinculacao.usuarios?.nome || "Usuário",
                                    vinculacao.tasks_list?.nome_lista || "Lista"
                                  )
                                }
                                className="text-red-600 hover:text-red-900 inline-flex items-center"
                                title="Remover vinculação"
                              >
                                <FiTrash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center">
                            <div className="text-gray-500">
                              <FiLink className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                              <p>Nenhuma vinculação encontrada</p>
                              <p className="text-sm">
                                Clique em "Nova Vinculação" para começar
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Cadastro de Lista */}
      {showCadastroDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Cadastrar Nova Lista
            </h3>

            <form onSubmit={cadastrarNovaLista} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome da Lista *
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o nome da lista"
                  disabled={cadastrando}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projeto *
                </label>
                <select
                  value={novoProjetoId}
                  onChange={(e) => setNovoProjetoId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={cadastrando}
                >
                  <option value="">Selecione um projeto</option>
                  {projetos.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  A lista será vinculada ao projeto selecionado
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>Dica:</strong> As listas ajudam a organizar tarefas
                  dentro de projetos. Escolha um nome descritivo para facilitar
                  a identificação.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCadastroDialog(false);
                    setNovoNome("");
                    setNovoProjetoId("");
                  }}
                  disabled={cadastrando}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cadastrando || !novoNome.trim() || !novoProjetoId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {cadastrando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <FiPlus className="w-4 h-4 mr-2" />
                      Cadastrar Lista
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para nova vinculação */}
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
                    setNovaVinculacao({ usuario_id: "", list_id: "" });
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
                    onChange={(e) =>
                      setNovaVinculacao((prev) => ({
                        ...prev,
                        usuario_id: e.target.value,
                      }))
                    }
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
                    onChange={(e) =>
                      setNovaVinculacao((prev) => ({
                        ...prev,
                        list_id: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={salvandoVinculacao}
                  >
                    <option value="">Selecione uma lista</option>
                    {todasListas.map((lista) => (
                      <option key={lista.id} value={lista.id}>
                        {lista.nome_lista} (
                        {lista.projetos?.nome || "Projeto não identificado"})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Atenção:</strong> Esta vinculação dará ao usuário
                    acesso para visualizar e gerenciar tarefas desta lista
                    específica.
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => {
                    setShowNovaVinculacao(false);
                    setNovaVinculacao({ usuario_id: "", list_id: "" });
                  }}
                  disabled={salvandoVinculacao}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={criarVinculacao}
                  disabled={
                    salvandoVinculacao ||
                    !novaVinculacao.usuario_id ||
                    !novaVinculacao.list_id
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {salvandoVinculacao ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <FiLink className="w-4 h-4 mr-2" />
                      Criar Vinculação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
