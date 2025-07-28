// ✅ PDFPrinter COMPLETO - HTML/CSS com Cabeçalho Fixo em Todas as Páginas

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

  // ✅ ABORDAGEM 1: HTML + CSS com window.print()
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
      
      // ✅ AGUARDAR CARREGAMENTO E IMPRIMIR
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // printWindow.close(); // Opcional: fechar após imprimir
          
          toast.success('Relatório enviado para impressão!', { id: 'pdf-generation' });
          setGerando(false);
        }, 500);
      };

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

  // ✅ GERAR HTML COMPLETO COM CSS DE IMPRESSÃO E CABEÇALHO FIXO
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
        }
        
        /* ✅ CSS ESPECÍFICO PARA IMPRESSÃO COM CABEÇALHO FIXO */
        @media print {
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                font-size: 12px;
            }
            
            /* ✅ CONFIGURAR PÁGINA SIMPLES SEM @page HEADER */
            @page {
                margin: 1.5cm 1.5cm 1.5cm 1.5cm; /* Margens normais */
            }
            
            /* ✅ CABEÇALHO FIXO PARA IMPRESSÃO - MELHORADO */
            .fixed-header {
                display: block;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: white;
                z-index: 1000;
                padding: 15px 20px;
                border-bottom: 3px solid #012060;
                text-align: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .content-with-header {
                margin-top: 100px; /* Espaço para o cabeçalho fixo */
            }
            
            .page-break { 
                page-break-before: always; 
            }
            
            .avoid-break { 
                page-break-inside: avoid; 
            }
            
            table { 
                page-break-inside: auto; 
            }
            
            tr { 
                page-break-inside: avoid; 
                page-break-after: auto; 
            }
            
            .no-print { 
                display: none; 
            }
            
            /* ✅ OCULTAR CABEÇALHO ORIGINAL NA IMPRESSÃO */
            .header {
                display: none;
            }
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
        }
        
        /* ✅ CABEÇALHO FIXO PARA IMPRESSÃO */
        .fixed-header {
            display: none; /* Oculto por padrão */
        }
        
        @media print {
            .fixed-header {
                display: block !important;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: white !important;
                z-index: 1000;
                padding: 15px 20px;
                border-bottom: 3px solid #012060;
                text-align: center;
                box-shadow: none;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .content-with-header {
                margin-top: 100px !important;
            }
        }
        
        /* ✅ CABEÇALHO ORIGINAL (TELA) */
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #012060;
            padding-bottom: 20px;
        }
        
        .header h1 {
            color: #012060;
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .header h2 {
            color: #374151;
            font-size: 20px;
            margin-bottom: 10px;
            font-weight: normal;
        }
        
        .header p {
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
        
        /* ✅ TABELA COM QUEBRA AUTOMÁTICA */
        .table-container {
            width: 100%;
            margin-bottom: 30px;
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
        
        @media print {
            .print-button { display: none; }
        }
    </style>
</head>
<body>
    <!-- ✅ BOTÃO DE IMPRESSÃO (só aparece na tela) -->
    <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir PDF</button>
    
    <!-- ✅ CABEÇALHO FIXO PARA IMPRESSÃO -->
    <div class="fixed-header">
        <h1 style="color: #012060; font-size: 18px; margin-bottom: 5px; font-weight: bold;">
            Relatório de Indicadores
        </h1>
        <h2 style="color: #374151; font-size: 14px; margin-bottom: 5px; font-weight: normal;">
            ${nomeIndicador}
        </h2>
        <p style="color: #6B7280; font-size: 10px; margin: 0;">
            Período: ${periodoFiltro} | Gerado em: ${dataGeracao}
        </p>
    </div>
    
    <div class="container">
        <!-- ✅ CABEÇALHO ORIGINAL (só para tela) -->
        <header class="header avoid-break">
            <h1>Relatório de Indicadores</h1>
            <h2>${nomeIndicador}</h2>
            <p>Período: ${periodoFiltro} | Gerado em: ${dataGeracao}</p>
        </header>

        <div class="content-with-header">
            <!-- ✅ INFORMAÇÕES GERAIS -->
            <section class="section avoid-break">
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
            <section class="section avoid-break">
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