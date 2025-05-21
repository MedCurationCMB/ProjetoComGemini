import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiSave } from 'react-icons/fi';
import TipTapEditor from './TipTapEditor';

const EditarTextoAnaliseDialog = ({ documento, onClose, onSuccess }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [atualizando, setAtualizando] = useState(false);
  
  useEffect(() => {
    // Se o documento já tem texto análise, carregá-lo
    if (documento && documento.texto_analise) {
      setHtmlContent(documento.texto_analise);
    }
  }, [documento]);

  const salvarTextoAnalise = async () => {
    if (!documento) return;

    try {
      setAtualizando(true);

      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setAtualizando(false);
        return;
      }

      // Atualizar o texto análise no Supabase
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ texto_analise: htmlContent })
        .eq('id', documento.id)
        .select();
      
      if (error) throw error;
      
      toast.success('Texto análise atualizado com sucesso!');
      
      // Fechar o modal de edição
      if (onSuccess) {
        onSuccess(htmlContent);
      }
      
    } catch (error) {
      console.error('Erro ao atualizar texto análise:', error);
      toast.error('Erro ao salvar o texto análise');
    } finally {
      setAtualizando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {!documento.texto_analise || documento.texto_analise.trim() === '' 
              ? "Adicionar Texto Análise" 
              : "Editar Texto Análise"}
          </h2>
          <button 
            onClick={onClose}
            className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
          >
            Fechar
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            <strong>Documento:</strong> {documento.nome_arquivo}
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Texto Análise:
          </label>
          
          <TipTapEditor 
            initialValue={htmlContent}
            onChange={setHtmlContent}
            onSave={salvarTextoAnalise}
          />
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={salvarTextoAnalise}
            disabled={atualizando}
            className={`flex items-center px-4 py-2 rounded ${
              atualizando
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {atualizando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                Salvar Análise
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditarTextoAnaliseDialog;