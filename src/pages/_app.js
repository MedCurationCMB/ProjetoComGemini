// ✅ ARQUIVO CORRIGIDO: src/pages/_app.js
// A principal mudança é carregar os dados completos da tabela 'usuarios'

import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { isUserActiveSimple } from '../utils/userUtils';
import '../styles/globals.css';
import '../styles/tiptap.css';

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userActive, setUserActive] = useState(true);
  const router = useRouter();

  // ✅ NOVA FUNÇÃO: Carregar dados completos do usuário
  const carregarDadosCompletos = async (authUser) => {
    if (!authUser?.id) return null;

    try {
      console.log('🔄 Carregando dados completos do usuário...');
      
      // ✅ BUSCAR DADOS DA TABELA 'usuarios' COM TODOS OS CAMPOS
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('*') // ← Todos os campos: admin, gestor, ativo, etc.
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar dados do usuário:', error);
        // ✅ Em caso de erro, retornar apenas dados do auth
        return authUser;
      }

      // ✅ COMBINAR dados do auth.users com dados da tabela usuarios
      const usuarioCompleto = {
        ...authUser,        // Dados do auth (id, email, etc.)
        ...userData         // Dados da tabela usuarios (admin, gestor, nome, etc.)
      };

      console.log('✅ Dados completos carregados:', {
        id: usuarioCompleto.id,
        email: usuarioCompleto.email,
        nome: usuarioCompleto.nome,
        admin: usuarioCompleto.admin,
        gestor: usuarioCompleto.gestor,
        ativo: usuarioCompleto.ativo
      });

      return usuarioCompleto;
    } catch (error) {
      console.error('❌ Erro ao carregar dados completos:', error);
      return authUser; // Fallback para dados básicos
    }
  };

  useEffect(() => {
    let mounted = true;
    let hasInitialized = false;
    
    const checkUser = async () => {
      if (hasInitialized || !mounted) return;
      hasInitialized = true;
      
      try {
        console.log('🔄 Verificando autenticação inicial...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('❌ Erro ao obter sessão:', sessionError.message);
          if (mounted) {
            setUser(null);
            setUserActive(true);
            setLoading(false);
          }
          return;
        }
        
        if (session?.user) {
          console.log('✅ Sessão encontrada para:', session.user.email);
          
          // ✅ CARREGAR DADOS COMPLETOS (INCLUINDO admin, gestor)
          const usuarioCompleto = await carregarDadosCompletos(session.user);
          
          if (!mounted) return;

          // ✅ VERIFICAÇÃO DE STATUS ATIVO
          try {
            const active = await isUserActiveSimple(session.user.id);
            
            if (!mounted) return;
            
            setUserActive(active);
            setUser(usuarioCompleto); // ← Usar dados completos
            
            console.log('✅ Status do usuário:', active ? 'ATIVO' : 'INATIVO');
            
            if (!active && router.pathname !== '/acesso-negado') {
              console.log('🔄 Redirecionando para acesso negado');
              router.push('/acesso-negado');
            }
          } catch (activeError) {
            console.warn('⚠️ Erro ao verificar status, permitindo acesso:', activeError.message);
            if (mounted) {
              setUser(usuarioCompleto); // ← Usar dados completos
              setUserActive(true);
            }
          }
        } else {
          console.log('ℹ️ Nenhuma sessão encontrada');
          if (mounted) {
            setUser(null);
            setUserActive(true);
          }
        }
      } catch (error) {
        console.error('❌ Erro geral na verificação:', error.message);
        if (mounted) {
          setUser(null);
          setUserActive(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          console.log('✅ Verificação inicial concluída');
        }
      }
    };
    
    checkUser();
    
    // ✅ LISTENER PARA MUDANÇAS DE AUTH
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state change:', event);
      
      if (event === 'SIGNED_IN') {
        if (session?.user) {
          console.log('✅ Usuário logado:', session.user.email);
          
          // ✅ CARREGAR DADOS COMPLETOS NO LOGIN
          const usuarioCompleto = await carregarDadosCompletos(session.user);
          setUser(usuarioCompleto);
          setUserActive(true);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('ℹ️ Usuário deslogado');
        setUser(null);
        setUserActive(true);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token renovado');
        // ✅ NO REFRESH, RECARREGAR DADOS COMPLETOS TAMBÉM
        if (session?.user) {
          const usuarioCompleto = await carregarDadosCompletos(session.user);
          setUser(usuarioCompleto);
        }
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  const publicPages = ['/acesso-negado', '/login', '/cadastro'];
  const isPublicPage = publicPages.includes(router.pathname);

  return (
    <>
      <Toaster position="top-right" />
      <Component {...pageProps} user={user} userActive={userActive} />
    </>
  );
}

export default MyApp;