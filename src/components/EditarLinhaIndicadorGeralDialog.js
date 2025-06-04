// src/components/EditarLinhaIndicadorGeralDialog.js - Versão com funcionalidade de anexar documento
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiX, FiCheck, FiCalendar, FiUpload, FiCloud, FiFile, FiArrowLeft } from 'react-icons/fi';

const EditarLinhaIndicadorGeralDialog = ({ 
  controleItem, 
  onClose, 
  onSuccess, 
  categorias, 
  projetos, 
  tiposIndicador, 
  subcategorias, 
  tiposUnidadeIndicador 
}) => {
  const [formData, setFormData] = useState({
    prazo_entrega: '',
    indicador: '',
    observacao: '',
    valor_indicador_apresentado: '',
    tipo_unidade_indicador: '',
    periodo_referencia: '',
    obrigatorio: false
  });
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('principal'); // 'principal', 'anexar-computador', 'anexar-nuvem'
  const [documentoAtual, setDocumentoAtual] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [documentosExistentes, setDocumentosExistentes] = useState([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [documentoSelecionado, setDocumentoSelecionado] = useState(null);
  const [filtroDocumento, setFiltroDocumento] = useState('');

  // Carrega os dados iniciais do item de controle
  useEffect(() => {
    if (controleItem) {
      setFormData({
        prazo_entrega: controleItem.prazo_entrega || '',
        indicador: controleItem.indicador || '',
        observacao: controleItem.observacao || '',
        valor_indicador_apresentado: controleItem.valor_indicador_apresentado || '',
        tipo_unidade_indicador: controleItem.tipo_unidade_indicador || '',
        periodo_referencia: controleItem.periodo_referencia || '',
        obrigatorio: controleItem.obrigatorio || false
      });
      
      // Buscar documento atualmente vinculado
      buscarDocumentoVinculado(controleItem.id);
    }
  }, [controleItem]);

  // Buscar documento vinculado atualmente
  const buscarDocumentoVinculado = async (controleId) => {
    try {
      const { data, error } = await supabase
        .from('documento_controle_indicador_geral_rel')
        .select('documento_id')
        .eq('controle_id', controleId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data && data.documento_id) {
        // Buscar informações do documento
        const { data: docData, error: docError } = await supabase
          .from('base_dados_conteudo')
          .select('*')
          .eq('id', data.documento_id)
          .single();
          
        if (docError) throw docError;
        
        setDocumentoAtual(docData);
      }
    } catch (error) {
      console.error('Erro ao buscar documento vinculado:', error);
    }
  };
  
  // Buscar documentos existentes quando o usuário escolher "anexar da nuvem"
  useEffect(() => {
    if (step === 'anexar-nuvem') {
      fetchDocumentosExistentes();
    }
  }, [step]);
  
  // Função para buscar documentos existentes
  const fetchDocumentosExistentes = async () => {
    try {
      setLoadingDocumentos(true);
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para ver os documentos');
        return;
      }
      
      // Buscar documentos existentes
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setDocumentosExistentes(data || []);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
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

  // Função para lidar com mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Salvar as alterações
  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Validar campos obrigatórios
      if (!formData.prazo_entrega) {
        toast.error('Por favor, preencha o prazo de entrega');
        setLoading(false);
        return;
      }
      
      if (!formData.indicador.trim()) {
        toast.error('Por favor, preencha o indicador');
        setLoading(false);
        return;
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao = {
        prazo_entrega: formData.prazo_entrega,
        indicador: formData.indicador?.trim() || null,
        observacao: formData.observacao?.trim() || null,
        valor_indicador_apresentado: formData.valor_indicador_apresentado 
          ? parseFloat(formData.valor_indicador_apresentado) 
          : null,
        periodo_referencia: formData.periodo_referencia || null,
        obrigatorio: formData.obrigatorio
      };

      // Incluir tipo_unidade_indicador apenas se foi selecionado
      if (formData.tipo_unidade_indicador) {
        dadosAtualizacao.tipo_unidade_indicador = parseInt(formData.tipo_unidade_indicador);
      } else {
        dadosAtualizacao.tipo_unidade_indicador = null;
      }
      
      // Atualizar o item de controle de indicador geral
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .update(dadosAtualizacao)
        .eq('id', controleItem.id)
        .select();
        
      if (error) throw error;
      
      toast.success('Item atualizado com sucesso!');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      toast.error(error.message || 'Erro ao salvar alterações');
    } finally {
      setLoading(false);
    }
  };

  // Função para enviar o arquivo PDF
  const uploadFile = async (e) => {
    e.preventDefault();
    
    if (!file) {
      toast.error('Por favor, selecione um arquivo para upload');
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
      formData.append('descricao', controleItem.indicador);
      formData.append('categoria_id', controleItem.categoria_id);
      formData.append('projeto_id', controleItem.projeto_id);
      
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
      
      // Atualizar a relação entre documento e controle
      await updateDocumentoRelacao(responseData.id);
      
      // Resetar estado
      setTimeout(() => {
        setFile(null);
        setUploading(false);
        setProgress(0);
        
        // Voltar para a tela principal e notificar sucesso
        setStep('principal');
        toast.success('Documento substituído com sucesso!');
        
        // Recarregar documento vinculado
        buscarDocumentoVinculado(controleItem.id);
        
        if (onSuccess) {
          onSuccess();
        }
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
      
      // Atualizar a relação entre documento e controle
      await updateDocumentoRelacao(documentoSelecionado);
      
      toast.success('Documento vinculado com sucesso!');
      
      // Voltar para a tela principal
      setStep('principal');
      
      // Recarregar documento vinculado
      buscarDocumentoVinculado(controleItem.id);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao vincular documento:', error);
      toast.error('Erro ao vincular documento');
    } finally {
      setUploading(false);
    }
  };

  // Função para atualizar a relação entre documento e controle (específica para indicadores)
  const updateDocumentoRelacao = async (novoDocumentoId) => {
    try {
      console.log(`Atualizando relação de indicador: controle_id=${controleItem.id}, novo documento_id=${novoDocumentoId}`);
      
      // Primeiro, excluir qualquer relação existente para este controle_id
      const { error: deleteError } = await supabase
        .from('documento_controle_indicador_geral_rel')
        .delete()
        .eq('controle_id', controleItem.id);
      
      if (deleteError) {
        console.error('Erro ao excluir relações existentes:', deleteError);
        throw deleteError;
      }
      
      console.log('Relações existentes removidas com sucesso');
      
      // Criar nova relação com o novo documento_id
      const { error: insertError } = await supabase
        .from('documento_controle_indicador_geral_rel')
        .insert({
          documento_id: novoDocumentoId,
          controle_id: controleItem.id
          // data_vinculo é preenchida automaticamente
        });
        
      if (insertError) {
        console.error('Erro ao inserir nova relação:', insertError);
        throw insertError;
      }
      
      console.log('Nova relação criada com sucesso');
      
      // Atualizar o flag tem_documento
      const { error: updateError } = await supabase
        .from('controle_indicador_geral')
        .update({ tem_documento: true })
        .eq('id', controleItem.id);
        
      if (updateError) {
        console.error('Erro ao atualizar flag tem_documento:', updateError);
        throw updateError;
      }
      
      console.log('Flag tem_documento atualizado com sucesso');
      
    } catch (error) {
      console.error('Erro ao atualizar relação documento-controle de indicador:', error);
      throw error;
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
  
  // Filtrar documentos baseado no texto de filtro
  const documentosFiltrados = documentosExistentes.filter(doc => {
    if (!filtroDocumento) return true;
    
    const searchTerms = filtroDocumento.toLowerCase().split(' ');
    const nomeArquivo = doc.nome_arquivo || '';
    const descricaoDoc = doc.descricao || '';
    const projetoNome = projetos[doc.projeto_id] || '';
    const categoriaNome = categorias[doc.categoria_id] || '';
    
    const textoCompleto = `${nomeArquivo} ${descricaoDoc} ${projetoNome} ${categoriaNome}`.toLowerCase();
    
    return searchTerms.every(term => textoCompleto.includes(term));
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {step === 'principal' && 'Editar Item de Controle de Indicador'}
            {step === 'anexar-computador' && 'Substituir Documento (Computador)'}
            {step === 'anexar-nuvem' && 'Substituir Documento (Nuvem)'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX className="h-6 w-6" />
          </button>
        </div>
        
        {step !== 'principal' && (
          <button 
            onClick={() => setStep('principal')}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FiArrowLeft className="mr-1" /> Voltar
          </button>
        )}
        
        {step === 'principal' && (
          <>
            <div className="mb-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-700 mb-2">Detalhes do Item</h3>
                <p><strong>Projeto:</strong> {projetos[controleItem?.projeto_id] || 'N/A'}</p>
                <p><strong>Categoria:</strong> {categorias[controleItem?.categoria_id] || 'N/A'}</p>
                <p><strong>Tipo Indicador:</strong> {tiposIndicador[controleItem?.tipo_indicador] || 'N/A'}</p>
                <p><strong>Subcategoria:</strong> {subcategorias[controleItem?.subcategoria_id] || 'N/A'}</p>
                <p><strong>ID Base:</strong> {controleItem?.id_controleindicador || 'N/A'}</p>
                <p><strong>Prazo Inicial:</strong> {formatDate(controleItem?.prazo_entrega_inicial)}</p>
                <p><strong>Valor Calculado Atual:</strong> {controleItem?.valor_indicador || '-'}</p>
                
                {documentoAtual && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-md border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-1">Documento Atual</h4>
                    <p><strong>Nome:</strong> {documentoAtual.nome_arquivo}</p>
                    <p><strong>Descrição:</strong> {documentoAtual.descricao || 'Sem descrição'}</p>
                    <p><strong>Data de Upload:</strong> {formatDate(documentoAtual.data_upload || documentoAtual.created_at)}</p>
                  </div>
                )}
              </div>
            </div>
            
            <form className="space-y-4">
              {/* Prazo de Entrega */}
              <div>
                <label htmlFor="prazo_entrega" className="block text-sm font-medium text-gray-700 mb-1">
                  Prazo de Entrega Atual <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="prazo_entrega"
                  name="prazo_entrega"
                  value={formData.prazo_entrega}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Período de Referência */}
              <div>
                <label htmlFor="periodo_referencia" className="block text-sm font-medium text-gray-700 mb-1">
                  Período de Referência
                </label>
                <input
                  type="date"
                  id="periodo_referencia"
                  name="periodo_referencia"
                  value={formData.periodo_referencia}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Data de referência para o cálculo ou avaliação deste indicador.
                </p>
              </div>
              
              {/* Indicador */}
              <div>
                <label htmlFor="indicador" className="block text-sm font-medium text-gray-700 mb-1">
                  Indicador <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="indicador"
                  name="indicador"
                  value={formData.indicador}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o nome do indicador"
                />
              </div>
              
              {/* Observação */}
              <div>
                <label htmlFor="observacao" className="block text-sm font-medium text-gray-700 mb-1">
                  Observação
                </label>
                <textarea
                  id="observacao"
                  name="observacao"
                  value={formData.observacao}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows="3"
                  placeholder="Digite observações sobre o indicador"
                />
              </div>
              
              {/* Valor Apresentado */}
              <div>
                <label htmlFor="valor_indicador_apresentado" className="block text-sm font-medium text-gray-700 mb-1">
                  Valor Apresentado
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="valor_indicador_apresentado"
                  name="valor_indicador_apresentado"
                  value={formData.valor_indicador_apresentado}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Digite o valor do indicador (ex: 15.75)"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Este é o valor numérico que será apresentado para o indicador.
                </p>
              </div>
              
              {/* Tipo de Unidade do Indicador */}
              <div>
                <label htmlFor="tipo_unidade_indicador" className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade do Indicador
                </label>
                <select
                  id="tipo_unidade_indicador"
                  name="tipo_unidade_indicador"
                  value={formData.tipo_unidade_indicador}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma unidade</option>
                  {Object.entries(tiposUnidadeIndicador).map(([id, tipo]) => (
                    <option key={id} value={id}>
                      {tipo}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Selecione a unidade de medida para este indicador.
                </p>
              </div>

              {/* Informação sobre Valor Calculado */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center">
                  <FiCalendar className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900">Valor Calculado</h4>
                    <p className="text-sm text-blue-700">
                      O valor calculado é preenchido automaticamente pelo sistema e não pode ser editado manualmente.
                    </p>
                    <p className="text-sm text-blue-600 font-medium mt-1">
                      Valor atual: {controleItem?.valor_indicador || 'Não calculado'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Obrigatório */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="obrigatorio"
                  name="obrigatorio"
                  checked={formData.obrigatorio}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="obrigatorio" className="ml-2 block text-sm text-gray-700">
                  Obrigatório
                </label>
              </div>
              
              {/* Opções para anexar arquivo */}
              <div className="pt-4 mt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-700 mb-3">Documento Vinculado</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setStep('anexar-computador')}
                    className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg"
                  >
                    <FiUpload className="mr-2" />
                    <span className="text-sm">Anexar do Computador</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStep('anexar-nuvem')}
                    className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg"
                  >
                    <FiCloud className="mr-2" />
                    <span className="text-sm">Anexar da Nuvem</span>
                  </button>
                </div>
              </div>
              
              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className={`px-4 py-2 rounded-md ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </div>
                  ) : (
                    'Salvar Alterações'
                  )}
                </button>
              </div>
            </form>
          </>
        )}
        
        {step === 'anexar-computador' && (
          <form onSubmit={uploadFile} className="space-y-4">
            {/* Upload de arquivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione um arquivo PDF para substituir o atual
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
                onClick={() => setStep('principal')}
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
                {uploading ? 'Enviando...' : 'Substituir Documento'}
              </button>
            </div>
          </form>
        )}
        
        {step === 'anexar-nuvem' && (
          <div className="space-y-4">
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
                            <span className="mr-2">{categorias[doc.categoria_id] || 'Categoria N/A'}</span>
                            <span className="mr-2">•</span>
                            <span>{projetos[doc.projeto_id] || 'Projeto N/A'}</span>
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
                  <FiFile className="h-8 w-8 mb-2" />
                  <p>Nenhum documento encontrado</p>
                </div>
              )}
            </div>
            
            {/* Botões */}
            <div className="flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={() => setStep('principal')}
                disabled={uploading}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Voltar
              </button>
              
              <button
                onClick={vincularDocumento}
                disabled={!documentoSelecionado || uploading}
                className={`px-4 py-2 rounded ${
                  !documentoSelecionado || uploading
                    ? 'bg-gray-400 cursor-not-allowed text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploading ? 'Processando...' : 'Substituir Documento'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditarLinhaIndicadorGeralDialog;