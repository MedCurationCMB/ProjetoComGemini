// src/pages/analise-multiplos-indicadores.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiCpu, FiCheckSquare, FiSquare, FiSearch, FiFilter, FiX } from 'react-icons/fi';
import MultipleIndicatorAnalysisDialog from '../components/MultipleIndicatorAnalysisDialog';
import SelectedIndicatorsPreview from '../components/SelectedIndicatorsPreview';

export default function AnaliseMultiplosIndicadores({ user }) {
  const router = useRouter();
  
  // Estados principais
  const [indicadores, setIndicadores] = useState([]);
  const [indicadoresSelecionados, setIndicadoresSelecionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorias, setCategorias] = useState({});
  const [projetos, setProjetos] = useState({});
  
  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroProjeto, setFiltroProjeto] = useState('');
  const [showFiltros, setShowFiltros] = useState(false);
  
  // Estado para modal de análise
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Carregar categorias e projetos
  useEffect(() => {
    const fetchCategoriasProjetos = async () => {
      try {
        // Buscar categorias
        const { data: categoriasData, error: categoriasError } = await supabase
          .from('categorias')
          .select('id, nome')
          .order('nome');
        
        if (categoriasError) throw categoriasError;
        
        // Converter array em objeto
        const categoriasObj = {};
        categoriasData.forEach(cat => {
          categoriasObj[cat.id] = cat.nome;
        });
        setCategorias(categoriasObj);
        
        // Buscar projetos
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('id, nome')
          .order('nome');
        
        if (projetosError) throw projetosError;
        
        // Converter array em objeto
        const projetosObj = {};
        projetosData.forEach(proj => {
          projetosObj[proj.id] = proj.nome;
        });
        setProjetos(projetosObj);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Erro ao carregar categorias e projetos');
      }
    };

    if (user) {
      fetchCategoriasProjetos();
    }
  }, [user]);

  // Carregar indicadores da tabela controle_indicador
  useEffect(() => {
    const fetchIndicadores = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from('controle_indicador')
          .select('id, indicador, projeto_id, categoria_id')
          .order('indicador');
        
        if (error) throw error;
        
        setIndicadores(data || []);
      } catch (error) {
        console.error('Erro ao buscar indicadores:', error);
        toast.error('Erro ao carregar indicadores');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchIndicadores();
    }
  }, [user]);

  // Função para alternar seleção de indicador
  const toggleIndicadorSelecionado = (indicadorId) => {
    setIndicadoresSelecionados(prev => {
      if (prev.includes(indicadorId)) {
        return prev.filter(id => id !== indicadorId);
      } else {
        return [...prev, indicadorId];
      }
    });
  };

  // Função para selecionar todos os indicadores filtrados
  const selecionarTodos = () => {
    const indicadoresFiltrados = getIndicadoresFiltrados();
    const todosSelecionados = indicadoresFiltrados.every(ind => 
      indicadoresSelecionados.includes(ind.id)
    );
    
    if (todosSelecionados) {
      // Desselecionar todos os filtrados
      setIndicadoresSelecionados(prev => 
        prev.filter(id => !indicadoresFiltrados.find(ind => ind.id === id))
      );
    } else {
      // Selecionar todos os filtrados
      const idsParaAdicionar = indicadoresFiltrados
        .filter(ind => !indicadoresSelecionados.includes(ind.id))
        .map(ind => ind.id);
      
      setIndicadoresSelecionados(prev => [...prev, ...idsParaAdicionar]);
    }
  };

  // Função para limpar todas as seleções
  const limparSelecoes = () => {
    setIndicadoresSelecionados([]);
  };

  // Função para filtrar indicadores
  const getIndicadoresFiltrados = () => {
    return indicadores.filter(indicador => {
      const matchSearch = indicador.indicador.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategoria = !filtroCategoria || indicador.categoria_id === parseInt(filtroCategoria);
      const matchProjeto = !filtroProjeto || indicador.projeto_id === parseInt(filtroProjeto);
      
      return matchSearch && matchCategoria && matchProjeto;
    });
  };

  // Função para voltar
  const voltarParaInicio = () => {
    router.push('/visualizacao-indicadores');
  };

  // Função para iniciar análise
  const iniciarAnalise = () => {
    if (indicadoresSelecionados.length < 2) {
      toast.error('Selecione pelo menos 2 indicadores para análise');
      return;
    }
    
    setShowAnalysisDialog(true);
  };

  // Função para lidar com a conclusão da análise
  const handleAnalysisComplete = (resultado) => {
    console.log('Análise comparativa concluída:', resultado);
    toast.success('Análise comparativa concluída com sucesso!');
  };

  const indicadoresFiltrados = getIndicadoresFiltrados();
  const todosFiltradosSelecionados = indicadoresFiltrados.length > 0 && 
    indicadoresFiltrados.every(ind => indicadoresSelecionados.includes(ind.id));

  // Não renderizar nada até autenticação
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white lg:bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white lg:bg-gray-50">
      <Head>
        <title>Análise Múltiplos Indicadores</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      {/* Modal de Análise */}
      {showAnalysisDialog && (
        <MultipleIndicatorAnalysisDialog 
          indicadoresSelecionados={indicadoresSelecionados}
          onClose={() => setShowAnalysisDialog(false)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {/* MOBILE Layout */}
      <div className="lg:hidden">
        {/* Header Mobile */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-4 py-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center flex-1 min-w-0">
              <button onClick={voltarParaInicio} className="mr-3 flex-shrink-0">
                <FiArrowLeft className="w-6 h-6 text-blue-600" />
              </button>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                Análise Múltiplos Indicadores
              </h1>
            </div>
            
            {/* Botão de filtros */}
            <button
              onClick={() => setShowFiltros(!showFiltros)}
              className={`p-2 rounded-lg transition-colors ${
                showFiltros ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <FiFilter className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de busca */}
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar indicadores..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filtros (colapsáveis) */}
          {showFiltros && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Todas as categorias</option>
                  {Object.entries(categorias).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Projeto</label>
                <select
                  value={filtroProjeto}
                  onChange={(e) => setFiltroProjeto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="">Todos os projetos</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Info de seleção */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {indicadoresSelecionados.length} de {indicadoresFiltrados.length} selecionados
            </span>
            <div className="flex space-x-2">
              <button
                onClick={selecionarTodos}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {todosFiltradosSelecionados ? 'Desmarcar' : 'Selecionar'} Todos
              </button>
              {indicadoresSelecionados.length > 0 && (
                <button
                  onClick={limparSelecoes}
                  className="text-red-600 hover:text-red-800 font-medium"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Conteúdo Mobile */}
        <div className="px-4 py-4 pb-20">
          {/* Preview dos Indicadores Selecionados - Mobile */}
          {indicadoresSelecionados.length > 0 && (
            <div className="mb-6">
              <SelectedIndicatorsPreview 
                indicadoresSelecionados={indicadoresSelecionados}
                categorias={categorias}
                projetos={projetos}
              />
            </div>
          )}

          {/* Lista de indicadores */}
          <div className="space-y-3">
            {indicadoresFiltrados.map(indicador => {
              const isSelected = indicadoresSelecionados.includes(indicador.id);
              return (
                <div
                  key={indicador.id}
                  onClick={() => toggleIndicadorSelecionado(indicador.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {indicador.indicador}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {indicador.projeto_id && (
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                            {projetos[indicador.projeto_id] || 'Projeto N/A'}
                          </span>
                        )}
                        {indicador.categoria_id && (
                          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {categorias[indicador.categoria_id] || 'Categoria N/A'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-3 flex-shrink-0">
                      {isSelected ? (
                        <FiCheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <FiSquare className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {indicadoresFiltrados.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum indicador encontrado com os filtros aplicados</p>
            </div>
          )}
        </div>

        {/* Botão fixo de análise - Mobile */}
        {indicadoresSelecionados.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
            <button
              onClick={iniciarAnalise}
              disabled={indicadoresSelecionados.length < 2}
              className={`w-full py-3 rounded-lg flex items-center justify-center font-medium transition-colors ${
                indicadoresSelecionados.length < 2
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <FiCpu className="mr-2" />
              Analisar {indicadoresSelecionados.length} Indicadores
            </button>
          </div>
        )}
      </div>

      {/* DESKTOP Layout */}
      <div className="hidden lg:block">
        {/* Header Desktop */}
        <div className="sticky top-0 bg-white shadow-sm z-10 px-8 py-6 border-b">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button 
                  onClick={voltarParaInicio}
                  className="mr-4 flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <FiArrowLeft className="w-6 h-6 mr-2" />
                  <span className="font-medium">Voltar</span>
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                  Análise Múltiplos Indicadores
                </h1>
              </div>

              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {indicadoresSelecionados.length} de {indicadoresFiltrados.length} selecionados
                </span>
                
                {indicadoresSelecionados.length > 0 && (
                  <button
                    onClick={iniciarAnalise}
                    disabled={indicadoresSelecionados.length < 2}
                    className={`px-4 py-2 rounded-lg flex items-center font-medium transition-colors ${
                      indicadoresSelecionados.length < 2
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <FiCpu className="mr-2" />
                    Analisar Indicadores
                  </button>
                )}
              </div>
            </div>

            {/* Filtros e busca Desktop */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar indicadores..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas as categorias</option>
                  {Object.entries(categorias).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <select
                  value={filtroProjeto}
                  onChange={(e) => setFiltroProjeto(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos os projetos</option>
                  {Object.entries(projetos).map(([id, nome]) => (
                    <option key={id} value={id}>{nome}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ações em massa Desktop */}
            <div className="mt-4 flex justify-between items-center">
              <div className="flex space-x-3">
                <button
                  onClick={selecionarTodos}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  {todosFiltradosSelecionados ? 'Desmarcar' : 'Selecionar'} Todos Filtrados
                </button>
                {indicadoresSelecionados.length > 0 && (
                  <button
                    onClick={limparSelecoes}
                    className="text-red-600 hover:text-red-800 font-medium text-sm"
                  >
                    Limpar Todas as Seleções
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo Desktop */}
        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* Preview dos Indicadores Selecionados - Desktop */}
          {indicadoresSelecionados.length > 0 && (
            <div className="mb-8">
              <SelectedIndicatorsPreview 
                indicadoresSelecionados={indicadoresSelecionados}
                categorias={categorias}
                projetos={projetos}
              />
            </div>
          )}

          {/* Grid de indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {indicadoresFiltrados.map(indicador => {
              const isSelected = indicadoresSelecionados.includes(indicador.id);
              return (
                <div
                  key={indicador.id}
                  onClick={() => toggleIndicadorSelecionado(indicador.id)}
                  className={`p-6 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-lg leading-tight">
                      {indicador.indicador}
                    </h3>
                    <div className="ml-3 flex-shrink-0">
                      {isSelected ? (
                        <FiCheckSquare className="w-6 h-6 text-blue-600" />
                      ) : (
                        <FiSquare className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {indicador.projeto_id && (
                      <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm rounded-full">
                        {projetos[indicador.projeto_id] || 'Projeto N/A'}
                      </span>
                    )}
                    {indicador.categoria_id && (
                      <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full ml-2">
                        {categorias[indicador.categoria_id] || 'Categoria N/A'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {indicadoresFiltrados.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                Nenhum indicador encontrado com os filtros aplicados
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}