import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { isUserActive } from '../utils/userUtils';
import '../styles/globals.css';
import '../styles/tiptap.css';

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userActive, setUserActive] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true; // Flag para evitar state updates em componentes desmontados
    
    // Verificar se o usuário está autenticado
    const checkUser = async () => {
      try {
        console.log('Verificando autenticação inicial...');
        
        // ✅ MUDANÇA PRINCIPAL: Usar getSession() primeiro para dados locais rápidos
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError);
          if (mounted) {
            setUser(null);
            setUserActive(true);
            setLoading(false);
          }
          return;
        }
        
        if (session?.user) {
          console.log('Sessão encontrada, verificando status do usuário...');
          
          // Verificar se o usuário está ativo
          try {
            const active = await isUserActive(session.user.id);
            
            if (!mounted) return; // Componente foi desmontado
            
            setUserActive(active);
            
            if (active) {
              setUser(session.user);
              console.log('Usuário ativo confirmado');
            } else {
              console.log('Usuário inativo, redirecionando...');
              setUser(null);
              // Só redirecionar se não estiver já na página de acesso negado
              if (router.pathname !== '/acesso-negado') {
                router.push('/acesso-negado');
              }
            }
          } catch (activeError) {
            console.error('Erro ao verificar status ativo:', activeError);
            // Em caso de erro na verificação, permitir acesso por segurança
            if (mounted) {
              setUser(session.user);
              setUserActive(true);
            }
          }
        } else {
          console.log('Nenhuma sessão encontrada');
          if (mounted) {
            setUser(null);
            setUserActive(true);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        if (mounted) {
          setUser(null);
          setUserActive(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    checkUser();
    
    // ✅ CONFIGURAR LISTENER PARA MUDANÇAS DE AUTENTICAÇÃO
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      
      if (!mounted) return;
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          try {
            const active = await isUserActive(session.user.id);
            setUserActive(active);
            
            if (active) {
              setUser(session.user);
            } else {
              setUser(null);
              if (router.pathname !== '/acesso-negado') {
                router.push('/acesso-negado');
              }
            }
          } catch (error) {
            console.error('Erro ao verificar status no auth change:', error);
            // Em caso de erro, permitir acesso
            setUser(session.user);
            setUserActive(true);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserActive(true);
      }
    });
    
    // ✅ FUNÇÃO PARA REVALIDAR QUANDO A ABA VOLTAR AO FOCO
    const handleVisibilityChange = async () => {
      if (!mounted || document.visibilityState !== 'visible') return;
      
      console.log('Aba voltou ao foco - revalidando sessão');
      
      try {
        // Verificar sessão atual novamente
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Revalidar status do usuário
          const active = await isUserActive(session.user.id);
          
          if (mounted) {
            setUserActive(active);
            
            if (active) {
              setUser(session.user);
            } else {
              setUser(null);
              if (router.pathname !== '/acesso-negado') {
                router.push('/acesso-negado');
              }
            }
          }
        } else {
          if (mounted) {
            setUser(null);
            setUserActive(true);
          }
          
          // Se não houver sessão válida e não estiver em páginas públicas, redirecionar
          const publicPages = ['/login', '/cadastro', '/acesso-negado'];
          if (!publicPages.includes(router.pathname)) {
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('Erro na revalidação:', error);
        // Em caso de erro grave, fazer logout
        if (mounted) {
          await supabase.auth.signOut();
          setUser(null);
          router.replace('/login');
        }
      }
    };

    // ✅ REGISTRAR EVENTOS
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // ✅ CLEANUP FUNCTION
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [router]);

  // ✅ LOADING STATE MAIS SIMPLES
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

  // ✅ PÁGINAS PÚBLICAS QUE NÃO PRECISAM DE VERIFICAÇÃO
  const publicPages = ['/acesso-negado', '/login', '/cadastro'];
  if (publicPages.includes(router.pathname)) {
    return (
      <>
        <Toaster position="top-right" />
        <Component {...pageProps} user={user} />
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Component {...pageProps} user={user} userActive={userActive} />
    </>
  );
}

export default MyApp;