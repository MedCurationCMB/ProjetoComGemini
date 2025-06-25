// Componente CopiaControleIndicadorGeralTable.js - Ajustado para novo layout
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiPlus, FiChevronUp, FiChevronDown, FiEdit, FiFolder, FiUpload, FiCheck, FiX, FiRefreshCw } from 'react-icons/fi';
import AdicionarLinhaIndicadorGeralDialog from './AdicionarLinhaIndicadorGeralDialog';
import EditarLinhaIndicadorGeralDialog from './EditarLinhaIndicadorGeralDialog';
import AnexarDocumentoIndicadorDialog from './AnexarDocumentoIndicadorDialog';
import AtualizacaoMassaIndicadorDialog from './AtualizacaoMassaIndicadorDialog';
import AtualizacaoInlineIndicadorDialog from './AtualizacaoInlineIndicadorDialog';
import PreenchimentoAutomaticoDialog from './PreenchimentoAutomaticoDialog';

const CopiaControleIndicadorGeralTable = ({ 
  user, 
  filtroTipoIndicador = 'todos',
  filtroValorPendente = false,
  setFiltroValorPendente,
  filtrosPrazo,
  setFiltrosPrazo
}) => {
  const [controles, setControles] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [tiposIndicador, setTiposIndicador] = useState({});
  const [subcategorias, setSubcategorias] = useState({});
  const [tiposUnidadeIndicador, setTiposUnidadeIndicador] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [showAdicionarLinhaDialog, setShowAdicionarLinhaDialog] = useState(false);
  const [showAtualizacaoMassaDialog, setShowAtualizacaoMassaDialog] = useState(false);
  const [showAtualizacaoInlineDialog, setShowAtualizacaoInlineDialog] = useState(false);
  const [showPreenchimentoAutomaticoDialog, setShowPreenchimentoAutomaticoDialog] = useState(false);
  const [ordenacao, setOrdenacao] = useState({ campo: 'id', direcao: 'asc' });
  const [editarItemId, setEditarItemId] = useState(null);
  const [anexarDocumentoId, setAnexarDocumentoId] = useState(null);

  // ✅ REMOÇÃO: Não mostrar mais os filtros internos já que agora estão no header
  // A seção de filtros será removida do componente

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) {
      fetchCategorias();
      fetchProjetos();
      fetchTiposIndicador();
      fetchSubcategorias();
      fetchTiposUnidadeIndicador();
      fetchControles();
    }
  }, [projetosVinculados]);

  // Recarregar dados quando os filtros mudarem
  useEffect(() => {
    if (!loading && projetosVinculados.length >= 0) {
      fetchControles();
    }
  }, [filtroTipoIndicador, filtroValorPendente, filtrosPrazo]);

  // Função para calcular período
  const calcularPeriodo = (tipo) => {
    const hoje = new Date();
    const dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    let dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    switch (tipo) {
      case '15dias':
        dataFim.setDate(dataFim.getDate() + 15);
        break;
      case '30dias':
        dataFim.setDate(dataFim.getDate() + 30);
        break;
      case '60dias':
        dataFim.setDate(dataFim.getDate() + 60);
        break;
      default:
        return { dataInicio: null, dataFim: null };
    }

    const formatarDataLocal = (data) => {
      const ano = data.getFullYear();
      const mes = String(data.getMonth() + 1).padStart(2, '0');
      const dia = String(data.getDate()).padStart(2, '0');
      return `${ano}-${mes}-${dia}`;
    };

    return {
      dataInicio: formatarDataLocal(dataInicio),
      dataFim: formatarDataLocal(dataFim)
    };
  };

  // Função para buscar projetos vinculados ao usuário
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
      console.log('Projetos carregados:', projetosObj);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  // Buscar tipos de indicador
  const fetchTiposIndicador = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_indicador')
        .select('*');
      
      if (error) throw error;
      
      const tiposObj = {};
      data.forEach(tipo => {
        tiposObj[tipo.id] = tipo.tipo;
      });
      
      setTiposIndicador(tiposObj);
    } catch (error) {
      console.error('Erro ao carregar tipos de indicador:', error);
    }
  };

  // Buscar subcategorias
  const fetchSubcategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('subcategorias')
        .select('*');
      
      if (error) throw error;
      
      const subcategoriasObj = {};
      data.forEach(sub => {
        subcategoriasObj[sub.id] = sub.nome;
      });
      
      setSubcategorias(subcategoriasObj);
    } catch (error) {
      console.error('Erro ao carregar subcategorias:', error);
    }
  };

  // Buscar tipos de unidade de indicador
  const fetchTiposUnidadeIndicador = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_unidade_indicador')
        .select('*');
      
      if (error) throw error;
      
      const tiposUnidadeObj = {};
      data.forEach(tipo => {
        tiposUnidadeObj[tipo.id] = tipo.tipo;
      });
      
      setTiposUnidadeIndicador(tiposUnidadeObj);
    } catch (error) {
      console.error('Erro ao carregar tipos de unidade de indicador:', error);
    }
  };

  // Aplicar filtro por tipo de indicador
  const aplicarFiltroTipoIndicador = (query) => {
    if (filtroTipoIndicador === 'realizado') {
      return query.eq('tipo_indicador', 1); // Tipo 1 = Realizado
    } else if (filtroTipoIndicador === 'meta') {
      return query.eq('tipo_indicador', 2); // Tipo 2 = Meta
    }
    // Para 'todos', não aplicar filtro adicional
    return query;
  };

  // Aplicar filtro por valor pendente
  const aplicarFiltroValorPendente = (query) => {
    if (filtroValorPendente) {
      return query.is('valor_indicador_apresentado', null);
    }
    return query;
  };

  // Aplicar filtros de prazo
  const aplicarFiltrosPrazo = (query) => {
    if (!filtrosPrazo) return query;

    let dataInicioFiltro = null;
    let dataFimFiltro = null;

    if (filtrosPrazo.periodo && filtrosPrazo.periodo !== 'personalizado') {
      const periodo = calcularPeriodo(filtrosPrazo.periodo);
      dataInicioFiltro = periodo.dataInicio;
      dataFimFiltro = periodo.dataFim;
    } else if (filtrosPrazo.periodo === 'personalizado' && filtrosPrazo.data_inicio && filtrosPrazo.data_fim) {
      dataInicioFiltro = filtrosPrazo.data_inicio;
      dataFimFiltro = filtrosPrazo.data_fim;
    }

    if (dataInicioFiltro && dataFimFiltro) {
      query = query.gte('prazo_entrega', dataInicioFiltro)
                   .lte('prazo_entrega', dataFimFiltro);
    }

    return query;
  };

  // Buscar os dados com todos os filtros aplicados
  const fetchControles = async () => {
    try {
      setLoading(true);
      
      if (projetosVinculados.length === 0) {
        setControles([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('controle_indicador_geral')
        .select('*')
        .in('projeto_id', projetosVinculados);
      
      // Aplicar todos os filtros
      query = aplicarFiltroTipoIndicador(query);
      query = aplicarFiltroValorPendente(query);
      query = aplicarFiltrosPrazo(query);
      
      // Aplicar outros filtros se estiverem definidos
      if (filtroProjetoId) {
        query = query.eq('projeto_id', filtroProjetoId);
      }
      
      if (filtroCategoriaId) {
        query = query.eq('categoria_id', filtroCategoriaId);
      }
      
      // Aplicar ordenação
      if (ordenacao.campo === 'id_controleindicador') {
        query = query.order('id_controleindicador', { 
          ascending: ordenacao.direcao === 'asc',
          nullsFirst: ordenacao.direcao === 'asc'
        });
      } else {
        query = query.order(ordenacao.campo, { 
          ascending: ordenacao.direcao === 'asc' 
        });
      }
      
      // Adicionar ordenação secundária
      if (ordenacao.campo !== 'id') {
        query = query.order('id', { ascending: true });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setControles(Array.isArray(data) ? data : []);
      console.log(`Controles carregados (filtro: ${filtroTipoIndicador}):`, data?.length || 0);
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
      setOrdenacao({
        campo: campo,
        direcao: ordenacao.direcao === 'asc' ? 'desc' : 'asc'
      });
    } else {
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

  // Função para formatar data sem problemas de fuso horário
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      // Se for uma string no formato YYYY-MM-DD, criar a data sem conversão de fuso
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
      
      // Para outros formatos (com horário), usar parsing normal
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

  // Função para lidar com o sucesso da adição de linha
  const handleAdicionarLinhaSuccess = () => {
    setShowAdicionarLinhaDialog(false);
    fetchControles();
    toast.success('Operação concluída com sucesso!');
  };

  // Função para lidar com o sucesso da edição de linha
  const handleEditarSuccess = () => {
    setEditarItemId(null);
    fetchControles();
    toast.success('Item atualizado com sucesso!');
  };

  // Função para lidar com o sucesso da atualização em massa (planilha)
  const handleAtualizacaoMassaSuccess = () => {
    setShowAtualizacaoMassaDialog(false);
    fetchControles();
    toast.success('Atualização em massa (planilha) concluída!');
  };

  // Função para lidar com o sucesso da atualização inline
  const handleAtualizacaoInlineSuccess = () => {
    setShowAtualizacaoInlineDialog(false);
    fetchControles();
    toast.success('Atualização inline concluída!');
  };

  // Função para lidar com o sucesso do preenchimento automático
  const handlePreenchimentoAutomaticoSuccess = () => {
    setShowPreenchimentoAutomaticoDialog(false);
    fetchControles();
    toast.success('Preenchimento automático concluído!');
  };

  // Obter estatísticas dos indicadores para a aba ativa
  const getEstatisticasAba = () => {
    const total = controles.length;
    const comDocumento = controles.filter(item => item.tem_documento).length;
    const semDocumento = total - comDocumento;
    const obrigatorios = controles.filter(item => item.obrigatorio).length;
    const comValor = controles.filter(item => item.valor_indicador_apresentado !== null && item.valor_indicador_apresentado !== '').length;
    const semValor = total - comValor;
    
    return { total, comDocumento, semDocumento, obrigatorios, comValor, semValor };
  };

  const estatisticas = getEstatisticasAba();

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
      {/* ✅ NOVO: Estatísticas da aba ativa com estilo moderno */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900">Total</p>
              <p className="text-lg font-semibold text-blue-700">{estatisticas.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <FiCheck className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900">Com Documento</p>
              <p className="text-lg font-semibold text-green-700">{estatisticas.comDocumento}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                <FiX className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-900">Sem Documento</p>
              <p className="text-lg font-semibold text-yellow-700">{estatisticas.semDocumento}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900">Obrigatórios</p>
              <p className="text-lg font-semibold text-purple-700">{estatisticas.obrigatorios}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">?</span>
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-900">Sem Valor</p>
              <p className="text-lg font-semibold text-red-700">{estatisticas.semValor}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ NOVO: Botões de Ação em estilo moderno */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Ações Disponíveis</h3>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {/* Botão Atualizar Informações em Massa (Planilha) */}
          <button
            onClick={() => setShowAtualizacaoMassaDialog(true)}
            disabled={controles.length === 0}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              controles.length === 0
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
            title={controles.length === 0 ? 'Nenhum registro disponível para atualização' : 'Atualizar informações em massa via Excel'}
          >
            <FiRefreshCw className="mr-2" />
            Atualizar Informações em Massa (Planilha)
          </button>
          
          {/* Botão Atualizar Informações em Massa (Inline) */}
          <button
            onClick={() => setShowAtualizacaoInlineDialog(true)}
            disabled={controles.length === 0}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              controles.length === 0
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
            title={controles.length === 0 ? 'Nenhum registro disponível para edição' : 'Editar múltiplos registros ao mesmo tempo'}
          >
            <FiEdit className="mr-2" />
            Atualizar Informações em Massa
          </button>
          
          {/* Botão Adicionar Linha de Indicador Geral */}
          <button
            onClick={() => setShowAdicionarLinhaDialog(true)}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            <FiPlus className="mr-2" />
            Adicionar Linha de Indicador Geral
          </button>

          {/* Botão Preencher Automático Período de Referência */}
          <button
            onClick={() => setShowPreenchimentoAutomaticoDialog(true)}
            disabled={controles.length === 0}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium ${
              controles.length === 0
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
            title={controles.length === 0 ? 'Nenhum registro disponível' : 'Preencher automaticamente períodos de referência vazios baseado na recorrência'}
          >
            <FiCalendar className="mr-2" />
            Preencher Automático Período de Referência
          </button>
        </div>
      </div>

      {/* ✅ REMOÇÃO: A seção de filtros foi removida pois agora está no header da página */}

      {/* Modal para adicionar linha de indicador geral */}
      {showAdicionarLinhaDialog && (
        <AdicionarLinhaIndicadorGeralDialog
          onClose={() => setShowAdicionarLinhaDialog(false)}
          onSuccess={handleAdicionarLinhaSuccess}
          categorias={categorias}
          projetos={projetos}
          tiposIndicador={tiposIndicador}
          subcategorias={subcategorias}
          tiposUnidadeIndicador={tiposUnidadeIndicador}
        />
      )}

      {/* Modal para atualização em massa (planilha) */}
      {showAtualizacaoMassaDialog && (
        <AtualizacaoMassaIndicadorDialog
          onClose={() => setShowAtualizacaoMassaDialog(false)}
          onSuccess={handleAtualizacaoMassaSuccess}
          dadosTabela={controles} // Passa os dados atuais da tabela (com filtros aplicados)
          categorias={categorias}
          projetos={projetos}
          tiposIndicador={tiposIndicador}
          subcategorias={subcategorias}
          tiposUnidadeIndicador={tiposUnidadeIndicador}
        />
      )}

      {/* Modal para atualização inline */}
      {showAtualizacaoInlineDialog && (
        <AtualizacaoInlineIndicadorDialog
          onClose={() => setShowAtualizacaoInlineDialog(false)}
          onSuccess={handleAtualizacaoInlineSuccess}
          dadosTabela={controles} // Passa os dados atuais da tabela (com filtros aplicados)
          categorias={categorias}
          projetos={projetos}
          tiposIndicador={tiposIndicador}
          subcategorias={subcategorias}
          tiposUnidadeIndicador={tiposUnidadeIndicador}
        />
      )}

      {/* Modal para editar linha de indicador geral */}
      {editarItemId && (
        <EditarLinhaIndicadorGeralDialog
          controleItem={controles.find(item => item.id === editarItemId)}
          onClose={() => setEditarItemId(null)}
          onSuccess={handleEditarSuccess}
          categorias={categorias}
          projetos={projetos}
          tiposIndicador={tiposIndicador}
          subcategorias={subcategorias}
          tiposUnidadeIndicador={tiposUnidadeIndicador}
        />
      )}

      {/* Modal para anexar documento */}
      {anexarDocumentoId && (
        <AnexarDocumentoIndicadorDialog
          controleId={anexarDocumentoId} 
          onClose={() => setAnexarDocumentoId(null)}
          onSuccess={(documentoId) => handleDocumentoAnexado(anexarDocumentoId, documentoId)}
          controleItem={controles.find(item => item.id === anexarDocumentoId)}
          categorias={categorias}
          projetos={projetos}
          tiposIndicador={tiposIndicador}
          subcategorias={subcategorias}
          tiposUnidadeIndicador={tiposUnidadeIndicador}
        />
      )}

      {/* Modal para preenchimento automático */}
      {showPreenchimentoAutomaticoDialog && (
        <PreenchimentoAutomaticoDialog
          onClose={() => setShowPreenchimentoAutomaticoDialog(false)}
          onSuccess={handlePreenchimentoAutomaticoSuccess}
          dadosTabela={controles} // Passa os dados atuais da tabela (com filtros aplicados)
        />
      )}

      {/* ✅ NOVO: TABELA com estilo moderno */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {/* ID */}
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleToggleOrdenacao('id')}
                >
                  <div className="flex items-center">
                    ID
                    <OrdenacaoIcon campo="id" />
                  </div>
                </th>
                
                {/* PROJETO */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projeto
                </th>
                
                {/* CATEGORIA */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                
                {/* INDICADOR */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Indicador
                </th>
                
                {/* SUBCATEGORIA */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subcategoria
                </th>
                
                {/* PRAZO ATUAL */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prazo Atual
                </th>
                
                {/* PERÍODO DE REFERÊNCIA */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Período de Referência
                </th>
                
                {/* VALOR APRESENTADO */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Apresentado
                </th>
                
                {/* UNIDADE DO INDICADOR */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidade do Indicador
                </th>
                
                {/* VALOR CALCULADO */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Calculado
                </th>
                
                {/* AÇÕES */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {controles.length > 0 ? (
                controles.map((item, index) => (
                  <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {/* ID */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {item.id}
                    </td>
                    
                    {/* PROJETO */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={projetos[item.projeto_id] || 'Projeto indisponível'}>
                        {projetos[item.projeto_id] || 'Projeto indisponível'}
                      </div>
                    </td>
                    
                    {/* CATEGORIA */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={categorias[item.categoria_id] || 'Categoria indisponível'}>
                        {categorias[item.categoria_id] || 'Categoria indisponível'}
                      </div>
                    </td>
                    
                    {/* INDICADOR */}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-sm" title={item.indicador}>
                        {item.indicador}
                      </div>
                    </td>
                    
                    {/* SUBCATEGORIA */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={subcategorias[item.subcategoria_id] || 'Subcategoria indisponível'}>
                        {subcategorias[item.subcategoria_id] || 'Subcategoria indisponível'}
                      </div>
                    </td>
                    
                    {/* PRAZO ATUAL */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FiCalendar className="mr-1 text-blue-500" />
                        {formatDate(item.prazo_entrega)}
                      </div>
                    </td>
                    
                    {/* PERÍODO DE REFERÊNCIA */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FiCalendar className="mr-1 text-green-500" />
                        {formatDate(item.periodo_referencia)}
                      </div>
                    </td>
                    
                    {/* VALOR APRESENTADO */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.valor_indicador_apresentado ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {item.valor_indicador_apresentado}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          -
                        </span>
                      )}
                    </td>
                    
                    {/* UNIDADE DO INDICADOR */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {tiposUnidadeIndicador[item.tipo_unidade_indicador] ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tiposUnidadeIndicador[item.tipo_unidade_indicador]}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    
                    {/* VALOR CALCULADO */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.valor_indicador ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {item.valor_indicador}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    
                    {/* AÇÕES */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {/* Botão para editar linha */}
                        <button
                          onClick={() => setEditarItemId(item.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          title="Editar Item"
                        >
                          <FiEdit className="mr-1 h-3 w-3" />
                          Editar
                        </button>
                        
                        {/* Botão para anexar documento (apenas se não tiver documento) */}
                        {!item.tem_documento && (
                          <button
                            onClick={() => setAnexarDocumentoId(item.id)}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-xs leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            title="Anexar Documento"
                          >
                            <FiUpload className="mr-1 h-3 w-3" />
                            Anexar
                          </button>
                        )}
                        
                        {/* Indicador visual se tem documento */}
                        {item.tem_documento && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <FiCheck className="mr-1 h-3 w-3" />
                            Com Doc
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="px-6 py-8 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center">
                      <FiFolder className="h-12 w-12 text-gray-300 mb-4" />
                      <div>
                        {/* Mensagem adaptada para o filtro por tipo */}
                        {filtroTipoIndicador === 'todos' && 'Nenhum item de controle encontrado para os projetos vinculados'}
                        {filtroTipoIndicador === 'realizado' && 'Nenhum indicador do tipo "Realizado" encontrado para os projetos vinculados'}
                        {filtroTipoIndicador === 'meta' && 'Nenhum indicador do tipo "Meta" encontrado para os projetos vinculados'}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ NOVO: Informações adicionais sobre atualização em massa */}
      {controles.length > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <FiRefreshCw className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Duas Opções de Atualização em Massa</h4>
              <p className="text-sm text-blue-700 mt-1">
                Você pode atualizar múltiplos indicadores de duas formas diferentes:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li>• <strong>Atualização via Planilha (🟠 Laranja):</strong> Baixe Excel → Edite → Faça upload → Confirme</li>
                <li>• <strong>Atualização Inline (🟣 Roxo):</strong> Edite diretamente na interface, todos os registros visíveis</li>
                <li>• <strong>Campos editáveis:</strong> Indicador, Observação, Prazo, Período de Referência, Valor Apresentado, Unidade e Obrigatório</li>
                <li>• <strong>Respeita filtros:</strong> Ambas as opções trabalham apenas com os dados visíveis na tabela</li>
              </ul>
              <div className="mt-3 p-3 bg-white rounded-md border border-blue-200">
                <p className="text-sm text-blue-700">
                  <strong>📊 Registros disponíveis para atualização:</strong> {controles.length} indicador(es)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Baseado nos filtros aplicados: {filtroTipoIndicador} • {filtroValorPendente ? 'Apenas sem valor' : 'Todos os valores'} • {filtrosPrazo?.periodo || 'Sem filtro de prazo'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CopiaControleIndicadorGeralTable;