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
    // Verificar se o usuário está autenticado
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // Verificar se o usuário está ativo
          const active = await isUserActive(session.user.id);
          setUserActive(active);
          
          if (active) {
            setUser(session.user);
          } else {
            // Se não estiver ativo, redirecionar para página de acesso negado
            if (router.pathname !== '/acesso-negado') {
              router.push('/acesso-negado');
            }
            setUser(null);
          }
        } else {
          setUser(null);
          setUserActive(true); // Reset para não mostrar mensagem quando não há usuário
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Função para revalidar quando a aba voltar ao foco
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Aba voltou ao foco - revalidando sessão');
        
        try {
          // Forçar revalidação completa da sessão
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Reconectar se necessário
            if (typeof supabase.realtime?.setAuth === 'function') {
              supabase.realtime.setAuth(session.access_token);
            }
            
            // Revalidar status do usuário com novo token
            const active = await isUserActive(session.user.id);
            console.log('Revalidação de status:', active);
            
            if (active) {
              setUser(session.user);
              
              // Forçar atualização da página para reconectar todos os componentes
              if (router.pathname !== '/acesso-negado' && 
                  router.pathname !== '/login' && 
                  router.pathname !== '/cadastro') {
                router.replace(router.asPath);
              }
            } else {
              if (router.pathname !== '/acesso-negado') {
                router.push('/acesso-negado');
              }
              setUser(null);
            }
          } else {
            // Se não houver sessão válida, redirecionar para login
            if (router.pathname !== '/login' && 
                router.pathname !== '/cadastro' && 
                router.pathname !== '/acesso-negado') {
              router.replace('/login');
            }
            setUser(null);
          }
        } catch (error) {
          console.error('Erro na revalidação:', error);
          // Em caso de erro, tentar fazer logout e redirecionar para login
          await supabase.auth.signOut();
          router.replace('/login');
        }
      }
    };

    // Registrar evento de visibilidade
    document.addEventListener('visibilitychange', handleVisibilityChange);
      
    // Configurar listener para mudanças de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        // Verificar se o usuário está ativo
        const active = await isUserActive(session.user.id);
        setUserActive(active);
        
        if (active) {
          setUser(session.user);
        } else {
          // Se não estiver ativo, redirecionar para página de acesso negado
          if (router.pathname !== '/acesso-negado') {
            router.push('/acesso-negado');
          }
          setUser(null);
        }
      } else {
        setUser(null);
        setUserActive(true); // Reset para não mostrar mensagem quando não há usuário
      }
    });
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    // Mostrar um indicador de carregamento enquanto verificamos a autenticação
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Se estiver na página de acesso negado, não verificar status ativo
  if (router.pathname === '/acesso-negado' || 
      router.pathname === '/login' || 
      router.pathname === '/cadastro') {
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
      <Component {...pageProps} user={user} />
    </>
  );
}

export default MyApp;