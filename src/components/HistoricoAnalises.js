import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiCpu, FiCalendar, FiEye, FiTrash2, FiCode, FiFolder } from 'react-icons/fi';

const HistoricoAnalises = ({ user }) => { // Adicionado user como prop
  const [analises, setAnalises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [prompts, setPrompts] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]); // Novo estado para projetos vinculados
  const [textoVisualizando, setTextoVisualizando] = useState(null);
  const [tipoTextoVisualizando, setTipoTextoVisualizando] = useState('retorno'); // 'retorno' ou 'documentos'
  const [tituloVisualizando, setTituloVisualizando] = useState('');

  // ID do prompt HTML que necessita visualização especial
  const PROMPT_HTML_ID = "21992115-d737-48bd-90fa-d9f824dd4ceb";

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) { // Permitir execução mesmo se não há projetos vinculados
      fetchPrompts();
      fetchAnalises();
    }
  }, [projetosVinculados]);

  // Nova função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', user.id);
      
      if (error) throw error;
      
      // Extrair apenas os IDs dos projetos
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      console.log('Projetos vinculados ao usuário:', projetoIds);
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      setProjetosVinculados([]);
    }
  };

  // Buscar todos os prompts
  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*');
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por ID (UUID)
      const promptsObj = {};
      data.forEach(prompt => {
        promptsObj[prompt.id] = prompt.nome_prompt;
      });
      
      setPrompts(promptsObj);
    } catch (error) {
      console.error('Erro ao carregar prompts:', error);
    }
  };

  // Buscar histórico de análises (filtrado por projetos vinculados)
  const fetchAnalises = async () => {
    try {
      setLoading(true);
      
      // Se o usuário não tem projetos vinculados, não mostrar nenhuma análise
      if (projetosVinculados.length === 0) {
        setAnalises([]);
        setLoading(false);
        return;
      }
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para ver o histórico de análises');
        return;
      }
      
      // Primeiro, buscar todas as análises do usuário
      const { data: todasAnalises, error: analiseError } = await supabase
        .from('analises')
        .select('*')
        .eq('usuario_id', session.user.id) // Filtrar apenas análises do usuário
        .order('data_analise', { ascending: false });
      
      if (analiseError) throw analiseError;
      
      if (!todasAnalises || todasAnalises.length === 0) {
        setAnalises([]);
        setLoading(false);
        return;
      }
      
      // Agora, filtrar apenas análises que contenham documentos dos projetos vinculados
      const analisesFiltradas = [];
      
      for (const analise of todasAnalises) {
        if (!analise.documentos_selecionados || analise.documentos_selecionados.length === 0) {
          continue; // Pular análises sem documentos
        }
        
        // Verificar se algum dos documentos da análise pertence aos projetos vinculados
        const { data: documentos, error: docError } = await supabase
          .from('base_dados_conteudo')
          .select('projeto_id')
          .in('id', analise.documentos_selecionados)
          .in('projeto_id', projetosVinculados);
        
        if (docError) {
          console.error('Erro ao verificar documentos da análise:', docError);
          continue;
        }
        
        // Se encontrou pelo menos um documento do projeto vinculado, incluir a análise
        if (documentos && documentos.length > 0) {
          analisesFiltradas.push(analise);
        }
      }
      
      setAnalises(analisesFiltradas);
    } catch (error) {
      toast.error('Erro ao carregar histórico de análises');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Formata a data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return 'Data indisponível';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Visualizar texto da análise (retorno da IA ou documentos combinados)
  const visualizarTexto = (item, tipo) => {
    if (tipo === 'retorno') {
      if (!item.retorno_ia || item.retorno_ia.trim() === '') {
        toast.error('Esta análise não possui retorno da IA');
        return;
      }
      
      setTextoVisualizando(item.retorno_ia);
      setTipoTextoVisualizando('retorno');
      setTituloVisualizando('Resultado da Análise');
    } else if (tipo === 'documentos') {
      if (!item.texto_documentos_selecionados || item.texto_documentos_selecionados.trim() === '') {
        toast.error('Esta análise não possui texto dos documentos');
        return;
      }
      
      setTextoVisualizando(item.texto_documentos_selecionados);
      setTipoTextoVisualizando('documentos');
      setTituloVisualizando('Texto dos Documentos Analisados');
    }
  };

  // Nova função para visualizar o HTML em uma nova aba
  const visualizarHTML = (htmlContent) => {
    if (!htmlContent || htmlContent.trim() === '') {
      toast.error('Não há conteúdo HTML para visualizar');
      return;
    }

    try {
      // Criar uma nova janela/aba
      const newWindow = window.open('', '_blank');
      
      if (!newWindow) {
        toast.error('Não foi possível abrir uma nova aba. Verifique se o bloqueador de pop-ups está desativado.');
        return;
      }
      
      // Escrever o conteúdo HTML na nova aba
      newWindow.document.write(htmlContent);
      newWindow.document.close();
      
      toast.success('HTML aberto em nova aba');
    } catch (error) {
      console.error('Erro ao visualizar HTML:', error);
      toast.error('Erro ao abrir conteúdo HTML');
    }
  };

  // Excluir análise
  const excluirAnalise = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta análise?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('analises')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Análise excluída com sucesso');
      
      // Atualizar lista
      setAnalises(analises.filter(a => a.id !== id));
    } catch (error) {
      console.error('Erro ao excluir análise:', error);
      toast.error('Erro ao excluir análise');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Se não há projetos vinculados, mostrar mensagem informativa
  if (projetosVinculados.length === 0) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FiFolder className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Modal para visualização de texto */}
      {textoVisualizando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{tituloVisualizando}</h2>
              <button 
                onClick={() => setTextoVisualizando(null)}
                className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
              >
                Fechar
              </button>
            </div>
            <pre className="whitespace-pre-wrap p-4 bg-gray-100 rounded text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
              {textoVisualizando}
            </pre>
          </div>
        </div>
      )}

      {analises.length === 0 ? (
        <div className="bg-gray-100 p-6 rounded-lg text-center">
          <p className="text-gray-600">
            Nenhuma análise encontrada. Realize uma análise múltipla de documentos para ver o histórico aqui.
            <br />
            <span className="text-sm text-gray-500 mt-2 block">
              Apenas análises de documentos dos projetos aos quais você está vinculado são exibidas.
            </span>
          </p>
        </div>
      ) : (
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Prompt Utilizado
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Documentos Analisados
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {analises.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiCalendar className="h-5 w-5 text-gray-500 mr-2" />
                    <div className="text-sm text-gray-900">
                      {formatDate(item.data_analise)}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiCpu className="h-5 w-5 text-purple-500 mr-2" />
                    <div className="text-sm text-gray-900">
                      {prompts[item.prompt_id] || 'Prompt não disponível'}
                    </div>
                    {item.prompt_id === PROMPT_HTML_ID && (
                      <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        HTML
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiFile className="h-5 w-5 text-blue-500 mr-2" />
                    <div className="text-sm text-gray-900">
                      {item.documentos_selecionados?.length || 0} documento(s)
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => visualizarTexto(item, 'retorno')}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Ver Resultado da Análise"
                      disabled={!item.retorno_ia}
                    >
                      <FiCpu className={`h-5 w-5 ${!item.retorno_ia ? 'opacity-50' : ''}`} />
                    </button>
                    
                    <button
                      onClick={() => visualizarTexto(item, 'documentos')}
                      className="text-blue-600 hover:text-blue-900"
                      title="Ver Textos dos Documentos"
                      disabled={!item.texto_documentos_selecionados}
                    >
                      <FiEye className={`h-5 w-5 ${!item.texto_documentos_selecionados ? 'opacity-50' : ''}`} />
                    </button>
                    
                    {/* Novo botão para visualizar HTML */}
                    {item.prompt_id === PROMPT_HTML_ID && item.retorno_ia && (
                      <button
                        onClick={() => visualizarHTML(item.retorno_ia)}
                        className="text-green-600 hover:text-green-900"
                        title="Visualizar HTML"
                      >
                        <FiCode className="h-5 w-5" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => excluirAnalise(item.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Excluir Análise"
                    >
                      <FiTrash2 className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default HistoricoAnalises;