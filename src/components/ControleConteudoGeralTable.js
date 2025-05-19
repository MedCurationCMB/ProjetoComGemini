import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiFile, FiUpload, FiCalendar, FiCheck, FiX, FiInfo, FiPlus, FiChevronUp, FiChevronDown, FiEdit, FiSave, FiRefreshCw } from 'react-icons/fi';
import AnexarDocumentoDialog from './AnexarDocumentoDialog';
import AdicionarLinhaConteudoDialog from './AdicionarLinhaConteudoDialog';

const ControleConteudoGeralTable = () => {
  const [controles, setControles] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [loading, setLoading] = useState(true);
  const [anexarDocumentoId, setAnexarDocumentoId] = useState(null);
  const [substituirDocumentoId, setSubstituirDocumentoId] = useState(null); // NOVO: Para substituir documento
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [showAdicionarLinhaDialog, setShowAdicionarLinhaDialog] = useState(false);
  const [ordenacao, setOrdenacao] = useState({ campo: 'id', direcao: 'asc' });
  
  // NOVO: Estados para edição de linha
  const [itemEditando, setItemEditando] = useState(null);
  const [formEditando, setFormEditando] = useState({
    prazo_entrega: ''
  });
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);

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
        .select('*');
      
      // Aplicar filtros se estiverem definidos
      if (filtroProjetoId) {
        query = query.eq('projeto_id', filtroProjetoId);
      }
      
      if (filtroCategoriaId) {
        query = query.eq('categoria_id', filtroCategoriaId);
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
    } catch (error) {
      toast.error('Erro ao carregar dados de controle');
      console.error(error);
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
    if (!loading) {
      fetchControles();
    }
  }, [ordenacao]);

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

  // Função para iniciar edição de um item
  const iniciarEdicao = (item) => {
    setItemEditando(item.id);
    setFormEditando({
      prazo_entrega: item.prazo_entrega || ''
    });
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setItemEditando(null);
    setFormEditando({
      prazo_entrega: ''
    });
  };

  // Função para manipular mudanças nos campos do formulário
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormEditando(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para salvar edição
  const salvarEdicao = async () => {
    if (!itemEditando) return;
    
    try {
      setSalvandoEdicao(true);
      
      // Validar prazo de entrega
      if (!formEditando.prazo_entrega) {
        toast.error('O prazo de entrega é obrigatório');
        setSalvandoEdicao(false);
        return;
      }
      
      // Atualizar no Supabase
      const { data, error } = await supabase
        .from('controle_conteudo_geral')
        .update({
          prazo_entrega: formEditando.prazo_entrega
        })
        .eq('id', itemEditando)
        .select();
        
      if (error) throw error;
      
      // Atualizar lista local
      setControles(controles.map(item => 
        item.id === itemEditando
          ? { ...item, prazo_entrega: formEditando.prazo_entrega }
          : item
      ));
      
      toast.success('Item atualizado com sucesso!');
      
      // Sair do modo de edição
      setItemEditando(null);
      
    } catch (error) {
      console.error('Erro ao salvar edição:', error);
      toast.error('Erro ao salvar as alterações');
    } finally {
      setSalvandoEdicao(false);
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
      
      // Fechar dialogos
      setAnexarDocumentoId(null);
      setSubstituirDocumentoId(null);
      
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do documento');
    }
  };

  // NOVO: Função para substituir documento - Desvincular o documento antigo e vincular o novo
  const handleDocumentoSubstituido = async (controleId, documentoId = null) => {
    try {
      // Obter a sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para esta ação');
        return;
      }
      
      // Remover todos os vínculos atuais para este controle
      const { error: deleteError } = await supabase
        .from('documento_controle_geral_rel')
        .delete()
        .eq('controle_id', controleId);
        
      if (deleteError) {
        console.error('Erro ao remover vínculo antigo:', deleteError);
        // Continuar mesmo com erro, para tentar criar o novo vínculo
      }
      
      // Agora o documento já foi anexado, mas atualizamos a mensagem
      toast.success('Documento substituído com sucesso!');
      
      // Fechar diálogo
      setSubstituirDocumentoId(null);
      
    } catch (error) {
      console.error('Erro ao substituir documento:', error);
      toast.error('Erro ao substituir documento');
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
          onSuccess={(documentoId) => handleDocumentoAnexado(anexarDocumentoId, documentoId)}
          controleItem={controles.find(item => item.id === anexarDocumentoId)}
          categorias={categorias}
          projetos={projetos}
          isGeralTable={true} // Flag para indicar que é a tabela geral
        />
      )}

      {/* Modal para substituir documento */}
      {substituirDocumentoId && (
        <AnexarDocumentoDialog
          controleId={substituirDocumentoId} 
          onClose={() => setSubstituirDocumentoId(null)}
          onSuccess={(documentoId) => handleDocumentoSubstituido(substituirDocumentoId, documentoId)}
          controleItem={controles.find(item => item.id === substituirDocumentoId)}
          categorias={categorias}
          projetos={projetos}
          isGeralTable={true}
          isSubstituicao={true} // NOVO: Flag para indicar que é uma substituição
          tituloModal="Substituir Documento" // NOVO: Título personalizado
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
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {controles.length > 0 ? (
              controles.map((item) => (
                <tr key={item.id} className={itemEditando === item.id ? "bg-blue-50" : ""}>
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
                    {itemEditando === item.id ? (
                      // Modo de edição - campo de data
                      <input
                        type="date"
                        name="prazo_entrega"
                        value={formEditando.prazo_entrega}
                        onChange={handleInputChange}
                        className="px-2 py-1 border border-gray-300 rounded w-full"
                      />
                    ) : (
                      // Exibição normal
                      <div className="flex items-center">
                        <FiCalendar className="mr-1 text-blue-500" />
                        {formatDate(item.prazo_entrega)}
                      </div>
                    )}
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
                    {itemEditando === item.id ? (
                      // Botões de edição
                      <div className="flex space-x-2">
                        <button
                          onClick={salvarEdicao}
                          disabled={salvandoEdicao}
                          className={`${
                            salvandoEdicao
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-green-600 hover:bg-green-700'
                          } text-white px-3 py-1 rounded flex items-center text-xs`}
                          title="Salvar"
                        >
                          {salvandoEdicao ? (
                            <>
                              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1"></div>
                              Salvando
                            </>
                          ) : (
                            <>
                              <FiSave className="mr-1" />
                              Salvar
                            </>
                          )}
                        </button>
                        <button
                          onClick={cancelarEdicao}
                          disabled={salvandoEdicao}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded flex items-center text-xs"
                          title="Cancelar"
                        >
                          <FiX className="mr-1" />
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      // Botões padrão
                      <div className="flex flex-col space-y-2">
                        {!item.tem_documento ? (
                          // Botão para anexar documento (se não tiver documento)
                          <button
                            onClick={() => setAnexarDocumentoId(item.id)}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                            title="Anexar Documento"
                          >
                            <FiUpload className="mr-1" />
                            Anexar
                          </button>
                        ) : (
                          // Botão para substituir documento (se já tiver documento)
                          <button
                            onClick={() => setSubstituirDocumentoId(item.id)}
                            className="text-amber-600 hover:text-amber-800 flex items-center"
                            title="Substituir Documento"
                          >
                            <FiRefreshCw className="mr-1" />
                            Substituir
                          </button>
                        )}
                        
                        {/* Botão para editar o prazo */}
                        <button
                          onClick={() => iniciarEdicao(item)}
                          className="text-purple-600 hover:text-purple-800 flex items-center"
                          title="Editar Prazo"
                        >
                          <FiEdit className="mr-1" />
                          Editar Prazo
                        </button>
                      </div>
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