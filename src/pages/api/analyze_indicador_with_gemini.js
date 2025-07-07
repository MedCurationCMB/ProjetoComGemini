// pages/api/analyze_indicador_with_gemini.js
import { supabase } from '../../utils/supabaseClient';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de acesso necessário' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido ou usuário não autenticado' });
    }

    const { 
      dados_indicador, 
      prompt_texto, 
      nome_indicador, 
      prompt_id,
      indicador_id // ID do controle_indicador para salvar o resultado
    } = req.body;

    // Validar dados obrigatórios
    if (!dados_indicador || !prompt_texto || !indicador_id) {
      return res.status(400).json({ error: 'Dados do indicador, prompt e ID do indicador são obrigatórios' });
    }

    // Buscar a chave API vigente do Gemini
    const { data: configData, error: configError } = await supabase
      .from('configuracoes_gemini')
      .select('chave')
      .eq('vigente', true)
      .single();

    if (configError || !configData) {
      return res.status(500).json({ error: 'Chave API do Gemini não configurada' });
    }

    // Inicializar o cliente Gemini
    const genAI = new GoogleGenerativeAI(configData.chave);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Montar o prompt completo
    const promptCompleto = `${dados_indicador}\n\nANÁLISE SOLICITADA:\n${prompt_texto}`;

    console.log('Enviando prompt para Gemini:', promptCompleto.substring(0, 200) + '...');

    // Enviar para o Gemini
    const result = await model.generateContent(promptCompleto);
    const response = await result.response;
    const analise = response.text();

    console.log('Resposta do Gemini recebida:', analise.substring(0, 200) + '...');

    // Salvar o resultado da análise na tabela controle_indicador
    try {
      const { error: updateError } = await supabase
        .from('controle_indicador')
        .update({
          resultado_analise: analise,
          prompt_id: prompt_id,
          prompt_utilizado: prompt_texto
        })
        .eq('id', indicador_id);

      if (updateError) {
        console.warn('Aviso: Não foi possível salvar a análise na base de dados:', updateError.message);
        // Continua mesmo se não conseguir salvar
      } else {
        console.log('Análise salva com sucesso no controle_indicador ID:', indicador_id);
      }
    } catch (saveError) {
      console.warn('Aviso: Não foi possível salvar a análise na base de dados:', saveError.message);
      // Continua mesmo se não conseguir salvar
    }

    res.status(200).json({
      resultado: analise,
      indicador: nome_indicador,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao processar análise do indicador:', error);
    
    if (error.message?.includes('API key')) {
      return res.status(400).json({ error: 'Chave API do Gemini inválida' });
    }
    
    if (error.message?.includes('quota')) {
      return res.status(429).json({ error: 'Limite de uso da API atingido. Tente novamente mais tarde.' });
    }

    res.status(500).json({ 
      error: 'Erro interno do servidor ao processar análise',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}