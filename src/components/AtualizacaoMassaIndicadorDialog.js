// src/components/AtualizacaoMassaIndicadorDialog.js - COMPLETO FINAL (TIPO UNIDADE NÃO EDITÁVEL)
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiDownload, FiUpload, FiCheck, FiAlertCircle, FiFile } from 'react-icons/fi';
import ExcelJS from 'exceljs';

const AtualizacaoMassaIndicadorDialog = ({ 
  onClose, 
  onSuccess, 
  dadosTabela, // Os dados que estão sendo exibidos na tabela (com filtros aplicados)
  categorias,
  projetos,
  tiposIndicador,
  tiposUnidadeIndicador
}) => {
  const formatarValorIndicador = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '-';
    
    const num = parseFloat(valor);
    if (isNaN(num)) return valor;
    
    return num.toLocaleString('pt-BR');
  };
  const [step, setStep] = useState(1); // 1: Download, 2: Upload, 3: Confirmação
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dadosParaAtualizar, setDadosParaAtualizar] = useState([]);
  const [errosValidacao, setErrosValidacao] = useState([]);
  const [preencherPeriodoAutomatico, setPreencherPeriodoAutomatico] = useState(false);

  // Função para calcular o período de referência baseado na recorrência
  const calcularPeriodoReferencia = (prazoAtual, recorrencia, tempoRecorrencia) => {
    if (!prazoAtual || !recorrencia || recorrencia === 'sem recorrencia' || !tempoRecorrencia) {
      return null;
    }

    try {
      // Criar data sem problemas de fuso horário
      let dataPrazo;
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(prazoAtual)) {
        // Formato YYYY-MM-DD - criar data manual para evitar fuso horário
        const [year, month, day] = prazoAtual.split('-');
        dataPrazo = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Outros formatos
        dataPrazo = new Date(prazoAtual);
      }
      
      // Usar nova instância para não modificar a original
      let dataReferencia = new Date(dataPrazo.getFullYear(), dataPrazo.getMonth(), dataPrazo.getDate());
      
      // Calcular data de referência baseada na recorrência
      if (recorrencia === 'dia') {
        dataReferencia.setDate(dataReferencia.getDate() - tempoRecorrencia);
      } else if (recorrencia === 'mês') {
        dataReferencia.setMonth(dataReferencia.getMonth() - tempoRecorrencia);
      } else if (recorrencia === 'ano') {
        dataReferencia.setFullYear(dataReferencia.getFullYear() - tempoRecorrencia);
      } else {
        return null;
      }
      
      // Retornar no formato YYYY-MM-DD
      const ano = dataReferencia.getFullYear();
      const mes = String(dataReferencia.getMonth() + 1).padStart(2, '0');
      const dia = String(dataReferencia.getDate()).padStart(2, '0');
      
      return `${ano}-${mes}-${dia}`;
    } catch (error) {
      console.error('Erro ao calcular período de referência:', error);
      return null;
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Gerar planilha Excel COM TIPO UNIDADE NÃO EDITÁVEL
  const gerarPlanilhaExcel = async () => {
    try {
      setLoading(true);
      
      // Criar workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Indicadores');
      
      // ✅ DEFINIR COLUNAS COM TIPO UNIDADE NÃO EDITÁVEL
      worksheet.columns = [
        { header: 'ID (NÃO MODIFICAR)', key: 'id', width: 20 },
        { header: 'Projeto (NÃO MODIFICAR)', key: 'projeto', width: 25 },
        { header: 'Categoria (NÃO MODIFICAR)', key: 'categoria', width: 25 },
        { header: 'Tipo Indicador (NÃO MODIFICAR)', key: 'tipo_indicador', width: 20 },
        { header: 'Indicador (NÃO MODIFICAR)', key: 'indicador', width: 40 },
        { header: 'Descrição Resumida (NÃO MODIFICAR)', key: 'descricao_resumida', width: 40 },
        { header: 'Descrição Detalhada (NÃO MODIFICAR)', key: 'descricao_detalhada', width: 50 },
        { header: 'Tipo Unidade (NÃO MODIFICAR)', key: 'tipo_unidade_indicador', width: 25 }, // ✅ AGORA NÃO EDITÁVEL
        { header: 'Observação', key: 'observacao', width: 40 },
        { header: 'Prazo Entrega (YYYY-MM-DD)', key: 'prazo_entrega', width: 25 },
        { header: 'Período Referência (YYYY-MM-DD)', key: 'periodo_referencia', width: 25 },
        { header: 'Valor Apresentado', key: 'valor_indicador_apresentado', width: 20 },
        { header: 'Obrigatório (true/false)', key: 'obrigatorio', width: 20 }
      ];
      
      // Formatar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      
      // ✅ FORMATAR COLUNAS NÃO EDITÁVEIS (CINZA CLARO) - INCLUINDO TIPO UNIDADE
      const colunasNaoEditaveis = [1, 2, 3, 4, 5, 6, 7, 8]; // ID, Projeto, Categoria, Tipo Indicador, Indicador, Desc. Resumida, Desc. Detalhada, Tipo Unidade
      colunasNaoEditaveis.forEach(colIndex => {
        const column = worksheet.getColumn(colIndex);
        column.eachCell((cell, rowNumber) => {
          if (rowNumber === 1) {
            // Cabeçalho - manter cor azul mas com texto mais destacado
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFD6EAF8' } // Azul mais claro para colunas protegidas
            };
            cell.font = { bold: true, color: { argb: 'FF1F4E79' } }; // Azul escuro
          } else {
            // Dados - fundo cinza claro para indicar "somente leitura"
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF8F9FA' } // Cinza muito claro
            };
            cell.font = { color: { argb: 'FF6C757D' } }; // Texto cinza
          }
        });
      });
      
      // Adicionar dados com preenchimento automático opcional
      let registrosPreenchidos = 0;
      
      dadosTabela.forEach(item => {
        // Calcular período de referência se a opção estiver marcada e o campo estiver vazio
        let periodoReferencia = item.periodo_referencia || '';
        
        if (preencherPeriodoAutomatico && (!item.periodo_referencia || item.periodo_referencia === '')) {
          const periodoCalculado = calcularPeriodoReferencia(
            item.prazo_entrega,
            item.recorrencia,
            item.tempo_recorrencia
          );
          
          if (periodoCalculado) {
            periodoReferencia = periodoCalculado;
            registrosPreenchidos++;
          }
        }
        
        // ✅ ADICIONAR LINHA COM TIPO UNIDADE COMO SOMENTE LEITURA
        worksheet.addRow({
          id: item.id,
          projeto: projetos[item.projeto_id] || 'N/A',
          categoria: categorias[item.categoria_id] || 'N/A',
          tipo_indicador: tiposIndicador[item.tipo_indicador] || 'N/A',
          indicador: item.indicador || '',
          descricao_resumida: item.descricao_resumida || '',
          descricao_detalhada: item.descricao_detalhada || '',
          tipo_unidade_indicador: tiposUnidadeIndicador[item.tipo_unidade_indicador] || '', // ✅ SOMENTE LEITURA
          observacao: item.observacao || '',
          prazo_entrega: item.prazo_entrega || '',
          periodo_referencia: periodoReferencia,
          valor_indicador_apresentado: item.valor_indicador_apresentado || '',
          obrigatorio: item.obrigatorio ? 'true' : 'false'
        });
      });
      
      // Aplicar cor de fundo para colunas não editáveis nos dados
      dadosTabela.forEach((item, rowIndex) => {
        const excelRowIndex = rowIndex + 2; // +2 porque começamos na linha 2 (linha 1 é cabeçalho)
        colunasNaoEditaveis.forEach(colIndex => {
          const cell = worksheet.getCell(excelRowIndex, colIndex);
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8F9FA' } // Cinza muito claro
          };
          cell.font = { color: { argb: 'FF6C757D' } }; // Texto cinza
        });
      });
      
      // Adicionar bordas
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
      
      // Adicionar instruções em uma nova aba
      const instrucoes = workbook.addWorksheet('INSTRUÇÕES');
      instrucoes.addRow(['INSTRUÇÕES PARA ATUALIZAÇÃO EM MASSA']);
      instrucoes.addRow([]);
      instrucoes.addRow(['1. NÃO modifique as colunas marcadas como "NÃO MODIFICAR" (fundo cinza claro)']);
      instrucoes.addRow(['   - ID, Projeto, Categoria, Tipo Indicador, Indicador, Descrições e Tipo Unidade são SOMENTE LEITURA']); // ✅ ATUALIZADO
      instrucoes.addRow([]);
      instrucoes.addRow(['2. Você pode editar apenas:']);
      instrucoes.addRow(['   - Observação']);
      instrucoes.addRow(['   - Prazo Entrega (formato: YYYY-MM-DD, ex: 2024-12-31)']);
      instrucoes.addRow(['   - Período Referência (formato: YYYY-MM-DD, ex: 2024-12-31)']);
      instrucoes.addRow(['   - Valor Apresentado (apenas números, ex: 15.75)']);
      instrucoes.addRow(['   - Obrigatório (apenas "true" ou "false")']);
      instrucoes.addRow([]);
      
      // Informar sobre preenchimento automático se foi usado
      if (preencherPeriodoAutomatico && registrosPreenchidos > 0) {
        instrucoes.addRow(['📋 PREENCHIMENTO AUTOMÁTICO APLICADO:']);
        instrucoes.addRow([`   - ${registrosPreenchidos} período(s) de referência foram calculados automaticamente`]);
        instrucoes.addRow(['   - Fórmula usada: Período = Prazo Atual - Tempo de Recorrência']);
        instrucoes.addRow(['   - Você pode modificar estes valores se necessário']);
        instrucoes.addRow([]);
      }
      
      instrucoes.addRow(['3. ✅ COLUNAS DE VISUALIZAÇÃO (SOMENTE LEITURA):']);
      instrucoes.addRow(['   - Tipo Indicador: Mostra se é "Meta" ou "Realizado"']);
      instrucoes.addRow(['   - Indicador: Nome do indicador (não modificável)']);
      instrucoes.addRow(['   - Descrição Resumida: Permite visualizar a descrição resumida do indicador']);
      instrucoes.addRow(['   - Descrição Detalhada: Permite visualizar a descrição completa do indicador']);
      instrucoes.addRow(['   - Tipo Unidade: Mostra a unidade do indicador (ex: Percentual, Valor, etc.)']); // ✅ ATUALIZADO
      instrucoes.addRow(['   - Estas colunas são SOMENTE PARA LEITURA (fundo cinza claro)']);
      instrucoes.addRow([]);
      instrucoes.addRow(['4. Salve o arquivo e faça o upload na próxima etapa']);
      
      // Formatar instruções
      instrucoes.getRow(1).font = { bold: true, size: 16 };
      instrucoes.getColumn(1).width = 80;
      
      // Gerar buffer e baixar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Criar link de download
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      const nomeArquivo = preencherPeriodoAutomatico && registrosPreenchidos > 0 
        ? `indicadores_completo_com_preenchimento_${timestamp}.xlsx`
        : `indicadores_completo_${timestamp}.xlsx`;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL
      window.URL.revokeObjectURL(url);
      
      // Feedback melhorado
      if (preencherPeriodoAutomatico && registrosPreenchidos > 0) {
        toast.success(`Planilha baixada com ${registrosPreenchidos} período(s) preenchido(s) automaticamente!`);
      } else {
        toast.success('Planilha completa baixada - Tipo Unidade protegido contra edição!');
      }
      
      setStep(2);
      
    } catch (error) {
      console.error('Erro ao gerar planilha:', error);
      toast.error('Erro ao gerar planilha Excel');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Processar arquivo Excel SEM TIPO UNIDADE (NÃO EDITÁVEL)
  const processarArquivoExcel = async () => {
    if (!file) {
      toast.error('Selecione um arquivo Excel');
      return;
    }

    try {
      setLoading(true);
      
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      
      const worksheet = workbook.getWorksheet('Indicadores');
      if (!worksheet) {
        throw new Error('Aba "Indicadores" não encontrada no arquivo');
      }
      
      const dadosProcessados = [];
      const erros = [];
      
      // Processar cada linha (começando da linha 2, pulando o cabeçalho)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Pular cabeçalho
        
        const id = row.getCell(1).value;
        // ✅ IGNORAR CÉLULAS 4, 5, 6, 7 E 8 (Tipo Indicador, Indicador, Descrições, Tipo Unidade) - elas são somente leitura
        const observacao = row.getCell(9).value; // ✅ AJUSTADO: agora é coluna 9
        const prazo_entrega = row.getCell(10).value; // ✅ AJUSTADO: agora é coluna 10
        const periodo_referencia = row.getCell(11).value; // ✅ AJUSTADO: agora é coluna 11
        const valor_indicador_apresentado = row.getCell(12).value; // ✅ AJUSTADO: agora é coluna 12
        const obrigatorio = row.getCell(13).value; // ✅ AJUSTADO: agora é coluna 13
        
        // Validações
        if (!id) {
          erros.push(`Linha ${rowNumber}: ID não pode estar vazio`);
          return;
        }
        
        // ✅ REMOVIDO: Validação do indicador e tipo_unidade_indicador (não são mais editáveis)
        
        // Validar data de prazo_entrega
        let prazo_entrega_formatado = null;
        if (prazo_entrega) {
          if (prazo_entrega instanceof Date) {
            prazo_entrega_formatado = prazo_entrega.toISOString().split('T')[0];
          } else if (typeof prazo_entrega === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(prazo_entrega)) {
            prazo_entrega_formatado = prazo_entrega;
          } else {
            erros.push(`Linha ${rowNumber}: Prazo Entrega deve estar no formato YYYY-MM-DD`);
            return;
          }
        }
        
        // Validar data de periodo_referencia
        let periodo_referencia_formatado = null;
        if (periodo_referencia) {
          if (periodo_referencia instanceof Date) {
            periodo_referencia_formatado = periodo_referencia.toISOString().split('T')[0];
          } else if (typeof periodo_referencia === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(periodo_referencia)) {
            periodo_referencia_formatado = periodo_referencia;
          } else {
            erros.push(`Linha ${rowNumber}: Período Referência deve estar no formato YYYY-MM-DD`);
            return;
          }
        }
        
        // Validar valor_indicador_apresentado
        let valor_numerico = null;
        if (valor_indicador_apresentado !== null && valor_indicador_apresentado !== undefined && valor_indicador_apresentado !== '') {
          valor_numerico = parseFloat(valor_indicador_apresentado);
          if (isNaN(valor_numerico)) {
            erros.push(`Linha ${rowNumber}: Valor Apresentado deve ser um número válido`);
            return;
          }
        }
        
        // ✅ REMOVIDO: Validação do tipo_unidade_indicador (não é mais editável)
        
        // Validar obrigatório
        let obrigatorio_bool = false;
        if (obrigatorio !== null && obrigatorio !== undefined && obrigatorio !== '') {
          const obrigatorio_str = obrigatorio.toString().toLowerCase().trim();
          if (obrigatorio_str === 'true') {
            obrigatorio_bool = true;
          } else if (obrigatorio_str === 'false') {
            obrigatorio_bool = false;
          } else {
            erros.push(`Linha ${rowNumber}: Obrigatório deve ser "true" ou "false"`);
            return;
          }
        }
        
        // ✅ DADOS PROCESSADOS SEM indicador e tipo_unidade_indicador (não editáveis)
        dadosProcessados.push({
          id: parseInt(id),
          // indicador: removido (não editável)
          // tipo_unidade_indicador: removido (não editável)
          observacao: observacao ? observacao.toString().trim() : null,
          prazo_entrega: prazo_entrega_formatado,
          periodo_referencia: periodo_referencia_formatado,
          valor_indicador_apresentado: valor_numerico,
          obrigatorio: obrigatorio_bool
        });
      });
      
      if (erros.length > 0) {
        setErrosValidacao(erros);
        toast.error(`${erros.length} erro(s) encontrado(s) na planilha`);
        setLoading(false);
        return;
      }
      
      setDadosParaAtualizar(dadosProcessados);
      setStep(3);
      toast.success(`${dadosProcessados.length} registros processados com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo Excel');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNÇÃO ATUALIZADA: Executar atualização SEM indicador e tipo_unidade_indicador
  const executarAtualizacao = async () => {
    try {
      setLoading(true);
      
      let sucessos = 0;
      let falhas = 0;
      
      for (const item of dadosParaAtualizar) {
        try {
          const updateData = {
            // indicador: removido (não editável)
            // tipo_unidade_indicador: removido (não editável)
            observacao: item.observacao,
            prazo_entrega: item.prazo_entrega,
            periodo_referencia: item.periodo_referencia,
            valor_indicador_apresentado: item.valor_indicador_apresentado,
            obrigatorio: item.obrigatorio
          };
          
          const { error } = await supabase
            .from('controle_indicador_geral')
            .update(updateData)
            .eq('id', item.id);
            
          if (error) throw error;
          sucessos++;
        } catch (error) {
          console.error(`Erro ao atualizar ID ${item.id}:`, error);
          falhas++;
        }
      }
      
      if (sucessos > 0) {
        toast.success(`${sucessos} registro(s) atualizado(s) com sucesso!`);
      }
      
      if (falhas > 0) {
        toast.error(`${falhas} registro(s) falharam na atualização`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Erro na atualização em massa:', error);
      toast.error('Erro ao executar atualização em massa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Atualizar Informações em Massa</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>

        {/* Indicador de progresso */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                step >= 1 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                1
              </div>
              <span className="ml-2 font-medium">Download</span>
            </div>
            
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                step >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Upload</span>
            </div>
            
            <div className={`w-8 h-0.5 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                step >= 3 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                3
              </div>
              <span className="ml-2 font-medium">Confirmar</span>
            </div>
          </div>
        </div>

        {/* Etapa 1: Download */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FiDownload className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-blue-900">Baixar Planilha</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Primeiro, baixe a planilha Excel com os dados atuais. Esta planilha conterá 
                    {dadosTabela.length} registro(s) baseado(s) nos filtros aplicados.
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ INFORMAÇÃO ATUALIZADA: Tipo Unidade agora não editável */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Dados que serão incluídos na planilha:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Total de registros: <strong>{dadosTabela.length}</strong></p>
                <p>• ✅ <strong>Colunas de visualização:</strong> Tipo Indicador, Indicador, Descrições, Tipo Unidade (somente leitura)</p>
                <p>• Colunas editáveis: Observação, Prazo Entrega, Período Referência, Valor Apresentado, Obrigatório</p>
                <p>• Colunas protegidas: ID, Projeto, Categoria, Tipo Indicador, Indicador, Descrições, Tipo Unidade (não modificar)</p>
              </div>
            </div>

            {/* Opção de Preenchimento Automático */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="preencherPeriodoAutomatico"
                  checked={preencherPeriodoAutomatico}
                  onChange={(e) => setPreencherPeriodoAutomatico(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                />
                <div className="ml-3">
                  <label htmlFor="preencherPeriodoAutomatico" className="font-medium text-blue-900 cursor-pointer">
                    Preencher Automático Período de Referência
                  </label>
                  <p className="text-sm text-blue-700 mt-1">
                    Ao marcar esta opção, a planilha será gerada com os períodos de referência calculados automaticamente 
                    para indicadores que ainda não possuem essa informação (baseado na recorrência).
                  </p>
                  <div className="mt-2 text-xs text-blue-600">
                    <p>📋 <strong>Fórmula:</strong> Período de Referência = Prazo Atual - Tempo de Recorrência</p>
                    <p>🎯 <strong>Aplicado apenas em:</strong> Registros com período de referência vazio e recorrência válida</p>
                    <p>📊 <strong>Elegíveis:</strong> {dadosTabela.filter(item => 
                      (!item.periodo_referencia || item.periodo_referencia === '') &&
                      item.prazo_entrega &&
                      item.recorrencia &&
                      item.recorrencia !== 'sem recorrencia' &&
                      item.tempo_recorrencia
                    ).length} de {dadosTabela.length} registros</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <div className="flex space-x-3">
                <button
                  onClick={gerarPlanilhaExcel}
                  disabled={loading || dadosTabela.length === 0}
                  className={`px-6 py-2 rounded-md flex items-center ${
                    loading || dadosTabela.length === 0
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <FiDownload className="mr-2" />
                      Baixar Planilha
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md flex items-center"
                >
                  Próximo Passo →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Etapa 2: Upload */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <FiUpload className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-green-900">Enviar Planilha Modificada</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Agora faça as modificações necessárias na planilha baixada e envie o arquivo de volta.
                  </p>
                  {/* ✅ INFORMAÇÃO ATUALIZADA: Incluindo Tipo Unidade como não editável */}
                  <p className="text-sm text-green-700 mt-2">
                    <strong>💡 Lembre-se:</strong> As colunas "Tipo Indicador", "Indicador", "Descrições" e "Tipo Unidade" são apenas para visualização (fundo cinza claro) e não devem ser modificadas.
                  </p>
                </div>
              </div>
            </div>

            {/* Upload area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              {!file ? (
                <div className="text-center">
                  <FiFile className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Selecione o arquivo Excel modificado
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xlsx,.xls"
                        onChange={(e) => setFile(e.target.files[0])}
                      />
                      <span className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 mt-2">
                        Escolher arquivo
                      </span>
                    </label>
                    <p className="mt-2 text-xs text-gray-500">
                      Apenas arquivos Excel (.xlsx, .xls)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FiFile className="h-8 w-8 text-green-500" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Erros de validação */}
            {errosValidacao.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start">
                  <FiAlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-2" />
                  <div>
                    <h3 className="font-medium text-red-900">Erros encontrados na planilha:</h3>
                    <ul className="mt-2 text-sm text-red-700 space-y-1">
                      {errosValidacao.slice(0, 10).map((erro, index) => (
                        <li key={index}>• {erro}</li>
                      ))}
                      {errosValidacao.length > 10 && (
                        <li>• ... e mais {errosValidacao.length - 10} erro(s)</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              
              <button
                onClick={processarArquivoExcel}
                disabled={!file || loading}
                className={`px-6 py-2 rounded-md flex items-center ${
                  !file || loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processando...
                  </>
                ) : (
                  <>
                    <FiUpload className="mr-2" />
                    Processar Planilha
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Etapa 3: Confirmação */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <FiCheck className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-yellow-900">Confirmar Atualização</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {dadosParaAtualizar.length} registro(s) será(ão) atualizado(s). Revise os dados abaixo e confirme.
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ PREVIEW DOS DADOS: SEM TIPO UNIDADE NAS COLUNAS EDITÁVEIS */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Indicador</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipo Unidade</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prazo</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Período Ref.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obrigatório</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dadosParaAtualizar.slice(0, 20).map((item) => {
                    // ✅ BUSCAR OS DADOS ORIGINAIS PARA MOSTRAR AS INFORMAÇÕES NÃO EDITÁVEIS
                    const itemOriginal = dadosTabela.find(original => original.id === item.id);
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.id}</td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {itemOriginal ? (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              tiposIndicador[itemOriginal.tipo_indicador]?.toLowerCase().includes('realizado') 
                                ? 'bg-green-100 text-green-800'
                                : tiposIndicador[itemOriginal.tipo_indicador]?.toLowerCase().includes('meta')
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {tiposIndicador[itemOriginal.tipo_indicador] || 'N/A'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={itemOriginal?.indicador || 'Sem indicador'}>
                          {itemOriginal?.indicador || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500">
                          {itemOriginal ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {tiposUnidadeIndicador[itemOriginal.tipo_unidade_indicador] || 'N/A'}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 max-w-xs truncate" title={itemOriginal?.descricao_resumida || 'Sem descrição'}>
                          {itemOriginal?.descricao_resumida || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.prazo_entrega || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.periodo_referencia || '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{item.valor_indicador_apresentado ? formatarValorIndicador(item.valor_indicador_apresentado) : '-'}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {item.obrigatorio ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Sim
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Não
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {dadosParaAtualizar.length > 20 && (
                    <tr>
                      <td colSpan="9" className="px-3 py-2 text-sm text-gray-500 text-center">
                        ... e mais {dadosParaAtualizar.length - 20} registro(s)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ✅ INFORMAÇÃO ATUALIZADA: Incluindo Tipo Unidade como não editável */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                💡 <strong>Observação:</strong> As colunas "Tipo Indicador", "Indicador", "Tipo Unidade", "Descrição Resumida" e "Descrição Detalhada" são exibidas apenas para sua referência e não serão atualizadas no banco de dados.
              </p>
              <p className="text-sm text-blue-700 mt-1">
                ✅ <strong>Campos atualizados:</strong> Observação, Prazo Entrega, Período Referência, Valor Apresentado e Obrigatório.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              
              <button
                onClick={executarAtualizacao}
                disabled={loading}
                className={`px-6 py-2 rounded-md flex items-center ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Atualizando...
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2" />
                    Confirmar Atualização
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AtualizacaoMassaIndicadorDialog;