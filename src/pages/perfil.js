// ARQUIVO: src/pages/perfil.js
// Página de perfil completa para o usuário

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiUser, 
  FiMail, 
  FiKey, 
  FiSave, 
  FiArrowLeft, 
  FiMenu,
  FiHome,
  FiSettings,
  FiLogOut,
  FiEdit,
  FiLock,
  FiShield,
  FiCalendar
} from 'react-icons/fi';

export default function Perfil({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoResetSenha, setEnviandoResetSenha] = useState(false);
  const [resetSenhaEnviado, setResetSenhaEnviado] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Estados do formulário
  const [dadosUsuario, setDadosUsuario] = useState({
    nome: '',
    email: '',
    admin: false,
    gestor: false,
    ativo: true,
    created_at: null
  });
  
  const [dadosForm, setDadosForm] = useState({
    nome: ''
  });

  // Redirecionar se não estiver logado
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    carregarDadosUsuario();
  }, [user, router]);

  // Carregar dados do usuário
  const carregarDadosUsuario = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        toast.error('Erro ao carregar dados do usuário');
        return;
      }

      setDadosUsuario(data);
      setDadosForm({
        nome: data.nome || ''
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados do usuário');
    } finally {
      setLoading(false);
    }
  };

  // Salvar alterações do nome
  const salvarAlteracoes = async (e) => {
    e.preventDefault();
    
    if (!dadosForm.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      setSalvando(true);

      // Atualizar na tabela usuarios
      const { error } = await supabase
        .from('usuarios')
        .update({ nome: dadosForm.nome.trim() })
        .eq('id', user.id);

      if (error) {
        console.error('Erro ao atualizar nome:', error);
        toast.error('Erro ao salvar alterações');
        return;
      }

      // Atualizar também os metadata do usuário no auth
      try {
        await supabase.auth.updateUser({
          data: {
            nome: dadosForm.nome.trim()
          }
        });
      } catch (authError) {
        console.warn('Aviso: Não foi possível atualizar metadata do auth:', authError);
      }

      setDadosUsuario(prev => ({ ...prev, nome: dadosForm.nome.trim() }));
      toast.success('Nome atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvando(false);
    }
  };

  // Enviar email de reset de senha (igual ao "esqueci minha senha")
  const enviarResetSenha = async () => {
    try {
      setEnviandoResetSenha(true);
      
      // Usar a mesma função do "esqueci minha senha"
      const { error } = await supabase.auth.resetPasswordForEmail(dadosUsuario.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        throw error;
      }
      
      setResetSenhaEnviado(true);
      toast.success('Link de redefinição de senha enviado para seu email');
      
      // Limpar o estado após 5 segundos
      setTimeout(() => {
        setResetSenhaEnviado(false);
      }, 5000);
    } catch (error) {
      console.error('Erro ao enviar reset de senha:', error);
      toast.error(error.message || 'Erro ao enviar link de redefinição de senha');
    } finally {
      setEnviandoResetSenha(false);
    }
  };

  // Função para logout
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  const handleVoltarClick = () => {
    if (window.history.length > 1) {
      router.back(); // Há histórico, volta para página anterior
    } else {
      router.push('/med-curation-desktop'); // Não há histórico, vai para página principal
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Meu Perfil</title>
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
                  fallbackText="Perfil"
                  showFallback={true}
                />
              </div>
              
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
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
                        router.push('/configuracoes');
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
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
          <div className="hidden lg:flex items-center justify-between">
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
                fallbackText="Meu Perfil"
                showFallback={true}
              />
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/configuracoes')}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                title="Configurações"
              >
                <FiSettings className="w-5 h-5 text-gray-600" />
              </button>
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

      {/* Conteúdo principal */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Cabeçalho da seção */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-black mb-2">
            Meu Perfil
          </h1>
          <p className="text-gray-600 text-sm">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        {/* Cards do perfil */}
        <div className="space-y-6">
          {/* Card de Informações Básicas */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <FiUser className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Informações Básicas</h2>
                <p className="text-gray-500 text-sm">Atualize seus dados pessoais</p>
              </div>
            </div>

            <form onSubmit={salvarAlteracoes} className="space-y-4">
              {/* Nome */}
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <FiEdit className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="nome"
                    type="text"
                    value={dadosForm.nome}
                    onChange={(e) => setDadosForm(prev => ({ ...prev, nome: e.target.value }))}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Digite seu nome completo"
                    required
                  />
                </div>
              </div>

              {/* Email (apenas leitura) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="email"
                    type="email"
                    value={dadosUsuario.email}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    disabled
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  O email não pode ser alterado. Entre em contato com o administrador se necessário.
                </p>
              </div>

              {/* Informações de Status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Usuário
                  </label>
                  <div className="text-sm">
                    {dadosUsuario.admin ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <FiShield className="w-3 h-3 mr-1" />
                        Administrador
                      </span>
                    ) : dadosUsuario.gestor ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <FiUser className="w-3 h-3 mr-1" />
                        Gestor
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <FiUser className="w-3 h-3 mr-1" />
                        Usuário
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status da Conta
                  </label>
                  <div className="text-sm">
                    {dadosUsuario.ativo ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Ativa
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ✕ Inativa
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão Salvar */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={salvando || dadosForm.nome === dadosUsuario.nome}
                  className={`flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    salvando || dadosForm.nome === dadosUsuario.nome
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  } transition-colors`}
                >
                  <FiSave className="h-4 w-4 mr-2" />
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>

          {/* Card de Segurança */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FiLock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Segurança</h2>
                <p className="text-gray-500 text-sm">Gerencie a segurança da sua conta</p>
              </div>
            </div>

            {/* Reset de Senha */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Redefinir Senha</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Clique no botão abaixo para receber um link de redefinição de senha no seu email.
                  Este processo é o mesmo do "Esqueci minha senha".
                </p>
                
                {resetSenhaEnviado ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-800">
                          Link de redefinição enviado! Verifique sua caixa de entrada (e pasta de spam).
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={enviarResetSenha}
                    disabled={enviandoResetSenha}
                    className={`flex items-center justify-center px-4 py-2 border border-orange-300 rounded-md shadow-sm text-sm font-medium ${
                      enviandoResetSenha
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-orange-700 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
                    } transition-colors`}
                  >
                    <FiKey className="h-4 w-4 mr-2" />
                    {enviandoResetSenha ? 'Enviando...' : 'Redefinir Senha'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Card de Informações da Conta */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                <FiCalendar className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <h2 className="text-lg font-semibold text-gray-900">Informações da Conta</h2>
                <p className="text-gray-500 text-sm">Detalhes sobre sua conta no sistema</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <FiCalendar className="w-4 h-4 mr-2 text-gray-500" />
                  Data de Criação
                </h3>
                <p className="text-sm text-gray-600">
                  {dadosUsuario.created_at 
                    ? new Date(dadosUsuario.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Não disponível'
                  }
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <FiUser className="w-4 h-4 mr-2 text-gray-500" />
                  ID do Usuário
                </h3>
                <p className="text-sm text-gray-600 font-mono break-all">
                  {dadosUsuario.id ? dadosUsuario.id.substring(0, 12) + '...' : 'Não disponível'}
                </p>
              </div>
            </div>

            {/* Informação adicional sobre permissões */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Sobre as Permissões
              </h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-start">
                  <span className="inline-block w-20 font-medium">Usuário:</span>
                  <span>Acesso às funcionalidades básicas do sistema</span>
                </div>
                <div className="flex items-start">
                  <span className="inline-block w-20 font-medium">Gestor:</span>
                  <span>Acesso a recursos de gestão e relatórios</span>
                </div>
                <div className="flex items-start">
                  <span className="inline-block w-20 font-medium">Admin:</span>
                  <span>Acesso total ao sistema e configurações</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}