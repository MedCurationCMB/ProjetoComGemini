import { useState, useEffect, useRef, useMemo } from 'react';
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

  // Refs para controle de estado
  const mounted = useRef(true);
  const hasInitialized = useRef(false);
  const currentUserId = useRef(null);
  const authSubscription = useRef(null);

  // Memoizar o objeto user para evitar re-renders desnecessários
  const stableUser = useMemo(() => {
    if (!user) return null;
    
    // Se o ID não mudou, retornar a mesma referência
    if (currentUserId.current === user.id) {
      return user;
    }
    
    // Atualizar referência apenas quando o ID muda
    currentUserId.current = user.id;
    return user;
  }, [user?.id, user?.email]); // Apenas essas propriedades críticas

  useEffect(() => {
    mounted.current = true;
    
    const initializeAuth = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;
      
      try {
        console.log('Inicializando autenticação...');
        
        // Obter sessão inicial apenas uma vez
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Erro ao obter sessão:', sessionError.message);
          if (mounted.current) {
            setUser(null);
            setUserActive(true);
            setLoading(false);
          }
          return;
        }
        
        if (session?.user) {
          console.log('Sessão inicial encontrada para:', session.user.email);
          
          // Verificação de status apenas na inicialização
          try {
            const active = await isUserActiveSimple(session.user.id);
            
            if (mounted.current) {
              setUser(session.user);
              setUserActive(active);
              
              if (!active && router.pathname !== '/acesso-negado') {
                router.push('/acesso-negado');
              }
            }
          } catch (activeError) {
            console.warn('Erro ao verificar status, permitindo acesso:', activeError.message);
            if (mounted.current) {
              setUser(session.user);
              setUserActive(true);
            }
          }
        } else {
          console.log('Nenhuma sessão inicial encontrada');
          if (mounted.current) {
            setUser(null);
            setUserActive(true);
          }
        }
      } catch (error) {
        console.error('Erro na inicialização:', error.message);
        if (mounted.current) {
          setUser(null);
          setUserActive(true);
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
          console.log('Inicialização concluída');
        }
      }
    };
    
    // Executar inicialização
    initializeAuth();
    
    // Configurar listener de auth apenas uma vez
    const setupAuthListener = () => {
      authSubscription.current = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted.current) return;
        
        console.log('Auth state change:', event);
        
        // Filtrar eventos que realmente importam
        switch (event) {
          case 'SIGNED_IN':
            // Apenas processar se for um login real, não reautenticação
            if (session?.user && session.user.id !== currentUserId.current) {
              console.log('Novo login detectado:', session.user.email);
              setUser(session.user);
              setUserActive(true);
            }
            break;
            
          case 'SIGNED_OUT':
            console.log('Usuário deslogado');
            setUser(null);
            setUserActive(true);
            currentUserId.current = null;
            break;
            
          case 'TOKEN_REFRESHED':
            // Ignorar refresh de token - não deve causar re-render
            console.log('Token renovado silenciosamente');
            break;
            
          case 'USER_UPDATED':
            if (session?.user && session.user.id === currentUserId.current) {
              console.log('Dados do usuário atualizados');
              setUser(session.user);
            }
            break;
            
          default:
            // Ignorar outros eventos como INITIAL_SESSION se já inicializamos
            console.log('Evento ignorado:', event);
        }
      });
    };
    
    setupAuthListener();
    
    // Cleanup function
    return () => {
      mounted.current = false;
      if (authSubscription.current) {
        authSubscription.current.data.subscription.unsubscribe();
        authSubscription.current = null;
      }
    };
  }, []); // Apenas executa uma vez

  // Loading state
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

  return (
    <>
      <Toaster position="top-right" />
      <Component {...pageProps} user={stableUser} userActive={userActive} />
    </>
  );
}

export default MyApp;