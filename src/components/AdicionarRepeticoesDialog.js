// src/components/AdicionarRepeticoesDialog.js
import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiPlus, FiX, FiCalendar } from 'react-icons/fi';

const AdicionarRepeticoesDialog = ({ controleId, onClose, onSuccess, controleItem, categorias, projetos }) => {
  const [repeticoes, setRepeticoes] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Formatação de data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };
  
  // Função para adicionar as repetições
  const adicionarRepeticoes = async (e) => {
    e.preventDefault();
    
    if (repeticoes <= 0) {
      toast.error('O número de repetições deve ser maior que zero');
      return;
    }
    
    if (!controleItem) {
      toast.error('Informações do item de controle não disponíveis');
      return;
    }
    
    try {
      setLoading(true);
      
      // Obter a sessão atual do usuário
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setLoading(false);
        return;
      }
      
      // Obter o ID do controle original na tabela controle_conteudo
      const id_controleconteudo = controleItem.id_controleconteudo;
      
      if (!id_controleconteudo) {
        toast.error('Este item não está vinculado a um item de controle de conteúdo');
        setLoading(false);
        return;
      }
      
      // Chamar o endpoint para adicionar repetições
      const response = await fetch('/api/adicionar-repeticoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id_controleconteudo: id_controleconteudo,
          repeticoes: repeticoes
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao adicionar repetições');
      }
      
      const responseData = await response.json();
      
      toast.success(`${responseData.repetições_adicionadas} repetições adicionadas com sucesso!`);
      
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error) {
      console.error('Erro ao adicionar repetições:', error);
      toast.error(error.message || 'Falha ao adicionar repetições');
    } finally {
      setLoading(false);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Adicionar Repetições</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Detalhes do Item</h3>
            <p><strong>Projeto:</strong> {projetos[controleItem?.projeto_id] || 'N/A'}</p>
            <p><strong>Categoria:</strong> {categorias[controleItem?.categoria_id] || 'N/A'}</p>
            <p><strong>Descrição:</strong> {controleItem?.descricao || 'N/A'}</p>
            <p><strong>Prazo Original:</strong> {formatDate(controleItem?.prazo_entrega_inicial)}</p>
            <p><strong>Prazo Atual:</strong> {formatDate(controleItem?.prazo_entrega)}</p>
            <p><strong>Recorrência:</strong> {controleItem?.recorrencia} ({controleItem?.tempo_recorrencia})</p>
          </div>
        </div>
        
        <form onSubmit={adicionarRepeticoes} className="space-y-4">
          <div>
            <label htmlFor="repeticoes" className="block text-sm font-medium text-gray-700">
              Número de Repetições a Adicionar
            </label>
            <input
              type="number"
              id="repeticoes"
              value={repeticoes}
              onChange={(e) => setRepeticoes(parseInt(e.target.value) || 0)}
              min="1"
              max="100"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Adicione entre 1 e 100 repetições.
            </p>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancelar
            </button>
            
            <button
              type="submit"
              disabled={loading || repeticoes <= 0}
              className={`px-4 py-2 rounded ${
                loading || repeticoes <= 0
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {loading ? 'Processando...' : 'Adicionar Repetições'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdicionarRepeticoesDialog;