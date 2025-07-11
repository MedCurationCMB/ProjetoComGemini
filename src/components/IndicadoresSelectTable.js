import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiBarChart2, FiCheck, FiEye, FiCalendar, FiFolder, FiTrendingUp } from 'react-icons/fi';

const IndicadoresSelectTable = ({ user, onSelectionChange }) => {
  const [indicadores, setIndicadores] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndicadores, setSelectedIndicadores] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) {
      fetchCategorias();
      fetchProjetos();
      fetchIndicadores();
    }
  }, [projetosVinculados]);

  // Notifica o componente pai quando a seleção muda
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedIndicadores);
    }
  }, [selectedIndicadores, onSelectionChange]);

  // Buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', user.id);
      
      if (error) throw error;
      
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

  // Buscar indicadores da tabela controle_indicador
  const fetchIndicadores = async () => {
    try {
      setLoading(true);
      
      if (projetosVinculados.length === 0) {
        setIndicadores([]);
        setLoading(false);
        return;
      }
      
      const { data, error } = await supabase
        .from('controle_indicador')
        .select('*')
        .in('projeto_id', projetosVinculados) // Filtrar apenas projetos vinculados
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setIndicadores(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erro ao carregar indicadores');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar dados filhos de um indicador para preview
  const fetchIndicadorChildren = async (indicadorId) => {
    try {
      const { data, error } = await supabase
        .from('controle_indicador_geral')
        .select('*')
        .eq('id_controleindicador', indicadorId)
        .not('periodo_referencia', 'is', null)
        .order('periodo_referencia', { ascending: false })
        .limit(5); // Limitar a 5 registros para preview
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar dados filhos:', error);
      return [];
    }
  };

  // Visualizar preview dos dados do indicador
  const visualizarPreview = async (indicador) => {
    try {
      const children = await fetchIndicadorChildren(indicador.id);
      
      setPreviewData({
        indicador,
        children,
        totalChildren: children.length
      });
      setShowPreviewModal(true);
    } catch (error) {
      toast.error('Erro ao carregar preview do indicador');
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

  // Manipular seleção/desseleção de indicador
  const toggleIndicadorSelection = (indicadorId) => {
    setSelectedIndicadores(prevSelected => {
      if (prevSelected.includes(indicadorId)) {
        return prevSelected.filter(id => id !== indicadorId);
      } else {
        return [...prevSelected, indicadorId];
      }
    });
  };

  // Verificar se um indicador está selecionado
  const isIndicadorSelected = (indicadorId) => {
    return selectedIndicadores.includes(indicadorId);
  };

  // Selecionar todos os indicadores
  const selectAllIndicadores = () => {
    const allIds = indicadores.map(ind => ind.id);
    setSelectedIndicadores(allIds);
  };

  // Desselecionar todos os indicadores
  const unselectAllIndicadores = () => {
    setSelectedIndicadores([]);
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
      {/* Modal para preview dos dados do indicador */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Preview do Indicador: {previewData.indicador.indicador}</h2>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
              >
                Fechar
              </button>
            </div>
            
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Informações do Indicador</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Projeto:</span> {projetos[previewData.indicador.projeto_id] || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Categoria:</span> {categorias[previewData.indicador.categoria_id] || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Criado em:</span> {formatDate(previewData.indicador.created_at)}
                </div>
                <div>
                  <span className="font-medium">Total de períodos:</span> {previewData.totalChildren} (mostrando até 5)
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Últimos Períodos (Preview)</h3>
              {previewData.children.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Período
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Tipo
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Valor Apresentado
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Valor Indicador
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {previewData.children.map((child, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatDate(child.periodo_referencia)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {child.tipo_indicador === 1 ? 'Realizado' : child.tipo_indicador === 2 ? 'Meta' : 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {child.valor_indicador_apresentado || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {child.valor_indicador || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum dado encontrado para este indicador</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Botões de seleção */}
      <div className="mb-4 flex space-x-4">
        <button
          onClick={selectAllIndicadores}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Selecionar Todos
        </button>
        <button
          onClick={unselectAllIndicadores}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
        >
          Desselecionar Todos
        </button>
        <div className="ml-auto text-sm bg-gray-200 px-3 py-2 rounded-md">
          <span className="font-semibold">{selectedIndicadores.length}</span> indicador(es) selecionado(s)
        </div>
      </div>

      <table className="min-w-full bg-white border border-gray-300">
        <thead>
          <tr>
            <th className="px-4 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Selecionar
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Indicador
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Categoria
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Projeto
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Data de Criação
            </th>
            <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {Array.isArray(indicadores) && indicadores.length > 0 ? (
            indicadores.map((item) => (
              <tr key={item.id} className={isIndicadorSelected(item.id) ? "bg-blue-50" : ""}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={isIndicadorSelected(item.id)}
                      onChange={() => toggleIndicadorSelection(item.id)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiBarChart2 className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.indicador || 'Indicador sem nome'}
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {item.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <FiFolder className="h-4 w-4 text-gray-400 mr-2" />
                    {categorias[item.categoria_id] || 'Categoria indisponível'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <FiTrendingUp className="h-4 w-4 text-gray-400 mr-2" />
                    {projetos[item.projeto_id] || 'Projeto indisponível'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <FiCalendar className="h-4 w-4 text-gray-400 mr-2" />
                    {formatDate(item.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => visualizarPreview(item)}
                      className="text-purple-600 hover:text-purple-900"
                      title="Visualizar Preview dos Dados"
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => toggleIndicadorSelection(item.id)}
                      className={`${isIndicadorSelected(item.id) ? 'text-green-600' : 'text-gray-400'} hover:text-green-900`}
                      title={isIndicadorSelected(item.id) ? "Remover da seleção" : "Adicionar à seleção"}
                    >
                      <FiCheck className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                Nenhum indicador encontrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default IndicadoresSelectTable;