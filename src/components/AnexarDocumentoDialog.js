import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiUpload, FiFile, FiX, FiCloud, FiServer, FiArrowLeft } from 'react-icons/fi';

const AnexarDocumentoDialog = ({ controleId, onClose, onSuccess, controleItem, categorias, projetos, isGeralTable = false }) => {
  // Estados para controlar o fluxo
  const [step, setStep] = useState('escolha'); // 'escolha', 'computador', 'nuvem'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [descricao, setDescricao] = useState(controleItem?.descricao || '');
  
  // Estados para anexar da nuvem
  const [documentosExistentes, setDocumentosExistentes] = useState([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [filtroDocumento, setFiltroDocumento] = useState('');
  
  // ✅ CORRIGIDO: Estado para projetos vinculados (UUIDs)
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  
  // ✅ CORRIGIDO: Estados separados para mapeamento completo (UUIDs)
  const [todosOsProjetos, setTodosOsProjetos] = useState({});
  const [todasAsCategorias, setTodasAsCategorias] = useState({});

  // ✅ CORRIGIDO: PASSO 1 - Buscar projetos vinculados ao usuário (UUIDs)
  useEffect(() => {
    const fetchProjetosVinculados = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('❌ Usuário não autenticado');
          setProjetosVinculados([]);
          return;
        }
        
        console.log('🔍 PASSO 1: Buscando projetos vinculados ao usuário UUID:', session.user.id);
        
        // PASSO 1: Buscar quais são os projetos vinculados ao usuário
        const { data, error } = await supabase
          .from('relacao_usuarios_projetos')
          .select('projeto_id')
          .eq('usuario_id', session.user.id);
        
        if (error) {
          console.error('❌ Erro ao buscar projetos vinculados:', error);
          throw error;
        }
        
        // ✅ CORRIGIDO: projeto_id são UUIDs (strings), não converter para números
        const projetoIds = data?.map(item => item.projeto_id) || []; // Manter como UUIDs (strings)
        setProjetosVinculados(projetoIds);
        
        console.log('✅ PASSO 1 CONCLUÍDO: Projetos vinculados (UUIDs):', projetoIds);
        console.log('📊 Total de projetos vinculados:', projetoIds.length);
      } catch (error) {
        console.error('❌ Erro ao carregar projetos vinculados:', error);
        setProjetosVinculados([]);
        toast.error('Erro ao carregar projetos vinculados');
      }
    };

    fetchProjetosVinculados();
  }, []);

  // ✅ CORRIGIDO: Buscar TODOS os projetos e categorias para mapeamento completo (UUIDs)
  useEffect(() => {
    const fetchTodosOsDados = async () => {
      try {
        console.log('🔍 Carregando todos os projetos e categorias para mapeamento...');
        
        // Buscar TODOS os projetos (não apenas vinculados)
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('id, nome');
        
        if (projetosError) {
          console.error('❌ Erro ao buscar projetos:', projetosError);
        } else {
          // ✅ CORRIGIDO: projeto.id são UUIDs (strings)
          const projetosObj = {};
          projetosData.forEach(proj => {
            projetosObj[proj.id] = proj.nome; // proj.id é UUID (string)
          });
          setTodosOsProjetos(projetosObj);
          console.log('✅ Todos os projetos carregados (UUIDs):', Object.keys(projetosObj).length);
        }
        
        // Buscar TODAS as categorias
        const { data: categoriasData, error: categoriasError } = await supabase
          .from('categorias')
          .select('id, nome');
        
        if (categoriasError) {
          console.error('❌ Erro ao buscar categorias:', categoriasError);
        } else {
          // ✅ CORRIGIDO: categoria.id são UUIDs (strings)
          const categoriasObj = {};
          categoriasData.forEach(cat => {
            categoriasObj[cat.id] = cat.nome; // cat.id é UUID (string)
          });
          setTodasAsCategorias(categoriasObj);
          console.log('✅ Todas as categorias carregadas (UUIDs):', Object.keys(categoriasObj).length);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados completos:', error);
      }
    };

    fetchTodosOsDados();
  }, []);
  
  // Buscar documentos existentes quando o usuário escolher "anexar da nuvem"
  useEffect(() => {
    // Só executa se o step for 'nuvem' e já tiver carregado os projetos vinculados
    if (step === 'nuvem' && projetosVinculados !== undefined) {
      console.log('🔍 PASSO 2: Iniciando busca de documentos para projetos UUIDs:', projetosVinculados);
      fetchDocumentosExistentes();
    }
  }, [step, projetosVinculados]);
  
  // ✅ CORRIGIDO: PASSO 2 - Função para buscar documentos existentes FILTRADOS por projetos vinculados (UUIDs)
  const fetchDocumentosExistentes = async () => {
    try {
      setLoadingDocumentos(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para ver os documentos');
        return;
      }
      
      console.log('🔍 PASSO 2: Executando busca de documentos...');
      console.log('📋 Projetos vinculados UUIDs para filtro:', projetosVinculados);
      
      // PASSO 2: Se não há projetos vinculados, não mostrar nenhum documento
      if (!projetosVinculados || projetosVinculados.length === 0) {
        console.log('⚠️ PASSO 2: Usuário não tem projetos vinculados, retornando lista vazia');
        setDocumentosExistentes([]);
        return;
      }
      
      // ✅ CORRIGIDO: PASSO 2 - Buscar na tabela base_dados_conteudo os documentos que possuem 
      // o projeto_id UUID que o usuário está vinculado
      console.log('🔍 PASSO 2: Buscando documentos na tabela base_dados_conteudo...');
      console.log('🎯 Filtro: projeto_id IN UUIDs:', projetosVinculados);
      
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .select('*')
        .in('projeto_id', projetosVinculados) // ✅ CORRIGIDO: Buscar apenas documentos dos projetos vinculados (UUIDs)
        .not('projeto_id', 'is', null) // ← Garantir que projeto_id não é null
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ PASSO 2: Erro na consulta Supabase:', error);
        throw error;
      }
      
      console.log('✅ PASSO 2 CONCLUÍDO: Documentos encontrados:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📄 Detalhes dos documentos encontrados:');
        data.forEach((doc, index) => {
          console.log(`  ${index + 1}. ID: ${doc.id}, Arquivo: ${doc.nome_arquivo}, Projeto UUID: ${doc.projeto_id}`);
          console.log(`      Nome do Projeto: ${todosOsProjetos[doc.projeto_id] || 'Não encontrado'}`);
        });
      } else {
        console.log('📄 Nenhum documento encontrado para os projetos vinculados');
      }
      
      setDocumentosExistentes(data || []);
    } catch (error) {
      console.error('❌ PASSO 2: Erro ao carregar documentos:', error);
      toast.error('Erro ao carregar documentos existentes');
    } finally {
      setLoadingDocumentos(false);
    }
  };
  
  // Função para lidar com a seleção de arquivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    // Verificar se um arquivo foi selecionado
    if (!selectedFile) {
      return;
    }
    
    // Verificar se o arquivo é um PDF
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Por favor, selecione apenas arquivos PDF');
      return;
    }
    
    // Verificar o tamanho do arquivo (limite de 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('O arquivo não pode ter mais de 10MB');
      return;
    }
    
    setFile(selectedFile);
  };
  
  // Função para enviar o arquivo PDF
  const uploadFile = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Por favor, selecione um arquivo para upload');
      return;
    }
    
    if (!controleItem) {
      toast.error('Informações do item de controle não disponíveis');
      return;
    }
    
    try {
      setUploading(true);
      setProgress(0);
      
      // Obter a sessão atual do usuário
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para fazer upload de arquivos');
        setUploading(false);
        return;
      }
      
      // ✅ CORRIGIDO: Criar um FormData para enviar o arquivo (UUIDs)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('descricao', descricao);
      formData.append('categoria_id', controleItem.categoria_id); // UUID (string)
      formData.append('projeto_id', controleItem.projeto_id); // UUID (string)
      
      // Adicionar o campo certo dependendo da tabela
      if (isGeralTable) {
        formData.append('id_controleconteudogeral', controleId);
      } else {
        formData.append('id_controleconteudo', controleId);
      }
      
      // Fazer upload para a API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      // Simulação de progresso
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);
      
      // Verificar resposta
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload do arquivo');
      }
      
      // Processar resposta
      const responseData = await response.json();
      
      // Upload completo
      clearInterval(progressInterval);
      setProgress(100);
      
      // Resetar estado
      setTimeout(() => {
        setFile(null);
        setDescricao('');
        setUploading(false);
        setProgress(0);
        
        // Notificar sucesso e fechar diálogo
        if (onSuccess) {
          onSuccess(responseData.id);
        }
        
        toast.success('Documento anexado com sucesso!');
      }, 1000);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Falha ao enviar o arquivo');
      setUploading(false);
      setProgress(0);
    }
  };
  
  // Função para vincular documento existente ao controle
  const vincularDocumento = async () => {
    if (!documentoSelecionado) {
      toast.error('Por favor, selecione um documento para vincular');
      return;
    }
    
    try {
      setUploading(true);
      
      // Obter a sessão atual do usuário
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        setUploading(false);
        return;
      }
      
      // Criar vinculação na tabela de relacionamento
      const { error } = await supabase
        .from('documento_controle_geral_rel')
        .insert({
          documento_id: documentoSelecionado, // documento_id é INTEGER
          controle_id: controleId // controle_id é INTEGER
        });
      
      if (error) {
        // Verificar se é um erro de duplicidade
        if (error.code === '23505') { // Código de erro do PostgreSQL para violação de restrição única
          toast.warning('Este documento já está vinculado a este controle');
        } else {
          throw error;
        }
      } else {
        // Atualizar o flag tem_documento na tabela controle_conteudo_geral
        const { error: updateError } = await supabase
          .from('controle_conteudo_geral')
          .update({ tem_documento: true })
          .eq('id', controleId);
        
        if (updateError) throw updateError;
      }
      
      // Notificar sucesso e fechar diálogo
      toast.success('Documento vinculado com sucesso!');
      
      if (onSuccess) {
        onSuccess(documentoSelecionado);
      }
      
    } catch (error) {
      console.error('Erro ao vincular documento:', error);
      toast.error(error.message || 'Falha ao vincular o documento');
    } finally {
      setUploading(false);
    }
  };
  
  // Função para formatar data
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
  
  // ✅ CORRIGIDO: Filtrar documentos baseado no texto de filtro usando mapeamento completo (UUIDs)
  const documentosFiltrados = documentosExistentes.filter(doc => {
    if (!filtroDocumento) return true;
    
    const searchTerms = filtroDocumento.toLowerCase().split(' ');
    const nomeArquivo = doc.nome_arquivo || '';
    const descricaoDoc = doc.descricao || '';
    // ✅ CORRIGIDO: Usar todosOsProjetos e todasAsCategorias com UUIDs
    const projetoNome = todosOsProjetos[doc.projeto_id] || '';
    const categoriaNome = todasAsCategorias[doc.categoria_id] || '';
    
    const textoCompleto = `${nomeArquivo} ${descricaoDoc} ${projetoNome} ${categoriaNome}`.toLowerCase();
    
    return searchTerms.every(term => textoCompleto.includes(term));
  });
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {step === 'escolha' && 'Anexar Documento'}
            {step === 'computador' && 'Anexar do Computador'}
            {step === 'nuvem' && 'Anexar da Nuvem'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {step !== 'escolha' && (
          <button 
            onClick={() => setStep('escolha')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FiArrowLeft className="mr-1" /> Voltar
          </button>
        )}
        
        {step === 'escolha' && (
          <div>
            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Detalhes do Item</h3>
                <p><strong>Projeto:</strong> {projetos[controleItem?.projeto_id] || 'N/A'}</p>
                <p><strong>Categoria:</strong> {categorias[controleItem?.categoria_id] || 'N/A'}</p>
                <p><strong>Descrição:</strong> {controleItem?.descricao || 'N/A'}</p>
                <p><strong>Tipo de Item:</strong> {isGeralTable ? 'Controle Geral' : 'Controle Base'}</p>
                {isGeralTable && controleItem?.prazo_entrega && (
                  <p><strong>Prazo:</strong> {new Date(controleItem.prazo_entrega).toLocaleDateString('pt-BR')}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4 mt-6">
              <button
                onClick={() => setStep('computador')}
                className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-lg"
              >
                <FiUpload className="mr-3 h-6 w-6" />
                <span className="font-medium">Anexar do Computador</span>
              </button>
              
              <button
                onClick={() => setStep('nuvem')}
                className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-lg"
              >
                <FiCloud className="mr-3 h-6 w-6" />
                <span className="font-medium">Anexar da Nuvem</span>
              </button>
            </div>
          </div>
        )}
        
        {step === 'computador' && (
          <form onSubmit={uploadFile} className="space-y-4">
            {/* Campo de descrição */}
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                Descrição do Documento
              </label>
              <input
                type="text"
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite uma descrição para o documento"
                required
              />
            </div>
            
            {/* Upload de arquivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione um arquivo PDF
              </label>
              
              {!file ? (
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-1 text-center">
                    <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Selecionar arquivo</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          disabled={uploading}
                        />
                      </label>
                      <p className="pl-1">ou arraste e solte</p>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF até 10MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-1 flex items-center p-4 border border-gray-300 rounded-md bg-gray-50">
                  <FiFile className="h-8 w-8 text-blue-500 mr-3" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={uploading}
                    className="ml-4 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500"
                  >
                    <FiX className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Barra de progresso */}
            {uploading && (
              <div className="mt-4">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                        Upload em progresso
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                    <div
                      style={{ width: `${progress}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Botões */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setStep('escolha')}
                disabled={uploading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Voltar
              </button>
              
              <button
                type="submit"
                disabled={!file || uploading}
                className={`px-4 py-2 rounded ${
                  !file || uploading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploading ? 'Enviando...' : 'Anexar Documento'}
              </button>
            </div>
          </form>
        )}
        
        {step === 'nuvem' && (
          <div className="space-y-4">
            {/* ✅ CORRIGIDO: Aviso sobre filtro por projetos vinculados (UUIDs) */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-800 text-sm">
                <strong>Observação:</strong> São exibidos apenas documentos dos projetos aos quais você está vinculado.
                {projetosVinculados.length === 0 && (
                  <span className="block mt-1 text-blue-700">
                    Você não possui projetos vinculados. Entre em contato com o administrador.
                  </span>
                )}
              </p>
            </div>
            
            {/* Filtro */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Buscar Documentos
              </label>
              <input
                type="text"
                value={filtroDocumento}
                onChange={(e) => setFiltroDocumento(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite para filtrar documentos..."
              />
            </div>
            
            {/* Lista de documentos */}
            <div className="mt-4 border border-gray-200 rounded-md h-64 overflow-y-auto">
              {loadingDocumentos ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : documentosFiltrados.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {documentosFiltrados.map((doc) => (
                    <div 
                      key={doc.id} 
                      className={`p-3 hover:bg-gray-50 cursor-pointer ${
                        documentoSelecionado === doc.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setDocumentoSelecionado(doc.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 mt-1 h-4 w-4 rounded-full border ${
                          documentoSelecionado === doc.id 
                            ? 'bg-blue-500 border-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {documentoSelecionado === doc.id && (
                            <div className="h-full w-full flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <FiFile className="h-4 w-4 text-blue-500 mr-1" />
                            <h4 className="text-sm font-medium text-gray-900">{doc.nome_arquivo}</h4>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{doc.descricao}</p>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            {/* ✅ CORRIGIDO: Usar todasAsCategorias e todosOsProjetos com UUIDs */}
                            <span className="mr-2">{todasAsCategorias[doc.categoria_id] || 'Categoria N/A'}</span>
                            <span className="mr-2">•</span>
                            <span>{todosOsProjetos[doc.projeto_id] || 'Projeto N/A'}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(doc.data_upload || doc.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FiServer className="h-8 w-8 mb-2" />
                  <p>
                    {projetosVinculados.length === 0 
                      ? 'Nenhum projeto vinculado' 
                      : 'Nenhum documento encontrado'
                    }
                  </p>
                  {projetosVinculados.length === 0 && (
                    <p className="text-xs mt-1 text-center">
                      Entre em contato com o administrador<br />
                      para vincular você a projetos
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {/* Botões */}
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => setStep('escolha')}
                disabled={uploading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Voltar
              </button>
              
              <button
                onClick={vincularDocumento}
                disabled={!documentoSelecionado || uploading || projetosVinculados.length === 0}
                className={`px-4 py-2 rounded ${
                  !documentoSelecionado || uploading || projetosVinculados.length === 0
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploading ? 'Processando...' : 'Vincular Documento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnexarDocumentoDialog;