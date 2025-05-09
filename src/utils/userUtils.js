import { supabase } from './supabaseClient';

/**
 * Verifica se um usuário está ativo no sistema
 * @param {string} userId - ID do usuário a ser verificado
 * @returns {Promise<boolean>} - true se ativo, false caso contrário
 */
export const isUserActive = async (userId) => {
    try {
      if (!userId) return false;
      
      console.log("Verificando status de usuário:", userId);
      
      // Adicionar timeout para a consulta
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout na verificação de status')), 3000);
      });
      
      // Requisição ao Supabase
      const supabasePromise = supabase
        .from('usuarios')
        .select('ativo')
        .eq('id', userId)
        .single();
      
      // Usar Promise.race para definir timeout
      const { data, error } = await Promise.race([
        supabasePromise,
        timeoutPromise
      ]);
        
      if (error) {
        console.error('Erro ao verificar status do usuário:', error);
        return true; // Em caso de erro, permitir acesso por padrão
      }
      
      console.log("Status do usuário:", data);
      
      // Retornar true se não houver dados ou se ativo for null/undefined
      if (!data) return true;
      
      // Explicitamente retorne true se ativo for true ou não estiver definido
      return data.ativo !== false;
    } catch (error) {
      console.error('Falha ao verificar status do usuário:', error);
      // Em caso de erro, permitir o acesso por padrão
      return true;
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
      
      const { data, error } = await supabase
        .from('usuarios')
        .select('admin')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Erro ao verificar status de admin:', error);
        return false;
      }
      
      return data?.admin === true;
    } catch (error) {
      console.error('Falha ao verificar status de admin:', error);
      return false;
    }
  };