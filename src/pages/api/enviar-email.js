// pages/api/enviar-email.js
import nodemailer from 'nodemailer';
import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { controleItemId, userId } = req.body;

    // Validar dados recebidos
    if (!controleItemId || !userId) {
      return res.status(400).json({ error: 'Dados obrigatórios não fornecidos' });
    }

    console.log(`📧 Iniciando envio de email para item: ${controleItemId}`);

    // 1. Buscar o item de controle na tabela visível
    const { data: controleItem, error: controleError } = await supabase
      .from('controle_conteudo_geral_visivel')
      .select('*')
      .eq('id', controleItemId)
      .single();

    if (controleError || !controleItem) {
      console.error('❌ Erro ao buscar item de controle:', controleError);
      return res.status(404).json({ error: 'Item de controle não encontrado' });
    }

    // Verificar se tem id_original
    if (!controleItem.id_original) {
      console.error('❌ Item não possui id_original');
      return res.status(400).json({ error: 'Item não possui ID original válido' });
    }

    // 2. Buscar informações do projeto
    const { data: projetoData, error: projetoError } = await supabase
      .from('projetos')
      .select('nome')
      .eq('id', controleItem.projeto_id)
      .single();

    const projeto = projetoData?.nome || 'Projeto N/A';

    // 3. Buscar todos os usuários relacionados ao projeto
    const { data: usuariosProjeto, error: usuariosError } = await supabase
      .from('relacao_usuarios_projetos')
      .select(`
        usuario_id,
        usuarios!inner (
          email,
          nome
        )
      `)
      .eq('projeto_id', controleItem.projeto_id);

    if (usuariosError) {
      console.error('❌ Erro ao buscar usuários do projeto:', usuariosError);
      return res.status(500).json({ error: 'Erro ao buscar usuários do projeto' });
    }

    if (!usuariosProjeto || usuariosProjeto.length === 0) {
      console.log('⚠️ Nenhum usuário encontrado para o projeto');
      return res.status(400).json({ error: 'Nenhum usuário vinculado ao projeto' });
    }

    // 4. Preparar lista de destinatários
    const destinatarios = usuariosProjeto
      .map(item => ({
        email: item.usuarios.email,
        nome: item.usuarios.nome || item.usuarios.email
      }))
      .filter(dest => dest.email && dest.email.includes('@')); // Validação básica de email

    if (destinatarios.length === 0) {
      console.log('⚠️ Nenhum email válido encontrado');
      return res.status(400).json({ error: 'Nenhum email válido encontrado para os usuários do projeto' });
    }

    console.log(`📋 Encontrados ${destinatarios.length} destinatários:`, destinatarios.map(d => d.email));

    // 5. Configurar transporter do Nodemailer com SMTP2GO
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false, // true para porta 465, false para outras portas
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 6. Verificar conexão SMTP
    try {
      await transporter.verify();
      console.log('✅ Conexão SMTP verificada com sucesso');
    } catch (error) {
      console.error('❌ Erro na verificação SMTP:', error);
      return res.status(500).json({ error: 'Erro na configuração do servidor de email' });
    }

    // 7. Gerar URL do documento
    const urlDocumento = `https://projeto-com-gemini.vercel.app/documento/${controleItem.id_original}`;

    // 8. Preparar conteúdo do email (SIMPLIFICADO)
    const assunto = `[${projeto}] Conteúdo Disponível`;
    
    const conteudoHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <p style="font-size: 16px; color: #333; margin: 0;">
          Acesse o conteúdo aqui: <a href="${urlDocumento}" style="color: #007bff; text-decoration: none;">${urlDocumento}</a>
        </p>
      </div>
    `;

    const conteudoTexto = `Acesse o conteúdo aqui: ${urlDocumento}`;

    // 9. Preparar lista de emails para envio
    const emailsDestinatarios = destinatarios.map(dest => `${dest.nome} <${dest.email}>`);

    // 10. Preparar opções do email
    const mailOptions = {
      from: `Sistema de Controle de Conteúdo <${process.env.SMTP_EMAIL}>`,
      to: emailsDestinatarios.join(', '),
      subject: assunto,
      text: conteudoTexto,
      html: conteudoHTML,
      replyTo: process.env.SMTP_EMAIL
    };

    console.log('📤 Enviando email via SMTP2GO...');
    console.log('📧 Destinatários:', destinatarios.length);
    console.log('📝 Assunto:', assunto);
    console.log('🔗 URL do documento:', urlDocumento);

    // 11. Enviar email
    const emailResult = await transporter.sendMail(mailOptions);

    console.log('📬 Email enviado com sucesso:', emailResult.messageId);

    // 12. Atualizar data_email_recente APENAS SE o email foi enviado com sucesso
    const dataHoje = new Date().toISOString().split('T')[0];
    
    const { error: updateError } = await supabase
      .from('controle_conteudo_geral_visivel')
      .update({ data_email_recente: dataHoje })
      .eq('id', controleItemId);

    if (updateError) {
      console.error('⚠️ Email enviado, mas erro ao atualizar data:', updateError);
      // Email foi enviado, mas não conseguiu atualizar a data
      return res.status(200).json({
        success: true,
        message: 'Email enviado com sucesso, mas não foi possível atualizar a data no banco',
        messageId: emailResult.messageId,
        destinatarios: destinatarios.length,
        warning: 'Data não atualizada',
        urlEnviada: urlDocumento
      });
    }

    console.log('✅ Data de email atualizada com sucesso');

    // 13. Retornar sucesso completo
    return res.status(200).json({
      success: true,
      message: `Email enviado com sucesso para ${destinatarios.length} destinatário(s)`,
      messageId: emailResult.messageId,
      destinatarios: destinatarios.length,
      dataAtualizada: dataHoje,
      emailsEnviados: emailsDestinatarios,
      urlEnviada: urlDocumento
    });

  } catch (error) {
    console.error('❌ Erro geral no envio de email:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}