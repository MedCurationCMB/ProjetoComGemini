import { supabase } from './supabaseClient';

/**
 * Cache para evitar múltiplas verificações simultâneas
 */
let userStatusCache = new Map();
let ongoingVerifications = new Map();

/**
 * Limpa o cache de status de usuário
 */
export const clearUserStatusCache = () => {
  userStatusCache.clear();
  ongoingVerifications.clear();
};

/**
 * Verifica se um usuário está ativo no sistema (versão otimizada)
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se ativo, false caso contrário
 */
export const isUserActive = async (userId) => {
    try {
      if (!userId) return false;
      
      // Verificar se já existe uma verificação em andamento para este usuário
      if (ongoingVerifications.has(userId)) {
        console.log('Aguardando verificação em andamento para usuário:', userId);
        return await ongoingVerifications.get(userId);
      }
      
      // Verificar cache (válido por 30 segundos)
      const cached = userStatusCache.get(userId);
      if (cached && (Date.now() - cached.timestamp) < 30000) {
        console.log('Usando status em cache para usuário:', userId);
        return cached.status;
      }
      
      console.log("Verificando status de usuário:", userId);
      
      // Criar promise para evitar múltiplas verificações simultâneas
      const verificationPromise = performUserVerification(userId);
      ongoingVerifications.set(userId, verificationPromise);
      
      try {
        const result = await verificationPromise;
        
        // Salvar no cache
        userStatusCache.set(userId, {
          status: result,
          timestamp: Date.now()
        });
        
        return result;
      } finally {
        // Limpar verificação em andamento
        ongoingVerifications.delete(userId);
      }
      
    } catch (error) {
      console.error('Falha ao verificar status do usuário:', error);
      
      // Se for erro de timeout, mas o usuário estava autenticado, permitir acesso
      if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
        console.warn('Timeout na verificação - permitindo acesso por segurança');
        return true;
      }
      
      // Para outros erros, também permitir acesso por padrão para não bloquear usuários válidos
      return true;
    }
};

/**
 * Função interna para realizar a verificação real do usuário
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
const performUserVerification = async (userId) => {
  // Configuração de timeout mais longa e com retry
  const timeoutDuration = 8000; // 8 segundos
  const maxAttempts = 2;
  
  // Função para tentar a requisição com retry
  const attemptQuery = async (attempt = 1) => {
    try {
      console.log(`Tentativa ${attempt} de verificação de status para usuário ${userId}`);
      
      // Usar AbortController para controle de timeout mais preciso
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('ativo')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();
        
      clearTimeout(timeoutId);
        
      if (error) {
        console.error(`Erro na tentativa ${attempt}:`, error);
        
        // Se não for a última tentativa e for um erro recuperável, tenta novamente
        if (attempt < maxAttempts && isRecoverableError(error)) {
          console.log(`Tentando novamente em 1 segundo... (tentativa ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return attemptQuery(attempt + 1);
        }
        
        throw error;
      }
      
      return data;
    } catch (error) {
      // Se for erro de abort (timeout)
      if (error.name === 'AbortError') {
        console.warn(`Timeout na tentativa ${attempt}`);
        if (attempt < maxAttempts) {
          console.log(`Tentando novamente após timeout... (tentativa ${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          return attemptQuery(attempt + 1);
        }
        throw new Error('Timeout na verificação de status');
      }
      
      // Para outros erros, tentar novamente se não for a última tentativa
      if (attempt < maxAttempts && isRecoverableError(error)) {
        console.log(`Erro na tentativa ${attempt}, tentando novamente:`, error.message);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return attemptQuery(attempt + 1);
      }
      
      throw error;
    }
  };
  
  const data = await attemptQuery();
  
  console.log("Status do usuário obtido:", data);
  
  // Retornar true se não houver dados ou se ativo for null/undefined
  if (!data) return true;
  
  // Explicitamente retorne true se ativo for true ou não estiver definido
  return data.ativo !== false;
};

/**
 * Verifica se um erro é recuperável (pode tentar novamente)
 * @param {Error} error 
 * @returns {boolean}
 */
const isRecoverableError = (error) => {
  if (!error) return false;
  
  const recoverableErrors = [
    'network',
    'timeout',
    'connection',
    'NETWORK_ERROR',
    'PGRST116', // Supabase connection error
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return recoverableErrors.some(recoverable => 
    errorMessage.includes(recoverable) || errorCode.includes(recoverable)
  );
};

/**
 * Versão simplificada para casos onde a verificação completa não é crítica
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se ativo, false caso contrário
 */
export const isUserActiveSimple = async (userId) => {
    try {
      if (!userId) return false;
      
      console.log("Verificação simples de status de usuário:", userId);
      
      // Usar AbortController para cancelar requisições longas
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('ativo')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .single();
      
      clearTimeout(timeoutId);
        
      if (error) {
        console.error('Erro ao verificar status do usuário (modo simples):', error);
        return true; // Permitir acesso em caso de erro
      }
      
      console.log("Status do usuário (modo simples):", data);
      return data?.ativo !== false;
      
    } catch (error) {
      console.error('Falha ao verificar status do usuário (modo simples):', error);
      
      // Se for erro de abort (timeout), permitir acesso
      if (error.name === 'AbortError') {
        console.warn('Verificação cancelada por timeout - permitindo acesso');
        return true;
      }
      
      return true; // Permitir acesso por padrão
    }
};

/**
 * Desativa um usuário no sistema
 * @param {string} userId - ID do usuário a ser desativado
 * @returns {Promise<boolean>} - true se sucesso, false caso contrário
 */
export const deactivateUser = async (userId) => {
  try {
    console.log(`Tentando desativar usuário: ${userId}`);
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ ativo: false })
      .eq('id', userId)
      .select(); // Adiciona select() para ver os dados atualizados
      
    console.log('Dados retornados ao desativar:', data);
    console.log('Erro ao desativar:', error);
      
    if (error) {
      console.error('Erro ao desativar usuário:', error);
      return false;
    }
    
    // Limpar cache para este usuário
    userStatusCache.delete(userId);
    
    return true;
  } catch (error) {
    console.error('Falha ao desativar usuário:', error);
    return false;
  }
};

/**
 * Reativa um usuário no sistema
 * @param {string} userId - ID do usuário a ser reativado
 * @returns {Promise<boolean>} - true se sucesso, false caso contrário
 */
export const activateUser = async (userId) => {
  try {
    console.log(`Tentando ativar usuário: ${userId}`);
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ ativo: true })
      .eq('id', userId)
      .select(); // Adiciona select() para ver os dados atualizados
      
    console.log('Dados retornados ao ativar:', data);
    console.log('Erro ao ativar:', error);
      
    if (error) {
      console.error('Erro ao reativar usuário:', error);
      return false;
    }
    
    // Limpar cache para este usuário
    userStatusCache.delete(userId);
    
    return true;
  } catch (error) {
    console.error('Falha ao reativar usuário:', error);
    return false;
  }
};

/**
 * Verifica se um usuário é administrador
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se for admin, false caso contrário
 */
export const isUserAdmin = async (userId) => {
    try {
      if (!userId) return false;
      
      // Usar cache também para admin status
      const cacheKey = `admin_${userId}`;
      const cached = userStatusCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < 60000) { // Cache por 1 minuto
        return cached.status;
      }
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('admin')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Erro ao verificar status de admin:', error);
        return false;
      }
      
      const isAdmin = data?.admin === true;
      
      // Salvar no cache
      userStatusCache.set(cacheKey, {
        status: isAdmin,
        timestamp: Date.now()
      });
      
      return isAdmin;
    } catch (error) {
      console.error('Falha ao verificar status de admin:', error);
      return false;
    }
};

// Limpar cache periodicamente (a cada 5 minutos)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of userStatusCache.entries()) {
      // Remover entradas com mais de 5 minutos
      if (now - value.timestamp > 300000) {
        userStatusCache.delete(key);
      }
    }
  }, 300000); // 5 minutos
}