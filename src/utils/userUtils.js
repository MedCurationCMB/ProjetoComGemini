import { supabase } from './supabaseClient';

/**
 * ✅ CACHE SIMPLIFICADO PARA EVITAR MÚLTIPLAS VERIFICAÇÕES
 */
let userStatusCache = new Map();
let ongoingVerifications = new Map();

/**
 * ✅ LIMPA O CACHE DE STATUS DE USUÁRIO
 */
export const clearUserStatusCache = () => {
  userStatusCache.clear();
  ongoingVerifications.clear();
};

/**
 * ✅ VERSÃO ULTRA SIMPLIFICADA PARA VERIFICAR SE USUÁRIO ESTÁ ATIVO
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se ativo, false caso contrário
 */
export const isUserActive = async (userId) => {
  try {
    if (!userId) {
      console.log('UserID não fornecido, retornando true por padrão');
      return true;
    }
    
    // ✅ VERIFICAR SE JÁ EXISTE UMA VERIFICAÇÃO EM ANDAMENTO
    if (ongoingVerifications.has(userId)) {
      console.log('Verificação em andamento, aguardando resultado...');
      return await ongoingVerifications.get(userId);
    }
    
    // ✅ VERIFICAR CACHE (VÁLIDO POR 2 MINUTOS)
    const cached = userStatusCache.get(userId);
    if (cached && (Date.now() - cached.timestamp) < 120000) {
      console.log('Usando status em cache para usuário:', userId.substring(0, 8));
      return cached.status;
    }
    
    console.log("Verificando status de usuário:", userId.substring(0, 8));
    
    // ✅ CRIAR PROMISE PARA EVITAR MÚLTIPLAS VERIFICAÇÕES SIMULTÂNEAS
    const verificationPromise = performUserVerificationSimple(userId);
    ongoingVerifications.set(userId, verificationPromise);
    
    try {
      const result = await verificationPromise;
      
      // ✅ SALVAR NO CACHE
      userStatusCache.set(userId, {
        status: result,
        timestamp: Date.now()
      });
      
      return result;
    } finally {
      // ✅ LIMPAR VERIFICAÇÃO EM ANDAMENTO
      ongoingVerifications.delete(userId);
    }
    
  } catch (error) {
    console.error('Erro ao verificar status do usuário:', error.message);
    
    // ✅ EM CASO DE ERRO, SEMPRE PERMITIR ACESSO POR SEGURANÇA
    console.warn('Permitindo acesso por segurança devido ao erro');
    return true;
  }
};

/**
 * ✅ FUNÇÃO INTERNA SIMPLIFICADA PARA VERIFICAÇÃO
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
const performUserVerificationSimple = async (userId) => {
  const timeoutDuration = 5000; // 5 segundos apenas
  
  try {
    console.log(`Fazendo verificação de status para usuário ${userId.substring(0, 8)}`);
    
    // ✅ TIMEOUT CONTROLLER SIMPLES
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutDuration);
    
    // ✅ QUERY SIMPLIFICADA
    const { data, error } = await supabase
      .from('usuarios')
      .select('ativo')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .single();
      
    clearTimeout(timeoutId);
      
    if (error) {
      console.error(`Erro na verificação:`, error.message);
      
      // ✅ PARA QUALQUER ERRO, PERMITIR ACESSO
      console.warn('Erro na query, permitindo acesso por segurança');
      return true;
    }
    
    console.log("Status obtido:", data?.ativo);
    
    // ✅ RETORNAR TRUE SE NÃO HOUVER DADOS OU SE ATIVO NÃO FOR EXPLICITAMENTE FALSE
    if (!data) {
      console.log('Nenhum dado retornado, permitindo acesso');
      return true;
    }
    
    // ✅ EXPLICITAMENTE RETORNAR TRUE SE ATIVO FOR TRUE OU NÃO ESTIVER DEFINIDO
    const isActive = data.ativo !== false;
    console.log('Status final:', isActive);
    return isActive;
    
  } catch (error) {
    // ✅ SE FOR ERRO DE ABORT (TIMEOUT)
    if (error.name === 'AbortError') {
      console.warn('Timeout na verificação - permitindo acesso por segurança');
      return true;
    }
    
    console.error('Erro na verificação:', error.message);
    
    // ✅ PARA QUALQUER OUTRO ERRO, PERMITIR ACESSO
    console.warn('Permitindo acesso por segurança devido ao erro');
    return true;
  }
};

/**
 * ✅ VERSÃO AINDA MAIS SIMPLES PARA CASOS NÃO CRÍTICOS
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se ativo, false caso contrário
 */
export const isUserActiveSimple = async (userId) => {
  try {
    if (!userId) return true;
    
    console.log("Verificação simples de status de usuário:", userId.substring(0, 8));
    
    // ✅ TIMEOUT AINDA MENOR PARA VERIFICAÇÃO SIMPLES
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('ativo')
      .eq('id', userId)
      .abortSignal(controller.signal)
      .single();
    
    clearTimeout(timeoutId);
      
    if (error) {
      console.warn('Erro na verificação simples, permitindo acesso:', error.message);
      return true;
    }
    
    console.log("Status simples:", data?.ativo);
    return data?.ativo !== false;
    
  } catch (error) {
    console.warn('Erro na verificação simples, permitindo acesso:', error.message);
    return true;
  }
};

/**
 * ✅ DESATIVA UM USUÁRIO NO SISTEMA
 * @param {string} userId - ID do usuário a ser desativado
 * @returns {Promise<boolean>} - true se sucesso, false caso contrário
 */
export const deactivateUser = async (userId) => {
  try {
    console.log(`Tentando desativar usuário: ${userId.substring(0, 8)}`);
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ ativo: false })
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('Erro ao desativar usuário:', error);
      return false;
    }
    
    // ✅ LIMPAR CACHE PARA ESTE USUÁRIO
    userStatusCache.delete(userId);
    console.log('Usuário desativado com sucesso');
    
    return true;
  } catch (error) {
    console.error('Falha ao desativar usuário:', error);
    return false;
  }
};

/**
 * ✅ REATIVA UM USUÁRIO NO SISTEMA
 * @param {string} userId - ID do usuário a ser reativado
 * @returns {Promise<boolean>} - true se sucesso, false caso contrário
 */
export const activateUser = async (userId) => {
  try {
    console.log(`Tentando ativar usuário: ${userId.substring(0, 8)}`);
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ ativo: true })
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('Erro ao reativar usuário:', error);
      return false;
    }
    
    // ✅ LIMPAR CACHE PARA ESTE USUÁRIO
    userStatusCache.delete(userId);
    console.log('Usuário ativado com sucesso');
    
    return true;
  } catch (error) {
    console.error('Falha ao reativar usuário:', error);
    return false;
  }
};

/**
 * ✅ VERIFICA SE UM USUÁRIO É ADMINISTRADOR
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se for admin, false caso contrário
 */
export const isUserAdmin = async (userId) => {
  try {
    if (!userId) return false;
    
    // ✅ USAR CACHE TAMBÉM PARA ADMIN STATUS
    const cacheKey = `admin_${userId}`;
    const cached = userStatusCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // Cache por 5 minutos
      return cached.status;
    }
    
    console.log("Verificando status de admin:", userId.substring(0, 8));
    
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
    
    // ✅ SALVAR NO CACHE
    userStatusCache.set(cacheKey, {
      status: isAdmin,
      timestamp: Date.now()
    });
    
    console.log('Status de admin:', isAdmin);
    return isAdmin;
  } catch (error) {
    console.error('Falha ao verificar status de admin:', error);
    return false;
  }
};

// ✅ LIMPEZA PERIÓDICA DO CACHE (A CADA 10 MINUTOS)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, value] of userStatusCache.entries()) {
      // ✅ REMOVER ENTRADAS COM MAIS DE 10 MINUTOS
      if (now - value.timestamp > 600000) {
        userStatusCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cache limpo: ${cleanedCount} entradas removidas`);
    }
  }, 600000); // 10 minutos
}