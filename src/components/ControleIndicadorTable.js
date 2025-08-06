import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiCalendar, FiCheck, FiX, FiPlus, FiFolder, FiFilter, FiSearch, FiInfo, FiTrash2, FiEdit } from 'react-icons/fi';
import AdicionarLinhaIndicadorBaseDialog from './AdicionarLinhaIndicadorBaseDialog';
import DeleteIndicadorDialog from './DeleteIndicadorDialog';
import EdicaoInlineControleIndicadorDialog from './EdicaoInlineControleIndicadorDialog';
import EditarLinhaIndicadorDialog from './EditarLinhaIndicadorDialog'; // ✅ NOVO IMPORT

const ControleIndicadorTable = ({ user }) => {
  const [controles, setControles] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [subcategorias, setSubcategorias] = useState({});
  const [tiposUnidadeIndicador, setTiposUnidadeIndicador] = useState({});
  const [loading, setLoading] = useState(true);
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');
  const [showAdicionarLinhaDialog, setShowAdicionarLinhaDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEdicaoDialog, setShowEdicaoDialog] = useState(false);
  const [showEditarDialog, setShowEditarDialog] = useState(false); // ✅ NOVO STATE
  const [indicadorToDelete, setIndicadorToDelete] = useState(null);
  const [indicadorToEdit, setIndicadorToEdit] = useState(null); // ✅ NOVO STATE
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) {
      fetchCategorias();
      fetchProjetos();
      fetchSubcategorias();
      fetchTiposUnidadeIndicador();
      fetchControles();
    }
  }, [projetosVinculados, filtroProjetoId, filtroCategoriaId, searchTerm]);

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

  // Buscar tipos de unidade do indicador
  const fetchTiposUnidadeIndicador = async () => {
    try {
      const { data, error } = await supabase
        .from('tipos_unidade_indicador')
        .select('*')
        .order('tipo', { ascending: true });
      
      if (error) throw error;
      
      const tiposObj = {};
      data.forEach(tipo => {
        tiposObj[tipo.id] = tipo.tipo;
      });
      
      setTiposUnidadeIndicador(tiposObj);
      console.log('Tipos de unidade do indicador carregados:', tiposObj);
    } catch (error) {
      console.error('Erro ao carregar tipos de unidade do indicador:', error);
    }
  };

  // Buscar os dados de controle_indicador APENAS dos projetos vinculados
  const fetchControles = async () => {
    try {
      setLoading(true);
      
      if (projetosVinculados.length === 0) {
        setControles([]);
        setLoading(false);
        return;
      }
      
      let query = supabase
        .from('controle_indicador')
        .select('*')
        .in('projeto_id', projetosVinculados)
        .order('id', { ascending: true });
      
      // Aplicar filtros se estiverem definidos
      if (filtroProjetoId) {
        query = query.eq('projeto_id', filtroProjetoId);
      }
      
      if (filtroCategoriaId) {
        query = query.eq('categoria_id', filtroCategoriaId);
      }

      // Aplicar filtro de busca
      if (searchTerm.trim()) {
        query = query.ilike('indicador', `%${searchTerm.trim()}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      setControles(Array.isArray(data) ? data : []);
      console.log('Controles carregados:', data?.length || 0);
    } catch (error) {
      toast.error('Erro ao carregar dados de controle');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Formata a data para exibição - VERSÃO CORRIGIDA
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    
    try {
      // Método 1: Tratar como date-only (sem time) para evitar timezone issues
      if (dateString.includes('T') || dateString.includes(' ')) {
        // Se a string contém informação de tempo, usar o método tradicional com ajuste
        const date = new Date(dateString);
        
        if (isNaN(date.getTime())) {
          return 'Data inválida';
        }
        
        // Ajustar para timezone local para evitar o problema do "um dia a menos"
        const adjustedDate = new Date(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate()
        );
        
        return adjustedDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      } else {
        // Método 2: Para datas no formato YYYY-MM-DD (date-only), 
        // usar parsing manual para evitar timezone conversion
        const dateParts = dateString.split('-');
        if (dateParts.length === 3) {
          const year = parseInt(dateParts[0], 10);
          const month = parseInt(dateParts[1], 10) - 1; // Month é 0-indexed
          const day = parseInt(dateParts[2], 10);
          
          // Criar data no timezone local (sem UTC conversion)
          const localDate = new Date(year, month, day);
          
          if (isNaN(localDate.getTime())) {
            return 'Data inválida';
          }
          
          return localDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        }
      }
      
      // Fallback para outros formatos
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Função para truncar texto longo
  const truncateText = (text, maxLength = 100) => {
    if (!text) return '-';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Função para lidar com o sucesso da adição de linha
  const handleAdicionarLinhaSuccess = () => {
    setShowAdicionarLinhaDialog(false);
    fetchControles();
    toast.success('Operação concluída com sucesso!');
  };

  // Função para abrir modal de exclusão
  const handleDeleteClick = (indicador) => {
    setIndicadorToDelete(indicador);
    setShowDeleteDialog(true);
  };

  // Função para lidar com o sucesso da exclusão
  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false);
    setIndicadorToDelete(null);
    fetchControles();
  };

  // ✅ NOVA FUNÇÃO: Abrir modal de edição individual
  const handleEditClick = (indicador) => {
    setIndicadorToEdit(indicador);
    setShowEditarDialog(true);
  };

  // ✅ NOVA FUNÇÃO: Lidar com o sucesso da edição individual
  const handleEditSuccess = () => {
    setShowEditarDialog(false);
    setIndicadorToEdit(null);
    fetchControles();
  };

  // Função para abrir modal de edição em massa
  const handleEdicaoMassaClick = () => {
    setShowEdicaoDialog(true);
  };

  // Função para lidar com o sucesso da edição em massa
  const handleEdicaoSuccess = () => {
    setShowEdicaoDialog(false);
    fetchControles();
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltroProjetoId('');
    setFiltroCategoriaId('');
    setSearchTerm('');
    setShowFilters(false);
  };

  const hasActiveFilters = filtroProjetoId || filtroCategoriaId || searchTerm.trim();

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
      {/* Header com busca e filtros - Mobile */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              placeholder="Buscar indicadores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-lg transition-colors ${
              showFilters || hasActiveFilters 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <FiFilter className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowAdicionarLinhaDialog(true)}
            className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg text-sm font-medium"
          >
            <FiPlus className="mr-2" />
            Adicionar
          </button>
        </div>

        {/* Botão de edição em massa - Mobile */}
        {controles.length > 0 && (
          <div className="mb-4">
            <button
              onClick={handleEdicaoMassaClick}
              className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg text-sm font-medium"
            >
              <FiEdit className="mr-2" />
              Editar em Massa
            </button>
          </div>
        )}

        {showFilters && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Projeto
                </label>
                <select
                  value={filtroProjetoId}
                  onChange={(e) => setFiltroProjetoId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os projetos</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Categoria
                </label>
                <select
                  value={filtroCategoriaId}
                  onChange={(e) => setFiltroCategoriaId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as categorias</option>
                  {Object.entries(categorias).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {hasActiveFilters && (
              <div className="flex justify-center">
                <button
                  onClick={limparFiltros}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Header com busca e filtros - Desktop */}
      <div className="hidden lg:block mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="flex-1 max-w-md relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                placeholder="Buscar indicadores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-lg transition-colors ${
                showFilters || hasActiveFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FiFilter className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-3 ml-4">
            {/* Botão de edição em massa - Desktop */}
            {controles.length > 0 && (
              <button
                onClick={handleEdicaoMassaClick}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium"
              >
                <FiEdit className="mr-2" />
                Editar em Massa
              </button>
            )}

            <button
              onClick={() => setShowAdicionarLinhaDialog(true)}
              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-sm font-medium"
            >
              <FiPlus className="mr-2" />
              Adicionar Linha de Indicador
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Projeto (apenas projetos vinculados)
                </label>
                <select
                  value={filtroProjetoId}
                  onChange={(e) => setFiltroProjetoId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os projetos vinculados</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Categoria
                </label>
                <select
                  value={filtroCategoriaId}
                  onChange={(e) => setFiltroCategoriaId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as categorias</option>
                  {Object.entries(categorias).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
              
              {hasActiveFilters && (
                <button
                  onClick={limparFiltros}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                >
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal para adicionar linha de indicador */}
      {showAdicionarLinhaDialog && (
        <AdicionarLinhaIndicadorBaseDialog
          onClose={() => setShowAdicionarLinhaDialog(false)}
          onSuccess={handleAdicionarLinhaSuccess}
          categorias={categorias}
          projetos={projetos}
          subcategorias={subcategorias}
        />
      )}

      {/* Modal para confirmar exclusão */}
      {showDeleteDialog && indicadorToDelete && (
        <DeleteIndicadorDialog
          indicador={indicadorToDelete}
          onClose={() => setShowDeleteDialog(false)}
          onSuccess={handleDeleteSuccess}
          projetos={projetos}
          categorias={categorias}
          subcategorias={subcategorias}
        />
      )}

      {/* Modal para edição inline em massa */}
      {showEdicaoDialog && (
        <EdicaoInlineControleIndicadorDialog
          onClose={() => setShowEdicaoDialog(false)}
          onSuccess={handleEdicaoSuccess}
          dadosTabela={controles}
          categorias={categorias}
          projetos={projetos}
          subcategorias={subcategorias}
          tiposUnidadeIndicador={tiposUnidadeIndicador}
        />
      )}

      {/* ✅ NOVO MODAL: Edição individual */}
      {showEditarDialog && indicadorToEdit && (
        <EditarLinhaIndicadorDialog
          controleItem={indicadorToEdit}
          onClose={() => setShowEditarDialog(false)}
          onSuccess={handleEditSuccess}
          categorias={categorias}
          projetos={projetos}
          subcategorias={subcategorias}
          tiposUnidadeIndicador={tiposUnidadeIndicador}
        />
      )}

      {/* Tabela de Controle - Desktop */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Projeto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Indicador
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Descrição Resumida
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Descrição Detalhada
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Subcategoria
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Tipo Unidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Prazo Inicial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Recorrência
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Obrigatório
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Linhas Criadas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {controles.length > 0 ? (
              controles.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {projetos[item.projeto_id] || 'Projeto indisponível'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {categorias[item.categoria_id] || 'Categoria indisponível'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      <p className="font-medium">{item.indicador}</p>
                      {item.observacao && (
                        <p className="text-xs text-gray-500 mt-1">{item.observacao}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      {item.descricao_resumida ? (
                        <div className="group relative">
                          <p className="text-sm">{truncateText(item.descricao_resumida, 80)}</p>
                          {item.descricao_resumida.length > 80 && (
                            <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded p-2 mt-1 w-64 break-words">
                              {item.descricao_resumida}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Não informado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <div className="max-w-xs">
                      {item.descricao_detalhada ? (
                        <div className="group relative">
                          <p className="text-sm">{truncateText(item.descricao_detalhada, 80)}</p>
                          {item.descricao_detalhada.length > 80 && (
                            <div className="absolute z-10 invisible group-hover:visible bg-gray-800 text-white text-xs rounded p-2 mt-1 w-64 break-words">
                              {item.descricao_detalhada}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Não informado</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {subcategorias[item.subcategoria_id] || 'Subcategoria indisponível'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {tiposUnidadeIndicador[item.tipo_unidade_indicador] || 'Tipo indisponível'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <FiCalendar className="mr-1 text-gray-400" />
                      {formatDate(item.prazo_entrega_inicial)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.recorrencia ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {item.recorrencia}
                        {item.tempo_recorrencia ? ` (${item.tempo_recorrencia})` : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(() => {
                      // Calcular quantas linhas foram criadas baseado na configuração
                      let linhasBase;
                      if (!item.repeticoes || item.repeticoes <= 0) {
                        linhasBase = 1; // Apenas linha base
                      } else {
                        linhasBase = 1 + item.repeticoes; // Linha base + repetições
                      }
                      const totalLinhas = linhasBase * 2; // Multiplicado por 2 (Meta + Realizado)
                      
                      return (
                        <div className="text-center">
                          <span className="inline-flex-items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {totalLinhas} linhas
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {linhasBase} × 2 (Meta/Real)
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center space-x-2">
                      {/* ✅ NOVO BOTÃO: Editar individual */}
                      <button
                        onClick={() => handleEditClick(item)}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 text-xs font-medium rounded-md transition-colors"
                        title="Editar indicador"
                      >
                        <FiEdit className="h-3 w-3" />
                      </button>
                      
                      <button
                        onClick={() => handleDeleteClick(item)}
                        className="inline-flex items-center px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 text-xs font-medium rounded-md transition-colors"
                        title="Excluir indicador"
                      >
                        <FiTrash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="13" className="px-6 py-8 text-center text-sm text-gray-500">
                  {searchTerm.trim() ? 'Nenhum indicador encontrado para a busca' : 'Nenhum item de controle encontrado para os projetos vinculados'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Cards para Mobile */}
      <div className="lg:hidden space-y-4">
        {controles.length > 0 ? (
          controles.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 mb-1">
                    {item.indicador}
                  </h3>
                  <p className="text-xs text-gray-500">ID: {item.id}</p>
                </div>
                
                <div className="flex items-center space-x-2 ml-2">
                  {item.obrigatorio ? (
                    <span className="text-green-600">
                      <FiCheck className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      <FiX className="w-4 h-4" />
                    </span>
                  )}
                  
                  {(() => {
                    let linhasBase;
                    if (!item.repeticoes || item.repeticoes <= 0) {
                      linhasBase = 1;
                    } else {
                      linhasBase = 1 + item.repeticoes;
                    }
                    const totalLinhas = linhasBase * 2;
                    
                    return (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {totalLinhas}
                      </span>
                    );
                  })()}

                  {/* ✅ Botões de ação no mobile */}
                  <div className="flex items-center space-x-1">
                    {/* Botão de editar individual no mobile */}
                    <button
                      onClick={() => handleEditClick(item)}
                      className="p-1 bg-blue-100 hover:bg-blue-200 text-blue-700 hover:text-blue-800 rounded-md transition-colors"
                      title="Editar indicador"
                    >
                      <FiEdit className="w-4 h-4" />
                    </button>
                    
                    {/* Botão de excluir no mobile */}
                    <button
                      onClick={() => handleDeleteClick(item)}
                      className="p-1 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 rounded-md transition-colors"
                      title="Excluir indicador"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {item.observacao && (
                <p className="text-sm text-gray-600 mb-3">{item.observacao}</p>
              )}

              {/* Descrições */}
              {(item.descricao_resumida || item.descricao_detalhada) && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  {item.descricao_resumida && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">Descrição Resumida:</p>
                      <p className="text-sm text-gray-900">{item.descricao_resumida}</p>
                    </div>
                  )}
                  {item.descricao_detalhada && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-1">Descrição Detalhada:</p>
                      <p className="text-sm text-gray-900">{item.descricao_detalhada}</p>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2 mb-3">
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-20">Projeto:</span>
                  <span className="text-gray-900">{projetos[item.projeto_id] || 'Indisponível'}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-20">Categoria:</span>
                  <span className="text-gray-900">{categorias[item.categoria_id] || 'Indisponível'}</span>
                </div>
                
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-20">Subcategoria:</span>
                  <span className="text-gray-900">{subcategorias[item.subcategoria_id] || 'Indisponível'}</span>
                </div>

                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-20">Tipo Unidade:</span>
                  <span className="text-gray-900">{tiposUnidadeIndicador[item.tipo_unidade_indicador] || 'Indisponível'}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                <div className="flex items-center">
                  <FiCalendar className="mr-1" />
                  {formatDate(item.prazo_entrega_inicial)}
                </div>
                
                {item.recorrencia && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                    {item.recorrencia}
                    {item.tempo_recorrencia ? ` (${item.tempo_recorrencia})` : ''}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiFolder className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm.trim() ? 'Nenhum indicador encontrado' : 'Nenhum controle encontrado'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm.trim() 
                ? 'Tente ajustar sua busca ou limpar os filtros.'
                : 'Comece adicionando uma nova linha de indicador.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControleIndicadorTable;