// Componente: components/HelpModal.js
import { useState } from 'react';
import { 
  FiX, 
  FiTarget, 
  FiUpload, 
  FiRefreshCw, 
  FiEdit3,
  FiCheckCircle,
  FiClock,
  FiHelpCircle
} from 'react-icons/fi';
import { MdOutlineStickyNote2 } from "react-icons/md";

const HelpModal = ({ isOpen, onClose, type = 'atividades' }) => {
  if (!isOpen) return null;

  const renderAtividadesHelp = () => (
    <div className="space-y-6">
      {/* Seção de Edição Inline */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
          <FiTarget className="w-4 h-4" />
          💡 Como usar a edição inline COMPLETA:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Clique</strong> em qualquer célula editável para começar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Use <kbd className="px-2 py-1 bg-blue-200 rounded text-xs font-mono">Enter</kbd> para confirmar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Use <kbd className="px-2 py-1 bg-blue-200 rounded text-xs font-mono">Esc</kbd> para cancelar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Status:</strong> Clique no ícone ✅/⏳ para alternar rapidamente</span>
            </li>
          </ul>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Campos novos:</strong> Nota e Data agora editáveis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Clique fora</strong> do campo para confirmar automaticamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Modal aparece apenas se houver mudanças</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Responsável:</strong> Automaticamente filtrado por lista</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Seção de Importação Excel */}
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
          <FiUpload className="w-4 h-4" />
          📊 Importação em massa via Excel - RECURSOS COMPLETOS:
        </h4>
        <div className="text-sm text-green-800 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Template automático:</strong> Baixe template com exemplos e instruções detalhadas</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Todos os campos:</strong> Suporte completo a notas, datas e status</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Validação completa:</strong> Sistema verifica listas, usuários e permissões automaticamente</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Flexibilidade:</strong> Use nomes ou IDs para listas e usuários</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Processo guiado:</strong> 3 etapas simples - Download → Preenchimento → Upload</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Preview completo:</strong> Visualize todos os dados antes de confirmar</span>
          </div>
        </div>
      </div>

      {/* Seção de Campos e Funcionalidades */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
          <FiEdit3 className="w-4 h-4" />
          📝 Campos e Funcionalidades:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h5 className="font-medium mb-2 text-gray-900">Campos Principais:</h5>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <FiEdit3 className="w-3 h-3 text-blue-500" />
                <span><strong>Descrição:</strong> Conteúdo da atividade</span>
              </li>
              <li className="flex items-center gap-2">
                <FiTarget className="w-3 h-3 text-purple-500" />
                <span><strong>Lista/Projeto:</strong> Vinculação automática</span>
              </li>
              <li className="flex items-center gap-2">
                <FiCheckCircle className="w-3 h-3 text-green-500" />
                <span><strong>Status:</strong> Pendente ou Concluída</span>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2 text-gray-900">Campos Opcionais:</h5>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <FiClock className="w-3 h-3 text-orange-500" />
                <span><strong>Data Limite:</strong> Prazo da atividade</span>
              </li>
              <li className="flex items-center gap-2">
                <MdOutlineStickyNote2 className="w-3 h-3 text-yellow-500" />
                <span><strong>Nota:</strong> Informações adicionais</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecorrentesHelp = () => (
    <div className="space-y-6">
      {/* Seção de Edição Inline */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
          <FiRefreshCw className="w-4 h-4" />
          💡 Como usar a edição inline para Recorrentes:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Clique</strong> em qualquer célula editável para começar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Use <kbd className="px-2 py-1 bg-blue-200 rounded text-xs font-mono">Enter</kbd> para confirmar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Use <kbd className="px-2 py-1 bg-blue-200 rounded text-xs font-mono">Esc</kbd> para cancelar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Tipos avançados:</strong> Suporte completo a recorrências complexas</span>
            </li>
          </ul>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Campos novos:</strong> Nota e Persistência agora editáveis</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Configuração automática:</strong> Sistema adapta campos por tipo</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span><strong>Validação inteligente:</strong> Campos obrigatórios por contexto</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>Modal aparece apenas se houver mudanças</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Seção de Tipos de Recorrência */}
      <div className="p-4 bg-purple-50 rounded-lg">
        <h4 className="text-sm font-medium text-purple-900 mb-3 flex items-center gap-2">
          <FiRefreshCw className="w-4 h-4" />
          🔄 Tipos de Recorrência Suportados:
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
          <div>
            <h5 className="font-medium mb-2 text-purple-900">Básicos:</h5>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Diária:</strong> Todos os dias ou a cada X dias</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Semanal:</strong> Dias específicos da semana</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Mensal:</strong> Mesmo dia do mês</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Anual:</strong> Mesmo dia do ano</span>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2 text-purple-900">Avançados:</h5>
            <ul className="space-y-1">
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>A cada 2 semanas:</strong> Quinzenal em dia específico</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>A cada 3 semanas:</strong> Tri-semanal em dia específico</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>A cada 4 semanas:</strong> Quad-semanal em dia específico</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-600">•</span>
                <span><strong>Padrão mensal:</strong> Ex: primeira segunda do mês</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Seção de Importação Excel para Recorrentes */}
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
          <FiUpload className="w-4 h-4" />
          📊 Importação Excel para Recorrentes:
        </h4>
        <div className="text-sm text-green-800 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Recorrências avançadas:</strong> Biweekly, triweekly, quadweekly, monthly_weekday</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Configuração completa:</strong> Todos os campos de recorrência suportados</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Validação específica:</strong> Campos obrigatórios por tipo de recorrência</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-green-600">•</span>
            <span><strong>Template inteligente:</strong> Exemplos para cada tipo de recorrência</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FiHelpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Ajuda - {type === 'atividades' ? 'Atividades' : 'Atividades Recorrentes'}
              </h2>
              <p className="text-sm text-gray-600">
                {type === 'atividades' 
                  ? 'Guia completo para gerenciar suas atividades'
                  : 'Guia completo para configurar atividades recorrentes'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            title="Fechar ajuda"
          >
            <FiX className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {type === 'atividades' ? renderAtividadesHelp() : renderRecorrentesHelp()}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FiHelpCircle className="w-4 h-4" />
              <span>Precisa de mais ajuda? Entre em contato com o suporte.</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;