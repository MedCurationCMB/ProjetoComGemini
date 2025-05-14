import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiUpload, FiDownload, FiFile, FiX } from 'react-icons/fi';
import ExcelJS from 'exceljs';

const UploadExcelTemplate = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Função para gerar e baixar o template Excel
  const downloadTemplate = async () => {
    try {
      // Criar workbook com ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Template');
      
      // Definir cabeçalhos
      worksheet.columns = [
        { header: 'projeto_id', key: 'projeto_id', width: 15 },
        { header: 'categoria_id', key: 'categoria_id', width: 15 },
        { header: 'descricao', key: 'descricao', width: 30 },
        { header: 'prazo_entrega', key: 'prazo_entrega', width: 15 },
        { header: 'recorrencia', key: 'recorrencia', width: 15 },
        { header: 'tempo_recorrencia', key: 'tempo_recorrencia', width: 15 },
        { header: 'obrigatorio', key: 'obrigatorio', width: 12 },
        { header: 'tem_documento', key: 'tem_documento', width: 15 }
      ];
      
      // Adicionar dados de exemplo
      worksheet.addRow({
        projeto_id: 'ID do Projeto',
        categoria_id: 'ID da Categoria',
        descricao: 'Descrição do item',
        prazo_entrega: '2023-12-31', // Formato YYYY-MM-DD
        recorrencia: 'mês', // Opções: dia, mês, ano, sem recorrencia
        tempo_recorrencia: 1,
        obrigatorio: true, // true ou false
        tem_documento: false // true ou false
      });
      
      // Adicionar um segundo exemplo para clareza
      worksheet.addRow({
        projeto_id: 'ID do Projeto',
        categoria_id: 'ID da Categoria',
        descricao: 'Outro exemplo de item',
        prazo_entrega: '2024-06-30',
        recorrencia: 'ano',
        tempo_recorrencia: 1,
        obrigatorio: false,
        tem_documento: false
      });
      
      // Formatar cabeçalhos
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Gerar arquivo e baixar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template_controle_conteudo.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Template baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar template:', error);
      toast.error('Erro ao gerar template');
    }
  };
  
  // Função para lidar com a seleção de arquivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Verificar se um arquivo foi selecionado
    if (!selectedFile) {
      return;
    }
    
    // Verificar se o arquivo é um Excel
    const fileTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12'
    ];
    
    if (!fileTypes.includes(selectedFile.type)) {
      toast.error('Por favor, selecione apenas arquivos Excel (.xls, .xlsx)');
      return;
    }
    
    setFile(selectedFile);
  };
  
  // Função para fazer upload e processar o arquivo Excel
  const uploadExcel = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Por favor, selecione um arquivo para upload');
      return;
    }
    
    try {
      setUploading(true);
      setProgress(0);
      
      // Simulação de progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);
      
      // Ler o arquivo Excel usando FileReader
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const buffer = e.target.result;
          
          // Carregar o arquivo Excel com ExcelJS
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          
          // Assumir que os dados estão na primeira planilha
          const worksheet = workbook.worksheets[0];
          
          if (!worksheet) {
            throw new Error('A planilha não pôde ser carregada');
          }
          
          // Extrair cabeçalhos
          const headers = [];
          worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
            headers.push(cell.value?.toString() || '');
          });
          
          // Verificar se os cabeçalhos necessários estão presentes
          const requiredHeaders = ['projeto_id', 'categoria_id', 'descricao'];
          for (const header of requiredHeaders) {
            if (!headers.includes(header)) {
              throw new Error(`Cabeçalho obrigatório "${header}" não encontrado no arquivo`);
            }
          }
          
          // Extrair dados
          const excelData = [];
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) { // Pular a linha de cabeçalho
              const rowData = {};
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                const header = headers[colNumber - 1];
                if (header) {
                  rowData[header] = cell.value;
                }
              });
              excelData.push(rowData);
            }
          });
          
          // Verificar se há dados
          if (!excelData || excelData.length === 0) {
            throw new Error('A planilha não contém dados válidos');
          }
          
          // Validar os dados
          const validatedData = excelData.map(row => {
            // Converter e validar campos
            const item = {
              projeto_id: row.projeto_id?.toString().trim(),
              categoria_id: row.categoria_id?.toString().trim(),
              descricao: row.descricao?.toString().trim() || '',
              prazo_entrega: row.prazo_entrega ? new Date(row.prazo_entrega) : null,
              recorrencia: ['dia', 'mês', 'ano', 'sem recorrencia'].includes(row.recorrencia) 
                ? row.recorrencia 
                : 'sem recorrencia',
              tempo_recorrencia: row.tempo_recorrencia ? parseInt(row.tempo_recorrencia) : null,
              obrigatorio: Boolean(row.obrigatorio),
              tem_documento: Boolean(row.tem_documento)
            };
            
            // Verificar campos obrigatórios
            if (!item.projeto_id || !item.categoria_id || !item.descricao) {
              throw new Error('Todos os itens devem ter projeto_id, categoria_id e descrição');
            }
            
            return item;
          });
          
          // Obter a sessão do usuário
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            throw new Error('Você precisa estar logado para esta ação');
          }
          
          // Inserir os dados no Supabase
          const { data: insertedData, error } = await supabase
            .from('controle_conteudo')
            .insert(validatedData)
            .select();
          
          if (error) throw error;
          
          // Upload completo
          clearInterval(progressInterval);
          setProgress(100);
          
          // Resetar estado
          setTimeout(() => {
            setFile(null);
            setUploading(false);
            setProgress(0);
            
            toast.success(`${insertedData.length} itens importados com sucesso!`);
          }, 1000);
          
        } catch (error) {
          console.error('Erro ao processar planilha:', error);
          toast.error(error.message || 'Erro ao processar a planilha');
          setUploading(false);
          clearInterval(progressInterval);
          setProgress(0);
        }
      };
      
      reader.onerror = () => {
        toast.error('Erro ao ler o arquivo');
        setUploading(false);
        clearInterval(progressInterval);
        setProgress(0);
      };
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Falha ao enviar o arquivo');
      setUploading(false);
      setProgress(0);
    }
  };
  
  // O resto do componente permanece o mesmo
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-medium text-blue-700 mb-2">Como funciona</h3>
        <p className="text-blue-600 mb-4">
          Você pode importar vários itens de controle de conteúdo de uma vez usando uma planilha Excel.
          Baixe o template, preencha com seus dados e faça o upload.
        </p>
        <button
          onClick={downloadTemplate}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <FiDownload className="mr-2" />
          Baixar Template Excel
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Upload de Planilha</h3>
        
        <form onSubmit={uploadExcel} className="space-y-4">
          {/* Upload de arquivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a planilha Excel
            </label>
            
            {!file ? (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>Selecionar arquivo</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xls,.xlsx"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Excel (.xls, .xlsx)
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center p-4 border border-gray-300 rounded-md bg-gray-50">
                <FiFile className="h-8 w-8 text-blue-500 mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="ml-4 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
          
          {/* Barra de progresso */}
          {uploading && (
            <div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      Upload em progresso
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                  ></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Botão de envio */}
          <div>
            <button
              type="submit"
              disabled={!file || uploading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !file || uploading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
            >
              {uploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                'Enviar Planilha'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadExcelTemplate;