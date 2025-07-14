// src/utils/loginTracker.js

/**
 * Rastreia um login bem-sucedido
 * @param {Object} user - Objeto do usuário do Supabase
 * @param {Object} session - Objeto da sessão do Supabase
 * @param {string} metodo - Método de login usado (default: 'email_password')
 * @returns {Promise<boolean>} - true se o tracking foi bem-sucedido
 */
export const trackSuccessfulLogin = async (user, session, metodo = 'email_password') => {
  try {
    // Validar dados obrigatórios
    if (!user || !user.id || !user.email) {
      console.warn('Dados de usuário inválidos para tracking:', user);
      return false;
    }
    
    console.log('🔍 Rastreando login bem-sucedido para:', user.email);
    
    const loginData = {
      usuario_id: user.id,
      email: user.email,
      metodo_login: metodo,
      sessao_id: session?.access_token ? session.access_token.substring(0, 20) : null,
      sucesso: true
    };
    
    const response = await fetch('/api/track_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('❌ Erro ao rastrear login bem-sucedido:', errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Login bem-sucedido rastreado:', result);
    return true;
    
  } catch (error) {
    console.error('❌ Falha ao rastrear login bem-sucedido:', error);
    return false;
  }
};

/**
 * Rastreia uma tentativa de login falhada
 * @param {string} email - Email usado na tentativa
 * @param {string} metodo - Método de login tentado (default: 'email_password')
 * @param {string} erro - Descrição do erro
 * @returns {Promise<boolean>} - true se o tracking foi bem-sucedido
 */
export const trackFailedLogin = async (email, metodo = 'email_password', erro = null) => {
  try {
    if (!email) {
      console.warn('Email não fornecido para tracking de login falhado');
      return false;
    }
    
    console.log('🔍 Rastreando login falhado para:', email);
    
    const loginData = {
      usuario_id: '00000000-0000-0000-0000-000000000000', // UUID especial para logins falhados
      email: email,
      metodo_login: metodo,
      sessao_id: null,
      sucesso: false,
      erro: erro
    };
    
    const response = await fetch('/api/track_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('❌ Erro ao rastrear login falhado:', errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Login falhado rastreado:', result);
    return true;
    
  } catch (error) {
    console.error('❌ Falha ao rastrear login falhado:', error);
    return false;
  }
};

/**
 * Função genérica para rastrear qualquer tipo de login
 * @param {Object} loginData - Dados do login
 * @returns {Promise<boolean>} - true se o tracking foi bem-sucedido
 */
export const trackLogin = async (loginData) => {
  try {
    console.log('🔍 Rastreando login genérico:', loginData);
    
    const response = await fetch('/api/track_login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('❌ Erro ao rastrear login:', errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('✅ Login rastreado:', result);
    return true;
    
  } catch (error) {
    console.error('❌ Falha ao rastrear login:', error);
    return false;
  }
};

/**
 * Hook personalizado para usar em componentes React
 * @returns {Object} - Funções de tracking
 */
export const useLoginTracker = () => {
  const trackUserLogin = async (user, session, metodo) => {
    return await trackSuccessfulLogin(user, session, metodo);
  };
  
  const trackLoginFailure = async (email, metodo, erro) => {
    return await trackFailedLogin(email, metodo, erro);
  };
  
  return {
    trackUserLogin,
    trackLoginFailure,
    trackLogin
  };
};

/**
 * Função para obter histórico de logins do usuário atual
 * @param {string} token - Token de autenticação
 * @param {number} limit - Número máximo de registros (padrão: 50)
 * @param {number} offset - Offset para paginação (padrão: 0)
 * @param {boolean} onlySuccessful - Apenas logins bem-sucedidos (padrão: false)
 * @returns {Promise<Object>} - Objeto com dados e paginação
 */
export const getUserLoginHistory = async (token, limit = 50, offset = 0, onlySuccessful = false) => {
  try {
    console.log('🔍 Buscando histórico de logins...');
    
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      only_successful: onlySuccessful.toString()
    });
    
    const response = await fetch(`/api/get_login_history?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
      console.error('❌ Erro ao obter histórico de logins:', errorData);
      return {
        success: false,
        data: [],
        pagination: { total: 0, limit, offset, has_more: false },
        error: errorData.error
      };
    }
    
    const result = await response.json();
    console.log('✅ Histórico de logins obtido:', result);
    return {
      success: true,
      ...result
    };
    
  } catch (error) {
    console.error('❌ Falha ao obter histórico de logins:', error);
    return {
      success: false,
      data: [],
      pagination: { total: 0, limit, offset, has_more: false },
      error: error.message
    };
  }
};

/**
 * Função para detectar tipo de dispositivo no frontend
 * @returns {string} - Tipo de dispositivo
 */
export const detectDeviceType = () => {
  if (typeof window === 'undefined') return 'Unknown';
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'Mobile';
  } else if (/tablet|ipad/i.test(userAgent)) {
    return 'Tablet';
  } else {
    return 'Desktop';
  }
};

/**
 * Função para detectar navegador
 * @returns {string} - Nome do navegador
 */
export const detectBrowser = () => {
  if (typeof window === 'undefined') return 'Unknown';
  
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    return 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'Safari';
  } else if (userAgent.includes('Edg')) {
    return 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    return 'Opera';
  } else {
    return 'Unknown';
  }
};

// Exportações para compatibilidade
export default {
  trackSuccessfulLogin,
  trackFailedLogin,
  trackLogin,
  getUserLoginHistory,
  detectDeviceType,
  detectBrowser,
  useLoginTracker
};