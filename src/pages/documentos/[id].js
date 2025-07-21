// Arquivo: src/pages/documentos/[id].js - Com Popup dos Registros
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../../components/LogoDisplay';
import AnexarDocumentoDialog from '../../components/AnexarDocumentoDialog';
import EditarLinhaConteudoDialog from '../../components/EditarLinhaConteudoDialog';
import GeminiAnalysisDialog from '../../components/GeminiAnalysisDialog';
import TipTapEditor from '../../components/TipTapEditor';
import VisualizarTextoAnalise from '../../components/VisualizarTextoAnalise';
import { 
  FiArrowLeft,
  FiSearch, 
  FiFilter, 
  FiFolder,
  FiMenu, 
  FiHome, 
  FiStar, 
  FiClock, 
  FiGrid,
  FiEye, 
  FiEyeOff, 
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiCalendar,
  FiFileText,
  FiArchive,
  FiX,
  FiMaximize2,
  FiMinimize2,
  FiUpload,
  FiEdit,
  FiCheck,
  FiTag,
  FiBriefcase,
  FiRepeat,
  FiInfo,
  FiType,
  FiCpu,
  FiDownload,
  FiSave,
  FiFile,
  FiPlus
} from 'react-icons/fi';

// Componente do popup de detalhes (mesmo dos registros)
const DetalheConteudoPopup = ({ 
  item, 
  onClose, 
  categorias, 
  projetos, 
  onEditClick, 
  onAnexarClick,
  onToggleVisibilidade,
  atualizandoVisibilidade,
  documentoVinculado,
  onViewTextClick,
  onViewReturnClick,
  onViewAnalysisClick,
  onAnalyzeClick,
  onDownloadClick,
  onOpenClick
}) => {
  if (!item) return null;

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Detalhes do Conteúdo</h2>
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
          {/* Informações básicas */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="mt-1 text-sm text-gray-900">{item.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Base ID</label>
                <p className="mt-1 text-sm text-gray-900">{item.id_controleconteudo || '-'}</p>
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
                <p className="mt-1 text-sm text-gray-900">{item.descricao || '-'}</p>
              </div>
            </div>
          </div>

          {/* Datas e prazos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Prazos</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo Inicial</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <FiCalendar className="mr-2 text-gray-400" />
                  {formatDate(item.prazo_entrega_inicial)}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Prazo Atual</label>
                <div className="mt-1 flex items-center text-sm text-gray-900">
                  <FiClock className="mr-2 text-blue-500" />
                  {formatDate(item.prazo_entrega)}
                </div>
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiRepeat className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Recorrência</span>
                </div>
                <span className="text-sm text-gray-900">
                  {item.recorrencia ? (
                    <span>
                      {item.recorrencia}
                      {item.tempo_recorrencia ? ` (${item.tempo_recorrencia})` : ''}
                    </span>
                  ) : '-'}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiInfo className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Obrigatório</span>
                </div>
                {item.obrigatorio ? (
                  <span className="text-green-600 flex items-center text-sm">
                    <FiCheck className="mr-1" />
                    Sim
                  </span>
                ) : (
                  <span className="text-gray-500 flex items-center text-sm">
                    <FiX className="mr-1" />
                    Não
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <FiFile className="mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Status do Documento</span>
                </div>
                {item.tem_documento ? (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Documento Anexado
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Sem Documento
                  </span>
                )}
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  {item.visivel ? <FiEye className="mr-2 text-gray-500" /> : <FiEyeOff className="mr-2 text-gray-500" />}
                  <span className="text-sm font-medium text-gray-700">Visibilidade</span>
                </div>
                <div className="flex items-center">
                  {atualizandoVisibilidade ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                  ) : (
                    <input
                      type="checkbox"
                      checked={item.visivel || false}
                      onChange={() => onToggleVisibilidade(item.id, item.visivel)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer mr-2"
                    />
                  )}
                  <span className="text-sm text-gray-900">
                    {item.visivel ? 'Visível' : 'Oculto'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status dos Conteúdos */}
          {item.tem_documento && documentoVinculado && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status dos Conteúdos</h3>
              
              {/* Informações do documento */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 mb-2">Documento Vinculado</h4>
                <p className="text-sm text-blue-700">
                  <strong>Nome:</strong> {documentoVinculado.nome_arquivo || 'Nome não disponível'}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Descrição:</strong> {documentoVinculado.descricao || 'Sem descrição'}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Data Upload:</strong> {formatDate(documentoVinculado.data_upload || documentoVinculado.created_at)}
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FiType className="mr-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Texto Extraído</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {documentoVinculado.conteudo && documentoVinculado.conteudo.trim() !== '' ? (
                      <>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Disponível
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewTextClick(documentoVinculado, 'conteudo');
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Ver
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewTextClick(documentoVinculado, 'conteudo', true);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Editar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Não extraído
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewTextClick(documentoVinculado, 'conteudo', true);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Adicionar
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FiCpu className="mr-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Análise de IA</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {documentoVinculado.retorno_ia && documentoVinculado.retorno_ia.trim() !== '' ? (
                      <>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Disponível
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReturnClick(documentoVinculado);
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Ver
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReturnClick(documentoVinculado, true);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Editar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Não analisado
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzeClick(documentoVinculado.id);
                          }}
                          className="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
                        >
                          Analisar
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FiEdit className="mr-2 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Texto Análise</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {documentoVinculado.texto_analise && documentoVinculado.texto_analise.trim() !== '' ? (
                      <>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Disponível
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewAnalysisClick(documentoVinculado);
                          }}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Ver
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewAnalysisClick(documentoVinculado, true);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Editar
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Sem análise
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewAnalysisClick(documentoVinculado, true);
                          }}
                          className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          Adicionar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-end space-x-3">
            {/* Botões de ação para documentos */}
            {item.tem_documento && documentoVinculado && (
              <>
                <button
                  onClick={() => onOpenClick(documentoVinculado.id)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center text-sm"
                >
                  <FiEye className="mr-1 h-4 w-4" />
                  Abrir PDF
                </button>
                
                <button
                  onClick={() => onDownloadClick(documentoVinculado.id)}
                  className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center text-sm"
                >
                  <FiDownload className="mr-1 h-4 w-4" />
                  Baixar
                </button>
              </>
            )}
            
            <button
              onClick={() => onEditClick(item.id)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
            >
              <FiEdit className="mr-2 h-4 w-4" />
              Editar
            </button>
            
            {!item.tem_documento && (
              <button
                onClick={() => onAnexarClick(item.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <FiUpload className="mr-2 h-4 w-4" />
                Anexar Documento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function DocumentoDetalhes({ user }) {
  const router = useRouter();
  const { id } = router.query;
  
  const [documento, setDocumento] = useState(null);
  const [itensRelacionados, setItensRelacionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingItens, setLoadingItens] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [showMenu, setShowMenu] = useState(false);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  
  // Estados para filtros dos itens relacionados
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filtroLidos, setFiltroLidos] = useState('');
  const [filtroImportantes, setFiltroImportantes] = useState(false);
  const [filtroArquivados, setFiltroArquivados] = useState(false);
  const [filtroVisivel, setFiltroVisivel] = useState('todos');

  // Estados para o popup dos registros
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [showDetalhePopup, setShowDetalhePopup] = useState(false);
  const [documentoVinculado, setDocumentoVinculado] = useState(null);
  const [atualizandoVisibilidade, setAtualizandoVisibilidade] = useState({});
  const [anexarDocumentoId, setAnexarDocumentoId] = useState(null);
  const [editarItemId, setEditarItemId] = useState(null);
  
  // Estados para visualização e edição de textos
  const [textoVisualizando, setTextoVisualizando] = useState(null);
  const [tipoTextoVisualizando, setTipoTextoVisualizando] = useState('conteudo');
  const [tituloVisualizando, setTituloVisualizando] = useState('');
  const [editandoConteudo, setEditandoConteudo] = useState(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [atualizandoTexto, setAtualizandoTexto] = useState(false);
  const [editandoRetornoIA, setEditandoRetornoIA] = useState(null);
  const [retornoIAEditado, setRetornoIAEditado] = useState('');
  const [atualizandoRetornoIA, setAtualizandoRetornoIA] = useState(false);
  const [editandoTextoAnalise, setEditandoTextoAnalise] = useState(null);
  const [textoAnaliseHtml, setTextoAnaliseHtml] = useState('');
  const [atualizandoTextoAnalise, setAtualizandoTextoAnalise] = useState(false);
  const [visualizandoTextoAnaliseHtml, setVisualizandoTextoAnaliseHtml] = useState(null);
  const [documentoParaAnaliseIA, setDocumentoParaAnaliseIA] = useState(null);

  // Função para buscar dados de apresentação
  const fetchApresentacaoVariaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('apresentacao_variaveis')
        .select('*');
      
      if (error) throw error;
      
      const apresentacaoObj = {};
      data.forEach(item => {
        apresentacaoObj[item.nome_variavel] = item.nome_apresentacao;
      });
      
      setApresentacaoVariaveis(apresentacaoObj);
    } catch (error) {
      console.error('Erro ao carregar apresentação das variáveis:', error);
    }
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Função para fazer logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
      router.push('/login');
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer logout');
    }
  };

  // Função para buscar documento vinculado
  const fetchDocumentoVinculado = async (controleId) => {
    try {
      // Primeiro, buscar a relação documento-controle
      const { data: relacao, error: relacaoError } = await supabase
        .from('documento_controle_geral_rel')
        .select('documento_id')
        .eq('controle_id', controleId)
        .maybeSingle();
      
      if (relacaoError) throw relacaoError;
      
      if (relacao && relacao.documento_id) {
        // Buscar informações completas do documento
        const { data: documento, error: documentoError } = await supabase
          .from('base_dados_conteudo')
          .select('*')
          .eq('id', relacao.documento_id)
          .single();
          
        if (documentoError) throw documentoError;
        
        setDocumentoVinculado(documento);
      } else {
        setDocumentoVinculado(null);
      }
    } catch (error) {
      console.error('Erro ao buscar documento vinculado:', error);
      setDocumentoVinculado(null);
    }
  };

  // Função para alternar visibilidade
  const toggleVisibilidade = async (itemId, currentVisibility) => {
    try {
      setAtualizandoVisibilidade(prev => ({ ...prev, [itemId]: true }));
      
      const novaVisibilidade = !currentVisibility;
      
      // Atualizar no Supabase
      const { error } = await supabase
        .from('controle_conteudo_geral')
        .update({ visivel: novaVisibilidade })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Atualizar estado local
      setItensRelacionados(prevItens => 
        prevItens.map(item => 
          item.id === itemId 
            ? { ...item, visivel: novaVisibilidade }
            : item
        )
      );

      // Atualizar o item selecionado se for o mesmo
      if (itemSelecionado && itemSelecionado.id === itemId) {
        setItemSelecionado(prev => ({ ...prev, visivel: novaVisibilidade }));
      }
      
      toast.success(`Item ${novaVisibilidade ? 'tornado visível' : 'ocultado'} com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade do item');
    } finally {
      setAtualizandoVisibilidade(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Função para visualizar texto extraído ou resultado da IA
  const visualizarTexto = (item, tipo = 'conteudo', editar = false) => {
    if (tipo === 'conteudo') {
      if (editar || !item.conteudo || item.conteudo.trim() === '') {
        setEditandoConteudo(item);
        setTextoEditado(item.conteudo || '');
      } else {
        setTextoVisualizando(item.conteudo);
        setTipoTextoVisualizando('conteudo');
        setTituloVisualizando('Texto Extraído');
      }
    } else if (tipo === 'retorno_ia') {
      if (editar) {
        setEditandoRetornoIA(item);
        setRetornoIAEditado(item.retorno_ia || '');
      } else if (item.retorno_ia && item.retorno_ia.trim() !== '') {
        setTextoVisualizando(item.retorno_ia);
        setTipoTextoVisualizando('retorno_ia');
        setTituloVisualizando('Análise de IA');
      } else {
        toast.error('Não há análise de IA disponível para este documento');
      }
    }
  };

  // Função para visualizar/editar texto análise
  const visualizarTextoAnalise = (item, editar = false) => {
    if (editar) {
      setEditandoTextoAnalise(item);
      setTextoAnaliseHtml(item.texto_analise || '<p></p>');
    } else if (item.texto_analise && item.texto_analise.trim() !== '') {
      setVisualizandoTextoAnaliseHtml(item.texto_analise);
    } else {
      toast.error('Não há texto análise disponível para este documento');
    }
  };

  // Salvar o texto editado no Supabase
  const salvarTextoEditado = async () => {
    if (!editandoConteudo || !textoEditado.trim()) {
      toast.error('Por favor, insira o texto extraído antes de salvar');
      return;
    }

    try {
      setAtualizandoTexto(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setAtualizandoTexto(false);
        return;
      }

      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ conteudo: textoEditado })
        .eq('id', editandoConteudo.id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o documento vinculado local
      setDocumentoVinculado(prev => prev ? { ...prev, conteudo: textoEditado } : null);
      
      toast.success('Texto atualizado com sucesso!');
      setEditandoConteudo(null);
      setTextoEditado('');
      
    } catch (error) {
      console.error('Erro ao atualizar texto:', error);
      toast.error('Erro ao salvar o texto');
    } finally {
      setAtualizandoTexto(false);
    }
  };

  // Função para salvar o retorno da IA editado
  const salvarRetornoIAEditado = async () => {
    if (!editandoRetornoIA) return;

    try {
      setAtualizandoRetornoIA(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setAtualizandoRetornoIA(false);
        return;
      }

      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ retorno_ia: retornoIAEditado })
        .eq('id', editandoRetornoIA.id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o documento vinculado local
      setDocumentoVinculado(prev => prev ? { ...prev, retorno_ia: retornoIAEditado } : null);
      
      toast.success('Análise de IA atualizada com sucesso!');
      setEditandoRetornoIA(null);
      setRetornoIAEditado('');
      
    } catch (error) {
      console.error('Erro ao atualizar análise de IA:', error);
      toast.error('Erro ao salvar a análise de IA');
    } finally {
      setAtualizandoRetornoIA(false);
    }
  };

  // Função para salvar o texto análise como HTML
  const salvarTextoAnaliseEditado = async () => {
    if (!editandoTextoAnalise) return;

    try {
      setAtualizandoTextoAnalise(true);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setAtualizandoTextoAnalise(false);
        return;
      }

      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update({ texto_analise: textoAnaliseHtml })
        .eq('id', editandoTextoAnalise.id)
        .select();
      
      if (error) throw error;
      
      // Atualizar o documento vinculado local
      setDocumentoVinculado(prev => prev ? { ...prev, texto_analise: textoAnaliseHtml } : null);
      
      toast.success('Texto análise atualizado com sucesso!');
      setEditandoTextoAnalise(null);
      
    } catch (error) {
      console.error('Erro ao atualizar texto análise:', error);
      toast.error('Erro ao salvar o texto análise');
    } finally {
      setAtualizandoTextoAnalise(false);
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
  const handleItemClick = async (item) => {
    setItemSelecionado(item);
    setShowDetalhePopup(true);
    
    // Se o item tem documento, buscar as informações do documento
    if (item.tem_documento) {
      await fetchDocumentoVinculado(item.id);
    } else {
      setDocumentoVinculado(null);
    }
  };

  // Função para fechar o popup de detalhes
  const handleCloseDetalhe = () => {
    setShowDetalhePopup(false);
    setItemSelecionado(null);
    setDocumentoVinculado(null);
  };

  // Função para lidar com o sucesso da edição de linha
  const handleEditarSuccess = () => {
    setEditarItemId(null);
    setShowDetalhePopup(false);
    fetchItensRelacionados();
    toast.success('Item atualizado com sucesso!');
  };

  // Função para atualizar o status de um documento após upload ou vínculo
  const handleDocumentoAnexado = async (controleId, documentoId = null) => {
    try {
      // Atualizar localmente
      setItensRelacionados(prevItens => 
        prevItens.map(item => 
          item.id === controleId 
            ? { 
                ...item, 
                tem_documento: true
              } 
            : item
        )
      );

      // Atualizar o item selecionado se for o mesmo
      if (itemSelecionado && itemSelecionado.id === controleId) {
        setItemSelecionado(prev => ({ ...prev, tem_documento: true }));
        // Recarregar documento vinculado
        await fetchDocumentoVinculado(controleId);
      }
      
      toast.success('Documento anexado com sucesso!');
      setAnexarDocumentoId(null);
      setShowDetalhePopup(false);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do documento');
    }
  };

  // Função para lidar com a conclusão da análise IA
  const handleAnalysisComplete = async (resultado) => {
    // Recarregar documento vinculado para mostrar o novo resultado
    if (itemSelecionado && itemSelecionado.tem_documento) {
      await fetchDocumentoVinculado(itemSelecionado.id);
    }
    setDocumentoParaAnaliseIA(null);
  };

  // Função para fechar modal de texto
  const fecharModalTexto = () => {
    setTextoVisualizando(null);
  };

  // Buscar dados do documento principal
  useEffect(() => {
    const fetchDocumento = async () => {
      if (!id || !user) return;
      
      try {
        setLoading(true);
        
        const documentoId = String(id);
        console.log('Buscando documento ID:', documentoId, 'Tipo:', typeof documentoId);
        
        const { data: docData, error: docError } = await supabase
          .from('controle_conteudo')
          .select('*')
          .eq('id', documentoId)
          .single();
        
        if (docError) {
          console.error('Erro ao buscar documento:', docError);
          toast.error('Documento não encontrado');
          router.push('/documentos');
          return;
        }
        
        console.log('Documento encontrado:', docData);
        setDocumento(docData);
        
        const [categoriasResponse, projetosResponse] = await Promise.all([
          supabase.from('categorias').select('id, nome'),
          supabase.from('projetos').select('id, nome')
        ]);
        
        if (categoriasResponse.data) {
          const categoriasObj = {};
          categoriasResponse.data.forEach(cat => {
            categoriasObj[cat.id] = cat.nome;
          });
          setCategorias(categoriasObj);
        }
        
        if (projetosResponse.data) {
          const projetosObj = {};
          projetosResponse.data.forEach(proj => {
            projetosObj[proj.id] = proj.nome;
          });
          setProjetos(projetosObj);
        }
        
      } catch (error) {
        console.error('Erro ao carregar documento:', error);
        toast.error('Erro ao carregar documento');
      } finally {
        setLoading(false);
      }
    };

    fetchDocumento();
    fetchApresentacaoVariaveis();
  }, [id, user, router]);

  // Buscar itens relacionados
  const fetchItensRelacionados = async () => {
    if (!id || !user) return;
    
    try {
      setLoadingItens(true);
      
      const documentoId = String(id);
      console.log('Buscando itens relacionados para documento ID:', documentoId);
      
      let query = supabase
        .from('controle_conteudo_geral')
        .select('*')
        .eq('id_controleconteudo', documentoId);
      
      console.log('Query SQL gerada:', query);
      
      const { data: allData, error: debugError } = await query;
      
      if (debugError) {
        console.error('Erro na query básica:', debugError);
        toast.error('Erro ao carregar itens relacionados');
        return;
      }
      
      console.log('Todos os registros encontrados (sem filtros):', allData);
      console.log('Quantidade total:', allData?.length || 0);
      
      let filteredData = allData || [];
      
      // Aplicar filtros
      if (searchTerm.trim()) {
        filteredData = filteredData.filter(item => 
          (item.descricao && item.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (item.texto_analise && item.texto_analise.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      if (filtroLidos === 'lidos') {
        filteredData = filteredData.filter(item => item.lido === true);
      } else if (filtroLidos === 'nao_lidos') {
        filteredData = filteredData.filter(item => item.lido === false);
      }
      
      if (filtroImportantes) {
        filteredData = filteredData.filter(item => item.importante === true);
      }
      
      if (filtroArquivados) {
        filteredData = filteredData.filter(item => item.arquivado === true);
      }
      
      if (filtroVisivel === 'visiveis') {
        filteredData = filteredData.filter(item => item.visivel === true);
      } else if (filtroVisivel === 'ocultos') {
        filteredData = filteredData.filter(item => item.visivel === false);
      }
      
      console.log('Dados após filtros:', filteredData);
      console.log('Quantidade após filtros:', filteredData.length);
      
      filteredData.sort((a, b) => {
        const dateA = new Date(a.prazo_entrega || a.created_at || 0);
        const dateB = new Date(b.prazo_entrega || b.created_at || 0);
        return dateB - dateA;
      });
      
      setItensRelacionados(filteredData);
      
    } catch (error) {
      console.error('Erro ao carregar itens relacionados:', error);
      toast.error('Erro ao carregar itens relacionados');
    } finally {
      setLoadingItens(false);
    }
  };

  useEffect(() => {
    fetchItensRelacionados();
  }, [id, user, searchTerm, filtroLidos, filtroImportantes, filtroArquivados, filtroVisivel]);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFiltroLidos('');
    setFiltroImportantes(false);
    setFiltroArquivados(false);
    setFiltroVisivel('todos');
    setShowFilters(false);
  };

  // Verificar se há filtros ativos
  const hasActiveFilters = searchTerm.trim() || filtroLidos || filtroImportantes || filtroArquivados || filtroVisivel !== 'todos';

  // Função para determinar a cor da borda baseada no status de leitura
  const getBorderColor = (item) => {
    return item.lido ? 'border-gray-300' : 'border-blue-500';
  };

  // Obter indicadores de status do item
  const getStatusIndicators = (item) => {
    const indicators = [];
    
    if (!item.lido) {
      indicators.push(
        <div key="nao-lido" className="w-3 h-3 bg-blue-500 rounded-full" title="Não lido"></div>
      );
    }
    
    if (item.importante) {
      indicators.push(
        <FiStar key="importante" className="w-4 h-4 text-yellow-600" title="Importante" />
      );
    }
    
    if (item.arquivado) {
      indicators.push(
        <FiArchive key="arquivado" className="w-4 h-4 text-gray-600" title="Arquivado" />
      );
    }
    
    if (item.visivel === false) {
      indicators.push(
        <FiEyeOff key="oculto" className="w-4 h-4 text-gray-400" title="Oculto" />
      );
    }
    
    return indicators;
  };

  // Função para verificar se deve mostrar ícone de ler depois
  const shouldShowReadLaterIcon = (item) => {
    return item.ler_depois;
  };

  // Formatar data
  const formatDate = (item, isDocumentoPrincipal = false) => {
    let dateString;
    
    if (isDocumentoPrincipal) {
      dateString = item.prazo_entrega_inicial;
    } else {
      dateString = item.prazo_entrega || item.created_at;
    }
    
    if (!dateString) return isDocumentoPrincipal ? 'Sem prazo definido' : '';
    
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

  // Extrair prévia do texto
  const getTextPreview = (htmlContent, maxLength = 150) => {
    if (!htmlContent) return '';
    
    if (htmlContent === '<p></p>' || htmlContent.trim() === '') return '';
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      if (!textContent.trim()) return '';
      
      return textContent.length > maxLength 
        ? textContent.substring(0, maxLength) + '...'
        : textContent;
    } catch (e) {
      return htmlContent;
    }
  };

  // Obter texto da recorrência formatado
  const getRecorrenciaText = (documento) => {
    if (!documento.recorrencia || documento.recorrencia === 'sem recorrencia') {
      return 'Sem recorrência';
    }
    
    const tempo = documento.tempo_recorrencia || '';
    const repeticoes = documento.repeticoes ? ` (${documento.repeticoes}x)` : '';
    
    return `A cada ${tempo} ${documento.recorrencia}${repeticoes}`;
  };

  // Obter status do item
  const getItemStatus = (item) => {
    const status = [];
    
    if (!item.visivel) status.push('Oculto');
    if (item.lido) status.push('Lido');
    if (item.importante) status.push('Importante');
    if (item.ler_depois) status.push('Ler Depois');
    if (item.arquivado) status.push('Arquivado');
    
    return status.length > 0 ? status.join(', ') : 'Pendente';
  };

  // Fechar modal com ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showDetalhePopup) {
        handleCloseDetalhe();
      }
    };

    if (showDetalhePopup) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showDetalhePopup]);

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!documento) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Documento não encontrado</h2>
          <Link href="/documentos" className="text-blue-600 hover:text-blue-800">
            Voltar para documentos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>{documento.descricao || 'Documento'} - MedCura</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/documentos"
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <FiArrowLeft className="w-6 h-6 text-gray-600" />
              </Link>
              
              <LogoDisplay 
                className=""
                fallbackText="MedCuration"
                showFallback={true}
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <FiMenu className="w-6 h-6 text-gray-600" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                  <Link href="/med-curation-desktop" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                    <FiHome className="mr-3 h-4 w-4" />
                    Curadoria
                  </Link>
                  <Link href="/documentos" className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center">
                    <FiFileText className="mr-3 h-4 w-4" />
                    Documentos
                  </Link>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                  >
                    <FiUser className="mr-3 h-4 w-4" />
                    Perfil
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                  >
                    <FiSettings className="mr-3 h-4 w-4" />
                    Configurações
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600"
                  >
                    <FiLogOut className="mr-3 h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Informações do documento principal */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                {documento.descricao || 'Sem descrição'}
              </h1>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {documento.projeto_id && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                    {apresentacaoVariaveis.projeto || 'Projeto'}: {projetos[documento.projeto_id]}
                  </span>
                )}
                {documento.categoria_id && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    {apresentacaoVariaveis.categoria || 'Categoria'}: {categorias[documento.categoria_id]}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              {documento.obrigatorio && (
                <div className="flex items-center text-red-600">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-sm">Obrigatório</span>
                </div>
              )}
              {documento.tem_documento && (
                <div className="flex items-center text-green-600">
                  <FiFileText className="w-5 h-5 mr-1" />
                  <span className="text-sm">Com Anexo</span>
                </div>
              )}
              {documento.recorrencia && documento.recorrencia !== 'sem recorrencia' && (
                <div className="flex items-center text-blue-600">
                  <FiClock className="w-5 h-5 mr-1" />
                  <span className="text-sm">Recorrente</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">Prazo de Entrega</h4>
              <p className="text-gray-900">
                {formatDate(documento, true)}
              </p>
            </div>
            
            {documento.recorrencia && documento.recorrencia !== 'sem recorrencia' && (
              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-1">Recorrência</h4>
                <p className="text-gray-900">
                  {getRecorrenciaText(documento)}
                </p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-1">Status</h4>
              <div className="flex flex-wrap gap-2">
                {documento.obrigatorio && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                    Obrigatório
                  </span>
                )}
                {documento.tem_documento && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                    Tem Documento
                  </span>
                )}
                {!documento.obrigatorio && !documento.tem_documento && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                    Pendente
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-gray-500">
            <div className="flex items-center">
              <FiCalendar className="w-4 h-4 mr-1" />
              Criado em {formatDate(documento, true)}
            </div>
            
            <div className="text-right">
              <span className="font-medium">ID:</span> {documento.id}
            </div>
          </div>
        </div>

        {/* Seção de itens relacionados */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header dos itens relacionados */}
          <div className="p-6 border-b">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Itens Relacionados</h2>
                <p className="text-gray-600 text-sm mt-1">
                  {loadingItens ? 'Carregando...' : `${itensRelacionados.length} itens encontrados`}
                </p>
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`mt-4 lg:mt-0 px-4 py-2 rounded-lg transition-colors ${
                  showFilters || hasActiveFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FiFilter className="w-4 h-4 inline mr-2" />
                Filtros
              </button>
            </div>
            
            {/* Barra de busca */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Buscar nos itens relacionados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            {/* Filtros */}
            {showFilters && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-end space-y-3 sm:space-y-0 sm:space-x-3">
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Status de Leitura
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={filtroLidos}
                      onChange={(e) => setFiltroLidos(e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="lidos">Lidos</option>
                      <option value="nao_lidos">Não Lidos</option>
                    </select>
                  </div>
                  
                  <div className="w-full sm:flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Visibilidade
                    </label>
                    <select
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={filtroVisivel}
                      onChange={(e) => setFiltroVisivel(e.target.value)}
                    >
                      <option value="todos">Todos</option>
                      <option value="visiveis">Apenas Visíveis</option>
                      <option value="ocultos">Apenas Ocultos</option>
                    </select>
                  </div>
                  
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="w-full sm:w-auto px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    Filtros Avançados
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFiltroImportantes(!filtroImportantes)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroImportantes 
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiStar className="w-4 h-4 mr-1" />
                      Importantes
                    </button>
                    
                    <button
                      onClick={() => setFiltroArquivados(!filtroArquivados)}
                      className={`flex items-center px-3 py-2 rounded-lg text-sm transition-colors ${
                        filtroArquivados 
                          ? 'bg-green-100 text-green-800 border border-green-300' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <FiArchive className="w-4 h-4 mr-1" />
                      Arquivados
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Lista de itens relacionados com popup */}
          <div className="p-6">
            {loadingItens ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : itensRelacionados.length === 0 ? (
              <div className="py-8 text-center">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FiFileText className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum item relacionado</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {hasActiveFilters 
                    ? 'Não há itens que correspondam aos filtros selecionados.'
                    : 'Este documento ainda não possui itens relacionados na curadoria.'
                  }
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-600">
                  <p><strong>Debug Info:</strong></p>
                  <p>Documento ID: {id}</p>
                  <p>Filtros ativos: {hasActiveFilters ? 'Sim' : 'Não'}</p>
                  <p>Busca por: id_controleconteudo = {id}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {itensRelacionados.map((item) => (
                  <div key={item.id} className="block">
                    {/* Card clicável que abre o popup */}
                    <div 
                      onClick={() => handleItemClick(item)}
                      className={`border-l-4 ${getBorderColor(item)} p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">
                          {item.descricao || 'Sem descrição'}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIndicators(item)}
                          {shouldShowReadLaterIcon(item) && (
                            <FiClock className="w-4 h-4 text-blue-600" />
                          )}
                          <div className="text-gray-400 text-xs">
                            Clique para expandir
                          </div>
                        </div>
                      </div>
                      
                      {/* Preview do texto */}
                      {item.texto_analise && getTextPreview(item.texto_analise) && (
                        <p className="text-gray-600 text-sm mb-3 leading-relaxed">
                          {getTextPreview(item.texto_analise, 200)}
                        </p>
                      )}
                      
                      {(!item.texto_analise || !getTextPreview(item.texto_analise)) && (
                        <p className="text-gray-400 text-sm mb-3 italic">
                          Sem conteúdo de análise disponível
                        </p>
                      )}
                      
                      {/* Informações do item */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap space-x-2">
                          {item.projeto_id && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              {projetos[item.projeto_id] || `Projeto ${item.projeto_id}`}
                            </span>
                          )}
                          {item.categoria_id && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {categorias[item.categoria_id] || `Categoria ${item.categoria_id}`}
                            </span>
                          )}
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {getItemStatus(item)}
                          </span>
                        </div>
                        
                        <div className="flex items-center text-gray-500 text-xs">
                          <FiCalendar className="w-3 h-3 mr-1" />
                          {formatDate(item, false) || 'Sem data'}
                        </div>
                      </div>
                      
                      {/* Informações técnicas de debug */}
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-xs text-gray-400">
                          <span>ID: {item.id}</span>
                          <span>Visível: {item.visivel ? 'Sim' : 'Não'}</span>
                          <span>Controle: {item.id_controleconteudo}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Seção de informações de debug */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Informações de Debug</h4>
              <div className="grid grid-cols-2 gap-4 text-xs text-blue-700">
                <div>
                  <p><strong>Documento ID:</strong> {id}</p>
                  <p><strong>Total de itens:</strong> {itensRelacionados.length}</p>
                </div>
                <div>
                  <p><strong>Filtros ativos:</strong> {hasActiveFilters ? 'Sim' : 'Não'}</p>
                  <p><strong>Loading:</strong> {loadingItens ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              
              {hasActiveFilters && (
                <div className="mt-2 text-xs text-blue-600">
                  <p><strong>Filtros aplicados:</strong></p>
                  <ul className="list-disc list-inside ml-2">
                    {searchTerm && <li>Busca: "{searchTerm}"</li>}
                    {filtroLidos && <li>Leitura: {filtroLidos === 'lidos' ? 'Lidos' : 'Não lidos'}</li>}
                    {filtroImportantes && <li>Apenas importantes</li>}
                    {filtroArquivados && <li>Apenas arquivados</li>}
                    {filtroVisivel !== 'todos' && <li>Visibilidade: {filtroVisivel}</li>}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAIS E POPUPS */}

      {/* Popup de detalhes do controle (mesmo dos registros) */}
      {showDetalhePopup && (
        <DetalheConteudoPopup
          item={itemSelecionado}
          onClose={handleCloseDetalhe}
          categorias={categorias}
          projetos={projetos}
          documentoVinculado={documentoVinculado}
          onEditClick={(itemId) => {
            setEditarItemId(itemId);
            setShowDetalhePopup(false);
          }}
          onAnexarClick={(itemId) => {
            setAnexarDocumentoId(itemId);
            setShowDetalhePopup(false);
          }}
          onToggleVisibilidade={toggleVisibilidade}
          atualizandoVisibilidade={atualizandoVisibilidade[itemSelecionado?.id]}
          onViewTextClick={(documento, tipo, editar = false) => {
            setShowDetalhePopup(false);
            visualizarTexto(documento, tipo, editar);
          }}
          onViewReturnClick={(documento, editar = false) => {
            setShowDetalhePopup(false);
            visualizarTexto(documento, 'retorno_ia', editar);
          }}
          onViewAnalysisClick={(documento, editar = false) => {
            setShowDetalhePopup(false);
            visualizarTextoAnalise(documento, editar);
          }}
          onAnalyzeClick={(documentoId) => {
            setDocumentoParaAnaliseIA(documentoId);
            setShowDetalhePopup(false);
          }}
          onDownloadClick={(documentoId) => {
            downloadPdf(documentoId);
          }}
          onOpenClick={(documentoId) => {
            openPdf(documentoId);
          }}
        />
      )}

      {/* Modal para visualização de texto */}
      {textoVisualizando !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{tituloVisualizando}</h2>
              <button 
                onClick={fecharModalTexto}
                className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
              >
                Fechar
              </button>
            </div>
            <pre className="whitespace-pre-wrap p-4 bg-gray-100 rounded text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
              {textoVisualizando || ''}
            </pre>
          </div>
        </div>
      )}

      {/* Modal para edição/adição de texto extraído */}
      {editandoConteudo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {!editandoConteudo.conteudo || editandoConteudo.conteudo.trim() === '' 
                  ? "Adicionar Texto Extraído" 
                  : "Editar Texto Extraído"}
              </h2>
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
              {(!editandoConteudo.conteudo || editandoConteudo.conteudo.trim() === '') && (
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
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="textoExtraido" className="block text-sm font-medium text-gray-700 mb-1">
                {!editandoConteudo.conteudo || editandoConteudo.conteudo.trim() === '' 
                  ? "Cole o texto extraído aqui:" 
                  : "Texto extraído:"}
              </label>
              <textarea
                id="textoExtraido"
                value={textoEditado}
                onChange={(e) => setTextoEditado(e.target.value)}
                rows={15}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
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

      {/* Modal para edição/adição de retorno de IA */}
      {editandoRetornoIA && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {!editandoRetornoIA.retorno_ia || editandoRetornoIA.retorno_ia.trim() === '' 
                  ? "Adicionar Análise de IA" 
                  : "Editar Análise de IA"}
              </h2>
              <button 
                onClick={() => {
                  setEditandoRetornoIA(null);
                  setRetornoIAEditado('');
                }}
                className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
              >
                Fechar
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                <strong>Documento:</strong> {editandoRetornoIA.nome_arquivo}
              </p>
              {(!editandoRetornoIA.retorno_ia || editandoRetornoIA.retorno_ia.trim() === '') && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md mb-4">
                  <p className="text-yellow-800 font-medium mb-2">Análise de IA não disponível</p>
                  <p className="text-yellow-700">
                    Este documento ainda não foi analisado pela IA. Você pode adicionar manualmente uma análise abaixo ou usar o botão de análise com IA.
                  </p>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <label htmlFor="retornoIA" className="block text-sm font-medium text-gray-700 mb-1">
                {!editandoRetornoIA.retorno_ia || editandoRetornoIA.retorno_ia.trim() === '' 
                  ? "Adicione uma análise:" 
                  : "Análise de IA:"}
              </label>
              <textarea
                id="retornoIA"
                value={retornoIAEditado}
                onChange={(e) => setRetornoIAEditado(e.target.value)}
                rows={15}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="Digite ou cole a análise da IA aqui..."
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={salvarRetornoIAEditado}
                disabled={atualizandoRetornoIA}
                className={`flex items-center px-4 py-2 rounded ${
                  atualizandoRetornoIA
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {atualizandoRetornoIA ? (
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
      )}
      
      {/* Modal para edição/adição de texto análise com TipTap */}
      {editandoTextoAnalise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {!editandoTextoAnalise.texto_analise || editandoTextoAnalise.texto_analise.trim() === '' 
                  ? "Adicionar Texto Análise" 
                  : "Editar Texto Análise"}
              </h2>
              <button 
                onClick={() => {
                  setEditandoTextoAnalise(null);
                }}
                className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
              >
                Fechar
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                <strong>Documento:</strong> {editandoTextoAnalise.nome_arquivo}
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {!editandoTextoAnalise.texto_analise || editandoTextoAnalise.texto_analise.trim() === '' 
                  ? "Adicione uma análise manual:" 
                  : "Texto análise:"}
              </label>
              
              <TipTapEditor 
                initialValue={textoAnaliseHtml}
                onChange={html => setTextoAnaliseHtml(html)}
              />
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={salvarTextoAnaliseEditado}
                disabled={atualizandoTextoAnalise}
                className={`flex items-center px-4 py-2 rounded ${
                  atualizandoTextoAnalise
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {atualizandoTextoAnalise ? (
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
      )}

      {/* Modal para visualização de texto análise com HTML formatado */}
      {visualizandoTextoAnaliseHtml && (
        <VisualizarTextoAnalise 
          htmlContent={visualizandoTextoAnaliseHtml}
          onClose={() => setVisualizandoTextoAnaliseHtml(null)}
        />
      )}

      {/* Modal para anexar documento */}
      {anexarDocumentoId && (
        <AnexarDocumentoDialog
          controleId={anexarDocumentoId} 
          onClose={() => setAnexarDocumentoId(null)}
          onSuccess={(documentoId) => handleDocumentoAnexado(anexarDocumentoId, documentoId)}
          controleItem={itensRelacionados.find(item => item.id === anexarDocumentoId)}
          categorias={categorias}
          projetos={projetos}
          isGeralTable={true}
        />
      )}

      {/* Modal para editar item */}
      {editarItemId && (
        <EditarLinhaConteudoDialog
          controleItem={itensRelacionados.find(item => item.id === editarItemId)}
          onClose={() => setEditarItemId(null)}
          onSuccess={handleEditarSuccess}
          categorias={categorias}
          projetos={projetos}
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

      {/* Overlay para fechar menus quando clicar fora */}
      {(showMenu || showDetalhePopup) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-10"
          onClick={() => {
            setShowMenu(false);
            // Não fecha o diálogo aqui para evitar fechar acidentalmente
          }}
        />
      )}
    </div>
  );
}