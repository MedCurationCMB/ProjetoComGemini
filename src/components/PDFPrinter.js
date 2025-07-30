// ✅ PDFPrinter CORRIGIDO - Cabeçalho Fixo Funcional + Loading + Sem Impressão Automática

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiFileText } from 'react-icons/fi';

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
  dadosGraficoCombinado
}) => {
  const [gerando, setGerando] = useState(false);

  // ✅ FUNÇÃO CORRIGIDA: Loading e sem impressão automática
  const gerarPDFNativo = () => {
    if (gerando) return;

    setGerando(true);
    toast.loading('Preparando relatório...', { id: 'pdf-generation' });

    try {
      const kpis = calcularKPIs();
      const periodoFiltro = formatarPeriodoFiltro();
      
      // ✅ CRIAR HTML COMPLETO PARA IMPRESSÃO
      const htmlCompleto = gerarHTMLCompleto(kpis, periodoFiltro);
      
      // ✅ ABRIR NOVA JANELA
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlCompleto);
      printWindow.document.close();
      
      // ✅ Para o loading imediatamente após abrir a nova aba
      toast.success('Relatório aberto em nova aba!', { id: 'pdf-generation' });
      setGerando(false);
      
      // ✅ REMOVIDO: Não abre mais a impressão automaticamente
      // O usuário deve clicar no botão "Imprimir PDF" na nova aba

    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório', { id: 'pdf-generation' });
      setGerando(false);
    }
  };

  // ✅ ABORDAGEM 2: Download como HTML
  const gerarHTMLDownload = () => {
    if (gerando) return;

    try {
      setGerando(true);
      toast.loading('Gerando arquivo HTML...', { id: 'pdf-generation' });

      const kpis = calcularKPIs();
      const periodoFiltro = formatarPeriodoFiltro();
      const htmlCompleto = gerarHTMLCompleto(kpis, periodoFiltro);

      // ✅ CRIAR BLOB E DOWNLOAD
      const blob = new Blob([htmlCompleto], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `indicador_${nomeIndicador.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);

      toast.success('Arquivo HTML baixado! Abra no navegador e use Ctrl+P para PDF', { id: 'pdf-generation' });
    } catch (error) {
      console.error('Erro ao gerar HTML:', error);
      toast.error('Erro ao gerar arquivo HTML', { id: 'pdf-generation' });
    } finally {
      setGerando(false);
    }
  };

  // ✅ FUNÇÃO PARA FORMATAR PERÍODO
  const formatarPeriodoFiltro = () => {
    switch (filtroPeriodo) {
      case 'todos': return 'Todos os períodos';
      case '7dias': return 'Últimos 7 dias';
      case '30dias': return 'Últimos 30 dias';
      case '90dias': return 'Últimos 90 dias';
      case 'especifico':
        if (dataInicio && dataFim) {
          return `${formatDate(dataInicio)} até ${formatDate(dataFim)}`;
        }
        return 'Período específico';
      default: return 'Todos os períodos';
    }
  };

  // ✅ GERAR HTML COMPLETO COM CSS DE IMPRESSÃO CORRIGIDO
  const gerarHTMLCompleto = (kpis, periodoFiltro) => {
    const kpisHabilitados = [];
    
    // Montar KPIs habilitados
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

    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Indicadores - ${nomeIndicador}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.4;
            color: #1f2937;
            background: white;
            font-size: 14px;
        }
        
        /* ✅ CSS ESPECÍFICO PARA IMPRESSÃO - VERSÃO CORRIGIDA */
        @media print {
            body { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important;
                font-size: 12px !important;
            }
            
            /* ✅ CONFIGURAÇÃO DE PÁGINA CORRIGIDA */
            @page {
                margin-top: 80px !important;
                margin-bottom: 20px !important;
                margin-left: 20px !important;
                margin-right: 20px !important;
                
                /* ✅ CABEÇALHO RUNNING ELEMENT */
                @top-center {
                    content: element(header-content);
                }
            }
            
            /* ✅ CABEÇALHO FIXO - ABORDAGEM RUNNING ELEMENT */
            .running-header {
                position: running(header-content) !important;
                text-align: center !important;
                padding: 10px 20px !important;
                background: white !important;
                border-bottom: 2px solid #012060 !important;
                width: 100% !important;
                box-sizing: border-box !important;
            }
            
            .running-header h1 {
                color: #012060 !important;
                font-size: 16px !important;
                margin: 0 0 3px 0 !important;
                font-weight: bold !important;
            }
            
            .running-header h2 {
                color: #374151 !important;
                font-size: 14px !important;
                margin: 0 0 3px 0 !important;
                font-weight: normal !important;
            }
            
            .running-header p {
                color: #6B7280 !important;
                font-size: 10px !important;
                margin: 0 !important;
            }
            
            /* ✅ ESCONDER CABEÇALHO ORIGINAL NA IMPRESSÃO */
            .header-original {
                display: none !important;
            }
            
            /* ✅ CONTEÚDO PRINCIPAL */
            .content-main {
                margin-top: 0 !important;
                padding-top: 0 !important;
            }
            
            /* ✅ MELHORIAS PARA SEÇÕES */
            .section {
                page-break-inside: avoid;
                margin-bottom: 20px !important;
            }
            
            .section h3 {
                page-break-after: avoid;
            }
            
            /* ✅ MELHORIAS PARA TABELAS */
            table {
                page-break-inside: auto !important;
            }
            
            tr {
                page-break-inside: avoid !important;
            }
            
            td, th {
                padding: 12px 16px !important;
                font-size: 14px !important;
            }
            
            /* ✅ ESCONDER ELEMENTOS DESNECESSÁRIOS */
            .no-print {
                display: none !important;
            }
            
            .print-button {
                display: none !important;
            }
        }
        
        /* ✅ ESTILOS PARA TELA */
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        
        /* ✅ CABEÇALHO PARA TELA */
        .header-original {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #012060;
            padding-bottom: 20px;
        }
        
        .header-original h1 {
            color: #012060;
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .header-original h2 {
            color: #374151;
            font-size: 20px;
            margin-bottom: 10px;
            font-weight: normal;
        }
        
        .header-original p {
            color: #6B7280;
            font-size: 14px;
        }
        
        /* ✅ SEÇÕES */
        .section {
            margin-bottom: 30px;
        }
        
        .section h3 {
            color: #012060;
            font-size: 18px;
            margin-bottom: 15px;
            font-weight: bold;
        }
        
        /* ✅ INFORMAÇÕES GERAIS */
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .info-card {
            background: #F9FAFB;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
        }
        
        .info-card strong {
            color: #374151;
            font-size: 14px;
            display: block;
            margin-bottom: 5px;
        }
        
        .info-card div {
            color: #1F2937;
            font-size: 16px;
        }
        
        /* ✅ KPIS */
        .kpis-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 30px;
        }
        
        .kpi-card {
            background: #F9FAFB;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #E5E7EB;
            page-break-inside: avoid;
        }
        
        .kpi-label {
            font-size: 10px;
            color: #6B7280;
            font-weight: 500;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            line-height: 1.2;
        }
        
        .kpi-value {
            font-size: 16px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 3px;
            line-height: 1.1;
        }
        
        .kpi-meta {
            font-size: 9px;
            color: #9CA3AF;
            line-height: 1.2;
        }
        
        /* ✅ TABELA */
        .table-container {
            width: 100%;
            margin-bottom: 30px;
        }
        
        /* ✅ GRÁFICO */
        .chart-container {
            background: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            margin-bottom: 30px;
        }
        
        .chart-container h4 {
            color: #374151;
            font-size: 16px;
            margin-bottom: 15px;
            text-align: center;
            font-weight: 600;
        }
        
        .simple-chart {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        @media print {
            .chart-container {
                page-break-inside: avoid;
                background: white !important;
                border: 1px solid #E5E7EB !important;
            }
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            overflow: hidden;
        }
        
        thead {
            background: #F3F4F6;
        }
        
        th {
            padding: 12px 16px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #374151;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid #E5E7EB;
        }
        
        tbody tr:nth-child(odd) {
            background: white;
        }
        
        tbody tr:nth-child(even) {
            background: #F9FAFB;
        }
        
        td {
            padding: 12px 16px;
            font-size: 14px;
            color: #1F2937;
            border-bottom: 1px solid #E5E7EB;
            font-weight: 500;
        }
        
        /* ✅ RODAPÉ */
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #E5E7EB;
            color: #9CA3AF;
            font-size: 12px;
        }
        
        /* ✅ BOTÃO PARA TELA */
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3B82F6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
        }
        
        .print-button:hover {
            background: #2563EB;
        }
    </style>
</head>
<body>
    <!-- ✅ BOTÃO DE IMPRESSÃO (só aparece na tela) -->
    <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir PDF</button>
    
    <!-- ✅ CABEÇALHO RUNNING ELEMENT PARA IMPRESSÃO -->
    <div class="running-header">
        <h1>Relatório de Indicadores</h1>
        <h2>${nomeIndicador}</h2>
        <p>Período: ${periodoFiltro} | Gerado em: ${dataGeracao}</p>
    </div>
    
    <div class="container">
        <!-- ✅ CABEÇALHO ORIGINAL (só para tela) -->
        <header class="header-original">
            <h1>Relatório de Indicadores</h1>
            <h2>${nomeIndicador}</h2>
            <p>Período: ${periodoFiltro} | Gerado em: ${dataGeracao}</p>
        </header>

        <div class="content-main">
            <!-- ✅ INFORMAÇÕES GERAIS -->
            <section class="section">
                <h3>Informações Gerais</h3>
                <div class="info-grid">
                    <div class="info-card">
                        <strong>Projeto:</strong>
                        <div>${infoGeral?.projeto_id ? (projetos[infoGeral.projeto_id] || 'N/A') : 'N/A'}</div>
                    </div>
                    <div class="info-card">
                        <strong>Categoria:</strong>
                        <div>${infoGeral?.categoria_id ? (categorias[infoGeral.categoria_id] || 'N/A') : 'N/A'}</div>
                    </div>
                </div>
            </section>

            ${kpisHabilitados.length > 0 ? `
            <!-- ✅ RESUMO DOS INDICADORES -->
            <section class="section">
                <h3>Resumo dos Indicadores</h3>
                <div class="kpis-grid">
                    ${kpisHabilitados.map(kpi => `
                        <div class="kpi-card">
                            <div class="kpi-label">${kpi.label}</div>
                            <div class="kpi-value">${kpi.valor}</div>
                            <div class="kpi-meta">${kpi.label === 'Contagem de Registros' ? kpi.meta : `Meta: ${kpi.meta}`}</div>
                        </div>
                    `).join('')}
                </div>
            </section>
            ` : ''}

            <!-- ✅ VISUALIZAÇÃO GRÁFICA -->
            <section class="section">
                <h3>Visualização Gráfica</h3>
                <div class="chart-container">
                    <h4>Valor Indicador (Realizado vs Meta)</h4>
                    
                    <!-- ✅ GRÁFICO SVG SIMPLES PARA PDF - LIMITADO A 10 MAIS RECENTES -->
                    <div class="simple-chart">
                        ${dadosGraficoCombinado.length > 0 ? `
                            <svg width="100%" height="300" viewBox="0 0 800 300" style="border: 1px solid #E5E7EB; background: white;">
                                <!-- Título do gráfico -->
                                <text x="400" y="25" text-anchor="middle" font-size="14" font-weight="bold" fill="#374151">
                                    Realizado vs Meta por Período ${dadosGraficoCombinado.length > 10 ? '(10 mais recentes)' : ''}
                                </text>
                                
                                <!-- Legenda -->
                                <g transform="translate(300, 40)">
                                    <rect x="0" y="0" width="12" height="12" fill="#3B82F6"/>
                                    <text x="18" y="10" font-size="12" fill="#6B7280">Realizado</text>
                                    <rect x="100" y="0" width="12" height="12" fill="#6B7280"/>
                                    <text x="118" y="10" font-size="12" fill="#6B7280">Meta</text>
                                </g>
                                
                                <!-- Dados do gráfico -->
                                ${dadosGraficoCombinado.slice(-10).map((dados, index) => {
                                    const dadosLimitados = dadosGraficoCombinado.slice(-10);
                                    const maxValue = Math.max(
                                        ...dadosLimitados.map(d => Math.max(d.realizadoApresentado || 0, d.metaApresentado || 0))
                                    );
                                    const x = 80 + (index * (640 / dadosLimitados.length));
                                    const barWidth = Math.min(40, (640 / dadosLimitados.length) - 10);
                                    const realizadoHeight = ((dados.realizadoApresentado || 0) / maxValue) * 180;
                                    const metaHeight = ((dados.metaApresentado || 0) / maxValue) * 180;
                                    const baseY = 250;
                                    
                                    return `
                                        <!-- Barra Realizado -->
                                        <rect x="${x}" y="${baseY - realizadoHeight}" 
                                              width="${barWidth}" height="${realizadoHeight}" 
                                              fill="#3B82F6" rx="2"/>
                                        
                                        <!-- Linha Meta -->
                                        ${dados.metaApresentado > 0 ? `
                                            <line x1="${x}" y1="${baseY - metaHeight}" 
                                                  x2="${x + barWidth}" y2="${baseY - metaHeight}" 
                                                  stroke="#6B7280" stroke-width="3"/>
                                            <circle cx="${x + barWidth/2}" cy="${baseY - metaHeight}" 
                                                    r="3" fill="#6B7280"/>
                                        ` : ''}
                                        
                                        <!-- Valores -->
                                        <text x="${x + barWidth/2}" y="${baseY - realizadoHeight - 5}" 
                                              text-anchor="middle" font-size="10" fill="#374151">
                                            ${(dados.realizadoApresentado || 0).toLocaleString('pt-BR')}
                                        </text>
                                        
                                        <!-- Período -->
                                        <text x="${x + barWidth/2}" y="${baseY + 15}" 
                                              text-anchor="middle" font-size="8" fill="#6B7280">
                                            ${dados.periodo.split('-')[0]}/${dados.periodo.split('-')[1]}
                                        </text>
                                        <text x="${x + barWidth/2}" y="${baseY + 26}" 
                                              text-anchor="middle" font-size="8" fill="#6B7280">
                                            20${dados.periodo.split('-')[2]}
                                        </text>
                                    `;
                                }).join('')}
                                
                                <!-- Eixo X -->
                                <line x1="70" y1="250" x2="730" y2="250" stroke="#E5E7EB" stroke-width="1"/>
                            </svg>
                        ` : `
                            <div style="text-align: center; padding: 40px; color: #6B7280; border: 1px solid #E5E7EB;">
                                Nenhum dado disponível para exibir o gráfico
                            </div>
                        `}
                    </div>
                </div>
            </section>

            <!-- ✅ DADOS DETALHADOS -->
            <section class="section">
                <h3>Dados Detalhados</h3>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Período de Referência</th>
                                <th>Realizado</th>
                                <th>Meta</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${dadosTabela.map((linha, index) => `
                                <tr>
                                    <td>${formatDate(linha.periodo_referencia)}</td>
                                    <td>${formatValue(linha.valor_apresentado_realizado)}</td>
                                    <td>${formatValue(linha.valor_apresentado_meta)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- ✅ RODAPÉ -->
            <footer class="footer">
                <p>Relatório gerado automaticamente pelo Sistema de Indicadores</p>
            </footer>
        </div>
    </div>
</body>
</html>`;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-2 w-full lg:w-auto">
      {/* ✅ BOTÃO PRINCIPAL: Impressão Nativa */}
      <button
        onClick={gerarPDFNativo}
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
            Preparando...
          </>
        ) : (
          <>
            <FiFileText className="mr-2 h-4 w-4" />
            Imprimir Página
          </>
        )}
      </button>

      {/* ✅ BOTÃO ALTERNATIVO: Download HTML */}
      <button
        onClick={gerarHTMLDownload}
        disabled={gerando || !indicadores || indicadores.length === 0}
        className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition-colors text-sm w-full lg:w-auto ${
          gerando || !indicadores || indicadores.length === 0
            ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        📄 Baixar HTML
      </button>
    </div>
  );
};

export default PDFPrinter;