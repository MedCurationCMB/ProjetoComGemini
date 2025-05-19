import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiDownload, FiEye, FiType, FiEdit, FiSave, FiCpu, FiX } from 'react-icons/fi';
import GeminiAnalysisDialog from './GeminiAnalysisDialog';
import EditorConteudoModal from './EditorConteudoModal';

const ConteudoTable = () => {
  const [conteudos, setConteudos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [loading, setLoading] = useState(true);
  const [textoVisualizando, setTextoVisualizando] = useState(null);
  const [tipoTextoVisualizando, setTipoTextoVisualizando] = useState('conteudo'); // 'conteudo' ou 'retorno_ia'
  const [tituloVisualizando, setTituloVisualizando] = useState('');
  const [documentoParaAnaliseIA, setDocumentoParaAnaliseIA] = useState(null);
  const [documentoVinculacoes, setDocumentoVinculacoes] = useState({});
  
  // Estado para o novo modal de edição unificado
  const [editorModalAberto, setEditorModalAberto] = useState(false);
  const [editorTipo, setEditorTipo] = useState('conteudo'); // 'conteudo' ou 'retorno_ia'
  const [documentoEditando, setDocumentoEditando] = useState(null);

  useEffect(() => {
    fetchCategorias();
    fetchProjetos();
    fetchConteudos();
  }, []);

  // Buscar todas as categorias
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*');
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por ID
      const categoriasObj = {};
      data.forEach(cat => {
        categoriasObj[cat.id] = cat.nome;
      });
      
      setCategorias(categoriasObj);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  // Buscar todos os projetos
  const fetchProjetos = async () => {
    try {
      const { data, error } = await supabase
        .from('projetos')
        .select('*');
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por ID
      const projetosObj = {};
      data.forEach(proj => {
        projetosObj[proj.id] = proj.nome;
      });
      
      setProjetos(projetosObj);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  // Função para buscar vinculações de todos os documentos
  const fetchDocumentoVinculacoes = async (documentIds) => {
    try {
      if (!documentIds || documentIds.length === 0) return {};
      
      // Buscar todas as vinculações para os documentos listados
      const { data, error } = await supabase
        .from('documento_controle_geral_rel')
        .select('documento_id, controle_id')
        .in('documento_id', documentIds);
      
      if (error) throw error;
      
      // Organizar as vinculações por documento_id
      const vinculacoes = {};
      data.forEach(item => {
        if (!vinculacoes[item.documento_id]) {
          vinculacoes[item.documento_id] = [];
        }
        vinculacoes[item.documento_id].push(item.controle_id);
      });
      
      return vinculacoes;
    } catch (error) {
      console.error('Erro ao buscar vinculações de documentos:', error);
      return {};
    }
  };

  const fetchConteudos = async () => {
    try {
      setLoading(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para ver os conteúdos');
        return;
      }
      
      // Buscar diretamente do Supabase
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const documentos = Array.isArray(data) ? data : [];
      setConteudos(documentos);
      
      // Buscar vinculações se houver documentos
      if (documentos.length > 0) {
        const documentIds = documentos.map(doc => doc.id);
        const vinculacoes = await fetchDocumentoVinculacoes(documentIds);
        setDocumentoVinculacoes(vinculacoes);
      }
    } catch (error) {
      toast.error('Erro ao carregar conteúdos');
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
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Método unificado para visualizar ou editar conteúdo
  const editarConteudo = (documento, tipo) => {
    if (tipo === 'conteudo' && (!documento.conteudo || documento.conteudo.trim() === '')) {
      // Abrir diretamente no modo de edição se não houver conteúdo
      setDocumentoEditando(documento);
      setEditorTipo('conteudo');
      setEditorModalAberto(true);
    } else if (tipo === 'retorno_ia' && (!documento.retorno_ia || documento.retorno_ia.trim() === '')) {
      // Mostrar mensagem de erro se não houver análise de IA
      toast.error('Não há análise de IA disponível para este documento');
    } else {
      // Abrir no modo de visualização para conteúdo existente
      setTextoVisualizando(tipo === 'conteudo' ? documento.conteudo : documento.retorno_ia);
      setTipoTextoVisualizando(tipo);
      setTituloVisualizando(tipo === 'conteudo' ? 'Texto Extraído' : 'Análise de IA');
    }
  };

  // Método para abrir o editor a partir da visualização
  const abrirEditor = () => {
    if (!textoVisualizando) return;
    
    // Encontrar o documento atual
    const documento = conteudos.find(doc => 
      (tipoTextoVisualizando === 'conteudo' && doc.conteudo === textoVisualizando) ||
      (tipoTextoVisualizando === 'retorno_ia' && doc.retorno_ia === textoVisualizando)
    );
    
    if (documento) {
      // Fechar o modal de visualização
      setTextoVisualizando(null);
      
      // Abrir o editor
      setDocumentoEditando(documento);
      setEditorTipo(tipoTextoVisualizando);
      setEditorModalAberto(true);
    }
  };

  // Método para atualizar a lista após salvar
  const handleSaveSuccess = (documentoAtualizado) => {
    // Atualizar a lista local
    setConteudos(conteudos.map(item => 
      item.id === documentoAtualizado.id 
        ? documentoAtualizado
        : item
    ));
  };

  // Visualizar todos os IDs vinculados
  const visualizarTodosVinculados = (documentoId) => {
    const vinculados = documentoVinculacoes[documentoId] || [];
    
    if (vinculados.length === 0) {
      toast.info('Não há conteúdos vinculados a este documento');
      return;
    }
    
    setTextoVisualizando(vinculados.join("\n"));
    setTipoTextoVisualizando('vinculacoes');
    setTituloVisualizando('IDs de Conteúdo Vinculados');
  };

  // Função para lidar com a conclusão da análise IA
  const handleAnalysisComplete = async (resultado) => {
    // Recarregar a lista para exibir o resultado atualizado
    await fetchConteudos();
  };

  // Nova função para obter URL temporária
  const getTemporaryUrl = async (documentId) => {
    try {
      // Obter o token de autenticação atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar autenticado');
        return null;
      }

      // Chamar o endpoint para gerar URL temporária
      const response = await fetch(`/api/get_download_url?id=${documentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar URL temporária');
      }

      const data = await response.json();
      return {
        url: data.url,
        filename: data.filename
      };
    } catch (error) {
      console.error('Erro ao obter URL temporária:', error);
      toast.error('Erro ao gerar link de acesso ao arquivo');
      return null;
    }
  };

  // Função modificada para abrir PDF
  const openPdf = async (documentId) => {
    try {
      // Mostrar loading
      toast.loading('Preparando arquivo para visualização...');
      
      // Obter URL temporária
      const result = await getTemporaryUrl(documentId);
      
      if (!result || !result.url) {
        toast.dismiss();
        toast.error('Não foi possível gerar o link de acesso');
        return;
      }
      
      // Remover toast de loading
      toast.dismiss();
      
      // Abrir em nova aba
      window.open(result.url, '_blank');
    } catch (error) {
      toast.dismiss();
      console.error('Erro ao abrir PDF:', error);
      toast.error('Erro ao processar o arquivo');
    }
  };

  // Função modificada para download do PDF
  const downloadPdf = async (documentId) => {
    try {
      // Mostrar loading
      toast.loading('Preparando arquivo para download...');
      
      // Obter URL temporária
      const result = await getTemporaryUrl(documentId);
      
      if (!result || !result.url) {
        toast.dismiss();
        toast.error('Não foi possível gerar o link de download');
        return;
      }
      
      // Obter o token de autenticação atual
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fazer a requisição para o arquivo
      const response = await fetch(result.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      if (!response.ok) {
        toast.dismiss();
        toast.error('Erro ao fazer download do arquivo');
        return;
      }
      
      // Processar o download
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = result.filename || 'download.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Remover toast de loading
      toast.dismiss();
      toast.success('Download iniciado');
    } catch (error) {
      toast.dismiss();
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao processar download do arquivo');
    }
  };

  // Função para formatar a exibição de IDs vinculados
  const formatVinculados = (documentoId) => {
    const vinculados = documentoVinculacoes[documentoId] || [];
    
    if (vinculados.length === 0) {
      return "-";
    } else if (vinculados.length <= 3) {
      return vinculados.join(", ");
    } else {
      return `${vinculados.slice(0, 3).join(", ")} +${vinculados.length - 3}`;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Modal para visualização de texto */}
      {textoVisualizando !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{tituloVisualizando}</h2>
              <div className="flex space-x-2">
                {tipoTextoVisualizando !== 'vinculacoes' && (
                  <button 
                    onClick={abrirEditor}
                    className="text-blue-500 hover:text-blue-700 bg-blue-100 p-2 rounded flex items-center"
                  >
                    <FiEdit className="mr-1" /> Editar
                  </button>
                )}
                <button 
                  onClick={() => setTextoVisualizando(null)}
                  className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
                >
                  Fechar
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap p-4 bg-gray-100 rounded text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
              {textoVisualizando || ''}
            </pre>
          </div>
        </div>
      )}

      {/* Modal unificado para edição de conteúdo */}
      {editorModalAberto && (
        <EditorConteudoModal
          documento={documentoEditando}
          tipo={editorTipo}
          onClose={() => {
            setEditorModalAberto(false);
            setDocumentoEditando(null);
          }}
          onSave={handleSaveSuccess}
        />
      )}

      {/* Modal para análise de IA */}
      {documentoParaAnaliseIA && (
        <GeminiAnalysisDialog 
          documentId={documentoParaAnaliseIA}
          onClose={() => setDocumentoParaAnaliseIA(null)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Arquivo
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              ID CONTEÚDO VINCULADO
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Categoria
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Projeto
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Descrição
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Data de Upload
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {Array.isArray(conteudos) && conteudos.length > 0 ? (
            conteudos.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiFile className="h-5 w-5 text-blue-500 mr-2" />
                    <div className="text-sm text-gray-900">
                      {item.nome_arquivo || 'Arquivo sem nome'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.tamanho_arquivo 
                      ? `${(item.tamanho_arquivo / 1024 / 1024).toFixed(2)} MB` 
                      : 'Tamanho desconhecido'}
                  </div>
                  {item.retorno_ia && (
                    <div className="mt-1 flex items-center">
                      <span className="text-xs inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                        <FiCpu className="mr-1 h-3 w-3" />
                        Análise IA disponível
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div 
                    className="cursor-pointer hover:text-blue-600"
                    onClick={() => visualizarTodosVinculados(item.id)}
                    title={documentoVinculacoes[item.id]?.length > 0 ? "Clique para ver todos os IDs vinculados" : "Sem vinculações"}
                  >
                    {formatVinculados(item.id)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {categorias[item.categoria_id] || 'Categoria indisponível'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {projetos[item.projeto_id] || 'Projeto indisponível'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {item.descricao || 'Sem descrição'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(item.data_upload || item.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-col space-y-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openPdf(item.id)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Visualizar PDF"
                      >
                        <FiEye className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => downloadPdf(item.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Baixar PDF"
                      >
                        <FiDownload className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => editarConteudo(item, 'conteudo')}
                        className="text-purple-600 hover:text-purple-900"
                        title={!item.conteudo || item.conteudo.trim() === '' 
                          ? "Adicionar Texto Extraído" 
                          : "Visualizar Texto Extraído"}
                      >
                        {!item.conteudo || item.conteudo.trim() === '' 
                          ? <FiEdit className="h-5 w-5" />
                          : <FiType className="h-5 w-5" />
                        }
                      </button>
                      
                      <button
                        onClick={() => setDocumentoParaAnaliseIA(item.id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Análise com IA"
                      >
                        <FiCpu className="h-5 w-5" />
                      </button>
                      
                      {item.retorno_ia && (
                        <button
                          onClick={() => editarConteudo(item, 'retorno_ia')}
                          className="text-amber-600 hover:text-amber-900"
                          title="Ver Análise da IA"
                        >
                          <FiEye className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                Nenhum conteúdo encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ConteudoTable;