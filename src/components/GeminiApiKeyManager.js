import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiKey, FiSave, FiTrash2, FiCheckCircle } from 'react-icons/fi';

const GeminiApiKeyManager = () => {
  const [loading, setLoading] = useState(true);
  const [chaves, setChaves] = useState([]);
  const [novaChave, setNovaChave] = useState('');
  const [salvandoChave, setSalvandoChave] = useState(false);

  useEffect(() => {
    carregarChaves();
  }, []);

  const carregarChaves = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('configuracoes_gemini')
        .select('*')
        .order('id', { ascending: false });
      
      if (error) throw error;
      
      setChaves(data || []);
    } catch (error) {
      console.error('Erro ao carregar chaves:', error);
      toast.error('Falha ao carregar chaves da API');
    } finally {
      setLoading(false);
    }
  };

  const salvarNovaChave = async () => {
    if (!novaChave.trim()) {
      toast.error('Por favor, insira uma chave API válida');
      return;
    }

    try {
      setSalvandoChave(true);
      
      // Inserir nova chave com vigência TRUE
      const { data, error } = await supabase
        .from('configuracoes_gemini')
        .insert([
          { chave: novaChave, vigente: true }
        ])
        .select();
      
      if (error) throw error;
      
      toast.success('Chave API da Gemini salva com sucesso!');
      setNovaChave('');
      await carregarChaves();
    } catch (error) {
      console.error('Erro ao salvar chave:', error);
      toast.error('Erro ao salvar a chave API');
    } finally {
      setSalvandoChave(false);
    }
  };

  const alterarVigencia = async (id) => {
    try {
      const { error } = await supabase
        .from('configuracoes_gemini')
        .update({ vigente: true })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Chave definida como vigente');
      await carregarChaves();
    } catch (error) {
      console.error('Erro ao alterar vigência:', error);
      toast.error('Erro ao alterar a vigência da chave');
    }
  };

  const excluirChave = async (id) => {
    try {
      const chaveParaExcluir = chaves.find(c => c.id === id);
      
      // Se a chave for vigente, mostrar alerta
      if (chaveParaExcluir.vigente) {
        if (!confirm('Esta é a chave vigente. Excluí-la pode interromper o funcionamento da IA. Deseja continuar?')) {
          return;
        }
      }
      
      const { error } = await supabase
        .from('configuracoes_gemini')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Chave excluída com sucesso');
      await carregarChaves();
    } catch (error) {
      console.error('Erro ao excluir chave:', error);
      toast.error('Erro ao excluir a chave');
    }
  };

  // Função para mascarar a chave API, exibindo apenas os primeiros e últimos 4 caracteres
  const mascaraChave = (chave) => {
    if (!chave || chave.length < 10) return chave;
    return `${chave.substring(0, 4)}...${chave.substring(chave.length - 4)}`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-6 flex items-center">
        <FiKey className="mr-2 text-blue-600" /> Configuração da Chave API da IA Gemini
      </h2>
      
      <div className="mb-6">
        <p className="text-gray-700 mb-4">
          A chave API do Google Gemini é necessária para usar os recursos de análise de IA no sistema.
          Você pode obter uma chave no <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>.
        </p>
        
        <div className="flex">
          <input
            type="password"
            value={novaChave}
            onChange={(e) => setNovaChave(e.target.value)}
            placeholder="Insira a chave API do Gemini"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={salvarNovaChave}
            disabled={salvandoChave || !novaChave.trim()}
            className={`flex items-center px-4 py-2 rounded-r-md ${
              salvandoChave || !novaChave.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {salvandoChave ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <FiSave className="mr-2" />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-3">Chaves Configuradas</h3>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : chaves.length === 0 ? (
          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
            <p className="text-yellow-700">
              Nenhuma chave API configurada. Adicione uma chave para habilitar as funcionalidades de IA.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chave API
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {chaves.map((chave) => (
                  <tr key={chave.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {mascaraChave(chave.chave)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {chave.vigente ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Vigente
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {!chave.vigente && (
                        <button
                          onClick={() => alterarVigencia(chave.id)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Tornar vigente"
                        >
                          <FiCheckCircle className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => excluirChave(chave.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir chave"
                      >
                        <FiTrash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiApiKeyManager;