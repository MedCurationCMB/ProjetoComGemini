import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiUpload, FiCalendar, FiCheck, FiX, FiInfo, FiPlus } from 'react-icons/fi';
import AnexarDocumentoDialog from './AnexarDocumentoDialog';
import AdicionarLinhaConteudoDialog from './AdicionarLinhaConteudoDialog';

const ControleConteudoGeralTable = () => {
  const [controles, setControles] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [loading, setLoading] = useState(true);
  const [anexarDocumentoId, setAnexarDocumentoId] = useState(null);
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [showAdicionarLinhaDialog, setShowAdicionarLinhaDialog] = useState(false);

  useEffect(() => {
    fetchCategorias();
    fetchProjetos();
    fetchControles();
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

  // Buscar os dados de controle_conteudo_geral
  const fetchControles = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('controle_conteudo_geral')
        .select('*')
        .order('prazo_entrega', { ascending: true });
      
      // Aplicar filtros se estiverem definidos
      if (filtroProjetoId) {
        query = query.eq('projeto_id', filtroProjetoId);
      }
      
      if (filtroCategoriaId) {
        query = query.eq('categoria_id', filtroCategoriaId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setControles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erro ao carregar dados de controle');
      console.error(error);
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

  // Função para atualizar o status de um documento após upload
  const handleDocumentoAnexado = async (controleId) => {
    try {
      // Atualizar o status na tabela controle_conteudo_geral
      const { error } = await supabase
        .from('controle_conteudo_geral')
        .update({ tem_documento: true })
        .eq('id', controleId);
      
      if (error) throw error;
      
      // Atualizar localmente
      setControles(prevControles => 
        prevControles.map(item => 
          item.id === controleId 
            ? { ...item, tem_documento: true } 
            : item
        )
      );
      
      toast.success('Documento anexado com sucesso!');
      setAnexarDocumentoId(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do documento');
    }
  };

  // Função para lidar com o sucesso da adição de linha
  const handleAdicionarLinhaSuccess = () => {
    setShowAdicionarLinhaDialog(false);
    fetchControles(); // Recarrega os dados da tabela
    toast.success('Operação concluída com sucesso!');
  };

  // Aplicar filtros
  const aplicarFiltros = () => {
    fetchControles();
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltroProjetoId('');
    setFiltroCategoriaId('');
    // Refetch sem filtros
    setTimeout(fetchControles, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Filtros */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">Filtros</h3>
          
          {/* Botão Adicionar Linha de Conteúdo */}
          <button
            onClick={() => setShowAdicionarLinhaDialog(true)}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            <FiPlus className="mr-2" />
            Adicionar Linha de Conteúdo
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Projeto
            </label>
            <select
              value={filtroProjetoId}
              onChange={(e) => setFiltroProjetoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos os projetos</option>
              {Object.entries(projetos).map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              value={filtroCategoriaId}
              onChange={(e) => setFiltroCategoriaId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas as categorias</option>
              {Object.entries(categorias).map(([id, nome]) => (
                <option key={id} value={id}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end space-x-2">
            <button 
              onClick={aplicarFiltros}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Aplicar
            </button>
            <button 
              onClick={limparFiltros}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Modal para anexar documento */}
      {anexarDocumentoId && (
        <AnexarDocumentoDialog
          controleId={anexarDocumentoId} 
          onClose={() => setAnexarDocumentoId(null)}
          onSuccess={() => handleDocumentoAnexado(anexarDocumentoId)}
          controleItem={controles.find(item => item.id === anexarDocumentoId)}
          categorias={categorias}
          projetos={projetos}
          isGeralTable={true} // Flag para indicar que é a tabela geral
        />
      )}

      {/* Modal para adicionar linha de conteúdo */}
      {showAdicionarLinhaDialog && (
        <AdicionarLinhaConteudoDialog
          onClose={() => setShowAdicionarLinhaDialog(false)}
          onSuccess={handleAdicionarLinhaSuccess}
          categorias={categorias}
          projetos={projetos}
        />
      )}

      {/* Tabela de Controle Geral */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Base ID
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Projeto
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Prazo Inicial
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Prazo Atual
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Recorrência
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Obrigatório
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {controles.length > 0 ? (
              controles.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.id_controleconteudo || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {projetos[item.projeto_id] || 'Projeto indisponível'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {categorias[item.categoria_id] || 'Categoria indisponível'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.descricao}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FiCalendar className="mr-1 text-gray-400" />
                      {formatDate(item.prazo_entrega_inicial)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FiCalendar className="mr-1 text-blue-500" />
                      {formatDate(item.prazo_entrega)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.recorrencia ? (
                      <span>
                        {item.recorrencia}
                        {item.tempo_recorrencia ? ` (${item.tempo_recorrencia})` : ''}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.obrigatorio ? (
                      <span className="text-green-600 flex items-center">
                        <FiCheck className="mr-1" />
                        Sim
                      </span>
                    ) : (
                      <span className="text-gray-500 flex items-center">
                        <FiX className="mr-1" />
                        Não
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.tem_documento ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Documento Anexado
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Sem Documento
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {!item.tem_documento && (
                      <button
                        onClick={() => setAnexarDocumentoId(item.id)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                        title="Anexar Documento"
                      >
                        <FiUpload className="mr-1" />
                        Anexar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum item de controle encontrado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ControleConteudoGeralTable;