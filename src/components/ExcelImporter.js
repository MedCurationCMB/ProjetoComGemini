// src/components/ExcelImporter.js - VERSÃO COMPLETA ATUALIZADA
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  FiX, 
  FiDownload, 
  FiUpload, 
  FiCheck, 
  FiAlertCircle, 
  FiFile,
  FiCpu,
  FiChevronDown,
  FiChevronUp
} from 'react-icons/fi';
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // ✅ TIPOS DE RECORRÊNCIA COMPLETOS (igual ao tarefas-rotinas.js)
  const recurrenceTypes = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal (dia fixo)' },
    { value: 'yearly', label: 'Anual' },
    { value: 'biweekly', label: 'A cada 2 semanas' },
    { value: 'triweekly', label: 'A cada 3 semanas' },
    { value: 'quadweekly', label: 'A cada 4 semanas' },
    { value: 'monthly_weekday', label: 'Padrão mensal (ex: 1ª segunda)' }
  ];

  // ✅ TIPOS BÁSICOS E AVANÇADOS SEPARADOS
  const tiposRecorrenciaBasicos = [
    { value: 'daily', label: 'Diário' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensal (dia fixo)' },
    { value: 'yearly', label: 'Anual' }
  ];

  const tiposRecorrenciaAvancados = [
    { value: 'biweekly', label: 'A cada 2 semanas' },
    { value: 'triweekly', label: 'A cada 3 semanas' },
    { value: 'quadweekly', label: 'A cada 4 semanas' },
    { value: 'monthly_weekday', label: 'Padrão mensal' }
  ];

  // ✅ ORDINAIS PARA PADRÕES MENSIAIS
  const ordinaisMensais = [
    { value: 1, label: 'Primeira' },
    { value: 2, label: 'Segunda' },
    { value: 3, label: 'Terceira' },
    { value: 4, label: 'Quarta' },
    { value: -1, label: 'Última' }
  ];

  // ✅ DIAS DA SEMANA
  const diasDaSemana = [
    { valor: 1, nome: 'Segunda', abrev: 'SEG' },
    { valor: 2, nome: 'Terça', abrev: 'TER' },
    { valor: 3, nome: 'Quarta', abrev: 'QUA' },
    { valor: 4, nome: 'Quinta', abrev: 'QUI' },
    { valor: 5, nome: 'Sexta', abrev: 'SEX' },
    { valor: 6, nome: 'Sábado', abrev: 'SAB' },
    { valor: 0, nome: 'Domingo', abrev: 'DOM' }
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
          { header: 'Status (true/false)', key: 'completed', width: 15 },
          { header: 'Nota', key: 'note', width: 40 }
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
          { header: 'Data Fim (YYYY-MM-DD)', key: 'end_date', width: 20 },
          { header: 'Persistente (true/false)', key: 'persistent', width: 15 },
          { header: 'Nota', key: 'note', width: 40 },
          { header: 'Intervalo Semanas (2/3/4)', key: 'weekly_interval', width: 20 },
          { header: 'Dia da Semana (0-6)', key: 'selected_weekday', width: 20 },
          { header: 'Ordinal Mensal (1-4, -1)', key: 'monthly_ordinal', width: 20 },
          { header: 'Dia Semana Mensal (0-6)', key: 'monthly_weekday', width: 20 }
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
            completed: 'false',
            note: 'Prioridade alta - cliente aguardando'
          },
          {
            content: 'Revisar documentação',
            task_list_id: 'Lista de QA',
            usuario_id: 'Maria Santos',
            date: '2024-12-15',
            completed: 'true',
            note: ''
          },
          {
            content: 'Corrigir bug crítico',
            task_list_id: 'Lista de Desenvolvimento',
            usuario_id: 'Pedro Costa',
            date: '2024-11-30',
            completed: 'false',
            note: 'Verificar logs do sistema'
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
            end_date: '',
            persistent: 'true',
            note: 'Backup completo incluindo banco de dados',
            weekly_interval: '',
            selected_weekday: '',
            monthly_ordinal: '',
            monthly_weekday: ''
          },
          {
            content: 'Reunião semanal da equipe',
            task_list_id: 'Lista de Gestão',
            usuario_id: 'Ana Oliveira',
            recurrence_type: 'weekly',
            recurrence_interval: '1',
            recurrence_days: '1,2,3,4,5',
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            persistent: 'true',
            note: 'Todas as segundas-feiras às 10h',
            weekly_interval: '',
            selected_weekday: '',
            monthly_ordinal: '',
            monthly_weekday: ''
          },
          {
            content: 'Relatório mensal de vendas',
            task_list_id: 'Lista de Vendas',
            usuario_id: 'Carlos Silva',
            recurrence_type: 'monthly',
            recurrence_interval: '1',
            recurrence_days: '',
            start_date: '2024-01-01',
            end_date: '',
            persistent: 'true',
            note: 'Enviar para diretoria até dia 5',
            weekly_interval: '',
            selected_weekday: '',
            monthly_ordinal: '',
            monthly_weekday: ''
          },
          {
            content: 'Revisão quinzenal de projetos',
            task_list_id: 'Lista de Gestão',
            usuario_id: 'Ana Oliveira',
            recurrence_type: 'biweekly',
            recurrence_interval: '1',
            recurrence_days: '',
            start_date: '2024-01-01',
            end_date: '',
            persistent: 'true',
            note: 'A cada 2 semanas nas quartas-feiras',
            weekly_interval: '2',
            selected_weekday: '3',
            monthly_ordinal: '',
            monthly_weekday: ''
          },
          {
            content: 'Reunião da primeira segunda',
            task_list_id: 'Lista de Gestão',
            usuario_id: 'Ana Oliveira',
            recurrence_type: 'monthly_weekday',
            recurrence_interval: '1',
            recurrence_days: '',
            start_date: '2024-01-01',
            end_date: '',
            persistent: 'true',
            note: 'Primeira segunda-feira de cada mês',
            weekly_interval: '',
            selected_weekday: '',
            monthly_ordinal: '1',
            monthly_weekday: '1'
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
        instrucoes.addRow(['   - Nota: Informações adicionais sobre a tarefa']);
      } else {
        instrucoes.addRow(['   - Descrição da Rotina: Texto descrevendo a rotina']);
        instrucoes.addRow(['   - Lista: Nome da lista ou ID numérico']);
        instrucoes.addRow(['   - Responsável: Nome do usuário ou ID numérico']);
        instrucoes.addRow(['   - Tipo Recorrência: daily, weekly, monthly, yearly, biweekly, triweekly, quadweekly, monthly_weekday']);
        instrucoes.addRow(['   - Data Início: Formato YYYY-MM-DD (ex: 2024-01-01)']);
        instrucoes.addRow([]);
        instrucoes.addRow(['2. CAMPOS OPCIONAIS:']);
        instrucoes.addRow(['   - Intervalo Recorrência: Número (padrão: 1)']);
        instrucoes.addRow(['   - Dias Semana: Para weekly, usar 0-6 separados por vírgula']);
        instrucoes.addRow(['   - Data Fim: Formato YYYY-MM-DD ou deixar vazio']);
        instrucoes.addRow(['   - Persistente: "true" para persistente, "false" para não persistente']);
        instrucoes.addRow(['   - Nota: Informações adicionais sobre a rotina']);
        instrucoes.addRow([]);
        instrucoes.addRow(['3. CAMPOS PARA TIPOS AVANÇADOS:']);
        instrucoes.addRow(['   - Intervalo Semanas: Para biweekly/triweekly/quadweekly (2, 3, 4)']);
        instrucoes.addRow(['   - Dia da Semana: Para tipos avançados (0-6)']);
        instrucoes.addRow(['   - Ordinal Mensal: Para monthly_weekday (1-4 = primeira-quarta, -1 = última)']);
        instrucoes.addRow(['   - Dia Semana Mensal: Para monthly_weekday (0-6)']);
        instrucoes.addRow([]);
        instrucoes.addRow(['4. DIAS DA SEMANA (para recorrência semanal):']);
        instrucoes.addRow(['   - 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta']);
        instrucoes.addRow(['   - 4 = Quinta, 5 = Sexta, 6 = Sábado']);
        instrucoes.addRow(['   - Exemplo: "1,2,3,4,5" = Segunda a Sexta']);
        instrucoes.addRow([]);
        instrucoes.addRow(['5. TIPOS DE RECORRÊNCIA AVANÇADOS:']);
        instrucoes.addRow(['   - biweekly: A cada 2 semanas em dia específico']);
        instrucoes.addRow(['   - triweekly: A cada 3 semanas em dia específico']);
        instrucoes.addRow(['   - quadweekly: A cada 4 semanas em dia específico']);
        instrucoes.addRow(['   - monthly_weekday: Padrão mensal (ex: primeira segunda)']);
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
      instrucoes.addRow(['6. OBSERVAÇÕES IMPORTANTES:']);
      instrucoes.addRow(['   - Você pode usar o nome da lista ou seu ID numérico']);
      instrucoes.addRow(['   - Você pode usar o nome do usuário ou seu ID numérico']);
      instrucoes.addRow(['   - Datas devem estar no formato YYYY-MM-DD']);
      instrucoes.addRow(['   - Remove as linhas de exemplo antes de importar seus dados']);
      instrucoes.addRow(['   - Campos obrigatórios não podem estar vazios']);
      instrucoes.addRow(['   - Para tipos avançados, preencha os campos específicos']);
      
      // Formatar instruções
      instrucoes.getRow(1).font = { bold: true, size: 16 };
      instrucoes.getColumn(1).width = 100;
      
      // Formatar seções
      const sections = [
        { row: 1, bgColor: 'FF2F75B6', textColor: 'FFFFFFFF' },
        { row: 3, bgColor: 'FFFCE4D6', textColor: 'FF8B4513' },
        { row: type === 'tarefas' ? 9 : 11, bgColor: 'FFE7F5E6', textColor: 'FF2E8B57' },
        { row: type === 'tarefas' ? 14 : 35, bgColor: 'FFFFF2CC', textColor: 'FF8B6914' }
      ];
      
      sections.forEach(section => {
        if (instrucoes.getRow(section.row)) {
          instrucoes.getRow(section.row).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: section.bgColor }
          };
          instrucoes.getRow(section.row).font = {
            bold: true,
            color: { argb: section.textColor }
          };
        }
      });
      
      // Gerar buffer e baixar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      
      // Criar link de download
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `template_${type}_completo_${timestamp}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpar URL
      window.URL.revokeObjectURL(url);
      
      toast.success(`Template completo para ${type} baixado com sucesso!`);
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
          dadosLinha.note = row.getCell(6).value;
        } else {
          dadosLinha.content = row.getCell(1).value;
          dadosLinha.task_list_id = row.getCell(2).value;
          dadosLinha.usuario_id = row.getCell(3).value;
          dadosLinha.recurrence_type = row.getCell(4).value;
          dadosLinha.recurrence_interval = row.getCell(5).value;
          dadosLinha.recurrence_days = row.getCell(6).value;
          dadosLinha.start_date = row.getCell(7).value;
          dadosLinha.end_date = row.getCell(8).value;
          dadosLinha.persistent = row.getCell(9).value;
          dadosLinha.note = row.getCell(10).value;
          dadosLinha.weekly_interval = row.getCell(11).value;
          dadosLinha.selected_weekday = row.getCell(12).value;
          dadosLinha.monthly_ordinal = row.getCell(13).value;
          dadosLinha.monthly_weekday = row.getCell(14).value;
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
            erros.push(`Linha ${rowNumber}: Tipo de recorrência inválido. Use: ${recurrenceTypes.map(rt => rt.value).join(', ')}`);
            return;
          }
          
          if (!dadosLinha.start_date) {
            erros.push(`Linha ${rowNumber}: Data de início é obrigatória`);
            return;
          }
          
          // ✅ VALIDAÇÕES PARA TIPOS AVANÇADOS
          if (['biweekly', 'triweekly', 'quadweekly'].includes(dadosLinha.recurrence_type)) {
            if (!dadosLinha.selected_weekday) {
              erros.push(`Linha ${rowNumber}: Dia da semana é obrigatório para tipo ${dadosLinha.recurrence_type}`);
              return;
            }
            
            if (!dadosLinha.weekly_interval) {
              // Definir intervalo padrão baseado no tipo
              if (dadosLinha.recurrence_type === 'biweekly') dadosLinha.weekly_interval = 2;
              else if (dadosLinha.recurrence_type === 'triweekly') dadosLinha.weekly_interval = 3;
              else if (dadosLinha.recurrence_type === 'quadweekly') dadosLinha.weekly_interval = 4;
            }
          }
          
          if (dadosLinha.recurrence_type === 'monthly_weekday') {
            if (!dadosLinha.monthly_ordinal || !dadosLinha.monthly_weekday) {
              erros.push(`Linha ${rowNumber}: Ordinal mensal e dia da semana são obrigatórios para monthly_weekday`);
              return;
            }
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
            dadosFinais.completed = ['true', '1', 'sim', 'concluída', 'yes'].includes(completedStr);
          }
          
          // Processar nota
          if (dadosLinha.note) {
            dadosFinais.note = String(dadosLinha.note).trim();
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
          
          // Processar persistente
          dadosFinais.persistent = true;
          if (dadosLinha.persistent) {
            const persistentStr = String(dadosLinha.persistent).toLowerCase().trim();
            dadosFinais.persistent = !['false', '0', 'não', 'nao', 'no'].includes(persistentStr);
          }
          
          // Processar nota
          if (dadosLinha.note) {
            dadosFinais.note = String(dadosLinha.note).trim();
          }
          
          // ✅ PROCESSAR CAMPOS AVANÇADOS
          if (dadosLinha.weekly_interval) {
            dadosFinais.weekly_interval = parseInt(dadosLinha.weekly_interval) || 
              (dadosLinha.recurrence_type === 'biweekly' ? 2 : 
               dadosLinha.recurrence_type === 'triweekly' ? 3 : 4);
          }
          
          if (dadosLinha.selected_weekday) {
            dadosFinais.selected_weekday = parseInt(dadosLinha.selected_weekday);
          }
          
          if (dadosLinha.monthly_ordinal) {
            dadosFinais.monthly_ordinal = parseInt(dadosLinha.monthly_ordinal);
          }
          
          if (dadosLinha.monthly_weekday) {
            dadosFinais.monthly_weekday = parseInt(dadosLinha.monthly_weekday);
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
      <div className="bg-white p-6 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
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
              <span className="ml-2 font-medium">Confirmação</span>
            </div>
          </div>
        </div>

        {/* Conteúdo por etapa */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Como funciona:</h3>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Baixe o template Excel completo com instruções</li>
                <li>Preencha com seus dados seguindo as instruções</li>
                <li>Faça upload do arquivo preenchido</li>
                <li>Confirme e importe os dados</li>
              </ol>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Importante:</h3>
              <ul className="list-disc list-inside space-y-1 text-yellow-700">
                <li>Mantenha o formato original das colunas</li>
                <li>Campos marcados com * são obrigatórios</li>
                <li>Para tipos avançados de recorrência, preencha os campos específicos</li>
                <li>Verifique se usuários têm acesso às listas selecionadas</li>
              </ul>
            </div>

            <button
              onClick={gerarPlanilhaExcel}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <FiDownload className="mr-2" />
                  Baixar Template Completo
                </>
              )}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                id="excel-file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
              
              <label htmlFor="excel-file" className="cursor-pointer">
                {file ? (
                  <div className="text-green-600">
                    <FiCheck className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-gray-500">Clique para selecionar outro arquivo</p>
                  </div>
                ) : (
                  <div className="text-gray-400">
                    <FiUpload className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-medium">Clique para selecionar o arquivo Excel</p>
                    <p className="text-sm">Formatos suportados: .xlsx, .xls</p>
                  </div>
                )}
              </label>
            </div>

            {errosValidacao.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">Erros encontrados:</h4>
                <div className="max-h-32 overflow-y-auto">
                  {errosValidacao.map((erro, index) => (
                    <p key={index} className="text-red-700 text-sm mb-1">
                      {erro}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg"
              >
                Voltar
              </button>
              <button
                onClick={processarArquivoExcel}
                disabled={!file || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Processar Arquivo'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiCheck className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">
                  {dadosParaImportar.length} {type === 'tarefas' ? 'tarefas' : 'rotinas'} prontas para importar
                </span>
              </div>
            </div>

            {/* Visualização dos dados */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 font-medium">
                Dados para importação ({dadosParaImportar.length} registros)
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-3 py-2 text-left">Descrição</th>
                      <th className="px-3 py-2 text-left">Lista</th>
                      <th className="px-3 py-2 text-left">Responsável</th>
                      {type === 'rotinas' && (
                        <th className="px-3 py-2 text-left">Recorrência</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosParaImportar.slice(0, 10).map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">{item.content}</td>
                        <td className="px-3 py-2">{listas[item.task_list_id]?.nome}</td>
                        <td className="px-3 py-2">{usuarios[item.usuario_id]}</td>
                        {type === 'rotinas' && (
                          <td className="px-3 py-2">
                            {recurrenceTypes.find(rt => rt.value === item.recurrence_type)?.label}
                            {item.recurrence_interval > 1 && ` (a cada ${item.recurrence_interval})`}
                          </td>
                        )}
                      </tr>
                    ))}
                    {dadosParaImportar.length > 10 && (
                      <tr>
                        <td colSpan={type === 'tarefas' ? 3 : 4} className="px-3 py-2 text-center text-gray-500">
                          ... e mais {dadosParaImportar.length - 10} registros
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg"
              >
                Voltar
              </button>
              <button
                onClick={executarImportacao}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50"
              >
                {loading ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        )}

        {/* Seção de opções avançadas */}
        {type === 'rotinas' && step === 1 && (
          <div className="mt-6 border-t pt-4">
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              <FiCpu className="mr-2" />
              Tipos de Recorrência Avançados
              {showAdvancedOptions ? (
                <FiChevronUp className="ml-2" />
              ) : (
                <FiChevronDown className="ml-2" />
              )}
            </button>

            {showAdvancedOptions && (
              <div className="mt-3 bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-3">Tipos de Recorrência Suportados:</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-blue-800 mb-2">Tipos Básicos:</h5>
                    <ul className="space-y-1 text-sm">
                      {tiposRecorrenciaBasicos.map(tipo => (
                        <li key={tipo.value} className="flex items-center">
                          <FiCheck className="h-3 w-3 text-green-600 mr-2" />
                          <span className="font-medium">{tipo.label}:</span>
                          <span className="ml-1 text-gray-600">{tipo.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-purple-800 mb-2">Tipos Avançados:</h5>
                    <ul className="space-y-1 text-sm">
                      {tiposRecorrenciaAvancados.map(tipo => (
                        <li key={tipo.value} className="flex items-center">
                          <FiCpu className="h-3 w-3 text-purple-600 mr-2" />
                          <span className="font-medium">{tipo.label}:</span>
                          <span className="ml-1 text-gray-600">{tipo.value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-white rounded border">
                  <h6 className="font-medium text-orange-800 mb-2">Exemplos de uso:</h6>
                  <div className="text-xs space-y-2">
                    <p><strong>biweekly:</strong> A cada 2 semanas nas quartas-feiras</p>
                    <p><strong>monthly_weekday:</strong> Primeira segunda-feira de cada mês</p>
                    <p><strong>quadweekly:</strong> A cada 4 semanas nas sextas-feiras</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExcelImporter;