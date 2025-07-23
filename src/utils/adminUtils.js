// src/utils/adminUtils.js
import { supabase } from './supabaseClient';

/**
 * ✅ PROMOVE UM USUÁRIO A ADMINISTRADOR
 * @param {string} userId - ID do usuário a ser promovido
 * @returns {Promise<boolean>} - true se sucesso, false caso contrário
 */
export const promoteToAdmin = async (userId) => {
  try {
    console.log(`Promovendo usuário a admin: ${userId.substring(0, 8)}`);
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ admin: true })
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('Erro ao promover usuário a admin:', error);
      return false;
    }
    
    console.log('Usuário promovido a admin com sucesso');
    return true;
  } catch (error) {
    console.error('Falha ao promover usuário a admin:', error);
    return false;
  }
};

/**
 * ✅ REMOVE PRIVILÉGIOS DE ADMINISTRADOR DE UM USUÁRIO
 * @param {string} userId - ID do usuário a ter privilégios removidos
 * @returns {Promise<boolean>} - true se sucesso, false caso contrário
 */
export const removeAdminPrivileges = async (userId) => {
  try {
    console.log(`Removendo privilégios de admin: ${userId.substring(0, 8)}`);
    
    // Primeiro verificar se não é o último admin
    const { data: adminCount, error: countError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('admin', true);
    
    if (countError) {
      console.error('Erro ao verificar quantidade de admins:', countError);
      return false;
    }
    
    if (adminCount.length <= 1) {
      console.error('Não é possível remover o último administrador');
      return false;
    }
    
    const { data, error } = await supabase
      .from('usuarios')
      .update({ admin: false })
      .eq('id', userId)
      .select();
      
    if (error) {
      console.error('Erro ao remover privilégios de admin:', error);
      return false;
    }
    
    console.log('Privilégios de admin removidos com sucesso');
    return true;
  } catch (error) {
    console.error('Falha ao remover privilégios de admin:', error);
    return false;
  }
};

/**
 * ✅ CONTA QUANTOS ADMINISTRADORES EXISTEM NO SISTEMA
 * @returns {Promise<number>} - Número de administradores
 */
export const countAdmins = async () => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id')
      .eq('admin', true);
    
    if (error) {
      console.error('Erro ao contar administradores:', error);
      return 0;
    }
    
    return data.length;
  } catch (error) {
    console.error('Falha ao contar administradores:', error);
    return 0;
  }
};

/**
 * ✅ VERIFICA SE É SEGURO REMOVER PRIVILÉGIOS DE ADMIN
 * @param {string} userId - ID do usuário a ter privilégios removidos
 * @returns {Promise<boolean>} - true se for seguro remover, false caso contrário
 */
export const canRemoveAdminSafely = async (userId) => {
  try {
    // Verificar se o usuário é realmente admin
    const { data: user, error: userError } = await supabase
      .from('usuarios')
      .select('admin')
      .eq('id', userId)
      .single();
    
    if (userError || !user?.admin) {
      return false; // Usuário não é admin, não precisa remover
    }
    
    // Contar quantos admins existem
    const adminCount = await countAdmins();
    
    // É seguro remover se há mais de 1 admin
    return adminCount > 1;
  } catch (error) {
    console.error('Erro ao verificar se é seguro remover admin:', error);
    return false;
  }
};

/**
 * ✅ LISTA TODOS OS ADMINISTRADORES DO SISTEMA
 * @returns {Promise<Array>} - Lista de administradores
 */
export const listAllAdmins = async () => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, created_at')
      .eq('admin', true)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Erro ao listar administradores:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Falha ao listar administradores:', error);
    return [];
  }
};