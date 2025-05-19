import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiDownload, FiEye, FiType, FiEdit, FiSave, FiCpu, FiX } from 'react-icons/fi';
import GeminiAnalysisDialog from './GeminiAnalysisDialog';

const ConteudoTable = () => {
  const [conteudos, setConteudos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [loading, setLoading] = useState(true);
  const [textoVisualizando, setTextoVisualizando] = useState(null);
  const [editandoConteudo, setEditandoConteudo] = useState(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [atualizandoTexto, setAtualizandoTexto] = useState(false);
  const [documentoParaAnaliseIA, setDocumentoParaAnaliseIA] = useState(null);
  const [tipoTextoVisualizando, setTipoTextoVisualizando] = useState('conteudo'); // 'conteudo' ou 'retorno_ia'
  const [tituloVisualizando, setTituloVisualizando] = useState('');
  const [documentoVinculacoes, setDocumentoVinculacoes] = useState({});
  
  // NOVO: Estado para controlar edição de documentos
  const [documentoEditando, setDocumentoEditando] = useState(null);
  const [formEdicao, setFormEdicao] = useState({
    categoria_id: '',
    projeto_id: '',
    descricao: '',
    conteudo: '',
    retorno_ia: ''
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

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

  // Visualizar texto extraído ou resultado da IA
  const visualizarTexto = (item, tipo = 'conteudo') => {
    if (tipo === 'conteudo') {
      if (!item.conteudo || item.conteudo.trim() === '') {
        // Se não houver texto, mostrar modal com mensagem e opção para extrair
        setEditandoConteudo(item);
        setTextoEditado('');
      } else {
        // Se houver texto, mostrar o texto normalmente
        setTextoVisualizando(item.conteudo);
        setTipoTextoVisualizando('conteudo');
        setTituloVisualizando('Texto Extraído');
      }
    } else if (tipo === 'retorno_ia') {
      if (item.retorno_ia && item.retorno_ia.trim() !== '') {
        setTextoVisualizando(item.retorno_ia);
        setTipoTextoVisualizando('retorno_ia');
        setTituloVisualizando('Análise de IA');
      } else {
        toast.error('Não há análise de IA disponível para este documento');
      }
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

  // Função para visualizar todos os IDs vinculados
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

  // NOVO: Função para iniciar edição de documento
  const iniciarEdicaoDocumento = (documento) => {
    setDocumentoEditando(documento.id);
    setFormEdicao({
      categoria_id: documento.categoria_id || '',
      projeto_id: documento.projeto_id || '',
      descricao: documento.descricao || '',
      conteudo: documento.conteudo || '',
      retorno_ia: documento.retorno_ia || ''
    });
  };

  // NOVO: Função para cancelar edição
  const cancelarEdicao = () => {
    setDocumentoEditando(null);
    setFormEdicao({
      categoria_id: '',
      projeto_id: '',
      descricao: '',
      conteudo: '',
      retorno_ia: ''
    });
  };

  // NOVO: Função para manipular mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormEdicao(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // NOVO: Função para salvar documento editado
  const salvarDocumentoEditado = async () => {
    if (!documentoEditando) return;
    
    try {
      setSalvandoEdicao(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setSalvandoEdicao(false);
        return;
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao = {
        categoria_id: formEdicao.categoria_id,
        projeto_id: formEdicao.projeto_id,
        descricao: formEdicao.descricao,
        conteudo: formEdicao.conteudo,
        retorno_ia: formEdicao.retorno_ia
      };
      
      // Atualizar o documento no Supabase
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .update(dadosAtualizacao)
        .eq('id', documentoEditando)
        .select();
      
      if (error) throw error;
      
      // Atualizar a lista local
      setConteudos(conteudos.map(item => 
        item.id === documentoEditando
          ? { ...item, ...dadosAtualizacao }
          : item
      ));
      
      toast.success('Documento atualizado com sucesso!');
      
      // Fechar o modo de edição
      setDocumentoEditando(null);
      
    } catch (error) {
      console.error('Erro ao atualizar documento:', error);
      toast.error('Erro ao salvar as alterações');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // NOVO: Função para editar o texto extraído em um modal separado
  const editarTextoExtraido = () => {
    const documento = conteudos.find(doc => doc.id === documentoEditando);
    if (documento) {
      setEditandoConteudo(documento);
      setTextoEditado(formEdicao.conteudo);
      
      // Manter o modo de edição do documento ativo
      // para que as alterações sejam refletidas quando o modal for fechado
    }
  };

  // NOVO: Função para editar o retorno da IA em um modal separado
  const editarRetornoIA = () => {
    // Abrir um modal para editar o retorno da IA
    setTextoVisualizando(formEdicao.retorno_ia);
    setTipoTextoVisualizando('retorno_ia_editando');
    setTituloVisualizando('Editar Análise de IA');
  };

  // NOVO: Função para salvar o retorno da IA editado
  const salvarRetornoIAEditado = () => {
    if (tipoTextoVisualizando === 'retorno_ia_editando') {
      setFormEdicao(prev => ({
        ...prev,
        retorno_ia: textoVisualizando
      }));
      setTextoVisualizando(null);
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
              <h2 className="text-xl font-bold">{tituloVisualizando}</h2>
              <div className="flex space-x-2">
                {tipoTextoVisualizando === 'retorno_ia_editando' && (
                  <button 
                    onClick={salvarRetornoIAEditado}
                    className="text-green-500 hover:text-green-700 bg-green-100 p-2 rounded flex items-center"
                  >
                    <FiSave className="mr-1" /> Salvar
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
            {tipoTextoVisualizando === 'retorno_ia_editando' ? (
              <textarea
                value={textoVisualizando}
                onChange={(e) => setTextoVisualizando(e.target.value)}
                className="w-full p-4 bg-gray-100 rounded text-sm leading-relaxed max-h-[60vh] h-[400px] font-mono"
              ></textarea>
            ) : (
              <pre className="whitespace-pre-wrap p-4 bg-gray-100 rounded text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                {textoVisualizando}
              </pre>
            )}
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
                  
                  // Se estamos editando um documento, atualizar o formulário de edição
                  if (documentoEditando && documentoEditando === editandoConteudo.id) {
                    setFormEdicao(prev => ({
                      ...prev,
                      conteudo: prev.conteudo // Manter o mesmo valor, pois cancelamos
                    }));
                  }
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
                onClick={() => {
                  salvarTextoEditado();
                  
                  // Se estamos editando um documento, atualizar o formulário de edição
                  if (documentoEditando && documentoEditando === editandoConteudo.id) {
                    setFormEdicao(prev => ({
                      ...prev,
                      conteudo: textoEditado
                    }));
                  }
                }}
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
              <tr key={item.id} className={documentoEditando === item.id ? "bg-blue-50" : ""}>
                {documentoEditando === item.id ? (
                  // Modo de edição
                  <>
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
                      <div>{formatVinculados(item.id)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        name="categoria_id"
                        value={formEdicao.categoria_id}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Selecione</option>
                        {Object.entries(categorias).map(([id, nome]) => (
                          <option key={id} value={id}>{nome}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        name="projeto_id"
                        value={formEdicao.projeto_id}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="">Selecione</option>
                        {Object.entries(projetos).map(([id, nome]) => (
                          <option key={id} value={id}>{nome}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <textarea
                        name="descricao"
                        value={formEdicao.descricao}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Descrição do documento"
                      ></textarea>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.data_upload || item.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={salvarDocumentoEditado}
                            disabled={salvandoEdicao}
                            className={`flex items-center px-3 py-1 rounded ${
                              salvandoEdicao
                                ? 'bg-gray-400 text-gray-100 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                            title="Salvar Alterações"
                          >
                            {salvandoEdicao ? (
                              <>
                                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1"></div>
                                Salvando
                              </>
                            ) : (
                              <>
                                <FiSave className="mr-1 h-4 w-4" />
                                Salvar
                              </>
                            )}
                          </button>
                          <button
                            onClick={cancelarEdicao}
                            disabled={salvandoEdicao}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded flex items-center"
                            title="Cancelar Edição"
                          >
                            <FiX className="mr-1 h-4 w-4" />
                            Cancelar
                          </button>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={editarTextoExtraido}
                            className="text-purple-600 hover:text-purple-900 px-2 py-1 border border-purple-200 rounded text-xs flex items-center"
                            title="Editar Texto Extraído"
                          >
                            <FiEdit className="mr-1 h-3 w-3" />
                            Texto
                          </button>
                          <button
                            onClick={editarRetornoIA}
                            className="text-indigo-600 hover:text-indigo-900 px-2 py-1 border border-indigo-200 rounded text-xs flex items-center"
                            title="Editar Retorno IA"
                          >
                            <FiEdit className="mr-1 h-3 w-3" />
                            IA
                          </button>
                        </div>
                      </div>
                    </td>
                  </>
                ) : (
                  // Modo de visualização
                  <>
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
                            onClick={() => visualizarTexto(item, 'conteudo')}
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
                              onClick={() => visualizarTexto(item, 'retorno_ia')}
                              className="text-amber-600 hover:text-amber-900"
                              title="Ver Análise da IA"
                            >
                              <FiEye className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                        <div>
                          <button
                            onClick={() => iniciarEdicaoDocumento(item)}
                            className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded flex items-center"
                            title="Editar Documento"
                          >
                            <FiEdit className="mr-1 h-3 w-3" />
                            Editar
                          </button>
                        </div>
                      </div>
                    </td>
                  </>
                )}
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