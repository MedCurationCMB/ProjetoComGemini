// src/components/ExcelImporter.js - Para Tarefas e Rotinas
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiDownload, FiUpload, FiCheck, FiAlertCircle, FiFile } from 'react-icons/fi';
import ExcelJS from 'exceljs';

const ExcelImporter = ({ 
  onClose, 
  onSuccess, 
  type = 'tarefas', // 'tarefas' ou 'rotinas'
  listas,
  projetos,
  usuarios,
  usuariosListas
}) => {
  const [step, setStep] = useState(1); // 1: Download, 2: Upload, 3: Confirmação
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dadosParaImportar, setDadosParaImportar] = useState([]);
  const [errosValidacao, setErrosValidacao] = useState([]);

  // Opções para recorrência (rotinas)
  const recurrenceTypes = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal' },
    { value: 'yearly', label: 'Anual' }
  ];

  // Função para gerar planilha Excel
  const gerarPlanilhaExcel = async () => {
    try {
      setLoading(true);
      
      // Criar workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(type === 'tarefas' ? 'Tarefas' : 'Rotinas');
      
      // Definir colunas baseadas no tipo
      if (type === 'tarefas') {
        worksheet.columns = [
          { header: 'Descrição da Tarefa *', key: 'content', width: 50 },
          { header: 'Lista (Nome ou ID) *', key: 'task_list_id', width: 30 },
          { header: 'Responsável (Nome ou ID) *', key: 'usuario_id', width: 25 },
          { header: 'Data Limite (YYYY-MM-DD)', key: 'date', width: 20 },
          { header: 'Status (true/false)', key: 'completed', width: 15 }
        ];
      } else {
        worksheet.columns = [
          { header: 'Descrição da Rotina *', key: 'content', width: 50 },
          { header: 'Lista (Nome ou ID) *', key: 'task_list_id', width: 30 },
          { header: 'Responsável (Nome ou ID) *', key: 'usuario_id', width: 25 },
          { header: 'Tipo Recorrência *', key: 'recurrence_type', width: 20 },
          { header: 'Intervalo Recorrência', key: 'recurrence_interval', width: 20 },
          { header: 'Dias Semana (0-6)', key: 'recurrence_days', width: 20 },
          { header: 'Data Início (YYYY-MM-DD) *', key: 'start_date', width: 20 },
          { header: 'Data Fim (YYYY-MM-DD)', key: 'end_date', width: 20 }
        ];
      }
      
      // Formatar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F3FF' }
      };
      
      // Adicionar dados de exemplo
      if (type === 'tarefas') {
        const exemploTarefas = [
          {
            content: 'Implementar nova funcionalidade',
            task_list_id: 'Lista de Desenvolvimento',
            usuario_id: 'João Silva',
            date: '2024-12-31',
            completed: 'false'
          },
          {
            content: 'Revisar documentação',
            task_list_id: 'Lista de QA',
            usuario_id: 'Maria Santos',
            date: '2024-12-15',
            completed: 'true'
          },
          {
            content: 'Corrigir bug crítico',
            task_list_id: 'Lista de Desenvolvimento',
            usuario_id: 'Pedro Costa',
            date: '2024-11-30',
            completed: 'false'
          }
        ];
        
        exemploTarefas.forEach(tarefa => {
          worksheet.addRow(tarefa);
        });
      } else {
        const exemploRotinas = [
          {
            content: 'Backup diário do sistema',
            task_list_id: 'Lista de Infraestrutura',
            usuario_id: 'Pedro Costa',
            recurrence_type: 'daily',
            recurrence_interval: '1',
            recurrence_days: '',
            start_date: '2024-01-01',
            end_date: ''
          },
          {
            content: 'Reunião semanal da equipe',
            task_list_id: 'Lista de Gestão',
            usuario_id: 'Ana Oliveira',
            recurrence_type: 'weekly',
            recurrence_interval: '1',
            recurrence_days: '1,2,3,4,5',
            start_date: '2024-01-01',
            end_date: '2024-12-31'
          },
          {
            content: 'Relatório mensal de vendas',
            task_list_id: 'Lista de Vendas',
            usuario_id: 'Carlos Silva',
            recurrence_type: 'monthly',
            recurrence_interval: '1',
            recurrence_days: '',
            start_date: '2024-01-01',
            end_date: ''
          }
        ];
        
        exemploRotinas.forEach(rotina => {
          worksheet.addRow(rotina);
        });
      }
      
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
      
      instrucoes.addRow([`INSTRUÇÕES PARA IMPORTAÇÃO DE ${type.toUpperCase()}`]);
      instrucoes.addRow([]);
      instrucoes.addRow(['1. CAMPOS OBRIGATÓRIOS (marcados com *):']);
      
      if (type === 'tarefas') {
        instrucoes.addRow(['   - Descrição da Tarefa: Texto descrevendo a tarefa']);
        instrucoes.addRow(['   - Lista: Nome da lista ou ID numérico']);
        instrucoes.addRow(['   - Responsável: Nome do usuário ou ID numérico']);
        instrucoes.addRow([]);
        instrucoes.addRow(['2. CAMPOS OPCIONAIS:']);
        instrucoes.addRow(['   - Data Limite: Formato YYYY-MM-DD (ex: 2024-12-31)']);
        instrucoes.addRow(['   - Status: "true" para concluída, "false" para pendente']);
      } else {
        instrucoes.addRow(['   - Descrição da Rotina: Texto descrevendo a rotina']);
        instrucoes.addRow(['   - Lista: Nome da lista ou ID numérico']);
        instrucoes.addRow(['   - Responsável: Nome do usuário ou ID numérico']);
        instrucoes.addRow(['   - Tipo Recorrência: daily, weekly, monthly, yearly']);
        instrucoes.addRow(['   - Data Início: Formato YYYY-MM-DD (ex: 2024-01-01)']);
        instrucoes.addRow([]);
        instrucoes.addRow(['2. CAMPOS OPCIONAIS:']);
        instrucoes.addRow(['   - Intervalo Recorrência: Número (padrão: 1)']);
        instrucoes.addRow(['   - Dias Semana: Para weekly, usar 0-6 separados por vírgula']);
        instrucoes.addRow(['   - Data Fim: Formato YYYY-MM-DD ou deixar vazio']);
        instrucoes.addRow([]);
        instrucoes.addRow(['3. DIAS DA SEMANA (para recorrência semanal):']);
        instrucoes.addRow(['   - 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta']);
        instrucoes.addRow(['   - 4 = Quinta, 5 = Sexta, 6 = Sábado']);
        instrucoes.addRow(['   - Exemplo: "1,2,3,4,5" = Segunda a Sexta']);
      }
      
      instrucoes.addRow([]);
      instrucoes.addRow(['LISTAS DISPONÍVEIS:']);
      Object.entries(listas).forEach(([id, lista]) => {
        const projeto = projetos[lista.projeto_id] || 'Projeto não encontrado';
        instrucoes.addRow([`   - ID ${id}: ${lista.nome} (${projeto})`]);
      });
      
      instrucoes.addRow([]);
      instrucoes.addRow(['USUÁRIOS DISPONÍVEIS:']);
      Object.entries(usuarios).forEach(([id, nome]) => {
        instrucoes.addRow([`   - ID ${id}: ${nome}`]);
      });
      
      instrucoes.addRow([]);
      instrucoes.addRow(['4. OBSERVAÇÕES IMPORTANTES:']);
      instrucoes.addRow(['   - Você pode usar o nome da lista ou seu ID numérico']);
      instrucoes.addRow(['   - Você pode usar o nome do usuário ou seu ID numérico']);
      instrucoes.addRow(['   - Datas devem estar no formato YYYY-MM-DD']);
      instrucoes.addRow(['   - Remove as linhas de exemplo antes de importar seus dados']);
      instrucoes.addRow(['   - Campos obrigatórios não podem estar vazios']);
      
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
      link.download = `template_${type}_${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL
      window.URL.revokeObjectURL(url);
      
      toast.success(`Template para ${type} baixado com sucesso!`);
      setStep(2);
      
    } catch (error) {
      console.error('Erro ao gerar planilha:', error);
      toast.error('Erro ao gerar template Excel');
    } finally {
      setLoading(false);
    }
  };

  // Função para processar arquivo Excel
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
      
      const worksheet = workbook.getWorksheet(type === 'tarefas' ? 'Tarefas' : 'Rotinas');
      if (!worksheet) {
        throw new Error(`Aba "${type === 'tarefas' ? 'Tarefas' : 'Rotinas'}" não encontrada no arquivo`);
      }
      
      const dadosProcessados = [];
      const erros = [];
      
      // Processar cada linha (começando da linha 2, pulando o cabeçalho)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Pular cabeçalho
        
        const dadosLinha = {};
        
        if (type === 'tarefas') {
          dadosLinha.content = row.getCell(1).value;
          dadosLinha.task_list_id = row.getCell(2).value;
          dadosLinha.usuario_id = row.getCell(3).value;
          dadosLinha.date = row.getCell(4).value;
          dadosLinha.completed = row.getCell(5).value;
        } else {
          dadosLinha.content = row.getCell(1).value;
          dadosLinha.task_list_id = row.getCell(2).value;
          dadosLinha.usuario_id = row.getCell(3).value;
          dadosLinha.recurrence_type = row.getCell(4).value;
          dadosLinha.recurrence_interval = row.getCell(5).value;
          dadosLinha.recurrence_days = row.getCell(6).value;
          dadosLinha.start_date = row.getCell(7).value;
          dadosLinha.end_date = row.getCell(8).value;
        }
        
        // Validações básicas
        if (!dadosLinha.content || String(dadosLinha.content).trim() === '') {
          erros.push(`Linha ${rowNumber}: Descrição é obrigatória`);
          return;
        }
        
        if (!dadosLinha.task_list_id) {
          erros.push(`Linha ${rowNumber}: Lista é obrigatória`);
          return;
        }
        
        if (!dadosLinha.usuario_id) {
          erros.push(`Linha ${rowNumber}: Responsável é obrigatório`);
          return;
        }
        
        // Validações específicas para rotinas
        if (type === 'rotinas') {
          if (!dadosLinha.recurrence_type) {
            erros.push(`Linha ${rowNumber}: Tipo de recorrência é obrigatório`);
            return;
          }
          
          if (!recurrenceTypes.find(rt => rt.value === dadosLinha.recurrence_type)) {
            erros.push(`Linha ${rowNumber}: Tipo de recorrência inválido. Use: daily, weekly, monthly, yearly`);
            return;
          }
          
          if (!dadosLinha.start_date) {
            erros.push(`Linha ${rowNumber}: Data de início é obrigatória`);
            return;
          }
        }
        
        // Converter e validar task_list_id
        let listaId = null;
        const listaValue = String(dadosLinha.task_list_id).trim();
        
        // Tentar como ID direto
        if (listas[listaValue]) {
          listaId = parseInt(listaValue);
        } else {
          // Buscar por nome
          const foundLista = Object.entries(listas).find(([id, lista]) => 
            lista.nome.toLowerCase() === listaValue.toLowerCase()
          );
          if (foundLista) {
            listaId = parseInt(foundLista[0]);
          } else {
            erros.push(`Linha ${rowNumber}: Lista "${listaValue}" não encontrada`);
            return;
          }
        }
        
        // Converter e validar usuario_id
        let usuarioId = null;
        const usuarioValue = String(dadosLinha.usuario_id).trim();
        
        // Tentar como ID direto
        if (usuarios[usuarioValue]) {
          usuarioId = usuarioValue;
        } else {
          // Buscar por nome
          const foundUsuario = Object.entries(usuarios).find(([id, nome]) => 
            nome.toLowerCase() === usuarioValue.toLowerCase()
          );
          if (foundUsuario) {
            usuarioId = foundUsuario[0];
          } else {
            erros.push(`Linha ${rowNumber}: Usuário "${usuarioValue}" não encontrado`);
            return;
          }
        }
        
        // Verificar se usuário tem acesso à lista
        const usuariosDaLista = usuariosListas[listaId] || [];
        if (!usuariosDaLista.includes(usuarioId)) {
          erros.push(`Linha ${rowNumber}: Usuário "${usuarios[usuarioId]}" não tem acesso à lista "${listas[listaId].nome}"`);
          return;
        }
        
        // Processar dados específicos por tipo
        const dadosFinais = {
          content: String(dadosLinha.content).trim(),
          task_list_id: listaId,
          usuario_id: usuarioId
        };
        
        if (type === 'tarefas') {
          // Processar data
          if (dadosLinha.date) {
            if (dadosLinha.date instanceof Date) {
              dadosFinais.date = dadosLinha.date.toISOString().split('T')[0];
            } else if (typeof dadosLinha.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dadosLinha.date)) {
              dadosFinais.date = dadosLinha.date;
            } else {
              erros.push(`Linha ${rowNumber}: Data deve estar no formato YYYY-MM-DD`);
              return;
            }
          }
          
          // Processar completed
          dadosFinais.completed = false;
          if (dadosLinha.completed) {
            const completedStr = String(dadosLinha.completed).toLowerCase().trim();
            dadosFinais.completed = ['true', '1', 'sim', 'concluída'].includes(completedStr);
          }
        } else {
          // Processar dados de rotina
          dadosFinais.recurrence_type = dadosLinha.recurrence_type;
          dadosFinais.recurrence_interval = parseInt(dadosLinha.recurrence_interval) || 1;
          
          // Processar dias da semana
          if (dadosLinha.recurrence_days && dadosLinha.recurrence_type === 'weekly') {
            const days = String(dadosLinha.recurrence_days)
              .split(',')
              .map(d => parseInt(d.trim()))
              .filter(d => !isNaN(d) && d >= 0 && d <= 6);
            dadosFinais.recurrence_days = days.length > 0 ? days : null;
          } else {
            dadosFinais.recurrence_days = null;
          }
          
          // Processar datas
          if (dadosLinha.start_date instanceof Date) {
            dadosFinais.start_date = dadosLinha.start_date.toISOString().split('T')[0];
          } else if (typeof dadosLinha.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dadosLinha.start_date)) {
            dadosFinais.start_date = dadosLinha.start_date;
          } else {
            erros.push(`Linha ${rowNumber}: Data de início deve estar no formato YYYY-MM-DD`);
            return;
          }
          
          if (dadosLinha.end_date) {
            if (dadosLinha.end_date instanceof Date) {
              dadosFinais.end_date = dadosLinha.end_date.toISOString().split('T')[0];
            } else if (typeof dadosLinha.end_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dadosLinha.end_date)) {
              dadosFinais.end_date = dadosLinha.end_date;
            } else {
              erros.push(`Linha ${rowNumber}: Data de fim deve estar no formato YYYY-MM-DD`);
              return;
            }
          }
        }
        
        dadosProcessados.push({
          ...dadosFinais,
          _rowIndex: rowNumber
        });
      });
      
      if (erros.length > 0) {
        setErrosValidacao(erros);
        toast.error(`${erros.length} erro(s) encontrado(s) na planilha`);
        setLoading(false);
        return;
      }
      
      setDadosParaImportar(dadosProcessados);
      setStep(3);
      toast.success(`${dadosProcessados.length} registro(s) processado(s) com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      toast.error('Erro ao processar arquivo Excel');
    } finally {
      setLoading(false);
    }
  };

  // Função para executar importação
  const executarImportacao = async () => {
    try {
      setLoading(true);
      
      let sucessos = 0;
      let falhas = 0;
      
      const tabela = type === 'tarefas' ? 'tasks' : 'routine_tasks';
      
      for (const item of dadosParaImportar) {
        try {
          const { _rowIndex, ...dadosInsert } = item;
          
          const { error } = await supabase
            .from(tabela)
            .insert(dadosInsert);
            
          if (error) throw error;
          sucessos++;
        } catch (error) {
          console.error(`Erro ao inserir linha ${item._rowIndex}:`, error);
          falhas++;
        }
      }
      
      if (sucessos > 0) {
        toast.success(`${sucessos} ${type} importada(s) com sucesso!`);
      }
      
      if (falhas > 0) {
        toast.error(`${falhas} ${type} falharam na importação`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Erro na importação:', error);
      toast.error('Erro ao executar importação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            Importar {type === 'tarefas' ? 'Tarefas' : 'Rotinas'} via Excel
          </h2>
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
              <span className="ml-2 font-medium">Download Template</span>
            </div>
            
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                step >= 2 ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Upload Planilha</span>
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

        {/* Etapa 1: Download Template */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <FiDownload className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                <div>
                  <h3 className="font-medium text-blue-900">Baixar Template</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Primeiro, baixe o template Excel para {type}. O arquivo conterá exemplos e instruções detalhadas.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">O que está incluído no template:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Template com exemplos de dados</p>
                <p>• Aba de instruções detalhadas</p>
                <p>• Lista de todas as listas de projeto disponíveis</p>
                <p>• Lista de todos os usuários disponíveis</p>
                <p>• Validações e formatos obrigatórios</p>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">
                Campos obrigatórios para {type}:
              </h4>
              <div className="text-sm text-yellow-700 space-y-1">
                {type === 'tarefas' ? (
                  <>
                    <p>• <strong>Descrição da Tarefa:</strong> Texto descrevendo a tarefa</p>
                    <p>• <strong>Lista:</strong> Nome da lista ou ID numérico</p>
                    <p>• <strong>Responsável:</strong> Nome do usuário ou ID numérico</p>
                  </>
                ) : (
                  <>
                    <p>• <strong>Descrição da Rotina:</strong> Texto descrevendo a rotina</p>
                    <p>• <strong>Lista:</strong> Nome da lista ou ID numérico</p>
                    <p>• <strong>Responsável:</strong> Nome do usuário ou ID numérico</p>
                    <p>• <strong>Tipo de Recorrência:</strong> daily, weekly, monthly, yearly</p>
                    <p>• <strong>Data de Início:</strong> Formato YYYY-MM-DD</p>
                  </>
                )}
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
                  disabled={loading}
                  className={`px-6 py-2 rounded-md flex items-center ${
                    loading
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
                      Baixar Template
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
                  <h3 className="font-medium text-green-900">Enviar Planilha Preenchida</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Preencha o template baixado com suas {type} e envie o arquivo de volta.
                  </p>
                  <p className="text-sm text-green-700 mt-2">
                    <strong>💡 Lembre-se:</strong> Remova as linhas de exemplo antes de importar seus dados.
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
                        Selecione o arquivo Excel preenchido
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
                  <h3 className="font-medium text-yellow-900">Confirmar Importação</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    {dadosParaImportar.length} {type} será(ão) importada(s). Revise os dados abaixo e confirme.
                  </p>
                </div>
              </div>
            </div>

            {/* Preview dos dados */}
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Linha</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lista</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
                    {type === 'tarefas' ? (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Limite</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </>
                    ) : (
                      <>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Recorrência</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fim</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {dadosParaImportar.slice(0, 20).map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 text-sm text-gray-900">{item._rowIndex}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 max-w-xs truncate" title={item.content}>
                        {item.content}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {listas[item.task_list_id]?.nome || 'Lista não encontrada'}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        {usuarios[item.usuario_id] || 'Usuário não encontrado'}
                      </td>
                      {type === 'tarefas' ? (
                        <>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.date || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {item.completed ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Concluída
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pendente
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {recurrenceTypes.find(rt => rt.value === item.recurrence_type)?.label || item.recurrence_type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.start_date}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.end_date || '-'}</td>
                        </>
                      )}
                    </tr>
                  ))}
                  {dadosParaImportar.length > 20 && (
                    <tr>
                      <td colSpan={type === 'tarefas' ? "6" : "7"} className="px-3 py-2 text-sm text-gray-500 text-center">
                        ... e mais {dadosParaImportar.length - 20} registro(s)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-700">
                💡 <strong>Resumo da importação:</strong> {dadosParaImportar.length} {type} serão criadas no sistema.
              </p>
              <p className="text-sm text-blue-700 mt-1">
                ✅ <strong>Validações realizadas:</strong> Todas as listas, usuários e permissões foram verificados.
              </p>
              {type === 'rotinas' && (
                <p className="text-sm text-blue-700 mt-1">
                  🔄 <strong>Recorrências:</strong> As rotinas serão executadas conforme a configuração definida.
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              
              <button
                onClick={executarImportacao}
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
                    Importando...
                  </>
                ) : (
                  <>
                    <FiCheck className="mr-2" />
                    Confirmar Importação
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ExcelImporter;