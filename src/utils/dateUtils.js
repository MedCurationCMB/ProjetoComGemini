// src/utils/dateUtils.js
// Utilitários para manipulação correta de datas, evitando problemas de timezone

/**
 * Converte data do input HTML para formato compatível com PostgreSQL
 * Evita problemas de timezone mantendo a data local escolhida pelo usuário
 * @param {string|Date} dateValue - Valor da data do input ou objeto Date
 * @returns {string|null} - Data no formato YYYY-MM-DD ou null
 */
export const formatDateForSupabase = (dateValue) => {
  if (!dateValue) return null;
  
  // Se já é uma string no formato YYYY-MM-DD, mantém assim
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateValue;
  }
  
  // Se é um objeto Date, converte para YYYY-MM-DD local (não UTC)
  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return dateValue;
};

/**
 * Converte data do Supabase para input HTML type="date"
 * @param {string} dateString - String de data do banco de dados
 * @returns {string} - Data no formato YYYY-MM-DD para input
 */
export const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  
  // Se já está no formato correto, retorna como está
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Se é uma string de data/timestamp, converte para YYYY-MM-DD
  try {
    const date = new Date(dateString);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      console.error('Data inválida:', dateString);
      return '';
    }
    
    // Usar getFullYear, getMonth e getDate para evitar problemas de timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error('Erro ao formatar data para input:', e);
    return '';
  }
};

/**
 * Formata data para exibição no formato brasileiro (DD/MM/YYYY)
 * @param {string|Date} dateValue - Valor da data
 * @returns {string} - Data formatada em pt-BR ou mensagem de erro
 */
export const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return 'Data indisponível';
  
  try {
    // Se já está no formato YYYY-MM-DD, apenas converte para formato brasileiro
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateValue.split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Se é uma string de timestamp, processa normalmente
    const date = new Date(dateValue);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    console.error('Erro ao formatar data para exibição:', e);
    return 'Data inválida';
  }
};

/**
 * Converte data para timestamp Unix (para comparações)
 * @param {string|Date} dateValue - Valor da data
 * @returns {number} - Timestamp Unix ou 0 se inválido
 */
export const dateToTimestamp = (dateValue) => {
  if (!dateValue) return 0;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return 0;
    }
    return date.getTime();
  } catch (e) {
    console.error('Erro ao converter data para timestamp:', e);
    return 0;
  }
};

/**
 * Cria uma data local a partir de string YYYY-MM-DD
 * Evita problemas de timezone ao criar o objeto Date
 * @param {string} dateString - String no formato YYYY-MM-DD
 * @returns {Date|null} - Objeto Date local ou null se inválido
 */
export const createLocalDate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;
  
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  
  const [, year, month, day] = match;
  
  // Criar data local usando o construtor com parâmetros separados
  // Isso evita problemas de timezone
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
};

/**
 * Verifica se uma string é uma data válida
 * @param {string} dateString - String de data para verificar
 * @returns {boolean} - true se válida, false caso contrário
 */
export const isValidDate = (dateString) => {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch (e) {
    return false;
  }
};

/**
 * Compara duas datas
 * @param {string|Date} date1 - Primeira data
 * @param {string|Date} date2 - Segunda data
 * @returns {number} - -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
 */
export const compareDates = (date1, date2) => {
  const timestamp1 = dateToTimestamp(date1);
  const timestamp2 = dateToTimestamp(date2);
  
  if (timestamp1 < timestamp2) return -1;
  if (timestamp1 > timestamp2) return 1;
  return 0;
};

/**
 * Obtém a data atual no formato YYYY-MM-DD
 * @returns {string} - Data atual no formato para inputs
 */
export const getCurrentDateForInput = () => {
  const today = new Date();
  return formatDateForSupabase(today);
};

/**
 * Adiciona dias a uma data
 * @param {string|Date} dateValue - Data base
 * @param {number} days - Número de dias para adicionar (pode ser negativo)
 * @returns {string|null} - Nova data no formato YYYY-MM-DD ou null se inválido
 */
export const addDays = (dateValue, days) => {
  if (!dateValue || typeof days !== 'number') return null;
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    
    date.setDate(date.getDate() + days);
    return formatDateForSupabase(date);
  } catch (e) {
    console.error('Erro ao adicionar dias:', e);
    return null;
  }
};

/**
 * Calcula a diferença em dias entre duas datas
 * @param {string|Date} startDate - Data inicial
 * @param {string|Date} endDate - Data final
 * @returns {number} - Diferença em dias (pode ser negativo)
 */
export const daysDifference = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    
    const diffTime = end - start;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.error('Erro ao calcular diferença de dias:', e);
    return 0;
  }
};