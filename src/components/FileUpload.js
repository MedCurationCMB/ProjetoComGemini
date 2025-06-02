import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiUpload, FiFile, FiCheck, FiX, FiFolder } from 'react-icons/fi';

const FileUpload = ({ categoria_id, projeto_id, onUploadComplete, projetosVinculados = [] }) => { // Nova prop projetosVinculados
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [descricao, setDescricao] = useState('');
  
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
  
  // Função para fazer upload do arquivo
  const uploadFile = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Por favor, selecione um arquivo para upload');
      return;
    }
    
    if (!categoria_id) {
      toast.error('Por favor, selecione uma categoria');
      return;
    }
    
    if (!projeto_id) {
      toast.error('Por favor, selecione um projeto');
      return;
    }

    // Verificar se o projeto selecionado está na lista de projetos vinculados
    if (projetosVinculados.length > 0 && !projetosVinculados.includes(parseInt(projeto_id))) {
      toast.error('Você não está vinculado ao projeto selecionado');
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
      
      // Criar um FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('file', file);
      formData.append('descricao', descricao);
      formData.append('categoria_id', categoria_id);
      formData.append('projeto_id', projeto_id);
      
      // Fazer upload para a API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });
      
      // Simulação de progresso (em um caso real, você poderia usar um evento de progresso)
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
      const data = await response.json();
      
      // Upload completo
      clearInterval(progressInterval);
      setProgress(100);
      
      // Resetar estado
      setTimeout(() => {
        setFile(null);
        setDescricao('');
        setUploading(false);
        setProgress(0);
        
        // Notificar componente pai
        if (onUploadComplete && typeof onUploadComplete === 'function') {
          onUploadComplete(data);
        }
        
        toast.success('Arquivo enviado com sucesso!');
      }, 1000);
      
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error(error.message || 'Falha ao enviar o arquivo');
      setUploading(false);
      setProgress(0);
    }
  };

  // Se não há projetos vinculados e o array foi fornecido, mostrar mensagem
  if (projetosVinculados.length === 0 && Array.isArray(projetosVinculados)) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="py-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FiFolder className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes antes de fazer upload de arquivos.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload de Arquivo PDF</h2>
      
      <form onSubmit={uploadFile} className="space-y-4">
        {/* Campo de descrição (agora opcional) */}
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
        <div className="mt-4">
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
        
        {/* Botão de envio */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={!file || uploading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              !file || uploading
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
        </div>
      </form>
    </div>
  );
};

export default FileUpload;