// pages/api/enviar-email-multiplo.js
import nodemailer from 'nodemailer';
import { supabase } from '../../utils/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { controleItemIds, userId } = req.body;

    // Validar dados recebidos
    if (!controleItemIds || !Array.isArray(controleItemIds) || controleItemIds.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs de controle é obrigatória' });
    }

    if (!userId) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }

    console.log(`📧 Iniciando envio de email em lote para ${controleItemIds.length} itens:`, controleItemIds);

    // 1. Buscar todos os itens de controle na tabela visível
    const { data: controleItens, error: controleError } = await supabase
      .from('controle_conteudo_geral_visivel')
      .select('*')
      .in('id', controleItemIds);

    if (controleError || !controleItens) {
      console.error('❌ Erro ao buscar itens de controle:', controleError);
      return res.status(404).json({ error: 'Itens de controle não encontrados' });
    }

    // Filtrar apenas itens que têm id_original válido
    const itensValidos = controleItens.filter(item => item.id_original);
    
    if (itensValidos.length === 0) {
      return res.status(400).json({ error: 'Nenhum item possui ID original válido' });
    }

    console.log(`📋 ${itensValidos.length} de ${controleItens.length} itens são válidos`);

    // 2. Agrupar itens por projeto
    const itensAgrupadosPorProjeto = itensValidos.reduce((acc, item) => {
      const projetoId = item.projeto_id;
      if (!acc[projetoId]) {
        acc[projetoId] = [];
      }
      acc[projetoId].push(item);
      return acc;
    }, {});

    const projetosIds = Object.keys(itensAgrupadosPorProjeto);
    console.log(`📁 Itens agrupados em ${projetosIds.length} projeto(s):`, projetosIds);

    // 3. Buscar informações dos projetos
    const { data: projetosData, error: projetosError } = await supabase
      .from('projetos')
      .select('id, nome')
      .in('id', projetosIds);

    if (projetosError) {
      console.error('❌ Erro ao buscar projetos:', projetosError);
      return res.status(500).json({ error: 'Erro ao buscar informações dos projetos' });
    }

    const projetosMap = {};
    projetosData.forEach(proj => {
      projetosMap[proj.id] = proj.nome;
    });

    // 4. Configurar transporter do Nodemailer com SMTP2GO
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // 5. Verificar conexão SMTP
    try {
      await transporter.verify();
      console.log('✅ Conexão SMTP verificada com sucesso');
    } catch (error) {
      console.error('❌ Erro na verificação SMTP:', error);
      return res.status(500).json({ error: 'Erro na configuração do servidor de email' });
    }

    // 6. Processar cada projeto separadamente
    const resultadosEnvio = [];
    const warnings = [];
    let totalDestinatarios = 0;

    for (const projetoId of projetosIds) {
      const itensDoProjeto = itensAgrupadosPorProjeto[projetoId];
      const nomeProjeto = projetosMap[projetoId] || 'Projeto N/A';

      console.log(`\n📧 Processando projeto: ${nomeProjeto} (${itensDoProjeto.length} itens)`);

      try {
        // 6.1. Buscar usuários do projeto
        const { data: usuariosProjeto, error: usuariosError } = await supabase
          .from('relacao_usuarios_projetos')
          .select(`
            usuario_id,
            usuarios!inner (
              email,
              nome
            )
          `)
          .eq('projeto_id', projetoId);

        if (usuariosError) {
          console.error(`❌ Erro ao buscar usuários do projeto ${nomeProjeto}:`, usuariosError);
          warnings.push(`Erro ao buscar usuários do projeto ${nomeProjeto}`);
          continue;
        }

        if (!usuariosProjeto || usuariosProjeto.length === 0) {
          console.log(`⚠️ Nenhum usuário encontrado para o projeto ${nomeProjeto}`);
          warnings.push(`Nenhum usuário vinculado ao projeto ${nomeProjeto}`);
          continue;
        }

        // 6.2. Preparar lista de destinatários
        const destinatarios = usuariosProjeto
          .map(item => ({
            email: item.usuarios.email,
            nome: item.usuarios.nome || item.usuarios.email
          }))
          .filter(dest => dest.email && dest.email.includes('@'));

        if (destinatarios.length === 0) {
          console.log(`⚠️ Nenhum email válido encontrado para o projeto ${nomeProjeto}`);
          warnings.push(`Nenhum email válido encontrado para o projeto ${nomeProjeto}`);
          continue;
        }

        console.log(`📋 ${destinatarios.length} destinatários encontrados para ${nomeProjeto}`);
        totalDestinatarios += destinatarios.length;

        // 6.3. Gerar URLs dos documentos
        const urlsDocumentos = itensDoProjeto.map(item => 
          `https://projeto-com-gemini.vercel.app/documento/${item.id_original}`
        );

        // 6.4. Preparar conteúdo do email
        const assunto = `[${nomeProjeto}] Conteúdos Disponíveis`;
        
        const listaUrlsHTML = urlsDocumentos
          .map(url => `<p><a href="${url}" style="color: #007bff; text-decoration: none;">${url}</a></p>`)
          .join('');

        const conteudoHTML = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p style="font-size: 16px; color: #333; margin: 0 0 15px 0;">
              Acesse aqui os conteúdos:
            </p>
            <div style="margin-left: 20px;">
              ${listaUrlsHTML}
            </div>
          </div>
        `;

        const conteudoTexto = `Acesse aqui os conteúdos:\n${urlsDocumentos.join('\n')}`;

        // 6.5. Preparar opções do email
        const emailsDestinatarios = destinatarios.map(dest => `${dest.nome} <${dest.email}>`);

        const mailOptions = {
          from: `Sistema de Controle de Conteúdo <${process.env.SMTP_EMAIL}>`,
          to: emailsDestinatarios.join(', '),
          subject: assunto,
          text: conteudoTexto,
          html: conteudoHTML,
          replyTo: process.env.SMTP_EMAIL
        };

        console.log(`📤 Enviando email para projeto ${nomeProjeto}...`);

        // 6.6. Enviar email
        const emailResult = await transporter.sendMail(mailOptions);

        console.log(`✅ Email enviado para ${nomeProjeto}:`, emailResult.messageId);

        resultadosEnvio.push({
          projeto: nomeProjeto,
          destinatarios: destinatarios.length,
          itens: itensDoProjeto.length,
          messageId: emailResult.messageId,
          urls: urlsDocumentos
        });

      } catch (error) {
        console.error(`❌ Erro ao enviar email para projeto ${nomeProjeto}:`, error);
        warnings.push(`Falha no envio para projeto ${nomeProjeto}: ${error.message}`);
      }
    }

    // 7. Atualizar data_email_recente APENAS para itens que tiveram emails enviados com sucesso
    if (resultadosEnvio.length > 0) {
      const dataHoje = new Date().toISOString().split('T')[0];
      
      // Coletar IDs dos itens que tiveram sucesso no envio
      const idsComSucesso = [];
      resultadosEnvio.forEach(resultado => {
        const itensDoProjeto = Object.values(itensAgrupadosPorProjeto)
          .flat()
          .filter(item => projetosMap[item.projeto_id] === resultado.projeto);
        idsComSucesso.push(...itensDoProjeto.map(item => item.id));
      });

      if (idsComSucesso.length > 0) {
        const { error: updateError } = await supabase
          .from('controle_conteudo_geral_visivel')
          .update({ data_email_recente: dataHoje })
          .in('id', idsComSucesso);

        if (updateError) {
          console.error('⚠️ Emails enviados, mas erro ao atualizar datas:', updateError);
          warnings.push('Emails enviados, mas não foi possível atualizar as datas no banco');
        } else {
          console.log(`✅ Datas atualizadas para ${idsComSucesso.length} itens`);
        }
      }
    }

    // 8. Preparar resposta
    if (resultadosEnvio.length === 0) {
      return res.status(400).json({
        error: 'Nenhum email foi enviado com sucesso',
        warnings: warnings
      });
    }

    console.log(`\n✅ Processo concluído:`);
    console.log(`📧 ${resultadosEnvio.length} projeto(s) processados com sucesso`);
    console.log(`👥 Total de ${totalDestinatarios} destinatários`);
    console.log(`⚠️ ${warnings.length} warnings`);

    return res.status(200).json({
      success: true,
      message: `Emails enviados com sucesso para ${resultadosEnvio.length} projeto(s)`,
      resultados: resultadosEnvio,
      totalProjetos: resultadosEnvio.length,
      totalDestinatarios: totalDestinatarios,
      warnings: warnings.length > 0 ? warnings : undefined,
      dataAtualizada: new Date().toISOString().split('T')[0]
    });

  } catch (error) {
    console.error('❌ Erro geral no envio de emails em lote:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
}