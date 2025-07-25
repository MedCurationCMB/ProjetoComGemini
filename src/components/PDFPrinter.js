// src/components/PDFPrinter.js - Versão Completa com Gráfico
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiFileText } from 'react-icons/fi';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  ResponsiveContainer, 
  LabelList,
  Tooltip
} from 'recharts';

const PDFPrinter = ({ 
  nomeIndicador, 
  indicadores, 
  infoGeral, 
  categorias, 
  projetos, 
  configuracoes,
  calcularKPIs,
  formatKPIValue,
  formatDate,
  formatValue,
  dadosTabela,
  filtroPeriodo,
  dataInicio,
  dataFim,
  dadosGraficoCombinado // ✅ NOVO: Receber dados do gráfico
}) => {
  const [gerando, setGerando] = useState(false);

  // Função para formatar período de filtro para o PDF
  const formatarPeriodoFiltro = () => {
    switch (filtroPeriodo) {
      case 'todos':
        return 'Todos os períodos';
      case '7dias':
        return 'Últimos 7 dias';
      case '30dias':
        return 'Últimos 30 dias';
      case '90dias':
        return 'Últimos 90 dias';
      case 'especifico':
        if (dataInicio && dataFim) {
          return `${formatDate(dataInicio)} até ${formatDate(dataFim)}`;
        }
        return 'Período específico';
      default:
        return 'Todos os períodos';
    }
  };

  // ✅ NOVA FUNÇÃO: Gerar gráfico como imagem
  const gerarGraficoComoImagem = async () => {
    return new Promise((resolve) => {
      try {
        // Criar container temporário para o gráfico
        const chartContainer = document.createElement('div');
        chartContainer.style.position = 'absolute';
        chartContainer.style.left = '-9999px';
        chartContainer.style.top = '0';
        chartContainer.style.width = '600px';
        chartContainer.style.height = '300px';
        chartContainer.style.backgroundColor = 'white';
        chartContainer.style.padding = '20px';
        
        // HTML do gráfico
        chartContainer.innerHTML = `
          <div style="width: 600px; height: 300px; background: white; font-family: Arial, sans-serif;">
            <div style="text-align: center; margin-bottom: 15px;">
              <h3 style="color: #012060; font-size: 16px; margin: 0; font-weight: bold;">
                Valor Indicador (Realizado vs Meta)
              </h3>
            </div>
            
            <!-- Legenda -->
            <div style="display: flex; justify-content: center; margin-bottom: 15px; gap: 20px;">
              <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #3B82F6; margin-right: 6px; border-radius: 2px;"></div>
                <span style="font-size: 12px; color: #6B7280;">Realizado</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #6B7280; margin-right: 6px; border-radius: 2px;"></div>
                <span style="font-size: 12px; color: #6B7280;">Meta</span>
              </div>
            </div>
            
            <!-- Área do gráfico -->
            <div id="chart-area" style="width: 100%; height: 220px; position: relative;">
              ${gerarGraficoSVG()}
            </div>
          </div>
        `;
        
        document.body.appendChild(chartContainer);
        
        // Aguardar renderização
        setTimeout(async () => {
          try {
            const html2canvas = (await import('html2canvas')).default;
            
            const canvas = await html2canvas(chartContainer, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              width: 600,
              height: 300,
              logging: false
            });
            
            document.body.removeChild(chartContainer);
            
            const imageData = canvas.toDataURL('image/png');
            resolve(imageData);
          } catch (error) {
            console.error('Erro ao gerar gráfico:', error);
            document.body.removeChild(chartContainer);
            resolve(null);
          }
        }, 1000);
        
      } catch (error) {
        console.error('Erro ao criar container do gráfico:', error);
        resolve(null);
      }
    });
  };

  // ✅ NOVA FUNÇÃO: Gerar SVG do gráfico manualmente
  const gerarGraficoSVG = () => {
    if (!dadosGraficoCombinado || dadosGraficoCombinado.length === 0) {
      return '<div style="text-align: center; padding: 50px; color: #9CA3AF;">Sem dados para exibir</div>';
    }

    const width = 560;
    const height = 200;
    const margin = { top: 20, right: 30, bottom: 50, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Calcular valores máximos para escala
    const maxRealizado = Math.max(...dadosGraficoCombinado.map(d => d.realizadoApresentado || 0));
    const maxMeta = Math.max(...dadosGraficoCombinado.map(d => d.metaApresentado || 0));
    const maxValue = Math.max(maxRealizado, maxMeta) * 1.1; // 10% de margem

    const barWidth = chartWidth / dadosGraficoCombinado.length * 0.6;
    const barSpacing = chartWidth / dadosGraficoCombinado.length;

    let svgContent = `
      <svg width="${width}" height="${height}" style="background: white;">
        <!-- Grid lines -->
        <defs>
          <pattern id="grid" width="1" height="20" patternUnits="userSpaceOnUse">
            <path d="M 1 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="${chartWidth}" height="${chartHeight}" x="${margin.left}" y="${margin.top}" fill="url(#grid)" opacity="0.3"/>
        
        <!-- Eixo Y -->
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + chartHeight}" stroke="#E5E7EB" stroke-width="1"/>
        
        <!-- Eixo X -->
        <line x1="${margin.left}" y1="${margin.top + chartHeight}" x2="${margin.left + chartWidth}" y2="${margin.top + chartHeight}" stroke="#E5E7EB" stroke-width="1"/>
    `;

    // Adicionar barras e linha
    dadosGraficoCombinado.forEach((item, index) => {
      const x = margin.left + (index * barSpacing) + (barSpacing - barWidth) / 2;
      const realizadoHeight = (item.realizadoApresentado / maxValue) * chartHeight;
      const realizadoY = margin.top + chartHeight - realizadoHeight;
      
      const metaY = margin.top + chartHeight - ((item.metaApresentado / maxValue) * chartHeight);
      
      // Barra (Realizado)
      svgContent += `
        <rect x="${x}" y="${realizadoY}" width="${barWidth}" height="${realizadoHeight}" 
              fill="#3B82F6" rx="2" ry="2"/>
        
        <!-- Valor da barra -->
        <text x="${x + barWidth/2}" y="${realizadoY - 5}" text-anchor="middle" 
              font-size="10" fill="#374151" font-weight="500">
          ${item.realizadoApresentado ? item.realizadoApresentado.toLocaleString('pt-BR') : '0'}
        </text>
        
        <!-- Label do período -->
        <text x="${x + barWidth/2}" y="${margin.top + chartHeight + 15}" text-anchor="middle" 
              font-size="9" fill="#6B7280" transform="rotate(-45, ${x + barWidth/2}, ${margin.top + chartHeight + 15})">
          ${item.periodo || ''}
        </text>
      `;
      
      // Ponto da linha (Meta)
      if (item.metaApresentado) {
        const nextX = index < dadosGraficoCombinado.length - 1 ? 
          margin.left + ((index + 1) * barSpacing) + barSpacing / 2 : null;
        const nextMetaY = index < dadosGraficoCombinado.length - 1 && dadosGraficoCombinado[index + 1].metaApresentado ?
          margin.top + chartHeight - ((dadosGraficoCombinado[index + 1].metaApresentado / maxValue) * chartHeight) : null;
        
        // Ponto
        svgContent += `
          <circle cx="${x + barWidth/2}" cy="${metaY}" r="3" fill="#6B7280" stroke="white" stroke-width="1"/>
        `;
        
        // Linha para próximo ponto
        if (nextX && nextMetaY) {
          svgContent += `
            <line x1="${x + barWidth/2}" y1="${metaY}" x2="${nextX}" y2="${nextMetaY}" 
                  stroke="#6B7280" stroke-width="2"/>
          `;
        }
      }
    });

    svgContent += '</svg>';
    return svgContent;
  };

  // Função para gerar PDF usando jsPDF puro (sem html2canvas)
  const gerarPDFPuro = async () => {
    if (gerando) return;

    try {
      setGerando(true);
      toast.loading('Gerando PDF...', { id: 'pdf-generation' });

      // Importar jsPDF dinamicamente
      const jsPDF = (await import('jspdf')).default;

      const kpis = calcularKPIs();
      const periodoFiltro = formatarPeriodoFiltro();

      // Criar novo documento PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      let currentY = margin;

      // Função auxiliar para adicionar nova página se necessário
      const checkPageBreak = (requiredHeight) => {
        if (currentY + requiredHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
          return true;
        }
        return false;
      };

      // Função auxiliar para adicionar texto
      const addText = (text, x, y, options = {}) => {
        const { 
          fontSize = 12, 
          color = '#000000', 
          fontWeight = 'normal',
          align = 'left',
          maxWidth = contentWidth 
        } = options;
        
        pdf.setFontSize(fontSize);
        pdf.setTextColor(color);
        
        if (fontWeight === 'bold') {
          pdf.setFont(undefined, 'bold');
        } else {
          pdf.setFont(undefined, 'normal');
        }

        // Quebrar texto se for muito longo
        const lines = pdf.splitTextToSize(text, maxWidth);
        
        if (align === 'center') {
          x = pageWidth / 2;
          pdf.text(lines, x, y, { align: 'center' });
        } else {
          pdf.text(lines, x, y);
        }
        
        return lines.length * (fontSize * 0.35); // Retorna altura usada
      };

      // Cabeçalho
      checkPageBreak(40);
      
      // Linha decorativa no topo
      pdf.setDrawColor(1, 32, 96); // Cor azul #012060
      pdf.setLineWidth(1);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      // Título principal
      currentY += addText('RELATÓRIO DE INDICADORES', pageWidth / 2, currentY, {
        fontSize: 22,
        color: '#012060',
        fontWeight: 'bold',
        align: 'center'
      });
      currentY += 5;

      // Nome do indicador
      currentY += addText(nomeIndicador, pageWidth / 2, currentY, {
        fontSize: 16,
        color: '#374151',
        align: 'center'
      });
      currentY += 5;

      // Informações do relatório
      const infoRelatorio = `Período: ${periodoFiltro} | Gerado em: ${new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      
      currentY += addText(infoRelatorio, pageWidth / 2, currentY, {
        fontSize: 10,
        color: '#6B7280',
        align: 'center'
      });
      currentY += 15;

      // Linha decorativa
      pdf.setDrawColor(229, 231, 235); // Cor cinza
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 15;

      // Informações Gerais
      checkPageBreak(50);
      
      currentY += addText('INFORMAÇÕES GERAIS', margin, currentY, {
        fontSize: 14,
        color: '#012060',
        fontWeight: 'bold'
      });
      currentY += 10;

      // Projeto
      currentY += addText(`Projeto: ${infoGeral?.projeto_id ? (projetos[infoGeral.projeto_id] || 'N/A') : 'N/A'}`, margin, currentY, {
        fontSize: 11,
        color: '#374151'
      });
      currentY += 5;

      // Categoria
      currentY += addText(`Categoria: ${infoGeral?.categoria_id ? (categorias[infoGeral.categoria_id] || 'N/A') : 'N/A'}`, margin, currentY, {
        fontSize: 11,
        color: '#374151'
      });
      currentY += 15;

      // ✅ NOVA SEÇÃO: Gráfico (apenas texto no PDF puro)
      if (dadosGraficoCombinado && dadosGraficoCombinado.length > 0) {
        checkPageBreak(60);
        
        currentY += addText('GRÁFICO - VALOR INDICADOR (REALIZADO VS META)', margin, currentY, {
          fontSize: 14,
          color: '#012060',
          fontWeight: 'bold'
        });
        currentY += 10;

        // Desenhar uma representação simples do gráfico
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.5);
        pdf.rect(margin, currentY, contentWidth, 40);
        
        addText('Gráfico de barras com linha - Dados por período', margin + 5, currentY + 15, {
          fontSize: 10,
          color: '#6B7280'
        });
        
        addText('■ Realizado (barras azuis)  ● Meta (linha cinza)', margin + 5, currentY + 25, {
          fontSize: 9,
          color: '#6B7280'
        });
        
        // Mostrar alguns dados resumidos
        const totalPeriodos = dadosGraficoCombinado.length;
        const ultimoRealizado = dadosGraficoCombinado[dadosGraficoCombinado.length - 1]?.realizadoApresentado || 0;
        const ultimaMeta = dadosGraficoCombinado[dadosGraficoCombinado.length - 1]?.metaApresentado || 0;
        
        addText(`${totalPeriodos} períodos | Último realizado: ${ultimoRealizado.toLocaleString('pt-BR')} | Última meta: ${ultimaMeta.toLocaleString('pt-BR')}`, margin + 5, currentY + 35, {
          fontSize: 8,
          color: '#6B7280'
        });
        
        currentY += 50;
      }

      // KPIs (se houver habilitados)
      const kpisHabilitados = [];
      
      if (configuracoes.soma) {
        kpisHabilitados.push({
          label: 'Soma - Valor Indicador',
          valor: formatKPIValue(kpis.somaRealizadoApresentado),
          meta: formatKPIValue(kpis.somaMetaApresentado)
        });
      }

      if (configuracoes.media) {
        kpisHabilitados.push({
          label: 'Média - Valor Indicador',
          valor: formatKPIValue(kpis.mediaRealizadoApresentado),
          meta: formatKPIValue(kpis.mediaMetaApresentado)
        });
      }

      if (configuracoes.desvio_padrao) {
        kpisHabilitados.push({
          label: 'Desvio Padrão - Valor Indicador',
          valor: formatKPIValue(kpis.desvioPadraoRealizadoApresentado),
          meta: formatKPIValue(kpis.desvioPadraoMetaApresentado)
        });
      }

      if (configuracoes.mediana) {
        kpisHabilitados.push({
          label: 'Mediana - Valor Indicador',
          valor: formatKPIValue(kpis.medianaRealizadoApresentado),
          meta: formatKPIValue(kpis.medianaMetaApresentado)
        });
      }

      if (configuracoes.minimo) {
        kpisHabilitados.push({
          label: 'Mínimo - Valor Indicador',
          valor: formatKPIValue(kpis.minimoRealizadoApresentado),
          meta: formatKPIValue(kpis.minimoMetaApresentado)
        });
      }

      if (configuracoes.maximo) {
        kpisHabilitados.push({
          label: 'Máximo - Valor Indicador',
          valor: formatKPIValue(kpis.maximoRealizadoApresentado),
          meta: formatKPIValue(kpis.maximoMetaApresentado)
        });
      }

      if (configuracoes.mais_recente) {
        kpisHabilitados.push({
          label: 'Mais Recente - Valor Indicador',
          valor: formatKPIValue(kpis.maisRecenteRealizadoApresentado),
          meta: formatKPIValue(kpis.maisRecenteMetaApresentado)
        });
      }

      if (configuracoes.contagem_registros) {
        kpisHabilitados.push({
          label: 'Contagem de Registros',
          valor: formatKPIValue(kpis.contagemRegistros),
          meta: 'Total de períodos'
        });
      }

      // Resumo dos Indicadores (KPIs)
      if (kpisHabilitados.length > 0) {
        checkPageBreak(40 + Math.ceil(kpisHabilitados.length / 4) * 20); // Altura baseada em linhas de 4
        
        currentY += addText('RESUMO DOS INDICADORES', margin, currentY, {
          fontSize: 14,
          color: '#012060',
          fontWeight: 'bold'
        });
        currentY += 10;

        // Organizar KPIs em grupos de 4 por linha
        const kpisPerRow = 4;
        const kpiWidth = (contentWidth - 15) / kpisPerRow; // 15 = 3 espaços de 5mm entre 4 KPIs
        
        for (let i = 0; i < kpisHabilitados.length; i += kpisPerRow) {
          checkPageBreak(20);
          
          const kpisRow = kpisHabilitados.slice(i, i + kpisPerRow);
          
          // Desenhar background dos KPIs da linha
          kpisRow.forEach((kpi, index) => {
            const xPos = margin + (index * (kpiWidth + 5));
            
            // Background cinza claro
            pdf.setFillColor(249, 250, 251);
            pdf.rect(xPos, currentY - 1, kpiWidth, 18, 'F');
            
            // Borda
            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.1);
            pdf.rect(xPos, currentY - 1, kpiWidth, 18);
            
            // Título do KPI
            addText(kpi.label, xPos + 2, currentY + 3, {
              fontSize: 8,
              color: '#6B7280',
              fontWeight: 'bold',
              maxWidth: kpiWidth - 4
            });
            
            // Valor principal
            addText(kpi.valor, xPos + 2, currentY + 9, {
              fontSize: 12,
              color: '#1F2937',
              fontWeight: 'bold',
              maxWidth: kpiWidth - 4
            });
            
            // Meta/subtítulo
            const subtitle = kpi.label === 'Contagem de Registros' ? kpi.meta : `Meta: ${kpi.meta}`;
            addText(subtitle, xPos + 2, currentY + 15, {
              fontSize: 7,
              color: '#9CA3AF',
              maxWidth: kpiWidth - 4
            });
          });
          
          currentY += 22; // Espaço para próxima linha de KPIs
        }
        
        currentY += 10;
      }

      // Dados Detalhados - Tabela
      checkPageBreak(60);
      
      currentY += addText('DADOS DETALHADOS', margin, currentY, {
        fontSize: 14,
        color: '#012060',
        fontWeight: 'bold'
      });
      currentY += 15;

      // Cabeçalho da tabela
      const colWidths = [60, 40, 40]; // Larguras das colunas
      const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1]];
      
      // Desenhar cabeçalho da tabela
      pdf.setFillColor(243, 244, 246); // Cor de fundo do cabeçalho
      pdf.rect(margin, currentY - 2, contentWidth, 10, 'F');
      
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.1);
      pdf.rect(margin, currentY - 2, contentWidth, 10);
      
      // Textos do cabeçalho
      addText('PERÍODO DE REFERÊNCIA', colPositions[0] + 2, currentY + 5, {
        fontSize: 9,
        color: '#374151',
        fontWeight: 'bold'
      });
      
      addText('REALIZADO', colPositions[1] + 2, currentY + 5, {
        fontSize: 9,
        color: '#374151',
        fontWeight: 'bold'
      });
      
      addText('META', colPositions[2] + 2, currentY + 5, {
        fontSize: 9,
        color: '#374151',
        fontWeight: 'bold'
      });
      
      currentY += 10;

      // Dados da tabela
      dadosTabela.forEach((linha, index) => {
        checkPageBreak(12);
        
        // Cor de fundo alternada
        if (index % 2 === 1) {
          pdf.setFillColor(249, 250, 251);
          pdf.rect(margin, currentY - 1, contentWidth, 10, 'F');
        }
        
        // Bordas da linha
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.1);
        pdf.rect(margin, currentY - 1, contentWidth, 10);
        
        // Dados da linha
        addText(formatDate(linha.periodo_referencia), colPositions[0] + 2, currentY + 6, {
          fontSize: 9,
          color: '#1F2937'
        });
        
        addText(formatValue(linha.valor_apresentado_realizado), colPositions[1] + 2, currentY + 6, {
          fontSize: 9,
          color: '#1F2937'
        });
        
        addText(formatValue(linha.valor_apresentado_meta), colPositions[2] + 2, currentY + 6, {
          fontSize: 9,
          color: '#1F2937'
        });
        
        currentY += 10;
      });

      // Rodapé
      currentY += 20;
      checkPageBreak(20);
      
      // Linha decorativa
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.5);
      pdf.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      addText('Relatório gerado automaticamente pelo Sistema de Indicadores', pageWidth / 2, currentY, {
        fontSize: 8,
        color: '#9CA3AF',
        align: 'center'
      });

      // Gerar nome do arquivo
      const nomeArquivo = `indicador_${nomeIndicador.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

      // Fazer download
      pdf.save(nomeArquivo);

      toast.success('PDF gerado com sucesso!', { id: 'pdf-generation' });

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.', { id: 'pdf-generation' });
    } finally {
      setGerando(false);
    }
  };

  // Tentar primeiro com html2canvas, fallback para PDF puro
  const gerarPDF = async () => {
    if (gerando) return;

    try {
      setGerando(true);
      toast.loading('Gerando PDF...', { id: 'pdf-generation' });

      // Tentar importar html2canvas
      try {
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;

        // Se chegou aqui, html2canvas está disponível
        await gerarPDFComCanvas(html2canvas, jsPDF);
      } catch (canvasError) {
        console.log('html2canvas não disponível, usando PDF puro:', canvasError.message);
        // Fallback para PDF puro
        await gerarPDFPuro();
      }

    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.', { id: 'pdf-generation' });
      setGerando(false);
    }
  };

  // Função com html2canvas (versão original melhorada)
  const gerarPDFComCanvas = async (html2canvas, jsPDF) => {
    try {
      // ✅ PRIMEIRO: Gerar imagem do gráfico
      const chartImage = await gerarGraficoComoImagem();

      // Criar elemento temporário com o conteúdo
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = gerarConteudoHTML(chartImage);
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '0';
      tempDiv.style.width = '800px';
      tempDiv.style.backgroundColor = 'white';
      document.body.appendChild(tempDiv);

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Capturar como canvas
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        logging: false
      });

      // Remover elemento temporário
      document.body.removeChild(tempDiv);

      // Gerar PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      const nomeArquivo = `indicador_${nomeIndicador.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(nomeArquivo);

      toast.success('PDF gerado com sucesso!', { id: 'pdf-generation' });
      setGerando(false);

    } catch (error) {
      console.log('Erro com html2canvas, tentando PDF puro:', error.message);
      await gerarPDFPuro();
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Gerar HTML (para html2canvas) COM GRÁFICO
  const gerarConteudoHTML = (chartImage = null) => {
    const kpis = calcularKPIs();
    const periodoFiltro = formatarPeriodoFiltro();
    
    const kpisHabilitados = [];
    
    if (configuracoes.soma) {
      kpisHabilitados.push({
        label: 'Soma - Valor Indicador',
        valor: formatKPIValue(kpis.somaRealizadoApresentado),
        meta: formatKPIValue(kpis.somaMetaApresentado)
      });
    }

    if (configuracoes.media) {
      kpisHabilitados.push({
        label: 'Média - Valor Indicador',
        valor: formatKPIValue(kpis.mediaRealizadoApresentado),
        meta: formatKPIValue(kpis.mediaMetaApresentado)
      });
    }

    if (configuracoes.desvio_padrao) {
      kpisHabilitados.push({
        label: 'Desvio Padrão - Valor Indicador',
        valor: formatKPIValue(kpis.desvioPadraoRealizadoApresentado),
        meta: formatKPIValue(kpis.desvioPadraoMetaApresentado)
      });
    }

    if (configuracoes.mediana) {
      kpisHabilitados.push({
        label: 'Mediana - Valor Indicador',
        valor: formatKPIValue(kpis.medianaRealizadoApresentado),
        meta: formatKPIValue(kpis.medianaMetaApresentado)
      });
    }

    if (configuracoes.minimo) {
      kpisHabilitados.push({
        label: 'Mínimo - Valor Indicador',
        valor: formatKPIValue(kpis.minimoRealizadoApresentado),
        meta: formatKPIValue(kpis.minimoMetaApresentado)
      });
    }

    if (configuracoes.maximo) {
      kpisHabilitados.push({
        label: 'Máximo - Valor Indicador',
        valor: formatKPIValue(kpis.maximoRealizadoApresentado),
        meta: formatKPIValue(kpis.maximoMetaApresentado)
      });
    }

    if (configuracoes.mais_recente) {
      kpisHabilitados.push({
        label: 'Mais Recente - Valor Indicador',
        valor: formatKPIValue(kpis.maisRecenteRealizadoApresentado),
        meta: formatKPIValue(kpis.maisRecenteMetaApresentado)
      });
    }

    if (configuracoes.contagem_registros) {
      kpisHabilitados.push({
        label: 'Contagem de Registros',
        valor: formatKPIValue(kpis.contagemRegistros),
        meta: 'Total de períodos'
      });
    }

    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; background: white;">
        <!-- Cabeçalho -->
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #012060; padding-bottom: 20px;">
          <h1 style="color: #012060; font-size: 28px; margin: 0 0 10px 0; font-weight: bold;">
            Relatório de Indicadores
          </h1>
          <h2 style="color: #374151; font-size: 20px; margin: 0; font-weight: normal;">
            ${nomeIndicador}
          </h2>
          <p style="color: #6B7280; font-size: 14px; margin: 10px 0 0 0;">
            Período: ${periodoFiltro} | Gerado em: ${new Date().toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>

        <!-- Informações Gerais -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #012060; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">
            Informações Gerais
          </h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB;">
              <strong style="color: #374151; font-size: 14px;">Projeto:</strong>
              <div style="color: #1F2937; font-size: 16px; margin-top: 5px;">
                ${infoGeral?.projeto_id ? (projetos[infoGeral.projeto_id] || 'N/A') : 'N/A'}
              </div>
            </div>
            <div style="background: #F9FAFB; padding: 15px; border-radius: 8px; border: 1px solid #E5E7EB;">
              <strong style="color: #374151; font-size: 14px;">Categoria:</strong>
              <div style="color: #1F2937; font-size: 16px; margin-top: 5px;">
                ${infoGeral?.categoria_id ? (categorias[infoGeral.categoria_id] || 'N/A') : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        ${chartImage && dadosGraficoCombinado && dadosGraficoCombinado.length > 0 ? `
        <!-- ✅ NOVA SEÇÃO: Gráfico -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #012060; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">
            Gráfico - Valor Indicador (Realizado vs Meta)
          </h3>
          <div style="text-align: center; background: white; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
            <img src="${chartImage}" style="max-width: 100%; height: auto;" alt="Gráfico de Indicadores" />
          </div>
        </div>
        ` : ''}

        ${kpisHabilitados.length > 0 ? `
        <!-- Resumo dos Indicadores -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #012060; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">
            Resumo dos Indicadores
          </h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
            ${kpisHabilitados.map(kpi => `
              <div style="background: #F9FAFB; padding: 12px; border-radius: 6px; border: 1px solid #E5E7EB;">
                <div style="font-size: 10px; color: #6B7280; font-weight: 500; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; line-height: 1.2;">
                  ${kpi.label}
                </div>
                <div style="font-size: 16px; font-weight: bold; color: #1F2937; margin-bottom: 3px; line-height: 1.1;">
                  ${kpi.valor}
                </div>
                <div style="font-size: 9px; color: #9CA3AF; line-height: 1.2;">
                  ${kpi.label === 'Contagem de Registros' ? kpi.meta : `Meta: ${kpi.meta}`}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        <!-- Dados Detalhados -->
        <div style="margin-bottom: 30px;">
          <h3 style="color: #012060; font-size: 18px; margin: 0 0 15px 0; font-weight: bold;">
            Dados Detalhados
          </h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;">
            <thead style="background: #F3F4F6;">
              <tr>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">
                  Período de Referência
                </th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">
                  Realizado
                </th>
                <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #E5E7EB;">
                  Meta
                </th>
              </tr>
            </thead>
            <tbody>
              ${dadosTabela.map((linha, index) => `
                <tr style="background: ${index % 2 === 0 ? 'white' : '#F9FAFB'};">
                  <td style="padding: 12px 16px; font-size: 14px; color: #1F2937; border-bottom: 1px solid #E5E7EB; font-weight: 500;">
                    ${formatDate(linha.periodo_referencia)}
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; color: #1F2937; border-bottom: 1px solid #E5E7EB; font-weight: 500;">
                    ${formatValue(linha.valor_apresentado_realizado)}
                  </td>
                  <td style="padding: 12px 16px; font-size: 14px; color: #1F2937; border-bottom: 1px solid #E5E7EB; font-weight: 500;">
                    ${formatValue(linha.valor_apresentado_meta)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Rodapé -->
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            Relatório gerado automaticamente pelo Sistema de Indicadores
          </p>
        </div>
      </div>
    `;
  };

  return (
    <button
      onClick={gerarPDF}
      disabled={gerando || !indicadores || indicadores.length === 0}
      className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors text-sm w-full lg:w-auto ${
        gerando || !indicadores || indicadores.length === 0
          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
          : 'bg-orange-600 text-white hover:bg-orange-700'
      }`}
    >
      {gerando ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Gerando PDF...
        </>
      ) : (
        <>
          <FiFileText className="mr-2 h-4 w-4" />
          Imprimir Página
        </>
      )}
    </button>
  );
};

export default PDFPrinter;