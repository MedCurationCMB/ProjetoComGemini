import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiUpload, FiFile, FiCheck, FiX, FiFolder } from 'react-icons/fi';

const UploadModal = ({ 
  isOpen, 
  onClose, 
  onUploadComplete, 
  user, 
  projetosVinculados = [] 
}) => {
  // Estados para categorias e projetos
  const [categorias, setCategorias] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Estados para seleção
  const [categoriaId, setCategoriaId] = useState('');
  const [projetoId, setProjetoId] = useState('');
  
  // Estados para upload
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [descricao, setDescricao] = useState('');

  // Carregar dados quando o modal abre
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchData();
    }
  }, [isOpen, user]);

  // Função para buscar apresentação das variáveis
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

  // Carregar categorias e projetos
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar apresentação das variáveis
      await fetchApresentacaoVariaveis();
      
      // Buscar categorias (todas)
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      
      if (categoriasError) {
        throw categoriasError;
      }
      
      setCategorias(categoriasData || []);
      
      // Buscar APENAS projetos vinculados ao usuário
      if (projetosVinculados.length > 0) {
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('*')
          .in('id', projetosVinculados)
          .order('nome');
        
        if (projetosError) {
          throw projetosError;
        }
        
        setProjetos(projetosData || []);
        console.log('Projetos carregados para upload:', projetosData?.length || 0);
      } else {
        setProjetos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Não foi possível carregar as categorias ou projetos');
    } finally {
      setLoading(false);
    }
  };

  // Função para lidar com a seleção de arquivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      return;
    }
    
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Por favor, selecione apenas arquivos PDF');
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('O arquivo não pode ter mais de 10MB');
      return;
    }
    
    setFile(selectedFile);
  };

  // Função para fazer upload do arquivo
  const uploadFile = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Por favor, selecione um arquivo para upload');
      return;
    }
    
    if (!categoriaId) {
      toast.error('Por favor, selecione uma categoria');
      return;
    }
    
    if (!projetoId) {
      toast.error('Por favor, selecione um projeto');
      return;
    }

    // Validação de projeto vinculado
    console.log('Projeto selecionado (UUID):', projetoId);
    console.log('Projetos vinculados (UUIDs):', projetosVinculados);
    
    if (projetosVinculados.length > 0) {
      const isVinculado = projetosVinculados.includes(projetoId);
      console.log('Usuário está vinculado ao projeto?', isVinculado);
      
      if (!isVinculado) {
        console.error('Projeto UUID não encontrado na lista de vinculados');
        toast.error('Você não está vinculado ao projeto selecionado');
        return;
      }
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
      
      // Criar um FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('descricao', descricao);
      formData.append('categoria_id', categoriaId);
      formData.append('projeto_id', projetoId);
      
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
      
      // Fazer upload para a API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      // Verificar resposta
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload do arquivo');
      }
      
      // Processar resposta
      const data = await response.json();
      
      // Upload completo
      clearInterval(progressInterval);
      setProgress(100);
      
      // Resetar estado
      setTimeout(() => {
        setFile(null);
        setDescricao('');
        setCategoriaId('');
        setProjetoId('');
        setUploading(false);
        setProgress(0);
        
        toast.success('Arquivo enviado com sucesso!');
        
        // Notificar componente pai e fechar modal
        if (onUploadComplete && typeof onUploadComplete === 'function') {
          onUploadComplete(data);
        }
        
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Falha ao enviar o arquivo');
      setUploading(false);
      setProgress(0);
    }
  };

  // Função para fechar modal
  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setDescricao('');
      setCategoriaId('');
      setProjetoId('');
      setProgress(0);
      onClose();
    }
  };

  // Não renderizar se não estiver aberto
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">Upload de Arquivo PDF</h2>
            <button 
              onClick={handleClose}
              disabled={uploading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <FiX className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : projetosVinculados.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FiFolder className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes antes de fazer upload de arquivos.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Seleção de Categoria e Projeto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Selecione {apresentacaoVariaveis.categoria || 'Categoria'} e {apresentacaoVariaveis.projeto || 'Projeto'}
                </h3>
                
                {/* Campo de Categoria */}
                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                    {apresentacaoVariaveis.categoria || 'Categoria'} do Documento
                  </label>
                  <select
                    id="categoria"
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    disabled={uploading}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione uma {apresentacaoVariaveis.categoria?.toLowerCase() || 'categoria'}</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                  
                  {!categoriaId && (
                    <p className="mt-2 text-sm text-gray-500">
                      Você precisa selecionar uma {apresentacaoVariaveis.categoria?.toLowerCase() || 'categoria'} antes de fazer upload
                    </p>
                  )}
                </div>
                
                {/* Campo de Projeto */}
                <div>
                  <label htmlFor="projeto" className="block text-sm font-medium text-gray-700 mb-2">
                    {apresentacaoVariaveis.projeto || 'Projeto'} (apenas projetos vinculados)
                  </label>
                  <select
                    id="projeto"
                    value={projetoId}
                    onChange={(e) => setProjetoId(e.target.value)}
                    disabled={uploading}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione um {apresentacaoVariaveis.projeto?.toLowerCase() || 'projeto'}</option>
                    {projetos.map((projeto) => (
                      <option key={projeto.id} value={projeto.id}>
                        {projeto.nome}
                      </option>
                    ))}
                  </select>
                  
                  {!projetoId && (
                    <p className="mt-2 text-sm text-gray-500">
                      Você precisa selecionar um {apresentacaoVariaveis.projeto?.toLowerCase() || 'projeto'} antes de fazer upload
                    </p>
                  )}
                </div>
                
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    As {apresentacaoVariaveis.categoria?.toLowerCase() || 'categorias'} e {apresentacaoVariaveis.projeto?.toLowerCase() || 'projetos'} ajudam a organizar seus documentos para facilitar a busca posteriormente.
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    <strong>Nota:</strong> Apenas {apresentacaoVariaveis.projeto?.toLowerCase() || 'projetos'} aos quais você está vinculado são exibidos.
                  </p>
                </div>
              </div>

              {/* Upload de Arquivo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Upload do Arquivo</h3>
                
                <form onSubmit={uploadFile} className="space-y-4">
                  {/* Campo de descrição */}
                  <div>
                    <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">
                      Descrição do Arquivo <span className="text-gray-500 text-xs">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      disabled={uploading}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Digite uma descrição para o arquivo (opcional)"
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
                          className="ml-4 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500 disabled:opacity-50"
                        >
                          <FiX className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {/* Barra de progresso */}
                  {uploading && (
                    <div>
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
                  
                  {/* Botões de ação */}
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      disabled={!file || !categoriaId || !projetoId || uploading}
                      className={`flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        !file || !categoriaId || !projetoId || uploading
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    >
                      {uploading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Enviando...
                        </span>
                      ) : (
                        'Enviar Arquivo'
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={uploading}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;