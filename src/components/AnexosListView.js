import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  FiFile, 
  FiDownload, 
  FiEye, 
  FiType, 
  FiEdit, 
  FiCpu, 
  FiX, 
  FiFolder,
  FiTag,
  FiBriefcase,
  FiCalendar,
  FiInfo,
  FiUpload,
  FiPaperclip
} from 'react-icons/fi';
import GeminiAnalysisDialog from './GeminiAnalysisDialog';
import TipTapEditor from './TipTapEditor';
import VisualizarTextoAnalise from './VisualizarTextoAnalise';

// Componente do popup de detalhes do anexo
const DetalheAnexoPopup = ({ 
  item, 
  onClose, 
  categorias, 
  projetos,
  onEditClick,
  onAnalyzeClick,
  onViewTextClick,
  onViewAnalysisClick,
  onViewReturnClick,
  onDownloadClick,
  onOpenClick,
  documentoVinculacoes
}) => {
  if (!item) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Tamanho desconhecido';
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatVinculados = () => {
    const vinculados = documentoVinculacoes[item.id] || [];
    
    if (vinculados.length === 0) {
      return "Nenhuma vinculação";
    } else if (vinculados.length <= 3) {
      return vinculados.join(", ");
    } else {
      return `${vinculados.slice(0, 3).join(", ")} +${vinculados.length - 3}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Detalhes do Anexo</h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Informações do arquivo */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações do Arquivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome do Arquivo</label>
                <p className="mt-1 text-sm text-gray-900">{item.nome_arquivo || 'Arquivo sem nome'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Tamanho</label>
                <p className="mt-1 text-sm text-gray-900">{formatFileSize(item.tamanho_arquivo)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Projeto</label>
                <p className="mt-1 text-sm text-gray-900">{projetos[item.projeto_id] || 'Projeto indisponível'}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <p className="mt-1 text-sm text-gray-900">{categorias[item.categoria_id] || 'Categoria indisponível'}</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <p className="mt-1 text-sm text-gray-900">{item.descricao || 'Sem descrição'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Data de Upload</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <FiCalendar className="mr-2 text-gray-400" />
                  {formatDate(item.data_upload || item.created_at)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Conteúdos Vinculados</label>
                <p className="mt-1 text-sm text-gray-900">{formatVinculados()}</p>
              </div>
            </div>
          </div>

          {/* Status dos conteúdos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Conteúdos</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiType className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Texto Extraído</span>
                </div>
                {item.conteudo && item.conteudo.trim() !== '' ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Disponível
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Não extraído
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiCpu className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Análise de IA</span>
                </div>
                {item.retorno_ia && item.retorno_ia.trim() !== '' ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Disponível
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    Não analisado
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiEdit className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Texto Análise</span>
                </div>
                {item.texto_analise && item.texto_analise.trim() !== '' ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Disponível
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                    Sem análise
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer com ações */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={() => onOpenClick(item.id)}
              className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center text-sm"
            >
              <FiEye className="mr-1 h-4 w-4" />
              Abrir
            </button>
            
            <button
              onClick={() => onDownloadClick(item.id)}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center justify-center text-sm"
            >
              <FiDownload className="mr-1 h-4 w-4" />
              Baixar
            </button>
            
            <button
              onClick={() => onAnalyzeClick(item.id)}
              className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center justify-center text-sm"
            >
              <FiCpu className="mr-1 h-4 w-4" />
              Analisar IA
            </button>
            
            <button
              onClick={() => onEditClick(item)}
              className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center justify-center text-sm"
            >
              <FiEdit className="mr-1 h-4 w-4" />
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente principal da lista de anexos
const AnexosListView = ({ user, filtroProjetoId, filtroCategoriaId }) => {
  const [anexos, setAnexos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentoVinculacoes, setDocumentoVinculacoes] = useState({});
  
  // Estados para popups e modais
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [showDetalhePopup, setShowDetalhePopup] = useState(false);
  const [documentoParaAnaliseIA, setDocumentoParaAnaliseIA] = useState(null);
  
  // Estado para controlar as abas
  const [abaAtiva, setAbaAtiva] = useState('todos'); // 'todos' ou 'pendentes'

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) {
      fetchCategorias();
      fetchProjetos();
      fetchAnexos();
    }
  }, [projetosVinculados, filtroProjetoId, filtroCategoriaId]);

  // Função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', user.id);
      
      if (error) throw error;
      
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      setProjetosVinculados([]);
    }
  };

  // Buscar todas as categorias
  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*');
      
      if (error) throw error;
      
      const categoriasObj = {};
      data.forEach(cat => {
        categoriasObj[cat.id] = cat.nome;
      });
      
      setCategorias(categoriasObj);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  // Buscar apenas os projetos vinculados ao usuário
  const fetchProjetos = async () => {
    try {
      if (projetosVinculados.length === 0) {
        setProjetos({});
        return;
      }

      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .in('id', projetosVinculados);
      
      if (error) throw error;
      
      const projetosObj = {};
      data.forEach(proj => {
        projetosObj[proj.id] = proj.nome;
      });
      
      setProjetos(projetosObj);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  // Função para buscar vinculações de documentos
  const fetchDocumentoVinculacoes = async (documentIds) => {
    try {
      if (!documentIds || documentIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('documento_controle_geral_rel')
        .select('documento_id, controle_id')
        .in('documento_id', documentIds);
      
      if (error) throw error;
      
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

  // Buscar os dados de anexos
  const fetchAnexos = async () => {
    try {
      setLoading(true);
      
      if (projetosVinculados.length === 0) {
        setAnexos([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('base_dados_conteudo')
        .select('*')
        .in('projeto_id', projetosVinculados);
      
      // Aplicar filtros se estiverem definidos
      if (filtroProjetoId && filtroProjetoId.trim() !== '') {
        query = query.eq('projeto_id', filtroProjetoId);
      }
      
      if (filtroCategoriaId && filtroCategoriaId.trim() !== '') {
        query = query.eq('categoria_id', filtroCategoriaId);
      }
      
      // Ordenar por data de upload (mais recentes primeiro)
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const documentos = Array.isArray(data) ? data : [];
      setAnexos(documentos);
      
      // Buscar vinculações se houver documentos
      if (documentos.length > 0) {
        const documentIds = documentos.map(doc => doc.id);
        const vinculacoes = await fetchDocumentoVinculacoes(documentIds);
        setDocumentoVinculacoes(vinculacoes);
      }
      
    } catch (error) {
      toast.error('Erro ao carregar anexos');
      console.error('Erro ao carregar anexos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Formata a data para exibição
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

  // Função para determinar o status do anexo
  const getAnexoStatus = (item) => {
    const hasText = item.conteudo && item.conteudo.trim() !== '';
    const hasIA = item.retorno_ia && item.retorno_ia.trim() !== '';
    const hasAnalysis = item.texto_analise && item.texto_analise.trim() !== '';
    
    if (hasText && hasIA && hasAnalysis) {
      return { status: 'completo', color: 'bg-green-100 text-green-800', text: 'Completo' };
    } else if (hasText && hasIA) {
      return { status: 'parcial', color: 'bg-yellow-100 text-yellow-800', text: 'Parcial' };
    } else if (hasText) {
      return { status: 'inicial', color: 'bg-blue-100 text-blue-800', text: 'Texto extraído' };
    } else {
      return { status: 'pendente', color: 'bg-gray-100 text-gray-800', text: 'Pendente' };
    }
  };

  // Função para obter URL temporária
  const getTemporaryUrl = async (documentId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar autenticado');
        return null;
      }

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
      toast.loading('Preparando arquivo para visualização...');
      
      const result = await getTemporaryUrl(documentId);
      
      if (!result || !result.url) {
        toast.dismiss();
        toast.error('Não foi possível gerar o link de acesso');
        return;
      }
      
      toast.dismiss();
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
      toast.loading('Preparando arquivo para download...');
      
      const result = await getTemporaryUrl(documentId);
      
      if (!result || !result.url) {
        toast.dismiss();
        toast.error('Não foi possível gerar o link de download');
        return;
      }
      
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
      
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = result.filename || 'download.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.dismiss();
      toast.success('Download iniciado');
    } catch (error) {
      toast.dismiss();
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao processar download do arquivo');
    }
  };

  // Função para abrir o popup de detalhes
  const handleItemClick = (item) => {
    setItemSelecionado(item);
    setShowDetalhePopup(true);
  };

  // Função para fechar o popup de detalhes
  const handleCloseDetalhe = () => {
    setShowDetalhePopup(false);
    setItemSelecionado(null);
  };

  // Função para lidar com a conclusão da análise IA
  const handleAnalysisComplete = async (resultado) => {
    await fetchAnexos();
    setDocumentoParaAnaliseIA(null);
  };

  // Função para formatar vinculações
  const formatVinculados = (documentoId) => {
    const vinculados = documentoVinculacoes[documentoId] || [];
    
    if (vinculados.length === 0) {
      return "Nenhuma";
    } else if (vinculados.length <= 2) {
      return vinculados.join(", ");
    } else {
      return `${vinculados.slice(0, 2).join(", ")} +${vinculados.length - 2}`;
    }
  };

  // Funções para obter título e descrição das abas
  const getTituloAba = () => {
    switch (abaAtiva) {
      case 'pendentes':
        return 'Anexos - Pendentes';
      default:
        return 'Todos os Anexos';
    }
  };

  const getDescricaoAba = () => {
    switch (abaAtiva) {
      case 'pendentes':
        return 'Visualizando apenas anexos sem texto extraído';
      default:
        return 'Visualizando todos os anexos disponíveis';
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
    <div>
      {/* Sistema de Abas com design igual ao controle-indicador-geral */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="border-b border-gray-200">
          {/* MOBILE: Navegação por abas horizontal com scroll */}
          <div className="lg:hidden">
            <div className="overflow-x-auto">
              <nav className="-mb-px flex space-x-6 px-4" aria-label="Tabs">
                {/* Aba: Todos */}
                <button
                  onClick={() => setAbaAtiva('todos')}
                  className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                    abaAtiva === 'todos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Todos
                  {abaAtiva === 'todos' && (
                    <span className="ml-1 bg-blue-100 text-blue-600 px-1 py-0.5 rounded-full text-xs">
                      ✓
                    </span>
                  )}
                </button>

                {/* Aba: Pendentes */}
                <button
                  onClick={() => setAbaAtiva('pendentes')}
                  className={`whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm ${
                    abaAtiva === 'pendentes'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pendentes
                  {abaAtiva === 'pendentes' && (
                    <span className="ml-1 bg-red-100 text-red-600 px-1 py-0.5 rounded-full text-xs">
                      ✓
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* DESKTOP: Navegação por abas normal */}
          <div className="hidden lg:block">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {/* Aba: Todos */}
              <button
                onClick={() => setAbaAtiva('todos')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'todos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Todos os Anexos
                {abaAtiva === 'todos' && (
                  <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>

              {/* Aba: Pendentes */}
              <button
                onClick={() => setAbaAtiva('pendentes')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'pendentes'
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Pendentes
                {abaAtiva === 'pendentes' && (
                  <span className="ml-2 bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="p-4 lg:p-6">
          {/* MOBILE: Cabeçalho de aba compacto */}
          <div className="lg:hidden mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {getTituloAba()}
            </h2>
            <div className="flex items-center">
              {abaAtiva === 'todos' && (
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              )}
              {abaAtiva === 'pendentes' && (
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
              )}
              <span className="text-sm text-gray-600">
                {abaAtiva === 'todos' && 'Todos os anexos'}
                {abaAtiva === 'pendentes' && 'Sem texto extraído'}
              </span>
            </div>
          </div>

          {/* DESKTOP: Cabeçalho de aba completo */}
          <div className="hidden lg:block mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {getTituloAba()}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                {abaAtiva === 'todos' && (
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                )}
                {abaAtiva === 'pendentes' && (
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                )}
                <span className="text-sm text-gray-600">
                  {abaAtiva === 'todos' && 'Mostrando todos os anexos disponíveis'}
                  {abaAtiva === 'pendentes' && 'Filtrando apenas anexos sem texto extraído'}
                </span>
              </div>
            </div>
          </div>

          {/* Informações sobre a aba ativa */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">
              {(() => {
                // Filtrar anexos baseado na aba ativa
                const anexosFiltrados = abaAtiva === 'todos' 
                  ? anexos 
                  : anexos.filter(item => !item.conteudo || item.conteudo.trim() === '');

                return `${anexosFiltrados.length} ${anexosFiltrados.length === 1 ? 'anexo encontrado' : 'anexos encontrados'}`;
              })()}
            </p>
          </div>

          {/* Lista de anexos */}
          <div className="space-y-3">
            {(() => {
              // Filtrar anexos baseado na aba ativa
              const anexosFiltrados = abaAtiva === 'todos' 
                ? anexos 
                : anexos.filter(item => !item.conteudo || item.conteudo.trim() === '');

              return anexosFiltrados.length > 0 ? (
                anexosFiltrados.map((item) => {
                  const status = getAnexoStatus(item);
                  
                  return (
                    <div 
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        {/* Lado esquerdo - Informações principais */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiFile className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-medium text-gray-500">ID {item.id}</span>
                            {abaAtiva === 'pendentes' && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs font-medium text-orange-600 flex items-center">
                                  <FiUpload className="mr-1 h-3 w-3" />
                                  Pendente
                                </span>
                              </>
                            )}
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-1 truncate">
                            {item.nome_arquivo || 'Arquivo sem nome'}
                          </h4>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center">
                              <FiBriefcase className="mr-1 h-4 w-4" />
                              <span className="truncate">{projetos[item.projeto_id] || 'Projeto indisponível'}</span>
                            </div>
                            
                            <div className="flex items-center">
                              <FiTag className="mr-1 h-4 w-4" />
                              <span className="truncate">{categorias[item.categoria_id] || 'Categoria indisponível'}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center">
                              <FiCalendar className="mr-1 h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">
                                {formatDate(item.data_upload || item.created_at)}
                              </span>
                            </div>
                            
                            <div className="flex items-center">
                              <FiPaperclip className="mr-1 h-4 w-4 text-purple-500" />
                              <span className="text-xs text-purple-600 font-medium">
                                {formatVinculados(item.id)} vinculações
                              </span>
                            </div>
                          </div>
                          
                          {/* Indicadores de conteúdo */}
                          <div className="flex items-center space-x-2 mt-2">
                            {item.conteudo && item.conteudo.trim() !== '' && (
                              <span className="text-xs inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800">
                                <FiType className="mr-1 h-3 w-3" />
                                Texto extraído
                              </span>
                            )}
                            {item.retorno_ia && item.retorno_ia.trim() !== '' && (
                              <span className="text-xs inline-flex items-center px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                <FiCpu className="mr-1 h-3 w-3" />
                                Análise IA
                              </span>
                            )}
                            {item.texto_analise && item.texto_analise.trim() !== '' && (
                              <span className="text-xs inline-flex items-center px-2 py-0.5 rounded bg-teal-100 text-teal-800">
                                <FiEdit className="mr-1 h-3 w-3" />
                                Texto análise
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Lado direito - Status e tamanho */}
                        <div className="flex flex-col items-end space-y-2 ml-4">
                          {/* Status geral */}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                          
                          {/* Tamanho do arquivo */}
                          <span className="text-xs text-gray-500">
                            {item.tamanho_arquivo 
                              ? `${(item.tamanho_arquivo / 1024 / 1024).toFixed(2)} MB` 
                              : 'Tamanho desconhecido'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <FiFolder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {abaAtiva === 'todos' ? 'Nenhum anexo encontrado' : 'Nenhum anexo pendente'}
                  </h3>
                  <p className="text-gray-500">
                    {abaAtiva === 'todos' 
                      ? 'Não há anexos disponíveis para os filtros selecionados.'
                      : 'Todos os anexos possuem texto extraído.'
                    }
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Modais */}
      {showDetalhePopup && (
        <DetalheAnexoPopup
          item={itemSelecionado}
          onClose={handleCloseDetalhe}
          categorias={categorias}
          projetos={projetos}
          documentoVinculacoes={documentoVinculacoes}
          onEditClick={(item) => {
            // Implementar edição se necessário
            console.log('Editar:', item);
            setShowDetalhePopup(false);
          }}
          onAnalyzeClick={(itemId) => {
            setDocumentoParaAnaliseIA(itemId);
            setShowDetalhePopup(false);
          }}
          onViewTextClick={(item, tipo) => {
            // Implementar visualização de texto se necessário
            console.log('Ver texto:', item, tipo);
          }}
          onViewAnalysisClick={(item) => {
            // Implementar visualização de análise se necessário
            console.log('Ver análise:', item);
          }}
          onViewReturnClick={(item) => {
            // Implementar visualização de retorno IA se necessário
            console.log('Ver retorno IA:', item);
          }}
          onDownloadClick={(itemId) => {
            downloadPdf(itemId);
          }}
          onOpenClick={(itemId) => {
            openPdf(itemId);
          }}
        />
      )}

      {documentoParaAnaliseIA && (
        <GeminiAnalysisDialog 
          documentId={documentoParaAnaliseIA}
          onClose={() => setDocumentoParaAnaliseIA(null)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
    </div>
  );
};

export default AnexosListView;