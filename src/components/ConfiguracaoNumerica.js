// src/components/ConfiguracaoNumerica.js
import React, { useState } from 'react';
import { useLocale, LOCALE_OPTIONS } from '../contexts/LocaleContext';
import { toast } from 'react-hot-toast';
import { FiGlobe, FiSave, FiInfo } from 'react-icons/fi';

const ConfiguracaoNumerica = () => {
  const { currentLocale, updateLocale, loading, formatNumber, formatCurrency, formatDate } = useLocale();
  const [selectedLocale, setSelectedLocale] = useState(currentLocale);
  const [salvando, setSalvando] = useState(false);

  const handleSalvar = async () => {
    if (selectedLocale === currentLocale) {
      toast.info('Nenhuma alteração foi feita');
      return;
    }

    try {
      setSalvando(true);
      await updateLocale(selectedLocale);
      // O toast de sucesso já é exibido pelo updateLocale
    } catch (error) {
      // O toast de erro já é exibido pelo updateLocale
    } finally {
      setSalvando(false);
    }
  };

  const exemplos = {
    numero: 1234567.89,
    moeda: 1234.56,
    data: new Date('2025-06-25'),
    porcentagem: 15.75
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <FiGlobe className="mr-2 text-blue-600" /> 
        Configuração de Formato Numérico
      </h2>
      
      <div className="mb-6">
        <div className="bg-blue-50 p-4 rounded-md border border-blue-200 mb-4">
          <div className="flex items-start">
            <FiInfo className="mt-0.5 mr-2 text-blue-600 flex-shrink-0" />
            <p className="text-blue-700 text-sm">
              Esta configuração afetará a forma como números, moedas, datas e porcentagens 
              são exibidos em todo o sistema. A alteração será aplicada imediatamente após salvar.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Seleção de Formato */}
          <div>
            <h3 className="text-lg font-medium mb-4">Selecione o Formato</h3>
            
            <div className="space-y-3">
              {Object.entries(LOCALE_OPTIONS).map(([key, config]) => (
                <label key={key} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="locale"
                    value={key}
                    checked={selectedLocale === key}
                    onChange={(e) => setSelectedLocale(e.target.value)}
                    className="mr-3 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {config.label}
                    </div>
                    <div className="text-sm text-gray-500">
                      Separador decimal: "{config.decimalSeparator}" | 
                      Separador de milhares: "{config.thousandsSeparator}" | 
                      Moeda: {config.currencySymbol}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          {/* Preview dos Formatos */}
          <div>
            <h3 className="text-lg font-medium mb-4">Prévia do Formato Selecionado</h3>
            
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Número:</span>
                <span className="font-mono">
                  {new Intl.NumberFormat(LOCALE_OPTIONS[selectedLocale].locale).format(exemplos.numero)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Moeda:</span>
                <span className="font-mono">
                  {new Intl.NumberFormat(LOCALE_OPTIONS[selectedLocale].locale, {
                    style: 'currency',
                    currency: LOCALE_OPTIONS[selectedLocale].currency
                  }).format(exemplos.moeda)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Data:</span>
                <span className="font-mono">
                  {new Intl.DateTimeFormat(LOCALE_OPTIONS[selectedLocale].locale).format(exemplos.data)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Porcentagem:</span>
                <span className="font-mono">
                  {new Intl.NumberFormat(LOCALE_OPTIONS[selectedLocale].locale, {
                    style: 'percent',
                    minimumFractionDigits: 2
                  }).format(exemplos.porcentagem / 100)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Formato Atual */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Formato Atualmente Ativo</h3>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-green-800">
                {LOCALE_OPTIONS[currentLocale].label}
              </div>
              <div className="text-sm text-green-600">
                Exemplos: {formatNumber(exemplos.numero)} | {formatCurrency(exemplos.moeda)} | {formatDate(exemplos.data)}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Botão Salvar */}
      <div className="flex justify-end">
        <button
          onClick={handleSalvar}
          disabled={salvando || selectedLocale === currentLocale}
          className={`flex items-center px-6 py-2 rounded-md font-medium ${
            salvando || selectedLocale === currentLocale
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {salvando ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Salvando...
            </>
          ) : (
            <>
              <FiSave className="mr-2" />
              Salvar Configuração
            </>
          )}
        </button>
      </div>
      
      {/* Informações Adicionais */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-medium text-gray-900 mb-2">Onde esta configuração é aplicada:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Tabelas com valores numéricos</li>
          <li>• Relatórios e gráficos</li>
          <li>• Formulários de entrada de dados</li>
          <li>• Dashboards e métricas</li>
          <li>• Exportações (Excel, PDF, etc.)</li>
        </ul>
      </div>
    </div>
  );
};

export default ConfiguracaoNumerica;