// src/components/DeleteIndicadorDialog.js - Versão Atualizada SEM subcategoria
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiAlertTriangle, FiX, FiTrash2 } from 'react-icons/fi';

const DeleteIndicadorDialog = ({ 
  indicador, 
  onClose, 
  onSuccess,
  projetos,
  categorias
}) => {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      
      const { error: deleteControleError } = await supabase
        .from('controle_indicador')
        .delete()
        .eq('id', indicador.id);
      
      if (deleteControleError) throw deleteControleError;
      
      const linhasAfetadas = calcularLinhasAfetadas();
      
      toast.success(
        `Indicador excluído com sucesso! Aproximadamente ${linhasAfetadas} linhas relacionadas também foram removidas automaticamente.`
      );
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Erro ao excluir indicador:', error);
      toast.error(error.message || 'Erro ao excluir indicador');
    } finally {
      setDeleting(false);
    }
  };

  const calcularLinhasAfetadas = () => {
    let linhasBase;
    if (!indicador.repeticoes || indicador.repeticoes <= 0) {
      linhasBase = 1;
    } else {
      linhasBase = 1 + indicador.repeticoes;
    }
    return linhasBase * 2;
  };

  const linhasAfetadas = calcularLinhasAfetadas();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <FiAlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                Confirmar Exclusão
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={deleting}
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {/* Informações do indicador - REMOVIDO subcategoria */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">
            {indicador.indicador}
          </h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>
              <span className="font-medium">Projeto:</span>{' '}
              {projetos[indicador.projeto_id] || 'Não informado'}
            </p>
            <p>
              <span className="font-medium">Categoria:</span>{' '}
              {categorias[indicador.categoria_id] || 'Não informado'}
            </p>
            {indicador.observacao && (
              <p>
                <span className="font-medium">Observação:</span>{' '}
                {indicador.observacao}
              </p>
            )}
          </div>
        </div>
        
        {/* Aviso sobre o impacto da exclusão */}
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <FiAlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-800 mb-2">
                Atenção: Esta ação não pode ser desfeita!
              </h4>
              <p className="text-sm text-red-700 mb-2">
                Ao excluir este indicador, você também irá excluir automaticamente <strong>todas as linhas de indicador</strong> que estão relacionadas a esta linha base.
              </p>
              <p className="text-sm text-red-700">
                <strong>Estimativa de linhas afetadas:</strong> Aproximadamente {linhasAfetadas} linhas (baseado na configuração de recorrência).
              </p>
              <p className="text-sm text-red-600 mt-2 font-medium">
                O banco de dados automaticamente removerá todas as linhas relacionadas.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-700">
            Você tem certeza que deseja excluir este indicador e todas as suas linhas relacionadas?
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={`px-4 py-2 rounded-md flex items-center ${
              deleting
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {deleting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Excluindo...
              </>
            ) : (
              <>
                <FiTrash2 className="mr-2 h-4 w-4" />
                Sim, Excluir
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteIndicadorDialog;