// ✅ PDFPrinterIndicadores - Componente para imprimir lista de indicadores agrupados por projeto e categoria
// MODIFICADO: Apenas botão de impressão com ícone cinza, sem texto

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiFileText } from 'react-icons/fi';
import { supabase } from '../utils/supabaseClient';

const PDFPrinterIndicadores = ({ 
  indicadores, 
  categorias, 
  projetos,
  filtrosAtivos = {},
  termoBusca = ''
}) => {
  const [gerando, setGerando] = useState(false);

  // ✅ FUNÇÃO: Buscar dados do gráfico para um indicador específico
  const fetchGraficoData = async (idControleindicador) => {
    try {
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .select('*')
        .eq('id_controleindicador', idControleindicador)
        .not('periodo_referencia', 'is', null)
        .order('periodo_referencia', { ascending: false }) // Mais recentes primeiro
        .limit(6); // Apenas os 6 mais recentes
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
      return [];
    }
  };

  // ✅ FUNÇÃO: Preparar dados do gráfico combinado (Realizado vs Meta)
  const prepararDadosGraficoCombinado = (dadosIndicadores) => {
    if (!dadosIndicadores || dadosIndicadores.length === 0) return [];
    
    const dadosAgrupados = {};
    
    dadosIndicadores.forEach(indicador => {
      const periodo = formatDateGrafico(indicador.periodo_referencia);
      const periodoCompleto = indicador.periodo_referencia;
      
      if (!dadosAgrupados[periodo]) {
        dadosAgrupados[periodo] = {
          periodo,
          periodoCompleto,
          realizadoApresentado: 0,
          metaApresentado: 0
        };
      }
      
      if (indicador.tipo_indicador === 1) { // Realizado
        dadosAgrupados[periodo].realizadoApresentado = parseFloat(indicador.valor_indicador_apresentado) || 0;
      } else if (indicador.tipo_indicador === 2) { // Meta
        dadosAgrupados[periodo].metaApresentado = parseFloat(indicador.valor_indicador_apresentado) || 0;
      }
    });
    
    // Retornar em ordem crescente (mais antigo primeiro para o gráfico)
    return Object.values(dadosAgrupados)
      .sort((a, b) => new Date(a.periodoCompleto) - new Date(b.periodoCompleto));
  };

  // ✅ FUNÇÃO: Formatar data para gráfico (DD-MM-AA)
  const formatDateGrafico = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return '';
    }
  };

  // ✅ FUNÇÃO: Gerar gráfico SVG de barras
  const gerarGraficoSVG = (dadosGrafico, nomeIndicador) => {
    if (!dadosGrafico || dadosGrafico.length === 0) {
      return `
        <div class="grafico-svg" style="display: flex; align-items: center; justify-content: center; color: #9CA3AF; font-size: 12px;">
          Sem dados para gráfico
        </div>
      `;
    }

    const largura = 320;           /* ✅ AUMENTADO de 280px para 320px */
    const altura = 180;            /* ✅ AUMENTADO de 120px para 180px */
    const margemEsquerda = 30;     /* ✅ AUMENTADO de 25px para 30px */
    const margemDireita = 20;      /* ✅ AUMENTADO de 15px para 20px */
    const margemTopo = 20;         /* ✅ AUMENTADO de 15px para 20px */
    const margemInferior = 35;     /* ✅ AUMENTADO de 30px para 35px */
    
    const larguraGrafico = largura - margemEsquerda - margemDireita;
    const alturaGrafico = altura - margemTopo - margemInferior;
    
    // Encontrar valor máximo para escala
    const valorMaximo = Math.max(...dadosGrafico.map(d => d.realizadoApresentado));
    const escala = valorMaximo > 0 ? alturaGrafico / valorMaximo : 1;
    
    // Largura de cada barra
    const larguraBarra = larguraGrafico / dadosGrafico.length * 0.7;
    const espacoBarra = larguraGrafico / dadosGrafico.length;
    
    // Gerar barras SVG
    const barras = dadosGrafico.map((periodo, index) => {
      const x = margemEsquerda + (index * espacoBarra) + (espacoBarra - larguraBarra) / 2;
      const alturaBarra = periodo.realizadoApresentado * escala;
      const y = margemTopo + alturaGrafico - alturaBarra;
      
      return `
        <!-- Barra -->
        <rect 
          x="${x}" 
          y="${y}" 
          width="${larguraBarra}" 
          height="${alturaBarra}" 
          class="barra-svg"
          rx="2"
        />
        
        <!-- Valor acima da barra -->
        <text 
          x="${x + larguraBarra/2}" 
          y="${y - 3}" 
          class="texto-valor"
        >
          ${formatarValorIndicador(periodo.realizadoApresentado)}
        </text>
        
        <!-- Período abaixo -->
        <text 
          x="${x + larguraBarra/2}" 
          y="${altura - 8}" 
          class="texto-periodo"
        >
          ${periodo.periodo}
        </text>
      `;
    }).join('');
    
    return `
      <svg class="grafico-svg" viewBox="0 0 ${largura} ${altura}">
        <!-- Linha base -->
        <line 
          x1="${margemEsquerda}" 
          y1="${margemTopo + alturaGrafico}" 
          x2="${largura - margemDireita}" 
          y2="${margemTopo + alturaGrafico}" 
          class="linha-base"
        />
        
        ${barras}
      </svg>
    `;
  };

  // ✅ FUNÇÃO: Verificar se é KPI
  const isKpiOrNull = (indicador) => {
    if (!indicador.controle_indicador) return false;
    const tipoApresentacao = indicador.controle_indicador.tipos_apresentacao?.nome;
    return !tipoApresentacao || tipoApresentacao === 'KPI';
  };

  // ✅ FUNÇÃO: Verificar se é gráfico de barras
  const isGraficoBarras = (indicador) => {
    if (!indicador.controle_indicador) return false;
    const tipoApresentacao = indicador.controle_indicador.tipos_apresentacao?.nome;
    return tipoApresentacao === 'Gráfico de Barras';
  };

  // ✅ FUNÇÃO: Agrupar indicadores por projeto e categoria
  const agruparIndicadoresPorProjetoCategoria = (indicadores) => {
    const grupos = {};
    
    indicadores.forEach(indicador => {
      const projetoId = indicador.projeto_id || 'sem_projeto';
      const categoriaId = indicador.categoria_id || 'sem_categoria';
      const chave = `${projetoId}_${categoriaId}`;
      
      if (!grupos[chave]) {
        grupos[chave] = {
          projeto: {
            id: projetoId,
            nome: projetos[projetoId] || 'Projeto não definido'
          },
          categoria: {
            id: categoriaId,
            nome: categorias[categoriaId] || 'Categoria não definida'
          },
          kpis: [],
          graficos: []
        };
      }
      
      if (isKpiOrNull(indicador)) {
        grupos[chave].kpis.push(indicador);
      } else if (isGraficoBarras(indicador)) {
        grupos[chave].graficos.push(indicador);
      }
    });
    
    return Object.values(grupos).filter(grupo => 
      grupo.kpis.length > 0 || grupo.graficos.length > 0
    );
  };

  // ✅ FUNÇÃO: Formatar valor do indicador
  const formatarValorIndicador = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    const num = parseFloat(valor);
    if (isNaN(num)) return valor;
    return num.toLocaleString('pt-BR');
  };

  // ✅ FUNÇÃO: Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  // ✅ FUNÇÃO: Gerar HTML completo para impressão
  const gerarHTMLCompleto = async () => {
    const gruposIndicadores = agruparIndicadoresPorProjetoCategoria(indicadores);
    
    // ✅ Buscar dados dos gráficos para todos os indicadores de gráfico
    const dadosGraficos = {};
    for (const grupo of gruposIndicadores) {
      for (const grafico of grupo.graficos) {
        const dados = await fetchGraficoData(grafico.id_controleindicador);
        dadosGraficos[grafico.id_controleindicador] = prepararDadosGraficoCombinado(dados);
      }
    }
    
    const dataGeracao = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // ✅ Gerar título do relatório baseado nos filtros
    const gerarTituloRelatorio = () => {
      let titulo = 'Relatório de Indicadores';
      
      if (termoBusca) {
        titulo += ` - Busca: "${termoBusca}"`;
      }
      
      const filtrosTexto = [];
      if (filtrosAtivos.projeto) {
        filtrosTexto.push(`Projeto: ${projetos[filtrosAtivos.projeto]}`);
      }
      if (filtrosAtivos.categoria) {
        filtrosTexto.push(`Categoria: ${categorias[filtrosAtivos.categoria]}`);
      }
      if (filtrosAtivos.importantes) {
        filtrosTexto.push('Apenas Importantes');
      }
      if (filtrosAtivos.arquivados) {
        filtrosTexto.push('Apenas Arquivados');
      }
      
      if (filtrosTexto.length > 0) {
        titulo += ` (${filtrosTexto.join(', ')})`;
      }
      
      return titulo;
    };

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${gerarTituloRelatorio()}</title>
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
        
        /* ✅ CSS ESPECÍFICO PARA IMPRESSÃO */
        @media print {
            body { 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact;
                font-size: 12px;
                padding-top: 0 !important;
            }
            
            @page {
                margin: 1cm 1.5cm 1.5cm 1.5cm;
                size: A4;
            }
            
            /* ✅ CABEÇALHO APENAS NA PRIMEIRA PÁGINA */
            .fixed-header {
                display: none !important;
            }
            
            .header {
                display: block !important;
            }
            
            .content-with-header {
                margin-top: 0 !important;
            }
            
            /* QUEBRA DE PÁGINA PARA CADA GRUPO */
            .grupo-projeto-categoria {
                page-break-before: always;
                page-break-inside: avoid;
            }
            
            .grupo-projeto-categoria:first-child {
                page-break-before: avoid;
            }
            
            /* EVITAR QUEBRAS DESNECESSÁRIAS */
            .kpi-card, .grafico-card {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            
            .kpis-section, .graficos-section {
                page-break-inside: avoid;
            }
            
            .no-print {
                display: none !important;
            }
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
        }
        
        /* ✅ CABEÇALHO ORIGINAL (TELA E PRIMEIRA PÁGINA) */
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
        
        .header p {
            color: #6B7280;
            font-size: 14px;
        }
        
        /* ✅ GRUPO PROJETO/CATEGORIA SEM CARD */
        .grupo-projeto-categoria {
            margin-bottom: 40px;
        }
        
        .grupo-header-simples {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid #E5E7EB;
        }
        
        .grupo-header-simples h2 {
            color: #012060;
            font-size: 20px;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .grupo-header-simples p {
            color: #6B7280;
            font-size: 14px;
        }
        
        /* ✅ SEÇÕES */
        .section {
            margin-bottom: 30px;
        }
        
        .section h3 {
            color: #374151;
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        /* ✅ GRID DE KPIs - 4 POR LINHA */
        .kpis-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 30px;
        }
        
        .kpi-card {
            background: #F9FAFB;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            border-left: 4px solid #3B82F6;
            page-break-inside: avoid;
        }
        
        .kpi-titulo {
            font-size: 12px;
            color: #6B7280;
            font-weight: 600;
            margin-bottom: 8px;
            line-height: 1.3;
        }
        
        .kpi-valor {
            font-size: 24px;
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 8px;
            line-height: 1.1;
        }
        
        .kpi-data {
            font-size: 10px;
            color: #9CA3AF;
            line-height: 1.2;
        }
        
        .kpi-descricao {
            font-size: 10px;
            color: #6B7280;
            margin-top: 5px;
            line-height: 1.3;
        }
        
        /* ✅ GRID DE GRÁFICOS - 2 POR LINHA */
        .graficos-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .grafico-card {
            background: #F9FAFB;
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #E5E7EB;
            border-left: 4px solid #10B981;
            page-break-inside: avoid;
        }
        
        .grafico-titulo {
            font-size: 14px;
            color: #374151;
            font-weight: 600;
            margin-bottom: 10px;
            line-height: 1.3;
        }
        
        .grafico-descricao {
            font-size: 11px;
            color: #6B7280;
            margin-bottom: 15px;
            line-height: 1.3;
        }
        
        .grafico-dados {
            margin-bottom: 15px;
        }
        
        /* ✅ GRÁFICO SVG DE BARRAS - MAIOR */
        .grafico-svg {
            width: 100%;
            height: 180px;              /* ✅ AUMENTADO de 120px para 180px */
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 4px;
            margin-bottom: 15px;        /* ✅ AUMENTADO espaçamento */
        }
        
        .barra-svg {
            fill: #3B82F6;
        }
        
        .texto-periodo {
            font-size: 9px;            /* ✅ AUMENTADO de 8px para 9px */
            fill: #6B7280;
            text-anchor: middle;
        }
        
        .texto-valor {
            font-size: 8px;            /* ✅ AUMENTADO de 7px para 8px */
            fill: #374151;
            text-anchor: middle;
            font-weight: bold;
        }
        
        .linha-base {
            stroke: #E5E7EB;
            stroke-width: 1;
        }
        
        .grafico-info {
            font-size: 10px;
            color: #9CA3AF;
            text-align: center;
            font-style: italic;
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
        
        /* ✅ RESPONSIVIDADE PARA TELA */
        @media screen and (max-width: 1024px) {
            .kpis-grid {
                grid-template-columns: repeat(2, 1fr);
            }
            
            .graficos-grid {
                grid-template-columns: 1fr;
            }
        }
        
        @media screen and (max-width: 640px) {
            .kpis-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <!-- ✅ BOTÃO DE IMPRESSÃO (só aparece na tela) -->
    <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir PDF</button>
    
    <div class="container">
        <!-- ✅ CABEÇALHO ORIGINAL (tela e primeira página da impressão) -->
        <header class="header">
            <h1>${gerarTituloRelatorio()}</h1>
            <p>Gerado em: ${dataGeracao} | Total de indicadores: ${indicadores.length}</p>
        </header>

        <div class="content-with-header">
            ${gruposIndicadores.map((grupo, index) => `
                <div class="grupo-projeto-categoria">
                    <!-- ✅ CABEÇALHO DO GRUPO SEM CARD -->
                    <div class="grupo-header-simples">
                        <h2>${grupo.projeto.nome}</h2>
                        <p>${grupo.categoria.nome}</p>
                    </div>
                    
                    ${grupo.kpis.length > 0 ? `
                        <!-- ✅ SEÇÃO DE KPIs SEM TÍTULO -->
                        <div class="section kpis-section">
                            <div class="kpis-grid">
                                ${grupo.kpis.map(kpi => `
                                    <div class="kpi-card">
                                        <div class="kpi-titulo">${kpi.indicador || 'Sem nome'}</div>
                                        <div class="kpi-valor">${formatarValorIndicador(kpi.valor_indicador_apresentado)}</div>
                                        <div class="kpi-data">${formatDate(kpi.periodo_referencia)}</div>
                                        ${kpi.controle_indicador?.descricao_resumida ? 
                                            `<div class="kpi-descricao">${kpi.controle_indicador.descricao_resumida}</div>` : 
                                            ''
                                        }
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${grupo.graficos.length > 0 ? `
                        <!-- ✅ SEÇÃO DE GRÁFICOS SEM TÍTULO -->
                        <div class="section graficos-section">
                            <div class="graficos-grid">
                                ${grupo.graficos.map(grafico => {
                                    const dadosGrafico = dadosGraficos[grafico.id_controleindicador] || [];
                                    return `
                                        <div class="grafico-card">
                                            <div class="grafico-titulo">${grafico.indicador || 'Sem nome'}</div>
                                            ${grafico.controle_indicador?.descricao_resumida ? 
                                                `<div class="grafico-descricao">${grafico.controle_indicador.descricao_resumida}</div>` : 
                                                ''
                                            }
                                            
                                            <!-- ✅ GRÁFICO SVG MAIOR E ÚNICO -->
                                            ${gerarGraficoSVG(dadosGrafico, grafico.indicador)}
                                            
                                            <div class="grafico-info">
                                                Últimos ${Math.min(dadosGrafico.length, 6)} períodos - Valores Realizados
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `).join('')}
            
            <!-- ✅ RODAPÉ -->
            <footer class="footer">
                <p>Relatório gerado automaticamente pelo Sistema de Indicadores</p>
            </footer>
        </div>
    </div>
</body>
</html>`;
  };

  // ✅ FUNÇÃO: Gerar PDF usando impressão nativa
  const gerarPDFNativo = async () => {
    if (gerando) return;

    setGerando(true);
    toast.loading('Preparando relatório...', { id: 'pdf-generation' });

    try {
      const htmlCompleto = await gerarHTMLCompleto();
      
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

  // ✅ MODIFICADO: Retorna apenas o botão de impressão com ícone cinza
  return (
    <button
      onClick={gerarPDFNativo}
      disabled={gerando || !indicadores || indicadores.length === 0}
      className={`flex items-center text-gray-600 hover:text-gray-800 transition-colors ${
        gerando || !indicadores || indicadores.length === 0
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer'
      }`}
      title="Imprimir Relatório"
    >
      {gerando ? (
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
      ) : (
        <FiFileText className="w-5 h-5" />
      )}
    </button>
  );
};

export default PDFPrinterIndicadores;