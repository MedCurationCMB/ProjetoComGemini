import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Configurações otimizadas para estabilidade
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Configurações para melhor handling de sessões
    storageKey: 'sb-auth-token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    debug: process.env.NODE_ENV === 'development'
  },
  // Configurações de rede para melhor estabilidade
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  // Configurações globais
  global: {
    headers: {
      'X-Client-Info': 'nextjs-app'
    }
  },
  db: {
    schema: 'public'
  }
})

// Estado para controle de reconexão
let isReconnecting = false;
let reconnectAttempts = 0;
const maxReconnectAttempts = 3;

// Detectar mudanças de visibilidade da aba
let lastActiveTime = Date.now();
let connectionCheckInterval = null;

/**
 * Função para verificar conectividade com o Supabase
 */
export const checkSupabaseConnection = async () => {
  try {
    console.log('Verificando conectividade com Supabase...');
    
    // Fazer uma query simples e rápida
    const { error } = await supabase
      .from('usuarios')
      .select('count')
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 é "no rows found", que é OK
      console.error('Erro de conectividade:', error);
      return false;
    }
    
    console.log('Conexão com Supabase OK');
    reconnectAttempts = 0; // Reset counter on success
    return true;
  } catch (error) {
    console.error('Falha na verificação de conectividade:', error);
    return false;
  }
};

/**
 * Função para renovar sessão manualmente
 */
export const refreshSession = async () => {
  try {
    console.log('Renovando sessão...');
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error('Erro ao renovar sessão:', error);
      return false;
    }
    
    console.log('Sessão renovada com sucesso');
    return true;
  } catch (error) {
    console.error('Falha ao renovar sessão:', error);
    return false;
  }
};

/**
 * Função para reconectar quando necessário
 */
const attemptReconnection = async () => {
  if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) {
    return;
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
    } else {
      // Tentar novamente após um delay
      setTimeout(() => {
        isReconnecting = false;
        attemptReconnection();
      }, 2000 * reconnectAttempts); // Backoff exponencial
    }
  } catch (error) {
    console.error('Erro durante reconexão:', error);
    setTimeout(() => {
      isReconnecting = false;
      attemptReconnection();
    }, 2000 * reconnectAttempts);
  } finally {
    isReconnecting = false;
  }
};

/**
 * Verificação periódica de conectividade
 */
const startConnectionMonitoring = () => {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  connectionCheckInterval = setInterval(async () => {
    const now = Date.now();
    const timeSinceLastActive = now - lastActiveTime;
    
    // Só verificar se a aba esteve inativa por mais de 30 segundos
    if (timeSinceLastActive > 30000 && !document.hidden) {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        console.warn('Perda de conectividade detectada, tentando reconectar...');
        attemptReconnection();
      }
    }
  }, 60000); // Verificar a cada minuto
};

/**
 * Parar monitoramento de conexão
 */
const stopConnectionMonitoring = () => {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
};

// Configurações apenas no lado do cliente
if (typeof window !== 'undefined') {
  // Detectar quando a aba se torna ativa novamente
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      lastActiveTime = Date.now();
      console.log('Aba tornou-se ativa - verificando sessão e conectividade...');
      
      // Verificar sessão e conectividade após um pequeno delay
      setTimeout(async () => {
        const currentSession = await supabase.auth.getSession();
        
        if (currentSession.data.session) {
          console.log('Sessão encontrada, verificando conectividade...');
          const isConnected = await checkSupabaseConnection();
          
          if (!isConnected) {
            console.log('Problemas de conectividade detectados, tentando reconectar...');
            attemptReconnection();
          }
        } else {
          console.log('Nenhuma sessão encontrada');
        }
      }, 500);
    } else {
      console.log('Aba tornou-se inativa');
    }
  });
  
  // Listener para mudanças de foco na janela
  window.addEventListener('focus', () => {
    lastActiveTime = Date.now();
    console.log('Janela recebeu foco');
    
    // Verificação mais rápida quando a janela recebe foco
    setTimeout(async () => {
      const isConnected = await checkSupabaseConnection();
      if (!isConnected) {
        attemptReconnection();
      }
    }, 200);
  });
  
  // Listener para quando a janela perde o foco
  window.addEventListener('blur', () => {
    console.log('Janela perdeu foco');
  });
  
  // Detectar mudanças de rede
  window.addEventListener('online', () => {
    console.log('Conexão com internet restaurada');
    lastActiveTime = Date.now();
    setTimeout(() => {
      checkSupabaseConnection().then(isConnected => {
        if (!isConnected) {
          attemptReconnection();
        }
      });
    }, 1000);
  });
  
  window.addEventListener('offline', () => {
    console.log('Conexão com internet perdida');
    stopConnectionMonitoring();
  });
  
  // Iniciar monitoramento quando a página carrega
  window.addEventListener('load', () => {
    console.log('Página carregada, iniciando monitoramento de conexão');
    startConnectionMonitoring();
  });
  
  // Parar monitoramento quando a página descarrega
  window.addEventListener('beforeunload', () => {
    stopConnectionMonitoring();
  });
  
  // Listener para eventos de auth
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event);
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      lastActiveTime = Date.now();
      reconnectAttempts = 0; // Reset on successful auth
      
      // Reiniciar monitoramento após auth
      if (event === 'SIGNED_IN') {
        startConnectionMonitoring();
      }
    } else if (event === 'SIGNED_OUT') {
      stopConnectionMonitoring();
      reconnectAttempts = 0;
    }
  });
  
  // Inicializar imediatamente se ainda não foi
  setTimeout(() => {
    if (!connectionCheckInterval) {
      startConnectionMonitoring();
    }
  }, 1000);
}

/**
 * Função helper para fazer queries com retry automático
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
 * Obter status atual da conexão
 */
export const getConnectionStatus = () => {
  return {
    isReconnecting,
    reconnectAttempts,
    lastActiveTime,
    hasMonitoring: !!connectionCheckInterval
  };
};

export default supabase;