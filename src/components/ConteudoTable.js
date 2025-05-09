import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiDownload, FiEye, FiType, FiEdit, FiSave, FiBrain } from 'react-icons/fi';
import AIAnalysisModal from './AIAnalysisModal';

const ConteudoTable = () => {
  const [conteudos, setConteudos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({}); // Estado para armazenar projetos
  const [loading, setLoading] = useState(true);
  const [textoVisualizando, setTextoVisualizando] = useState(null);
  const [editandoConteudo, setEditandoConteudo] = useState(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [atualizandoTexto, setAtualizandoTexto] = useState(false);
  const [aiAnalysisModalOpen, setAiAnalysisModalOpen] = useState(false);
  const [selectedDocumentForAI, setSelectedDocumentForAI] = useState(null);

  useEffect(() => {
    fetchCategorias();
    fetchProjetos(); // Função para buscar projetos
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

  // Função para buscar todos os projetos
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
      
      setConteudos(Array.isArray(data) ? data : []);
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

  // Visualizar texto extraído
  const visualizarTexto = (item) => {
    if (!item.conteudo || item.conteudo.trim() === '') {
      // Se não houver texto, mostrar modal com mensagem e opção para extrair
      setEditandoConteudo(item);
      setTextoEditado('');
    } else {
      // Se houver texto, mostrar o texto normalmente
      setTextoVisualizando(item.conteudo);
    }
  };

  // Abrir modal de análise de IA
  const openAIAnalysisModal = (item) => {
    setSelectedDocumentForAI(item);
    setAiAnalysisModalOpen(true);
  };

  // Função para quando a análise é completada
  const handleAnalysisComplete = (response) => {
    // Atualizar a lista de documentos para refletir a nova análise
    fetchConteudos();
  };

  // Salvar o texto editado no Supabase
  const salvarTextoEditado = async () => {
    if (!editandoConteudo || !textoEditado.trim()) {
      toast.error('Por favor, insira o texto extraído antes de salvar');
      return;
    }

    try {
      setAtualizandoTexto(true);

      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setAtualizandoTexto(false);
        return;
      }

      // Atualizar o conteúdo no Supabase
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ conteudo: textoEditado })
        .eq('id', editandoConteudo.id)
        .select();
      
      if (error) throw error;
      
      // Atualizar a lista local
      setConteudos(conteudos.map(item => 
        item.id === editandoConteudo.id 
          ? { ...item, conteudo: textoEditado } 
          : item
      ));
      
      toast.success('Texto atualizado com sucesso!');
      
      // Fechar o modal de edição
      setEditandoConteudo(null);
      setTextoEditado('');
      
    } catch (error) {
      console.error('Erro ao atualizar texto:', error);
      toast.error('Erro ao salvar o texto');
    } finally {
      setAtualizandoTexto(false);
    }
  };

  // Função para obter URL temporária
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

  // Função para abrir PDF
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

  // Função para download do PDF
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
      {textoVisualizando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Texto Extraído</h2>
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

      {/* Modal para edição/adição de texto extraído */}
      {editandoConteudo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Adicionar Texto Extraído</h2>
              <button 
                onClick={() => {
                  setEditandoConteudo(null);
                  setTextoEditado('');
                }}
                className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
              >
                Fechar
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                <strong>Documento:</strong> {editandoConteudo.nome_arquivo}
              </p>
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                <p className="text-yellow-800 font-medium mb-2">Texto não disponível para extração</p>
                <p className="text-yellow-700">
                  Para extrair o texto deste documento, por favor, utilize esta ferramenta:
                </p>
                <a 
                  href="https://testedoctr.streamlit.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 p-2 bg-blue-600 hover:bg-blue-700 text-white text-center rounded"
                >
                  Acessar Ferramenta de Extração de Texto
                </a>
                <p className="mt-3 text-sm text-gray-600">
                  1. Na ferramenta, faça upload do documento PDF<br/>
                  2. Extraia o texto e copie-o<br/>
                  3. Cole o texto no campo abaixo e salve as alterações
                </p>
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="textoExtraido" className="block text-sm font-medium text-gray-700 mb-1">
                Cole o texto extraído aqui:
              </label>
              <textarea
                id="textoExtraido"
                value={textoEditado}
                onChange={(e) => setTextoEditado(e.target.value)}
                rows={10}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Cole aqui o texto extraído do documento..."
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={salvarTextoEditado}
                disabled={atualizandoTexto || !textoEditado.trim()}
                className={`flex items-center px-4 py-2 rounded ${
                  atualizandoTexto || !textoEditado.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {atualizandoTexto ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <FiSave className="mr-2" />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para análise de IA */}
      {aiAnalysisModalOpen && selectedDocumentForAI && (
        <AIAnalysisModal
          isOpen={aiAnalysisModalOpen}
          onClose={() => setAiAnalysisModalOpen(false)}
          documentId={selectedDocumentForAI.id}
          documentName={selectedDocumentForAI.nome_arquivo}
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
                      onClick={() => visualizarTexto(item)}
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
                    
                    {/* Botão para Análise de IA */}
                    {item.conteudo && item.conteudo.trim() !== '' && (
                      <button
                        onClick={() => openAIAnalysisModal(item)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title={item.retorno_IA ? "Ver Análise da IA" : "Solicitar Análise da IA"}
                      >
                        <FiBrain className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
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