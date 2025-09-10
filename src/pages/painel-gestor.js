// src/pages/painel-gestor.js
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiMenu, 
  FiHome, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiArrowRight,
  FiActivity,
  FiEye,
  FiUsers,
  FiTool
} from 'react-icons/fi';

export default function PainelGestor({ user }) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [checkingPermissions, setCheckingPermissions] = useState(true);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Verificar permissões ao carregar
  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        // Buscar dados do usuário diretamente na tabela usuarios
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('admin, gestor')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          toast.error('Erro ao verificar permissões');
          router.replace('/inicio');
          return;
        }

        // Verificar se é admin OU gestor
        const isAdmin = userData?.admin === true;
        const isGestor = userData?.gestor === true;
        const hasAccess = isAdmin || isGestor;

        setHasPermissions(hasAccess);
        
        if (!hasAccess) {
          toast.error('Você não tem permissão para acessar essa página!');
          router.replace('/visualizacao-de-atividades');
          return;
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        toast.error('Erro ao verificar permissões');
        router.replace('/visualizacao-de-atividades');
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkPermissions();
  }, [user, router]);

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

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

  // Funções de navegação atualizadas
  const handleVisualizacaoAtividadesClick = () => {
    router.push('/visualizacao-de-atividades');
  };

  const handleControleAtividadesClick = () => {
    router.push('/tarefas-rotinas');
  };

  const handleVisaoGeralClick = () => {
    router.push('/controle-atividades');
  };

  const handleGestaoListasClick = () => {
    router.push('/gestao-listas');
  };

  // Obter nome do usuário
  const getUserName = () => {
    if (user?.user_metadata?.nome) {
      return user.user_metadata.nome;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  // Mostrar loading enquanto verifica permissões
  if (checkingPermissions) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Não renderizar nada se não tiver permissões ou usuário
  if (!user || !hasPermissions) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Painel Gestor - Sistema de Gerenciamento</title>
        <meta name="description" content="Painel de gestão para administradores e gestores" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Mobile: Layout responsivo */}
          <div className="lg:hidden">
            {/* Primeira linha: Logo e controles à direita */}
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Sistema"
                showFallback={true}
              />
              
              {/* Controles à direita */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Menu de navegação"
                  >
                    <FiMenu className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-30">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleVisualizacaoAtividadesClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiActivity className="mr-3 h-4 w-4" />
                        Visualização Atividades
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleControleAtividadesClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiTool className="mr-3 h-4 w-4" />
                        Controle Atividades
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleVisaoGeralClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiEye className="mr-3 h-4 w-4" />
                        Visão Geral
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleGestaoListasClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiUsers className="mr-3 h-4 w-4" />
                        Gestão Usuários Listas
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
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600 transition-colors"
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

          {/* Desktop: Layout atualizado */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <LogoDisplay 
                className=""
                fallbackText="Sistema"
                showFallback={true}
              />
              
              {/* Espaço central vazio */}
              <div className="flex-1"></div>
              
              {/* Apenas o menu de 3 barras no desktop */}
              <div className="flex items-center">
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                    aria-label="Menu de navegação"
                  >
                    <FiMenu className="w-6 h-6 text-gray-600" />
                  </button>
                  
                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border z-30">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleVisualizacaoAtividadesClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiActivity className="mr-3 h-4 w-4" />
                        Visualização Atividades
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleControleAtividadesClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiTool className="mr-3 h-4 w-4" />
                        Controle Atividades
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleVisaoGeralClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiEye className="mr-3 h-4 w-4" />
                        Visão Geral
                      </button>
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          handleGestaoListasClick();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                      >
                        <FiUsers className="mr-3 h-4 w-4" />
                        Gestão Usuários Listas
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
                          handleLogout();
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600 transition-colors"
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
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mensagem de boas-vindas */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Painel Gestor
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Acesse as principais funcionalidades de gestão e controle do sistema.
          </p>
        </div>

        {/* Seções principais - Layout atualizado: 2x2 no desktop */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          
          {/* Visualização de Atividades */}
          <button
            onClick={handleVisualizacaoAtividadesClick}
            className="group bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-orange-300 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <FiActivity className="w-8 h-8 text-orange-600" />
              </div>
              <FiArrowRight className="w-6 h-6 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">
              Visualização de Atividades
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Visualize e gerencie todas as atividades do sistema de forma integrada.
            </p>
          </button>

          {/* Controle de Atividades */}
          <button
            onClick={handleControleAtividadesClick}
            className="group bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-blue-300 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <FiTool className="w-8 h-8 text-blue-600" />
              </div>
              <FiArrowRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
              Controle de Atividades
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Gerencie tarefas e rotinas do sistema de forma organizada e eficiente.
            </p>
          </button>

          {/* Visão Geral */}
          <button
            onClick={handleVisaoGeralClick}
            className="group bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-green-300 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <FiEye className="w-8 h-8 text-green-600" />
              </div>
              <FiArrowRight className="w-6 h-6 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
              Visão Geral
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Controle geral das atividades e indicadores de performance do sistema.
            </p>
          </button>

          {/* Gestão de Usuários e Listas */}
          <button
            onClick={handleGestaoListasClick}
            className="group bg-white p-8 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-purple-300 text-left"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <FiUsers className="w-8 h-8 text-purple-600" />
              </div>
              <FiArrowRight className="w-6 h-6 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
              Gestão de Usuários e Listas
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Gerencie usuários e suas listas de tarefas de forma centralizada.
            </p>
          </button>
        </div>

        {/* Seção informativa adicional */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Bem-vindo ao Painel de Gestão
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Este painel oferece acesso às principais funcionalidades de gestão do sistema. 
            Como administrador ou gestor, você tem controle total sobre as atividades, 
            usuários e configurações do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}