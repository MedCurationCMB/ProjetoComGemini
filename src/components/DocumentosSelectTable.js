import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiCheck, FiEye, FiType, FiFolder } from 'react-icons/fi';

const DocumentosSelectTable = ({ user, onSelectionChange }) => { // Adicionado user como prop
  const [conteudos, setConteudos] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]); // Novo estado para projetos vinculados
  const [loading, setLoading] = useState(true);
  const [textoVisualizando, setTextoVisualizando] = useState(null);
  const [selectedDocuments, setSelectedDocuments] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) { // Permitir execução mesmo se não há projetos vinculados
      fetchCategorias();
      fetchProjetos();
      fetchConteudos();
    }
  }, [projetosVinculados]);

  // Notifica o componente pai quando a seleção muda
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedDocuments);
    }
  }, [selectedDocuments, onSelectionChange]);

  // Nova função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', user.id);
      
      if (error) throw error;
      
      // Extrair apenas os IDs dos projetos
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      console.log('Projetos vinculados ao usuário:', projetoIds);
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

  // Buscar APENAS os projetos vinculados ao usuário
  const fetchProjetos = async () => {
    try {
      if (projetosVinculados.length === 0) {
        setProjetos({});
        return;
      }

      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .in('id', projetosVinculados); // Filtrar apenas projetos vinculados
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por ID
      const projetosObj = {};
      data.forEach(proj => {
        projetosObj[proj.id] = proj.nome;
      });
      
      setProjetos(projetosObj);
      console.log('Projetos carregados:', projetosObj);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const fetchConteudos = async () => {
    try {
      setLoading(true);
      
      // Se o usuário não tem projetos vinculados, não mostrar nenhum documento
      if (projetosVinculados.length === 0) {
        setConteudos([]);
        setLoading(false);
        return;
      }
      
      // Obter o token de acesso do usuário atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para ver os conteúdos');
        return;
      }
      
      // Buscar diretamente do Supabase APENAS dos projetos vinculados
      const { data, error } = await supabase
        .from('base_dados_conteudo')
        .select('*')
        .in('projeto_id', projetosVinculados) // Filtrar apenas projetos vinculados
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
      toast.error('Este documento não possui texto extraído');
      return;
    }
    
    setTextoVisualizando(item.conteudo);
  };

  // Manipular seleção/desseleção de documento
  const toggleDocumentSelection = (documentId) => {
    setSelectedDocuments(prevSelected => {
      if (prevSelected.includes(documentId)) {
        return prevSelected.filter(id => id !== documentId);
      } else {
        return [...prevSelected, documentId];
      }
    });
  };

  // Verificar se um documento está selecionado
  const isDocumentSelected = (documentId) => {
    return selectedDocuments.includes(documentId);
  };

  // Selecionar todos os documentos
  const selectAllDocuments = () => {
    const allIds = conteudos.map(doc => doc.id);
    setSelectedDocuments(allIds);
  };

  // Desselecionar todos os documentos
  const unselectAllDocuments = () => {
    setSelectedDocuments([]);
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

      {/* Botões de seleção */}
      <div className="mb-4 flex space-x-4">
        <button
          onClick={selectAllDocuments}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Selecionar Todos
        </button>
        <button
          onClick={unselectAllDocuments}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Desselecionar Todos
        </button>
        <div className="ml-auto text-sm bg-gray-200 px-3 py-2 rounded-md">
          <span className="font-semibold">{selectedDocuments.length}</span> documento(s) selecionado(s)
        </div>
      </div>

      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Selecionar
            </th>
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
              <tr key={item.id} className={isDocumentSelected(item.id) ? "bg-blue-50" : ""}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={isDocumentSelected(item.id)}
                      onChange={() => toggleDocumentSelection(item.id)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </td>
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
                      onClick={() => visualizarTexto(item)}
                      className="text-purple-600 hover:text-purple-900"
                      title={!item.conteudo || item.conteudo.trim() === '' 
                        ? "Sem texto extraído" 
                        : "Visualizar Texto Extraído"}
                      disabled={!item.conteudo || item.conteudo.trim() === ''}
                    >
                      <FiType className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => toggleDocumentSelection(item.id)}
                      className={`${isDocumentSelected(item.id) ? 'text-green-600' : 'text-gray-400'} hover:text-green-900`}
                      title={isDocumentSelected(item.id) ? "Remover da seleção" : "Adicionar à seleção"}
                    >
                      <FiCheck className="h-5 w-5" />
                    </button>
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

export default DocumentosSelectTable;