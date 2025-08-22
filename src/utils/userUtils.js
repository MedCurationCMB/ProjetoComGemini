// ✅ ARQUIVO ATUALIZADO: src/utils/userUtils.js
// Mantendo suas funções existentes + adicionando as novas para admin/gestor

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

// ========================================
// ✅ NOVAS FUNÇÕES PARA GESTÃO DE PERMISSÕES
// ========================================

/**
 * ✅ VERIFICA SE O USUÁRIO É GESTOR
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se for gestor, false caso contrário
 */
export const isUserGestor = async (userId) => {
  try {
    if (!userId) return false;
    
    const cacheKey = `gestor_${userId}`;
    const cached = userStatusCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 300000) { // Cache por 5 minutos
      return cached.status;
    }
    
    console.log("Verificando status de gestor:", userId.substring(0, 8));
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('gestor')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Erro ao verificar status de gestor:', error);
      return false;
    }
    
    const isGestor = data?.gestor === true;
    
    // ✅ SALVAR NO CACHE
    userStatusCache.set(cacheKey, {
      status: isGestor,
      timestamp: Date.now()
    });
    
    console.log('Status de gestor:', isGestor);
    return isGestor;
  } catch (error) {
    console.error('Falha ao verificar status de gestor:', error);
    return false;
  }
};

/**
 * ✅ VERIFICA SE O USUÁRIO TEM PERMISSÕES ADMINISTRATIVAS (admin OU gestor)
 * Esta é a função principal para verificar acesso às páginas de gestão
 * @param {Object} user - Objeto do usuário (com dados já carregados)
 * @returns {boolean} - true se tem permissões, false caso contrário
 */
export const hasAdminPermissions = (user) => {
  if (!user) {
    console.log('❌ Usuário não existe');
    return false;
  }
  
  console.log('🔍 Verificando permissões administrativas:', {
    userId: user.id?.substring(0, 8),
    admin: user.admin,
    gestor: user.gestor,
    adminType: typeof user.admin,
    gestorType: typeof user.gestor
  });

  // ✅ VERIFICAÇÃO FLEXÍVEL PARA DIFERENTES TIPOS DE DADOS
  const isAdmin = user.admin === true || user.admin === 'true' || user.admin === 1;
  const isGestor = user.gestor === true || user.gestor === 'true' || user.gestor === 1;
  
  const hasPermissions = isAdmin || isGestor;
  
  console.log('✅ Resultado da verificação:', {
    isAdmin,
    isGestor,
    hasPermissions
  });

  return hasPermissions;
};

/**
 * ✅ VERIFICA SE O USUÁRIO É APENAS ADMIN (não gestor)
 * @param {Object} user - Objeto do usuário
 * @returns {boolean} - true se for apenas admin
 */
export const isOnlyAdmin = (user) => {
  if (!user) return false;
  
  const isAdmin = user.admin === true || user.admin === 'true' || user.admin === 1;
  const isGestor = user.gestor === true || user.gestor === 'true' || user.gestor === 1;
  
  return isAdmin && !isGestor;
};

/**
 * ✅ VERIFICA SE O USUÁRIO É APENAS GESTOR (não admin)
 * @param {Object} user - Objeto do usuário
 * @returns {boolean} - true se for apenas gestor
 */
export const isOnlyGestor = (user) => {
  if (!user) return false;
  
  const isAdmin = user.admin === true || user.admin === 'true' || user.admin === 1;
  const isGestor = user.gestor === true || user.gestor === 'true' || user.gestor === 1;
  
  return isGestor && !isAdmin;
};

/**
 * ✅ OBTER DADOS COMPLETOS DO USUÁRIO DO SUPABASE
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object|null>} - Dados completos do usuário ou null
 */
export const getUserCompleteData = async (userId) => {
  try {
    if (!userId) return null;
    
    const cacheKey = `complete_${userId}`;
    const cached = userStatusCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < 180000) { // Cache por 3 minutos
      return cached.status;
    }
    
    console.log("Buscando dados completos do usuário:", userId.substring(0, 8));
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao buscar dados completos do usuário:', error);
      return null;
    }
    
    // ✅ SALVAR NO CACHE
    userStatusCache.set(cacheKey, {
      status: data,
      timestamp: Date.now()
    });

    return data;
  } catch (error) {
    console.error('Erro na busca de dados completos:', error);
    return null;
  }
};

/**
 * ✅ VERIFICAR SE O USUÁRIO TEM ACESSO A UM PROJETO ESPECÍFICO
 * @param {string} userId - ID do usuário
 * @param {string} projectId - ID do projeto
 * @returns {Promise<boolean>} - true se tem acesso
 */
export const hasProjectAccess = async (userId, projectId) => {
  try {
    if (!userId || !projectId) return false;
    
    // ✅ VERIFICAR SE É ADMIN (tem acesso a tudo)
    const userData = await getUserCompleteData(userId);
    if (userData?.admin === true) {
      console.log('✅ Usuário é admin, tem acesso a todos os projetos');
      return true;
    }

    // ✅ SE NÃO É ADMIN, VERIFICAR SE ESTÁ VINCULADO AO PROJETO
    const { data, error } = await supabase
      .from('relacao_usuarios_projetos')
      .select('id')
      .eq('usuario_id', userId)
      .eq('projeto_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
      console.error('Erro ao verificar acesso ao projeto:', error);
      return false;
    }

    const hasAccess = !!data;
    console.log(`${hasAccess ? '✅' : '❌'} Acesso ao projeto:`, projectId.substring(0, 8));
    return hasAccess;
  } catch (error) {
    console.error('Erro na verificação de acesso ao projeto:', error);
    return false;
  }
};

/**
 * ✅ OBTER LISTA DE PROJETOS QUE O USUÁRIO TEM ACESSO
 * @param {string} userId - ID do usuário
 * @returns {Promise<Array>} - Lista de projetos
 */
export const getUserProjects = async (userId) => {
  try {
    if (!userId) return [];
    
    // ✅ VERIFICAR SE É ADMIN
    const userData = await getUserCompleteData(userId);
    if (userData?.admin === true) {
      console.log('✅ Admin detectado, carregando todos os projetos');
      
      // ✅ ADMIN TEM ACESSO A TODOS OS PROJETOS
      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .order('nome');

      if (error) throw error;
      
      console.log(`✅ ${data.length} projetos carregados (admin)`);
      return data;
    }

    // ✅ SE NÃO É ADMIN, BUSCAR APENAS PROJETOS VINCULADOS
    console.log('👤 Usuário não-admin, carregando projetos vinculados');
    
    const { data, error } = await supabase
      .from('relacao_usuarios_projetos')
      .select(`
        projeto_id,
        projetos (*)
      `)
      .eq('usuario_id', userId);

    if (error) throw error;

    const projetos = data.map(rel => rel.projetos).filter(p => p !== null);
    console.log(`✅ ${projetos.length} projetos vinculados carregados`);
    return projetos;
  } catch (error) {
    console.error('Erro ao buscar projetos do usuário:', error);
    return [];
  }
};

/**
 * ✅ FUNÇÃO DE DEBUG PARA VERIFICAR DADOS DO USUÁRIO
 * @param {Object} user - Objeto do usuário
 * @returns {Object} - Retorna o próprio usuário (para chain)
 */
export const debugUserData = (user) => {
  console.log('=== DEBUG USER DATA ===');
  console.log('User object:', user);
  console.log('Has user:', !!user);
  
  if (user) {
    console.log('User ID:', user.id);
    console.log('Email:', user.email);
    console.log('Nome:', user.nome);
    console.log('Admin:', user.admin, '(type:', typeof user.admin, ')');
    console.log('Gestor:', user.gestor, '(type:', typeof user.gestor, ')');
    console.log('Ativo:', user.ativo, '(type:', typeof user.ativo, ')');
    console.log('Has admin permissions:', hasAdminPermissions(user));
    console.log('Is only admin:', isOnlyAdmin(user));
    console.log('Is only gestor:', isOnlyGestor(user));
  }
  
  console.log('=====================');
  return user;
};

/**
 * ✅ PROMOVER USUÁRIO A GESTOR
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} - true se sucesso
 */
export const promoteToGestor = async (userId) => {
  try {
    console.log(`Promovendo usuário a gestor: ${userId.substring(0, 8)}`);
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ gestor: true })
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('Erro ao promover usuário a gestor:', error);
      return false;
    }
    
    // ✅ LIMPAR CACHE
    userStatusCache.delete(`gestor_${userId}`);
    userStatusCache.delete(`complete_${userId}`);
    
    console.log('Usuário promovido a gestor com sucesso');
    return true;
  } catch (error) {
    console.error('Falha ao promover usuário a gestor:', error);
    return false;
  }
};

/**
 * ✅ REMOVER PRIVILÉGIOS DE GESTOR
 * @param {string} userId - ID do usuário
 * @returns {Promise<boolean>} - true se sucesso
 */
export const removeGestorPrivileges = async (userId) => {
  try {
    console.log(`Removendo privilégios de gestor: ${userId.substring(0, 8)}`);
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ gestor: false })
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('Erro ao remover privilégios de gestor:', error);
      return false;
    }
    
    // ✅ LIMPAR CACHE
    userStatusCache.delete(`gestor_${userId}`);
    userStatusCache.delete(`complete_${userId}`);
    
    console.log('Privilégios de gestor removidos com sucesso');
    return true;
  } catch (error) {
    console.error('Falha ao remover privilégios de gestor:', error);
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