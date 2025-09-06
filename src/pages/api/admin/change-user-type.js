// src/pages/api/admin/change-user-type.js
import { supabase } from '../../../utils/supabaseClient';
import { isUserAdmin } from '../../../utils/userUtils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar se o token de autorização está presente
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização necessário' });
    }

    const token = authHeader.split(' ')[1];

    // Verificar e obter o usuário atual usando o token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Erro ao verificar usuário:', userError);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    // Verificar se o usuário atual é administrador
    const isCurrentUserAdmin = await isUserAdmin(user.id);
    if (!isCurrentUserAdmin) {
      return res.status(403).json({ error: 'Apenas administradores podem alterar tipos de usuário' });
    }

    // Extrair dados do corpo da requisição
    const { userId, admin, gestor } = req.body;

    // Validar dados de entrada
    if (!userId) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    if (typeof admin !== 'boolean' || typeof gestor !== 'boolean') {
      return res.status(400).json({ error: 'Os campos admin e gestor devem ser boolean' });
    }

    // Verificar se não está tentando alterar seu próprio tipo
    if (userId === user.id) {
      return res.status(400).json({ error: 'Você não pode alterar seu próprio tipo de usuário' });
    }

    // Verificar se o usuário a ser modificado existe
    const { data: targetUser, error: fetchError } = await supabase
      .from('usuarios')
      .select('id, nome, email, admin, gestor')
      .eq('id', userId)
      .single();

    if (fetchError || !targetUser) {
      console.error('Erro ao buscar usuário alvo:', fetchError);
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se há alguma mudança real
    if (targetUser.admin === admin && targetUser.gestor === gestor) {
      return res.status(200).json({ 
        message: 'Nenhuma alteração necessária',
        user: targetUser 
      });
    }

    // Atualizar o tipo de usuário no banco de dados
    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .update({ 
        admin: admin,
        gestor: gestor,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, nome, email, admin, gestor')
      .single();

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError);
      return res.status(500).json({ error: 'Erro interno do servidor ao atualizar usuário' });
    }

    // Determinar o tipo para a mensagem de sucesso
    let tipoUsuario = 'Usuário';
    if (admin) {
      tipoUsuario = 'Administrador';
    } else if (gestor) {
      tipoUsuario = 'Gestor';
    }

    // Log da operação para auditoria
    console.log(`[ADMIN] Usuário ${user.email} (${user.id}) alterou o tipo do usuário ${targetUser.email} (${userId}) para ${tipoUsuario}`);

    return res.status(200).json({
      message: `Tipo de usuário alterado para "${tipoUsuario}" com sucesso`,
      user: updatedUser
    });

  } catch (error) {
    console.error('Erro inesperado ao alterar tipo de usuário:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}