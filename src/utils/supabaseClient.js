import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ✅ CONFIGURAÇÕES OTIMIZADAS PARA ESTABILIDADE
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // ✅ CONFIGURAÇÕES MELHORADAS PARA HANDLING DE SESSÕES
    storageKey: 'sb-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    debug: process.env.NODE_ENV === 'development'
  },
  // ✅ CONFIGURAÇÕES DE REDE OTIMIZADAS
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'nextjs-app'
    }
  },
  db: {
    schema: 'public'
  }
})

// ✅ ESTADO PARA CONTROLE DE RECONEXÃO SIMPLIFICADO
let isReconnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

/**
 * ✅ FUNÇÃO SIMPLIFICADA PARA VERIFICAR CONECTIVIDADE
 */
export const checkSupabaseConnection = async () => {
  try {
    // Fazer uma query bem simples e rápida
    const { error } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 é "no rows found", que é OK
      console.error('Erro de conectividade:', error);
      return false;
    }
    
    reconnectAttempts = 0; // Reset counter on success
    return true;
  } catch (error) {
    console.error('Falha na verificação de conectividade:', error);
    return false;
  }
};

/**
 * ✅ FUNÇÃO PARA RENOVAR SESSÃO MANUALMENTE
 */
export const refreshSession = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Erro ao renovar sessão:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Falha ao renovar sessão:', error);
    return false;
  }
};

/**
 * ✅ FUNÇÃO SIMPLIFICADA PARA RECONECTAR
 */
const attemptReconnection = async () => {
  if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
    return false;
  }
  
  isReconnecting = true;
  reconnectAttempts++;
  
  console.log(`Tentando reconexão... (tentativa ${reconnectAttempts})`);
  
  try {
    // Primeiro tentar renovar a sessão
    const sessionRefreshed = await refreshSession();
    
    // Depois verificar conectividade
    const isConnected = await checkSupabaseConnection();
    
    if (sessionRefreshed && isConnected) {
      console.log('Reconexão bem-sucedida');
      reconnectAttempts = 0;
      
      // Dispatch evento customizado para componentes saberem da reconexão
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-reconnected'));
      }
      
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Erro durante reconexão:', error);
    return false;
  } finally {
    isReconnecting = false;
  }
};

// ✅ CONFIGURAÇÕES SIMPLIFICADAS APENAS NO LADO DO CLIENTE
if (typeof window !== 'undefined') {
  let lastActiveTime = Date.now();
  
  // ✅ DETECTAR QUANDO A ABA SE TORNA ATIVA NOVAMENTE
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastActiveTime = Date.now();
      console.log('Aba tornou-se ativa');
      
      // Verificar conectividade após um pequeno delay
      setTimeout(async () => {
        const isConnected = await checkSupabaseConnection();
        if (!isConnected) {
          console.log('Problemas de conectividade detectados');
          await attemptReconnection();
        }
      }, 500);
    }
  });
  
  // ✅ DETECTAR MUDANÇAS DE REDE
  window.addEventListener('online', () => {
    console.log('Conexão com internet restaurada');
    lastActiveTime = Date.now();
    setTimeout(async () => {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        await attemptReconnection();
      }
    }, 1000);
  });
  
  window.addEventListener('offline', () => {
    console.log('Conexão com internet perdida');
  });
  
  // ✅ LISTENER SIMPLIFICADO PARA EVENTOS DE AUTH
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      lastActiveTime = Date.now();
      reconnectAttempts = 0; // Reset on successful auth
    } else if (event === 'SIGNED_OUT') {
      reconnectAttempts = 0;
    }
  });
}

/**
 * ✅ FUNÇÃO HELPER SIMPLIFICADA PARA QUERIES COM RETRY
 */
export const supabaseQueryWithRetry = async (queryFn, maxAttempts = 2) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await queryFn();
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`Query falhou na tentativa ${attempt}:`, error.message);
      
      if (attempt < maxAttempts) {
        // Verificar se é um erro de conectividade
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
          console.log('Erro de rede detectado, tentando reconectar...');
          await attemptReconnection();
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  }
  
  throw lastError;
};

/**
 * ✅ OBTER STATUS ATUAL DA CONEXÃO
 */
export const getConnectionStatus = () => {
  return {
    isReconnecting,
    reconnectAttempts,
    maxReconnectAttempts
  };
};

export default supabase;