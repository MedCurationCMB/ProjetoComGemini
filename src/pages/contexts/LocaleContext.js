// src/contexts/LocaleContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';

// Criar o Context
const LocaleContext = createContext();

// Hook personalizado para usar o Context
export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale deve ser usado dentro de um LocaleProvider');
  }
  return context;
};

// Configurações de locale disponíveis
export const LOCALE_OPTIONS = {
  'pt-BR': {
    label: 'Brasil (pt-BR)',
    locale: 'pt-BR',
    currency: 'BRL',
    currencySymbol: 'R$',
    decimalSeparator: ',',
    thousandsSeparator: '.',
    dateFormat: 'DD/MM/YYYY'
  },
  'en-US': {
    label: 'Estados Unidos (en-US)',
    locale: 'en-US',
    currency: 'USD',
    currencySymbol: '$',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    dateFormat: 'MM/DD/YYYY'
  }
};

// Provider do Context
export const LocaleProvider = ({ children }) => {
  const [currentLocale, setCurrentLocale] = useState('pt-BR'); // Padrão pt-BR
  const [loading, setLoading] = useState(true);

  // Carregar configuração do banco ao inicializar
  useEffect(() => {
    loadLocaleConfig();
  }, []);

  const loadLocaleConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('configuracoes_locale')
        .select('valor')
        .eq('chave', 'locale_formato')
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = não encontrado
        throw error;
      }
      
      if (data && data.valor && LOCALE_OPTIONS[data.valor]) {
        setCurrentLocale(data.valor);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de locale:', error);
      // Manter o padrão pt-BR em caso de erro
    } finally {
      setLoading(false);
    }
  };

  const updateLocale = async (newLocale) => {
    if (!LOCALE_OPTIONS[newLocale]) {
      throw new Error('Locale inválido');
    }

    try {
      // Verificar se a configuração já existe
      const { data: existingConfig, error: selectError } = await supabase
        .from('configuracoes_locale')
        .select('id')
        .eq('chave', 'locale_formato')
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existingConfig) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('configuracoes_locale')
          .update({ valor: newLocale })
          .eq('chave', 'locale_formato');
        
        if (error) throw error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('configuracoes_locale')
          .insert([{
            chave: 'locale_formato',
            valor: newLocale,
            descricao: 'Configuração de formato de números e datas do sistema'
          }]);
        
        if (error) throw error;
      }

      setCurrentLocale(newLocale);
      toast.success('Configuração de formato atualizada com sucesso!');
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configuração de locale:', error);
      toast.error('Erro ao salvar configuração de formato');
      throw error;
    }
  };

  // Funções de formatação baseadas no locale atual
  const formatNumber = (number, options = {}) => {
    if (number === null || number === undefined || isNaN(number)) {
      return '-';
    }

    const localeConfig = LOCALE_OPTIONS[currentLocale];
    
    return new Intl.NumberFormat(localeConfig.locale, {
      minimumFractionDigits: options.minimumFractionDigits || 0,
      maximumFractionDigits: options.maximumFractionDigits || 2,
      ...options
    }).format(number);
  };

  const formatCurrency = (amount, options = {}) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '-';
    }

    const localeConfig = LOCALE_OPTIONS[currentLocale];
    
    return new Intl.NumberFormat(localeConfig.locale, {
      style: 'currency',
      currency: localeConfig.currency,
      minimumFractionDigits: options.minimumFractionDigits || 2,
      maximumFractionDigits: options.maximumFractionDigits || 2,
      ...options
    }).format(amount);
  };

  const formatDate = (date, options = {}) => {
    if (!date) return '-';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '-';

    const localeConfig = LOCALE_OPTIONS[currentLocale];
    
    return new Intl.DateTimeFormat(localeConfig.locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      ...options
    }).format(dateObj);
  };

  const formatDateTime = (date, options = {}) => {
    if (!date) return '-';
    
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return '-';

    const localeConfig = LOCALE_OPTIONS[currentLocale];
    
    return new Intl.DateTimeFormat(localeConfig.locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    }).format(dateObj);
  };

  const formatPercentage = (value, options = {}) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '-';
    }

    const localeConfig = LOCALE_OPTIONS[currentLocale];
    
    return new Intl.NumberFormat(localeConfig.locale, {
      style: 'percent',
      minimumFractionDigits: options.minimumFractionDigits || 1,
      maximumFractionDigits: options.maximumFractionDigits || 2,
      ...options
    }).format(value / 100); // Dividir por 100 porque Intl espera um decimal (0.1 = 10%)
  };

  const getCurrentLocaleConfig = () => {
    return LOCALE_OPTIONS[currentLocale];
  };

  const value = {
    currentLocale,
    loading,
    updateLocale,
    formatNumber,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatPercentage,
    getCurrentLocaleConfig,
    availableLocales: LOCALE_OPTIONS
  };

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
};