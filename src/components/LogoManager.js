// src/components/LogoManager.js
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { supabase } from '../utils/supabaseClient';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';

export default function LogoManager() {
  const [currentLogo, setCurrentLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Carregar logo atual ao montar o componente
  useEffect(() => {
    fetchCurrentLogo();
  }, []);

  // Buscar logo atual do banco
  const fetchCurrentLogo = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('config_logo')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCurrentLogo(data[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      toast.error('Erro ao carregar logo atual');
    } finally {
      setLoading(false);
    }
  };

  // Validar arquivo selecionado
  const validateFile = (file) => {
    // Verificar se é uma imagem
    if (!file.type.startsWith('image/')) {
      return 'Por favor, selecione apenas arquivos de imagem (PNG, JPG, JPEG, GIF)';
    }
    
    // Verificar tamanho (limite de 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'O arquivo deve ter no máximo 5MB';
    }
    
    return null;
  };

  // Converter arquivo para Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Manipular seleção de arquivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      event.target.value = '';
      return;
    }
    
    setSelectedFile(file);
    
    // Criar preview da imagem
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Enviar nova logo
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }
    
    try {
      setUploading(true);
      
      // Converter arquivo para Base64
      const base64String = await fileToBase64(selectedFile);
      
      // Salvar no banco
      const { data, error } = await supabase
        .from('config_logo')
        .insert([
          { logo: base64String }
        ])
        .select();
      
      if (error) throw error;
      
      toast.success('Logo atualizada com sucesso!');
      
      // Atualizar estado local
      setCurrentLogo(data[0]);
      
      // Fechar diálogo e limpar formulário
      setShowDialog(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      
    } catch (error) {
      console.error('Erro ao salvar logo:', error);
      toast.error('Erro ao salvar logo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  // Fechar diálogo e limpar estado
  const closeDialog = () => {
    setShowDialog(false);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Gerenciamento da Logo</h2>
      
      {/* Logo atual */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Logo Atual</h3>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : currentLogo ? (
          <div className="flex flex-col items-center">
            <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <img 
                src={currentLogo.logo} 
                alt="Logo atual" 
                className="max-w-xs max-h-32 object-contain"
              />
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Última atualização: {new Date(currentLogo.updated_at).toLocaleString('pt-BR')}
            </p>
            <button
              onClick={() => setShowDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
            >
              <FiUpload className="mr-2" />
              Alterar Logo
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <FiImage className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma logo configurada</p>
            <button
              onClick={() => setShowDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center mx-auto"
            >
              <FiUpload className="mr-2" />
              Adicionar Logo
            </button>
          </div>
        )}
      </div>

      {/* Diálogo de upload */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                {currentLogo ? 'Alterar Logo' : 'Adicionar Logo'}
              </h3>
              <button 
                onClick={closeDialog}
                className="text-gray-400 hover:text-gray-600"
                disabled={uploading}
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Imagem
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Formatos aceitos: PNG, JPG, JPEG, GIF. Tamanho máximo: 5MB
              </p>
            </div>
            
            {/* Preview da imagem selecionada */}
            {previewUrl && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-center">
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="max-w-full max-h-32 object-contain mx-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeDialog}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className={`px-4 py-2 rounded-md text-white font-medium ${
                  !selectedFile || uploading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  'Enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}