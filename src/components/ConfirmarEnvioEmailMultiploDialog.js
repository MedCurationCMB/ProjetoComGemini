// src/components/ConfirmarEnvioEmailMultiploDialog.js
import React, { useState } from 'react';
import { FiX, FiMail, FiCalendar, FiCheck, FiAlertTriangle, FiLoader, FiUsers, FiList } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const ConfirmarEnvioEmailMultiploDialog = ({ itensControle, onClose, onConfirm, categorias, projetos, user }) => {
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

  // Agrupar itens por projeto
  const itensAgrupados = itensControle.reduce((acc, item) => {
    const projetoId = item.projeto_id;
    const projetoNome = projetos[projetoId] || 'Projeto N/A';
    
    if (!acc[projetoId]) {
      acc[projetoId] = {
        nome: projetoNome,
        itens: []
      };
    }
    
    acc[projetoId].itens.push(item);
    return acc;
  }, {});

  // Contar projetos únicos
  const projetosUnicos = Object.keys(itensAgrupados);

  // Função para confirmar e enviar emails
  const handleConfirmarEnvio = async () => {
    try {
      setEnviando(true);

      console.log('📧 Iniciando envio de email em lote para', itensControle.length, 'itens');

      // Fazer chamada para a API de envio de email múltiplo
      const response = await fetch('/api/enviar-email-multiplo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          controleItemIds: itensControle.map(item => item.id),
          userId: user?.id || 'user-id-placeholder'
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro no envio dos emails');
      }

      console.log('✅ Emails enviados com sucesso:', result);
      
      // Mostrar mensagem de sucesso detalhada
      toast.success(
        `${result.message}`, 
        { 
          duration: 8000,
          style: {
            maxWidth: '500px',
          }
        }
      );
      
      // Se houve warnings, mostrar também
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          toast.warning(warning, { duration: 4000 });
        });
      }

      // Chamar callback de sucesso para atualizar a tabela
      if (onConfirm) {
        onConfirm();
      }

      // Fechar o dialog
      onClose();

    } catch (error) {
      console.error('❌ Erro ao enviar emails em lote:', error);
      toast.error(`Erro ao enviar emails: ${error.message}`, { duration: 7000 });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Confirmar Envio de Email em Lote</h2>
          <button 
            onClick={onClose}
            disabled={enviando}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {/* Resumo da seleção */}
        <div className="mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-3 flex items-center">
              <FiList className="mr-2" />
              Resumo da Seleção
            </h3>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700">
                  <strong>Total de itens:</strong> {itensControle.length}
                </p>
              </div>
              <div>
                <p className="text-blue-700">
                  <strong>Projetos envolvidos:</strong> {projetosUnicos.length}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Detalhes por projeto */}
        <div className="mb-6">
          <h3 className="font-medium text-gray-700 mb-3">Itens por Projeto:</h3>
          <div className="space-y-4 max-h-60 overflow-y-auto">
            {Object.entries(itensAgrupados).map(([projetoId, dadosProjeto]) => (
              <div key={projetoId} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-800 mb-2">
                  📁 {dadosProjeto.nome} ({dadosProjeto.itens.length} item{dadosProjeto.itens.length > 1 ? 'ns' : ''})
                </h4>
                
                <div className="space-y-1">
                  {dadosProjeto.itens.map((item, index) => (
                    <div key={item.id} className="text-sm text-gray-600 pl-4">
                      <span className="font-mono text-xs bg-gray-200 px-1 rounded">ID {item.id}</span>
                      {' - '}
                      <span>{item.descricao || 'Sem descrição'}</span>
                      {' '}
                      <span className="text-gray-500">
                        (Original: {item.id_original})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Informação sobre destinatários */}
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiUsers className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm">
              <p className="text-green-800 font-medium mb-1">Destinatários:</p>
              <p className="text-green-700">
                Será enviado <strong>um email para cada projeto</strong> contendo todos os links dos itens selecionados daquele projeto.
              </p>
              <p className="text-green-700 mt-1">
                Os emails serão enviados para <strong>todos os usuários</strong> vinculados a cada projeto.
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
                1. <strong>Enviar emails</strong> agrupados por projeto com os links dos conteúdos
              </p>
              <p className="text-yellow-700">
                2. Atualizar a <strong>data de email recente</strong> para <strong>{getDataHoje()}</strong> em todos os itens
              </p>
            </div>
          </div>
        </div>
        
        {/* Exemplo do email que será enviado */}
        <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">Exemplo do email que será enviado:</h4>
          <div className="bg-white border border-gray-300 rounded p-3 text-sm font-mono">
            <p className="mb-2"><strong>Assunto:</strong> [Nome do Projeto] Conteúdos Disponíveis</p>
            <p className="mb-2"><strong>Conteúdo:</strong></p>
            <div className="pl-4 text-gray-600">
              <p>Acesse aqui os conteúdos:</p>
              <p>https://projeto-com-gemini.vercel.app/documento/123</p>
              <p>https://projeto-com-gemini.vercel.app/documento/456</p>
              <p>https://projeto-com-gemini.vercel.app/documento/789</p>
            </div>
          </div>
        </div>
        
        {/* Pergunta de confirmação */}
        <div className="mb-6">
          <p className="text-gray-700 text-center font-medium">
            Deseja confirmar o envio dos emails em lote?
          </p>
        </div>
        
        {/* Loading state durante envio */}
        {enviando && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <FiLoader className="animate-spin mr-3 text-blue-600" />
              <span className="text-blue-800 font-medium">Enviando emails...</span>
            </div>
            <p className="text-blue-700 text-sm text-center mt-2">
              Processando {projetosUnicos.length} projeto(s). Por favor, aguarde.
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
                Confirmar Envio em Lote
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmarEnvioEmailMultiploDialog;