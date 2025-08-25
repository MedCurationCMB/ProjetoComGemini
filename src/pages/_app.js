import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { isUserActiveSimple } from '../utils/userUtils'; // ✅ USANDO A VERSÃO SIMPLES
import '../styles/globals.css';
import '../styles/tiptap.css';

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userActive, setUserActive] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    let hasInitialized = false; // ✅ FLAG PARA EVITAR MÚLTIPLAS INICIALIZAÇÕES
    
    // ✅ FUNÇÃO ULTRA SIMPLIFICADA PARA VERIFICAR USUÁRIO
    const checkUser = async () => {
      if (hasInitialized || !mounted) return;
      hasInitialized = true;
      
      try {
        console.log('🔄 Verificando autenticação inicial...');
        
        // ✅ APENAS OBTER SESSÃO LOCAL - SEM VERIFICAÇÕES COMPLEXAS
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
          
          // ✅ VERIFICAÇÃO SIMPLES DE STATUS ATIVO (SEM RETRY, SEM TIMEOUT LONGO)
          try {
            const active = await isUserActiveSimple(session.user.id);
            
            if (!mounted) return;
            
            setUserActive(active);
            setUser(session.user);
            
            console.log('✅ Status do usuário:', active ? 'ATIVO' : 'INATIVO');
            
            // ✅ SÓ REDIRECIONAR SE REALMENTE INATIVO
            if (!active && router.pathname !== '/acesso-negado') {
              console.log('🔄 Redirecionando para acesso negado');
              router.push('/acesso-negado');
            }
          } catch (activeError) {
            console.warn('⚠️ Erro ao verificar status, permitindo acesso:', activeError.message);
            // ✅ EM CASO DE ERRO, SEMPRE PERMITIR ACESSO
            if (mounted) {
              setUser(session.user);
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
    
    // ✅ EXECUTAR VERIFICAÇÃO INICIAL
    checkUser();
    
    // ✅ LISTENER SIMPLIFICADO PARA MUDANÇAS DE AUTH
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth state change:', event);
      
      // ✅ APENAS REAGIR A EVENTOS IMPORTANTES
      if (event === 'SIGNED_IN') {
        if (session?.user) {
          console.log('✅ Usuário logado:', session.user.email);
          setUser(session.user);
          setUserActive(true); // ✅ ASSUMIR ATIVO INICIALMENTE
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('ℹ️ Usuário deslogado');
        setUser(null);
        setUserActive(true);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 Token renovado');
        // ✅ NÃO FAZER NADA ESPECIAL NO REFRESH - MANTER ESTADO ATUAL
      }
    });
    
    // ✅ CLEANUP FUNCTION SIMPLES
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // ✅ DEPENDÊNCIAS VAZIAS - SÓ EXECUTAR UMA VEZ

  // ✅ LOADING STATE SIMPLES
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

  // ✅ PÁGINAS PÚBLICAS
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