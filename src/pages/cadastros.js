import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import { supabase } from "../utils/supabaseClient";
import { isUserAdmin } from "../utils/userUtils";
import LogoDisplay from "../components/LogoDisplay";
import { 
  FiEdit, 
  FiSave, 
  FiX, 
  FiPlus,
  FiMenu,
  FiUser,
  FiHome,
  FiSettings,
  FiLogOut,
  FiArrowLeft
} from "react-icons/fi";

export default function Cadastros({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('projetos');
  const [showMenu, setShowMenu] = useState(false);
  
  // Estados para todos os dados
  const [projetos, setProjetos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [tiposUnidadeIndicador, setTiposUnidadeIndicador] = useState([]);
  const [tiposIndicador, setTiposIndicador] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [promptsIndicadores, setPromptsIndicadores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para edição
  const [editandoItem, setEditandoItem] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [textoPromptEditado, setTextoPromptEditado] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  
  // Estados para o diálogo de cadastro
  const [showCadastroDialog, setShowCadastroDialog] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTextoPrompt, setNovoTextoPrompt] = useState('');
  const [cadastrando, setCadastrando] = useState(false);

  // Estados para administrador
  const [isAdmin, setIsAdmin] = useState(false);
  const [visibilidadeAbas, setVisibilidadeAbas] = useState({});
  const [salvandoVisibilidade, setSalvandoVisibilidade] = useState(false);

  // Estados para apresentação de variáveis
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  const [editandoApresentacao, setEditandoApresentacao] = useState(null);
  const [nomeApresentacaoEditado, setNomeApresentacaoEditado] = useState('');
  const [salvandoApresentacao, setSalvandoApresentacao] = useState(false);

  // Configuração das abas
  const tabsConfig = {
    projetos: {
      label: 'Projetos',
      tabela: 'projetos',
      campo: 'nome',
      singular: 'projeto',
      artigo: 'um',
      hasApresentacao: true
    },
    categorias: {
      label: 'Categorias',
      tabela: 'categorias',
      campo: 'nome',
      singular: 'categoria',
      artigo: 'uma',
      hasApresentacao: true
    },
    subcategorias: {
      label: 'Subcategorias',
      tabela: 'subcategorias',
      campo: 'nome',
      singular: 'subcategoria',
      artigo: 'uma',
      hasApresentacao: false
    },
    tiposUnidadeIndicador: {
      label: 'Tipos Unidade Indicador',
      tabela: 'tipos_unidade_indicador',
      campo: 'tipo',
      singular: 'tipo de unidade indicador',
      artigo: 'um',
      hasApresentacao: false
    },
    tiposIndicador: {
      label: 'Tipos Indicador',
      tabela: 'tipos_indicador',
      campo: 'tipo',
      singular: 'tipo de indicador',
      artigo: 'um',
      hasApresentacao: false
    },
    prompts: {
      label: 'Prompts',
      tabela: 'prompts',
      campo: 'nome_prompt',
      campoTexto: 'texto_prompt',
      singular: 'prompt',
      artigo: 'um',
      hasApresentacao: false,
      hasTexto: true
    },
    promptsIndicadores: {
      label: 'Prompts Indicadores',
      tabela: 'prompts_indicadores',
      campo: 'nome_prompt',
      campoTexto: 'texto_prompt',
      singular: 'prompt de indicador',
      artigo: 'um',
      hasApresentacao: false,
      hasTexto: true
    }
  };

  // Função para voltar para a página de indicadores
  const handleVoltarClick = () => {
    router.push('/visualizacao-indicadores');
  };

  // Função para fazer logout
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

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  // Verificar se é admin e carregar visibilidade das abas
  useEffect(() => {
    const checkAdminAndLoadVisibility = async () => {
      if (user) {
        try {
          const adminStatus = await isUserAdmin(user.id);
          setIsAdmin(adminStatus);
          
          // Carregar configurações de visibilidade das abas
          await fetchVisibilidadeAbas();
        } catch (error) {
          console.error('Erro ao verificar admin status:', error);
        }
      }
    };

    checkAdminAndLoadVisibility();
  }, [user]);

  // Carregar dados quando o componente monta ou a aba muda
  useEffect(() => {
    if (user) {
      fetchData();
      if (tabsConfig[activeTab].hasApresentacao) {
        fetchApresentacaoVariaveis();
      }
    }
  }, [user, activeTab]);

  // Função para buscar configurações de visibilidade das abas
  const fetchVisibilidadeAbas = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_sistema')
        .select('chave, valor')
        .like('chave', 'aba_visivel_%');
      
      if (error) throw error;
      
      // Converter para objeto
      const configObj = {};
      data.forEach(item => {
        // Extrair nome da aba da chave (ex: aba_visivel_projetos -> projetos)
        const nomeAba = item.chave.replace('aba_visivel_', '');
        configObj[nomeAba] = item.valor === 'true';
      });
      
      // Definir valores padrão para abas que não existem na configuração
      const configCompleta = {};
      Object.keys(tabsConfig).forEach(aba => {
        configCompleta[aba] = configObj[aba] !== undefined ? configObj[aba] : true;
      });
      
      setVisibilidadeAbas(configCompleta);
    } catch (error) {
      console.error('Erro ao carregar visibilidade das abas:', error);
      // Definir todas como visíveis por padrão em caso de erro
      const configPadrao = {};
      Object.keys(tabsConfig).forEach(aba => {
        configPadrao[aba] = true;
      });
      setVisibilidadeAbas(configPadrao);
    }
  };

  // Função para buscar dados de apresentação
  const fetchApresentacaoVariaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('apresentacao_variaveis')
        .select('*');
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por nome_variavel
      const apresentacaoObj = {};
      data.forEach(item => {
        apresentacaoObj[item.nome_variavel] = item;
      });
      
      setApresentacaoVariaveis(apresentacaoObj);
    } catch (error) {
      console.error('Erro ao carregar apresentação das variáveis:', error);
    }
  };

  // Função para carregar dados baseado na aba ativa
  const fetchData = async () => {
    try {
      setLoading(true);
      const config = tabsConfig[activeTab];
      
      let selectFields = '*';
      if (config.hasTexto) {
        selectFields = `id, ${config.campo}, ${config.campoTexto}`;
      }
      
      const { data, error } = await supabase
        .from(config.tabela)
        .select(selectFields)
        .order(config.campo, { ascending: true });
      
      if (error) throw error;
      
      // Atualizar o estado correspondente
      switch (activeTab) {
        case 'projetos':
          setProjetos(data || []);
          break;
        case 'categorias':
          setCategorias(data || []);
          break;
        case 'subcategorias':
          setSubcategorias(data || []);
          break;
        case 'tiposUnidadeIndicador':
          setTiposUnidadeIndicador(data || []);
          break;
        case 'tiposIndicador':
          setTiposIndicador(data || []);
          break;
        case 'prompts':
          setPrompts(data || []);
          break;
        case 'promptsIndicadores':
          setPromptsIndicadores(data || []);
          break;
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar visibilidade de uma aba
  const toggleVisibilidadeAba = async (nomeAba) => {
    try {
      setSalvandoVisibilidade(true);
      
      const novoValor = !visibilidadeAbas[nomeAba];
      
      // Upsert na tabela de configurações
      const { error } = await supabase
        .from('configuracoes_sistema')
        .upsert({
          chave: `aba_visivel_${nomeAba}`,
          valor: novoValor.toString(),
          descricao: `Controla se a aba ${tabsConfig[nomeAba].label} é visível para usuários normais`
        }, {
          onConflict: 'chave'
        });
      
      if (error) throw error;
      
      // Atualizar estado local
      setVisibilidadeAbas(prev => ({
        ...prev,
        [nomeAba]: novoValor
      }));
      
      toast.success(`Visibilidade da aba ${tabsConfig[nomeAba].label} ${novoValor ? 'ativada' : 'desativada'} para usuários`);
      
    } catch (error) {
      console.error('Erro ao salvar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade da aba');
    } finally {
      setSalvandoVisibilidade(false);
    }
  };

  // Função para obter abas visíveis baseado no status de admin
  const getAbasVisiveis = () => {
    if (isAdmin) {
      // Admins veem todas as abas
      return Object.keys(tabsConfig);
    } else {
      // Usuários normais veem apenas abas configuradas como visíveis
      return Object.keys(tabsConfig).filter(aba => visibilidadeAbas[aba] === true);
    }
  };

  // Funções para editar apresentação
  const iniciarEdicaoApresentacao = (item) => {
    setEditandoApresentacao(item.id);
    setNomeApresentacaoEditado(item.nome_apresentacao);
  };

  const cancelarEdicaoApresentacao = () => {
    setEditandoApresentacao(null);
    setNomeApresentacaoEditado('');
  };

  const salvarEdicaoApresentacao = async () => {
    if (!nomeApresentacaoEditado.trim()) {
      toast.error('O nome de apresentação não pode estar vazio');
      return;
    }

    try {
      setSalvandoApresentacao(true);
      
      const { error } = await supabase
        .from('apresentacao_variaveis')
        .update({ nome_apresentacao: nomeApresentacaoEditado.trim() })
        .eq('id', editandoApresentacao);

      if (error) throw error;

      toast.success('Nome de apresentação atualizado com sucesso!');
      setEditandoApresentacao(null);
      setNomeApresentacaoEditado('');
      
      // Recarregar dados
      await fetchApresentacaoVariaveis();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvandoApresentacao(false);
    }
  };

  // Função para iniciar edição
  const iniciarEdicao = (item) => {
    const config = tabsConfig[activeTab];
    setEditandoItem(item.id);
    setNomeEditado(item[config.campo]);
    if (config.hasTexto) {
      setTextoPromptEditado(item[config.campoTexto] || '');
    }
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setEditandoItem(null);
    setNomeEditado('');
    setTextoPromptEditado('');
  };

  // Função para salvar edição
  const salvarEdicao = async () => {
    if (!nomeEditado.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    try {
      setSalvandoEdicao(true);
      const config = tabsConfig[activeTab];
      const dados = getDadosAbaAtiva();
      
      // Verificar se já existe outro item com o mesmo nome (case insensitive)
      const nomeExistente = dados.find(item => 
        item.id !== editandoItem && 
        item[config.campo].toUpperCase() === nomeEditado.trim().toUpperCase()
      );
      
      if (nomeExistente) {
        toast.error(`Já existe ${config.artigo} ${config.singular} com este nome`);
        return;
      }

      // Preparar dados para atualização
      const updateData = { [config.campo]: nomeEditado.trim() };
      if (config.hasTexto) {
        updateData[config.campoTexto] = textoPromptEditado.trim();
      }

      const { error } = await supabase
        .from(config.tabela)
        .update(updateData)
        .eq('id', editandoItem);

      if (error) throw error;

      toast.success('Dados atualizados com sucesso!');
      setEditandoItem(null);
      setNomeEditado('');
      setTextoPromptEditado('');
      
      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Função para cadastrar novo item
  const cadastrarItem = async () => {
    if (!novoNome.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    try {
      setCadastrando(true);
      const config = tabsConfig[activeTab];
      const dados = getDadosAbaAtiva();
      
      // Verificar se já existe item com o mesmo nome (case insensitive)
      const nomeExistente = dados.find(item => 
        item[config.campo].toUpperCase() === novoNome.trim().toUpperCase()
      );
      
      if (nomeExistente) {
        toast.error(`Já existe ${config.artigo} ${config.singular} com este nome`);
        return;
      }

      // Preparar dados para inserção
      const insertData = { [config.campo]: novoNome.trim() };
      if (config.hasTexto) {
        insertData[config.campoTexto] = novoTextoPrompt.trim();
      }

      // Inserir o novo item
      const { data: itemData, error } = await supabase
        .from(config.tabela)
        .insert([insertData])
        .select();

      if (error) throw error;

      // Se for um projeto, criar vinculação com o usuário
      if (activeTab === 'projetos' && itemData && itemData.length > 0) {
        const novoProjetoId = itemData[0].id;
        const userId = user.id;
        
        console.log('Vinculando usuário ao projeto:', { userId, novoProjetoId });
        
        // Inserir na tabela de relacionamento
        const { error: relacaoError } = await supabase
          .from('relacao_usuarios_projetos')
          .insert([{
            usuario_id: userId,
            projeto_id: novoProjetoId
          }]);
        
        if (relacaoError) {
          console.error('Erro ao criar vinculação usuário-projeto:', relacaoError);
          toast.warning('Projeto criado, mas houve um problema na vinculação com o usuário');
        } else {
          console.log('Vinculação usuário-projeto criada com sucesso');
        }
      }

      toast.success(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} cadastrado com sucesso!`);
      setShowCadastroDialog(false);
      setNovoNome('');
      setNovoTextoPrompt('');
      
      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao cadastrar item');
    } finally {
      setCadastrando(false);
    }
  };

  // Função para obter dados da aba ativa
  const getDadosAbaAtiva = () => {
    switch (activeTab) {
      case 'projetos': return projetos;
      case 'categorias': return categorias;
      case 'subcategorias': return subcategorias;
      case 'tiposUnidadeIndicador': return tiposUnidadeIndicador;
      case 'tiposIndicador': return tiposIndicador;
      case 'prompts': return prompts;
      case 'promptsIndicadores': return promptsIndicadores;
      default: return [];
    }
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  const dadosAtivos = getDadosAbaAtiva();
  const config = tabsConfig[activeTab];
  const abasVisiveis = getAbasVisiveis();

  // Se não há abas visíveis para o usuário
  if (abasVisiveis.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Head>
          <title>Configurações</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        </Head>

        {/* Header responsivo */}
        <div className="sticky top-0 bg-white shadow-sm z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* Botão Voltar + Logo */}
              <div className="flex items-center">
                <button
                  onClick={handleVoltarClick}
                  className="mr-3 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Voltar"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <LogoDisplay 
                  className=""
                  fallbackText="Configurações"
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
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleAnalisesIndicadoresClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiCpu className="mr-3 h-4 w-4" />
                      Análises Indicadores
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
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

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-yellow-800">
              Nenhuma seção de configurações está disponível para você no momento. 
              Entre em contato com o administrador se precisar de acesso.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Se a aba ativa não está visível, mudar para a primeira aba visível
  if (!abasVisiveis.includes(activeTab)) {
    setActiveTab(abasVisiveis[0]);
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Configurações</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile */}
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-4">
              {/* Botão Voltar + Logo */}
              <div className="flex items-center">
                <button
                  onClick={handleVoltarClick}
                  className="mr-3 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Voltar"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <LogoDisplay 
                  className=""
                  fallbackText="Configurações"
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
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleAnalisesIndicadoresClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiCpu className="mr-3 h-4 w-4" />
                      Análises Indicadores
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
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

          {/* Desktop */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              {/* Botão Voltar + Logo */}
              <div className="flex items-center">
                <button
                  onClick={handleVoltarClick}
                  className="mr-4 p-2 hover:bg-gray-100 rounded-md transition-colors"
                  title="Voltar para Indicadores"
                >
                  <FiArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <LogoDisplay 
                  className=""
                  fallbackText="Configurações"
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
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiUser className="mr-3 h-4 w-4" />
                      Perfil
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleAnalisesIndicadoresClick();
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                    >
                      <FiCpu className="mr-3 h-4 w-4" />
                      Análises Indicadores
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
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

      {/* Layout principal - SEM SIDEBAR */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cabeçalho da seção */}
        <div className="mb-6">
          <div className="lg:hidden">
            <h2 className="text-2xl font-bold text-black mb-2">Configurações</h2>
            <p className="text-gray-600 text-sm">
              Gerenciamento de cadastros do sistema
            </p>
          </div>
          
          <div className="hidden lg:block">
            <h1 className="text-2xl lg:text-3xl font-bold text-black">Configurações</h1>
            <p className="text-gray-600 text-sm mt-1">
              Gerenciamento de cadastros e configurações do sistema
            </p>
          </div>
        </div>

        {/* Tabs de navegação mobile */}
        <div className="lg:hidden mb-6">
          <div className="border-b border-gray-200">
            <div className="overflow-x-auto">
              <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
                {abasVisiveis.map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                      activeTab === key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tabsConfig[key].label}
                    {activeTab === key && (
                      <span className="ml-1 bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full text-xs">
                        ✓
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Tabs de navegação desktop */}
        <div className="hidden lg:block mb-6">
          <div className="border-b border-gray-200">
            <ul className="flex flex-wrap -mb-px">
              {abasVisiveis.map((key) => (
                <li key={key} className="mr-2">
                  <button
                    onClick={() => setActiveTab(key)}
                    className={`inline-block py-4 px-4 border-b-2 font-medium text-sm ${
                      activeTab === key
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tabsConfig[key].label}
                    {activeTab === key && (
                      <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                        Ativo
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Conteúdo da tab atual */}
        <div className="bg-white rounded-lg shadow-md p-4 lg:p-6">
          {/* Controle de Visibilidade para Admins */}
          {isAdmin && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex flex-col space-y-3 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-800">
                    Controle de Visibilidade - {config.label}
                  </h3>
                  <p className="text-xs text-blue-600 mt-1">
                    Como administrador, você pode controlar se esta aba é visível para usuários normais.
                  </p>
                </div>
                
                <div className="flex items-center justify-between lg:justify-end">
                  <span className="text-sm font-medium text-blue-800 lg:mr-3">
                    {visibilidadeAbas[activeTab] ? 'Visível para usuários' : 'Oculta para usuários'}
                  </span>
                  
                  <button
                    onClick={() => toggleVisibilidadeAba(activeTab)}
                    disabled={salvandoVisibilidade}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      visibilidadeAbas[activeTab] ? 'bg-blue-600' : 'bg-gray-200'
                    } ${salvandoVisibilidade ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    type="button"
                    role="switch"
                    aria-checked={visibilidadeAbas[activeTab]}
                    aria-label={`Alternar visibilidade da aba ${config.label}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out ${
                        visibilidadeAbas[activeTab] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {salvandoVisibilidade && (
                <div className="mt-2 flex items-center text-xs text-blue-600">
                  <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-2"></div>
                  Salvando alteração...
                </div>
              )}
            </div>
          )}

          {/* Tabela de Apresentação da Variável - apenas para projetos e categorias */}
          {config.hasApresentacao && (
            <div className="mb-8">
              <h2 className="text-lg lg:text-xl font-bold mb-4">Configuração de Apresentação</h2>
              
              <div className="bg-white rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nome para Apresentação
                        </th>
                        <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'] ? (
                        <tr>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            {editandoApresentacao === apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'].id ? (
                              <input
                                type="text"
                                value={nomeApresentacaoEditado}
                                onChange={(e) => setNomeApresentacaoEditado(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                disabled={salvandoApresentacao}
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">
                                {apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'].nome_apresentacao}
                              </div>
                            )}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {editandoApresentacao === apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'].id ? (
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={salvarEdicaoApresentacao}
                                  disabled={salvandoApresentacao}
                                  className={`text-green-600 hover:text-green-900 ${
                                    salvandoApresentacao ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Salvar"
                                >
                                  <FiSave className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={cancelarEdicaoApresentacao}
                                  disabled={salvandoApresentacao}
                                  className={`text-red-600 hover:text-red-900 ${
                                    salvandoApresentacao ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Cancelar"
                                >
                                  <FiX className="h-5 w-5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => iniciarEdicaoApresentacao(apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'])}
                                className="text-blue-600 hover:text-blue-900"
                                title="Editar"
                              >
                                <FiEdit className="h-5 w-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        <tr>
                          <td colSpan="2" className="px-4 lg:px-6 py-4 text-center text-sm text-gray-500">
                            Configuração não encontrada
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Seção principal do Gerenciamento */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
              <h2 className="text-lg lg:text-xl font-bold">Gerenciamento de {config.label}</h2>
              
              {/* Botão para cadastrar novo item */}
              <button
                onClick={() => setShowCadastroDialog(true)}
                className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <FiPlus className="mr-2 h-4 w-4" />
                Cadastrar {config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}
              </button>
            </div>

            {/* Aviso sobre não poder apagar */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Atenção:</strong> Uma vez cadastrados, os {config.label.toLowerCase()} não podem ser apagados do sistema. 
                Certifique-se de que o nome está correto antes de cadastrar.
                {activeTab === 'projetos' && (
                  <span className="block mt-1">
                    <strong>Novo:</strong> Ao criar um projeto, você será automaticamente vinculado a ele.
                  </span>
                )}
              </p>
            </div>
            
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
                          {config.campo === 'nome_prompt' ? 'Nome do Prompt' : 'Nome'}
                        </th>
                        {config.hasTexto && (
                          <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Texto do Prompt
                          </th>
                        )}
                        <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dadosAtivos.length > 0 ? (
                        dadosAtivos.map((item, index) => (
                          <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                              {editandoItem === item.id ? (
                                <input
                                  type="text"
                                  value={nomeEditado}
                                  onChange={(e) => setNomeEditado(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  disabled={salvandoEdicao}
                                />
                              ) : (
                                <div className="text-sm font-medium text-gray-900">
                                  {item[config.campo]}
                                </div>
                              )}
                            </td>
                            {config.hasTexto && (
                              <td className="px-4 lg:px-6 py-4">
                                {editandoItem === item.id ? (
                                  <textarea
                                    value={textoPromptEditado}
                                    onChange={(e) => setTextoPromptEditado(e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    rows="3"
                                    disabled={salvandoEdicao}
                                  />
                                ) : (
                                  <div className="text-sm text-gray-900 max-w-xs">
                                    {item[config.campoTexto] ? (
                                      <span className="truncate block" title={item[config.campoTexto]}>
                                        {item[config.campoTexto].length > 100 
                                          ? `${item[config.campoTexto].substring(0, 100)}...` 
                                          : item[config.campoTexto]
                                        }
                                      </span>
                                    ) : (
                                      <span className="text-gray-400 italic">Nenhum texto</span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {editandoItem === item.id ? (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={salvarEdicao}
                                    disabled={salvandoEdicao}
                                    className={`text-green-600 hover:text-green-900 ${
                                      salvandoEdicao ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    title="Salvar"
                                  >
                                    <FiSave className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={cancelarEdicao}
                                    disabled={salvandoEdicao}
                                    className={`text-red-600 hover:text-red-900 ${
                                      salvandoEdicao ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                    title="Cancelar"
                                  >
                                    <FiX className="h-5 w-5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => iniciarEdicao(item)}
                                  className="text-blue-600 hover:text-blue-900"
                                  title="Editar"
                                >
                                  <FiEdit className="h-5 w-5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={config.hasTexto ? "3" : "2"}
                            className="px-4 lg:px-6 py-4 text-center text-sm text-gray-500"
                          >
                            Nenhum {config.singular} encontrado
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para cadastrar novo item */}
      {showCadastroDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">
                  Cadastrar {config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}
                </h3>
                <button 
                  onClick={() => {
                    setShowCadastroDialog(false);
                    setNovoNome('');
                    setNovoTextoPrompt('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {config.campo === 'nome_prompt' ? 'Nome do Prompt' : `Nome do ${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}`}
                  </label>
                  <input
                    type="text"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={`Digite o nome do ${config.singular}`}
                    disabled={cadastrando}
                  />
                </div>

                {config.hasTexto && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Texto do Prompt
                    </label>
                    <textarea
                      value={novoTextoPrompt}
                      onChange={(e) => setNovoTextoPrompt(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Digite o texto do prompt"
                      rows="5"
                      disabled={cadastrando}
                    />
                  </div>
                )}

                {activeTab === 'projetos' && (
                  <p className="text-sm text-gray-600">
                    Você será automaticamente vinculado a este projeto.
                  </p>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCadastroDialog(false);
                    setNovoNome('');
                    setNovoTextoPrompt('');
                  }}
                  disabled={cadastrando}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                
                <button
                  onClick={cadastrarItem}
                  disabled={cadastrando || !novoNome.trim()}
                  className={`w-full sm:w-auto px-4 py-2 rounded-md text-white transition-colors ${
                    cadastrando || !novoNome.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {cadastrando ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menus quando clicar fora */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowMenu(false);
          }}
        />
      )}
    </div>
  );
}