// src/components/ConfirmarEnvioEmailDialog.js
import React, { useState } from 'react';
import { FiX, FiMail, FiCalendar, FiCheck, FiAlertTriangle, FiLoader, FiUsers } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const ConfirmarEnvioEmailDialog = ({ controleItem, onClose, onConfirm, categorias, projetos, user }) => {
  const [enviando, setEnviando] = useState(false);
  
  // Formata a data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const dateWithTime = dateString.includes('T') ? dateString : dateString + 'T00:00:00';
      const date = new Date(dateWithTime);
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Obter data de hoje formatada
  const getDataHoje = () => {
    const hoje = new Date();
    return hoje.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Função para confirmar e enviar email
  const handleConfirmarEnvio = async () => {
    try {
      setEnviando(true);

      console.log('📧 Iniciando envio de email para item:', controleItem.id);

      // Fazer chamada para a API de envio de email
      const response = await fetch('/api/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          controleItemId: controleItem.id,
          userId: user?.id || 'user-id-placeholder'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro no envio do email');
      }

      console.log('✅ Email enviado com sucesso:', result);
      
      // Mostrar mensagem de sucesso detalhada
      if (result.emailsEnviados && result.emailsEnviados.length > 0) {
        toast.success(
          `${result.message}\nDestinatários: ${result.emailsEnviados.join(', ')}`, 
          { 
            duration: 8000,
            style: {
              maxWidth: '500px',
            }
          }
        );
      } else {
        toast.success(result.message, { duration: 5000 });
      }
      
      // Se houve warning, mostrar também
      if (result.warning) {
        toast.warning(result.warning, { duration: 3000 });
      }

      // Chamar callback de sucesso para atualizar a tabela
      if (onConfirm) {
        onConfirm();
      }

      // Fechar o dialog
      onClose();

    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      toast.error(`Erro ao enviar email: ${error.message}`, { duration: 7000 });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Confirmar Envio de Email</h2>
          <button 
            onClick={onClose}
            disabled={enviando}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {/* Detalhes do Item */}
        <div className="mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-700 mb-3 flex items-center">
              <FiMail className="mr-2 text-blue-500" />
              Detalhes do Item
            </h3>
            
            <div className="space-y-2 text-sm">
              <p><strong>ID:</strong> {controleItem?.id}</p>
              <p><strong>Projeto:</strong> {projetos[controleItem?.projeto_id] || 'N/A'}</p>
              <p><strong>Categoria:</strong> {categorias[controleItem?.categoria_id] || 'N/A'}</p>
              <p><strong>Descrição:</strong> {controleItem?.descricao || 'N/A'}</p>
              
              <div className="flex items-center">
                <FiCalendar className="mr-1 text-blue-500" />
                <span><strong>Prazo Atual:</strong> {formatDate(controleItem?.prazo_entrega)}</span>
              </div>
              
              <div className="flex items-center">
                <FiMail className="mr-1 text-gray-500" />
                <span><strong>Último Email:</strong> {formatDate(controleItem?.data_email_recente)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Informação sobre destinatários */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiUsers className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-blue-800 font-medium mb-1">Destinatários:</p>
              <p className="text-blue-700">
                O email será enviado para <strong>todos os usuários</strong> vinculados ao projeto <strong>{projetos[controleItem?.projeto_id] || 'N/A'}</strong>.
              </p>
            </div>
          </div>
        </div>
        
        {/* Aviso sobre a ação */}
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiAlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-yellow-800 font-medium mb-1">Ação a ser realizada:</p>
              <p className="text-yellow-700">
                1. <strong>Enviar email</strong> com lembrete de prazo para todos os usuários do projeto
              </p>
              <p className="text-yellow-700">
                2. Atualizar a <strong>data de email recente</strong> para <strong>{getDataHoje()}</strong>
              </p>
            </div>
          </div>
        </div>
        
        {/* Pergunta de confirmação */}
        <div className="mb-6">
          <p className="text-gray-700 text-center font-medium">
            Deseja confirmar o envio do email para este item?
          </p>
        </div>
        
        {/* Loading state durante envio */}
        {enviando && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <FiLoader className="animate-spin mr-3 text-blue-600" />
              <span className="text-blue-800 font-medium">Enviando email...</span>
            </div>
            <p className="text-blue-700 text-sm text-center mt-2">
              Por favor, aguarde. Não feche esta janela.
            </p>
          </div>
        )}
        
        {/* Botões de ação */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={enviando}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleConfirmarEnvio}
            disabled={enviando}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <>
                <FiLoader className="mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <FiCheck className="mr-2" />
                Confirmar Envio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEnvioEmailDialog;