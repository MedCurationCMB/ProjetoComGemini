// src/components/AtualizacaoMassaIndicadorDialog.js
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
  subcategorias,
  tiposUnidadeIndicador
}) => {
  const [step, setStep] = useState(1); // 1: Download, 2: Upload, 3: Confirmação
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dadosParaAtualizar, setDadosParaAtualizar] = useState([]);
  const [errosValidacao, setErrosValidacao] = useState([]);

  // Função para gerar e baixar a planilha Excel
  const gerarPlanilhaExcel = async () => {
    try {
      setLoading(true);
      
      // Criar workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Indicadores');
      
      // Definir colunas
      worksheet.columns = [
        { header: 'ID (NÃO MODIFICAR)', key: 'id', width: 20 },
        { header: 'Projeto (NÃO MODIFICAR)', key: 'projeto', width: 25 },
        { header: 'Categoria (NÃO MODIFICAR)', key: 'categoria', width: 25 },
        { header: 'Indicador', key: 'indicador', width: 40 },
        { header: 'Observação', key: 'observacao', width: 40 },
        { header: 'Prazo Entrega (YYYY-MM-DD)', key: 'prazo_entrega', width: 25 },
        { header: 'Período Referência (YYYY-MM-DD)', key: 'periodo_referencia', width: 25 },
        { header: 'Valor Apresentado', key: 'valor_indicador_apresentado', width: 20 },
        { header: 'Tipo Unidade Indicador', key: 'tipo_unidade_indicador', width: 25 },
        { header: 'Obrigatório (true/false)', key: 'obrigatorio', width: 20 }
      ];
      
      // Formatar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      
      // Adicionar dados
      dadosTabela.forEach(item => {
        worksheet.addRow({
          id: item.id,
          projeto: projetos[item.projeto_id] || 'N/A',
          categoria: categorias[item.categoria_id] || 'N/A',
          indicador: item.indicador || '',
          observacao: item.observacao || '',
          prazo_entrega: item.prazo_entrega || '',
          periodo_referencia: item.periodo_referencia || '',
          valor_indicador_apresentado: item.valor_indicador_apresentado || '',
          tipo_unidade_indicador: tiposUnidadeIndicador[item.tipo_unidade_indicador] || '',
          obrigatorio: item.obrigatorio ? 'true' : 'false'
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
      instrucoes.addRow(['1. NÃO modifique as colunas marcadas como "NÃO MODIFICAR"']);
      instrucoes.addRow(['2. Você pode editar apenas:']);
      instrucoes.addRow(['   - Indicador']);
      instrucoes.addRow(['   - Observação']);
      instrucoes.addRow(['   - Prazo Entrega (formato: YYYY-MM-DD, ex: 2024-12-31)']);
      instrucoes.addRow(['   - Período Referência (formato: YYYY-MM-DD, ex: 2024-12-31)']);
      instrucoes.addRow(['   - Valor Apresentado (apenas números, ex: 15.75)']);
      instrucoes.addRow(['   - Tipo Unidade Indicador (use exatamente um dos valores disponíveis)']);
      instrucoes.addRow(['   - Obrigatório (apenas "true" ou "false")']);
      instrucoes.addRow([]);
      instrucoes.addRow(['3. Tipos de Unidade Disponíveis:']);
      
      // Adicionar lista de tipos de unidade
      Object.values(tiposUnidadeIndicador).forEach(tipo => {
        instrucoes.addRow([`   - ${tipo}`]);
      });
      
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
      link.download = `indicadores_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL
      window.URL.revokeObjectURL(url);
      
      toast.success('Planilha baixada com sucesso!');
      setStep(2);
      
    } catch (error) {
      console.error('Erro ao gerar planilha:', error);
      toast.error('Erro ao gerar planilha Excel');
    } finally {
      setLoading(false);
    }
  };

  // Função para processar o arquivo Excel enviado
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
        const indicador = row.getCell(4).value;
        const observacao = row.getCell(5).value;
        const prazo_entrega = row.getCell(6).value;
        const periodo_referencia = row.getCell(7).value;
        const valor_indicador_apresentado = row.getCell(8).value;
        const tipo_unidade_indicador = row.getCell(9).value;
        const obrigatorio = row.getCell(10).value;
        
        // Validações
        if (!id) {
          erros.push(`Linha ${rowNumber}: ID não pode estar vazio`);
          return;
        }
        
        if (!indicador || indicador.toString().trim() === '') {
          erros.push(`Linha ${rowNumber}: Indicador não pode estar vazio`);
          return;
        }
        
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
        
        // Validar tipo_unidade_indicador
        let tipo_unidade_id = null;
        if (tipo_unidade_indicador && tipo_unidade_indicador.toString().trim() !== '') {
          const tipoEncontrado = Object.entries(tiposUnidadeIndicador).find(
            ([id, nome]) => nome === tipo_unidade_indicador.toString().trim()
          );
          if (!tipoEncontrado) {
            erros.push(`Linha ${rowNumber}: Tipo Unidade "${tipo_unidade_indicador}" não é válido`);
            return;
          }
          tipo_unidade_id = parseInt(tipoEncontrado[0]);
        }
        
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
        
        dadosProcessados.push({
          id: parseInt(id),
          indicador: indicador.toString().trim(),
          observacao: observacao ? observacao.toString().trim() : null,
          prazo_entrega: prazo_entrega_formatado,
          periodo_referencia: periodo_referencia_formatado,
          valor_indicador_apresentado: valor_numerico,
          tipo_unidade_indicador: tipo_unidade_id,
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

  // Função para executar a atualização em massa
  const executarAtualizacao = async () => {
    try {
      setLoading(true);
      
      let sucessos = 0;
      let falhas = 0;
      
      for (const item of dadosParaAtualizar) {
        try {
          const { error } = await supabase
            .from('controle_indicador_geral')
            .update({
              indicador: item.indicador,
              observacao: item.observacao,
              prazo_entrega: item.prazo_entrega,
              periodo_referencia: item.periodo_referencia,
              valor_indicador_apresentado: item.valor_indicador_apresentado,
              tipo_unidade_indicador: item.tipo_unidade_indicador,
              obrigatorio: item.obrigatorio
            })
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

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Dados que serão incluídos na planilha:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Total de registros: <strong>{dadosTabela.length}</strong></p>
                <p>• Colunas editáveis: Indicador, Observação, Prazo Entrega, Período Referência, Valor Apresentado, Tipo Unidade, Obrigatório</p>
                <p>• Colunas protegidas: ID, Projeto, Categoria (não modificar)</p>
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

            {/* Preview dos dados */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Indicador</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Prazo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Obrigatório</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dadosParaAtualizar.slice(0, 20).map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.id}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.indicador}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.prazo_entrega || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.valor_indicador_apresentado || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.obrigatorio ? 'Sim' : 'Não'}</td>
                    </tr>
                  ))}
                  {dadosParaAtualizar.length > 20 && (
                    <tr>
                      <td colSpan="5" className="px-4 py-2 text-sm text-gray-500 text-center">
                        ... e mais {dadosParaAtualizar.length - 20} registro(s)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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