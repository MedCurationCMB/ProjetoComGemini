// src/pages/api/admin/manage-permissions.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Só aceitar método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar se as variáveis de ambiente estão configuradas
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ 
      error: 'Configurações do Supabase não encontradas' 
    });
  }

  try {
    // Criar cliente Supabase com a chave de serviço
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL, 
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verificar autorização
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorização não fornecido' });
    }

    const token = authHeader.split(' ')[1];

    // Validar se o usuário que está fazendo a requisição é admin
    // Primeiro, vamos decodificar o token para obter o ID do usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar se o usuário atual é admin
    const { data: currentUserData, error: currentUserError } = await supabase
      .from('usuarios')
      .select('admin')
      .eq('id', user.id)
      .single();

    if (currentUserError || !currentUserData?.admin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem realizar esta ação.' });
    }

    // Extrair dados da requisição
    const { userId, isAdmin } = req.body;

    if (!userId || typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: 'Dados inválidos. userId e isAdmin são obrigatórios.' });
    }

    // Verificar se não está tentando alterar seu próprio status
    if (userId === user.id) {
      return res.status(400).json({ error: 'Você não pode alterar seu próprio status de administrador.' });
    }

    // Verificar se o usuário alvo existe
    const { data: targetUser, error: targetUserError } = await supabase
      .from('usuarios')
      .select('id, email, nome, admin')
      .eq('id', userId)
      .single();

    if (targetUserError || !targetUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Se está tentando remover admin, verificar se não é o último admin
    if (!isAdmin && targetUser.admin) {
      const { data: adminCount, error: adminCountError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('admin', true);

      if (adminCountError) {
        return res.status(500).json({ error: 'Erro ao verificar quantidade de administradores' });
      }

      if (adminCount.length <= 1) {
        return res.status(400).json({ 
          error: 'Não é possível remover o último administrador do sistema.' 
        });
      }
    }

    // Atualizar o status de admin do usuário
    const { data, error } = await supabase
      .from('usuarios')
      .update({ admin: isAdmin })
      .eq('id', userId)
      .select('id, email, nome, admin, ativo, created_at');

    if (error) {
      console.error('Erro ao atualizar permissões:', error);
      return res.status(500).json({ error: 'Erro ao atualizar permissões do usuário' });
    }

    // Log da ação (opcional - você pode criar uma tabela de auditoria)
    console.log(`Admin ${user.email} ${isAdmin ? 'concedeu' : 'removeu'} permissões de admin para ${targetUser.email}`);

    return res.status(200).json({
      success: true,
      message: `Usuário ${isAdmin ? 'promovido a' : 'removido de'} administrador com sucesso`,
      user: data[0]
    });

  } catch (error) {
    console.error('Erro no servidor:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}