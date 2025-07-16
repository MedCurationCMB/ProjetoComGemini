import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { isUserActive } from '../utils/userUtils';
import '../styles/globals.css';

// Páginas que requerem autenticação
const protectedPages = [
  '/welcome',
  '/base-dados-conteudo',
  '/controle-conteudo',
  '/controle-conteudo-geral',
  '/registros', // Nova página adicionada
  '/visualizacao-indicadores',
  '/visualizacao-indicadores-importantes',
  '/visualizacao-geral-indicadores',
  '/controle-indicador-geral',
  '/indicador',
  '/analise-multiplos-indicadores',
  '/cadastros',
  '/historico-acessos'
];

// Páginas que não requerem autenticação
const publicPages = [
  '/login',
  '/cadastro',
  '/'
];

function MyApp({ Component, pageProps }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userCheckInProgress, setUserCheckInProgress] = useState(false);
  const router = useRouter();

  // Verificar se a página atual requer autenticação
  const isProtectedPage = protectedPages.some(page => 
    router.pathname.startsWith(page)
  );

  const isPublicPage = publicPages.includes(router.pathname);

  useEffect(() => {
    // Função para verificar sessão
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          console.log('Sessão encontrada:', session.user.id);
          
          // Verificar se o usuário está ativo
          setUserCheckInProgress(true);
          try {
            const isActive = await isUserActive(session.user.id);
            
            if (isActive) {
              console.log('Usuário está ativo');
              setUser(session.user);
            } else {
              console.log('Usuário inativo, fazendo logout...');
              await supabase.auth.signOut();
              setUser(null);
              if (isProtectedPage) {
                router.push('/login');
              }
            }
          } catch (userCheckError) {
            console.error('Erro ao verificar status do usuário:', userCheckError);
            // Em caso de erro na verificação, permitir acesso por precaução
            setUser(session.user);
          } finally {
            setUserCheckInProgress(false);
          }
        } else {
          console.log('Nenhuma sessão encontrada');
          setUser(null);
          if (isProtectedPage) {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        setUser(null);
        if (isProtectedPage) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escutar mudanças no estado da autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN' && session) {
          console.log('Usuário logado:', session.user.id);
          
          // Verificar se o usuário está ativo
          setUserCheckInProgress(true);
          try {
            const isActive = await isUserActive(session.user.id);
            
            if (isActive) {
              setUser(session.user);
              // Redirecionar para welcome se estivermos em uma página pública
              if (isPublicPage) {
                router.push('/welcome');
              }
            } else {
              console.log('Usuário inativo no login');
              await supabase.auth.signOut();
              setUser(null);
              router.push('/login');
            }
          } catch (userCheckError) {
            console.error('Erro ao verificar status do usuário no login:', userCheckError);
            // Em caso de erro, permitir acesso
            setUser(session.user);
            if (isPublicPage) {
              router.push('/welcome');
            }
          } finally {
            setUserCheckInProgress(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('Usuário deslogado');
          setUser(null);
          if (isProtectedPage) {
            router.push('/login');
          }
        }
      }
    );

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [router, isProtectedPage, isPublicPage]);

  // Mostrar loading enquanto verifica autenticação
  if (loading || userCheckInProgress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Para páginas protegidas, não renderizar se não houver usuário
  if (isProtectedPage && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Component {...pageProps} user={user} />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

export default MyApp;