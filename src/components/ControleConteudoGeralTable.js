// Componente ControleConteudoGeralTable.js modificado com correção para UUIDs
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiUpload, FiCalendar, FiCheck, FiX, FiInfo, FiPlus, FiChevronUp, FiChevronDown, FiEdit, FiFolder } from 'react-icons/fi';
import AnexarDocumentoDialog from './AnexarDocumentoDialog';
import AdicionarLinhaConteudoDialog from './AdicionarLinhaConteudoDialog';
import EditarLinhaConteudoDialog from './EditarLinhaConteudoDialog';

const ControleConteudoGeralTable = ({ user }) => {
  const [controles, setControles] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]); // ✅ CORRIGIDO: Array de UUIDs (strings)
  const [loading, setLoading] = useState(true);
  const [anexarDocumentoId, setAnexarDocumentoId] = useState(null);
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [showAdicionarLinhaDialog, setShowAdicionarLinhaDialog] = useState(false);
  const [ordenacao, setOrdenacao] = useState({ campo: 'id', direcao: 'asc' });
  const [editarItemId, setEditarItemId] = useState(null);
  const [atualizandoVisibilidade, setAtualizandoVisibilidade] = useState({});

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) { // Permitir execução mesmo se não há projetos vinculados
      fetchCategorias();
      fetchProjetos();
      fetchControles();
    }
  }, [projetosVinculados]);

  // ✅ CORRIGIDO: Função para buscar projetos vinculados ao usuário (UUIDs)
  const fetchProjetosVinculados = async () => {
    try {
      console.log('🔍 Buscando projetos vinculados para usuário UUID:', user.id);
      
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', user.id);
      
      if (error) throw error;
      
      // ✅ CORRIGIDO: projeto_id são UUIDs (strings), não converter para números
      const projetoIds = data.map(item => item.projeto_id); // Manter como strings (UUIDs)
      setProjetosVinculados(projetoIds);
      
      console.log('✅ Projetos vinculados (UUIDs):', projetoIds);
      console.log('📊 Total de projetos vinculados:', projetoIds.length);
    } catch (error) {
      console.error('❌ Erro ao carregar projetos vinculados:', error);
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
      
      // ✅ CORRIGIDO: categoria.id são UUIDs (strings)
      const categoriasObj = {};
      data.forEach(cat => {
        categoriasObj[cat.id] = cat.nome; // cat.id é UUID (string)
      });
      
      setCategorias(categoriasObj);
      console.log('✅ Categorias carregadas (UUIDs):', Object.keys(categoriasObj).length);
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
    }
  };

  // ✅ CORRIGIDO: Buscar APENAS os projetos vinculados ao usuário (UUIDs)
  const fetchProjetos = async () => {
    try {
      if (projetosVinculados.length === 0) {
        setProjetos({});
        return;
      }

      console.log('🔍 Buscando projetos com UUIDs:', projetosVinculados);

      const { data, error } = await supabase
        .from('projetos')
        .select('*')
        .in('id', projetosVinculados); // ✅ CORRIGIDO: projetosVinculados são UUIDs (strings)
      
      if (error) throw error;
      
      // ✅ CORRIGIDO: projeto.id são UUIDs (strings)
      const projetosObj = {};
      data.forEach(proj => {
        projetosObj[proj.id] = proj.nome; // proj.id é UUID (string)
      });
      
      setProjetos(projetosObj);
      console.log('✅ Projetos carregados (UUIDs):', Object.keys(projetosObj).length);
    } catch (error) {
      console.error('❌ Erro ao carregar projetos:', error);
    }
  };

  // ✅ CORRIGIDO: Buscar os dados de controle_conteudo_geral APENAS dos projetos vinculados (UUIDs)
  const fetchControles = async () => {
    try {
      setLoading(true);
      
      // Se o usuário não tem projetos vinculados, não mostrar nenhum controle
      if (projetosVinculados.length === 0) {
        setControles([]);
        setLoading(false);
        return;
      }
      
      console.log('🔍 Filtrando controles por projetos UUID:', projetosVinculados);
      
      let query = supabase
        .from('controle_conteudo_geral')
        .select('*')
        .in('projeto_id', projetosVinculados); // ✅ CORRIGIDO: filtrar por UUIDs
      
      // ✅ CORRIGIDO: Aplicar filtros se estiverem definidos (UUIDs)
      if (filtroProjetoId && filtroProjetoId.trim() !== '') {
        query = query.eq('projeto_id', filtroProjetoId); // filtroProjetoId é UUID (string)
      }
      
      if (filtroCategoriaId && filtroCategoriaId.trim() !== '') {
        query = query.eq('categoria_id', filtroCategoriaId); // filtroCategoriaId é UUID (string)
      }
      
      // Aplicar ordenação
      if (ordenacao.campo === 'id_controleconteudo') {
        // Para base_id (id_controleconteudo), precisamos tratar valores nulos
        query = query.order('id_controleconteudo', { 
          ascending: ordenacao.direcao === 'asc',
          nullsFirst: ordenacao.direcao === 'asc' // Valores nulos aparecem primeiro em ordem ascendente
        });
      } else {
        query = query.order(ordenacao.campo, { 
          ascending: ordenacao.direcao === 'asc' 
        });
      }
      
      // Adicionar ordenação secundária para garantir consistência quando valores forem iguais
      if (ordenacao.campo !== 'id') {
        query = query.order('id', { ascending: true });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setControles(Array.isArray(data) ? data : []);
      console.log('✅ Controles carregados:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📄 Exemplos de projeto_id nos controles:', data.slice(0, 3).map(c => c.projeto_id));
      }
    } catch (error) {
      toast.error('Erro ao carregar dados de controle');
      console.error('❌ Erro ao carregar controles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para alternar a ordenação
  const handleToggleOrdenacao = (campo) => {
    if (ordenacao.campo === campo) {
      // Se já estiver ordenando por este campo, inverte a direção
      setOrdenacao({
        campo: campo,
        direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Se for um novo campo, começa com ascendente
      setOrdenacao({
        campo: campo,
        direcao: 'asc'
      });
    }
  };

  // Efeito para refazer a busca quando a ordenação mudar
  useEffect(() => {
    if (!loading && projetosVinculados.length >= 0) {
      fetchControles();
    }
  }, [ordenacao]);

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
      setControles(prevControles => 
        prevControles.map(item => 
          item.id === itemId 
            ? { ...item, visivel: novaVisibilidade }
            : item
        )
      );
      
      toast.success(`Item ${novaVisibilidade ? 'tornado visível' : 'ocultado'} com sucesso!`);
      
    } catch (error) {
      console.error('Erro ao alterar visibilidade:', error);
      toast.error('Erro ao alterar visibilidade do item');
    } finally {
      setAtualizandoVisibilidade(prev => ({ ...prev, [itemId]: false }));
    }
  };

  // Formata a data para exibição
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      // ✅ CORREÇÃO: Adiciona T00:00:00 se a string não incluir horário
      // Isso força o JavaScript a interpretar como horário local, não UTC
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

  // Função para atualizar o status de um documento após upload ou vínculo
  const handleDocumentoAnexado = async (controleId, documentoId = null) => {
    try {
      // Atualizar localmente
      setControles(prevControles => 
        prevControles.map(item => 
          item.id === controleId 
            ? { 
                ...item, 
                tem_documento: true
              } 
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

  // Função para lidar com o sucesso da edição de linha
  const handleEditarSuccess = () => {
    setEditarItemId(null);
    fetchControles(); // Recarrega os dados da tabela
    toast.success('Item atualizado com sucesso!');
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

  // Componente para exibir o ícone de ordenação
  const OrdenacaoIcon = ({ campo }) => {
    if (ordenacao.campo !== campo) return null;
    
    return ordenacao.direcao === 'asc' 
      ? <FiChevronUp className="ml-1 inline-block" /> 
      : <FiChevronDown className="ml-1 inline-block" />;
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
              Projeto (apenas projetos vinculados)
            </label>
            <select
              value={filtroProjetoId}
              onChange={(e) => setFiltroProjetoId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos os projetos vinculados</option>
              {/* ✅ CORRIGIDO: Tratar IDs como UUIDs (strings) */}
              {Object.entries(projetos).map(([uuid, nome]) => (
                <option key={uuid} value={uuid}>
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
              {/* ✅ CORRIGIDO: Tratar IDs como UUIDs (strings) */}
              {Object.entries(categorias).map(([uuid, nome]) => (
                <option key={uuid} value={uuid}>
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
          onSuccess={(documentoId) => handleDocumentoAnexado(anexarDocumentoId, documentoId)}
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

      {/* Modal para editar linha de conteúdo */}
      {editarItemId && (
        <EditarLinhaConteudoDialog
          controleItem={controles.find(item => item.id === editarItemId)}
          onClose={() => setEditarItemId(null)}
          onSuccess={handleEditarSuccess}
          categorias={categorias}
          projetos={projetos}
        />
      )}

      {/* Tabela de Controle Geral */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr>
              <th 
                className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleToggleOrdenacao('id')}
              >
                <div className="flex items-center">
                  ID
                  <OrdenacaoIcon campo="id" />
                </div>
              </th>
              <th 
                className="px-6 py-3 bg-gray-100 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer"
                onClick={() => handleToggleOrdenacao('id_controleconteudo')}
              >
                <div className="flex items-center">
                  Base ID
                  <OrdenacaoIcon campo="id_controleconteudo" />
                </div>
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
                Visível
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-center">
                      {atualizandoVisibilidade[item.id] ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      ) : (
                        <input
                          type="checkbox"
                          checked={item.visivel || false}
                          onChange={() => toggleVisibilidade(item.id, item.visivel)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          title={item.visivel ? 'Clique para ocultar' : 'Clique para tornar visível'}
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {/* Botão para editar linha */}
                      <button
                        onClick={() => setEditarItemId(item.id)}
                        className="text-indigo-600 hover:text-indigo-900 flex items-center"
                        title="Editar Item"
                      >
                        <FiEdit className="mr-1" />
                        Editar
                      </button>
                      
                      {/* Botão para anexar documento (apenas se não tiver documento) */}
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
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12" className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhum item de controle encontrado para os projetos vinculados
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