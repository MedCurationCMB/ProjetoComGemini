import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
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

    // Verificar autorização (opcional, mas recomendado)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Token de autorização não fornecido' });
    }

    // Buscar todos os usuários
    const { data, error } = await supabase
      .from('usuarios')
      .select('*');

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Erro no servidor:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
