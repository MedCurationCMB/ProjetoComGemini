import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { supabase } from "../utils/supabaseClient";
import { FiEdit, FiSave, FiX, FiPlus } from "react-icons/fi";

export default function Cadastros({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('projetos');
  
  // Estados para todos os dados
  const [projetos, setProjetos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [tiposUnidadeIndicador, setTiposUnidadeIndicador] = useState([]);
  const [tiposIndicador, setTiposIndicador] = useState([]);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para edição
  const [editandoItem, setEditandoItem] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [textoPromptEditado, setTextoPromptEditado] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  
  // Estados para o diálogo de cadastro
  const [showCadastroDialog, setShowCadastroDialog] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoTextoPrompt, setNovoTextoPrompt] = useState('');
  const [cadastrando, setCadastrando] = useState(false);

  // Estados para apresentação de variáveis
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  const [editandoApresentacao, setEditandoApresentacao] = useState(null);
  const [nomeApresentacaoEditado, setNomeApresentacaoEditado] = useState('');
  const [salvandoApresentacao, setSalvandoApresentacao] = useState(false);

  // Configuração das abas
  const tabsConfig = {
    projetos: {
      label: 'Projetos',
      tabela: 'projetos',
      campo: 'nome',
      singular: 'projeto',
      artigo: 'um',
      hasApresentacao: true
    },
    categorias: {
      label: 'Categorias',
      tabela: 'categorias',
      campo: 'nome',
      singular: 'categoria',
      artigo: 'uma',
      hasApresentacao: true
    },
    subcategorias: {
      label: 'Subcategorias',
      tabela: 'subcategorias',
      campo: 'nome',
      singular: 'subcategoria',
      artigo: 'uma',
      hasApresentacao: false
    },
    tiposUnidadeIndicador: {
      label: 'Tipos Unidade Indicador',
      tabela: 'tipos_unidade_indicador',
      campo: 'tipo',
      singular: 'tipo de unidade indicador',
      artigo: 'um',
      hasApresentacao: false
    },
    tiposIndicador: {
      label: 'Tipos Indicador',
      tabela: 'tipos_indicador',
      campo: 'tipo',
      singular: 'tipo de indicador',
      artigo: 'um',
      hasApresentacao: false
    },
    prompts: {
      label: 'Prompts',
      tabela: 'prompts',
      campo: 'nome_prompt',
      campoTexto: 'texto_prompt',
      singular: 'prompt',
      artigo: 'um',
      hasApresentacao: false,
      hasTexto: true
    }
  };

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace("/login");
    }
  }, [user, router]);

  // Carregar dados quando o componente monta ou a aba muda
  useEffect(() => {
    if (user) {
      fetchData();
      if (tabsConfig[activeTab].hasApresentacao) {
        fetchApresentacaoVariaveis();
      }
    }
  }, [user, activeTab]);

  // Função para buscar dados de apresentação
  const fetchApresentacaoVariaveis = async () => {
    try {
      const { data, error } = await supabase
        .from('apresentacao_variaveis')
        .select('*');
      
      if (error) throw error;
      
      // Converter array em objeto para fácil acesso por nome_variavel
      const apresentacaoObj = {};
      data.forEach(item => {
        apresentacaoObj[item.nome_variavel] = item;
      });
      
      setApresentacaoVariaveis(apresentacaoObj);
    } catch (error) {
      console.error('Erro ao carregar apresentação das variáveis:', error);
    }
  };

  // Função para carregar dados baseado na aba ativa
  const fetchData = async () => {
    try {
      setLoading(true);
      const config = tabsConfig[activeTab];
      
      let selectFields = '*';
      if (config.hasTexto) {
        selectFields = `id, ${config.campo}, ${config.campoTexto}`;
      }
      
      const { data, error } = await supabase
        .from(config.tabela)
        .select(selectFields)
        .order(config.campo, { ascending: true });
      
      if (error) throw error;
      
      // Atualizar o estado correspondente
      switch (activeTab) {
        case 'projetos':
          setProjetos(data || []);
          break;
        case 'categorias':
          setCategorias(data || []);
          break;
        case 'subcategorias':
          setSubcategorias(data || []);
          break;
        case 'tiposUnidadeIndicador':
          setTiposUnidadeIndicador(data || []);
          break;
        case 'tiposIndicador':
          setTiposIndicador(data || []);
          break;
        case 'prompts':
          setPrompts(data || []);
          break;
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Funções para editar apresentação
  const iniciarEdicaoApresentacao = (item) => {
    setEditandoApresentacao(item.id);
    setNomeApresentacaoEditado(item.nome_apresentacao);
  };

  const cancelarEdicaoApresentacao = () => {
    setEditandoApresentacao(null);
    setNomeApresentacaoEditado('');
  };

  const salvarEdicaoApresentacao = async () => {
    if (!nomeApresentacaoEditado.trim()) {
      toast.error('O nome de apresentação não pode estar vazio');
      return;
    }

    try {
      setSalvandoApresentacao(true);
      
      const { error } = await supabase
        .from('apresentacao_variaveis')
        .update({ nome_apresentacao: nomeApresentacaoEditado.trim() })
        .eq('id', editandoApresentacao);

      if (error) throw error;

      toast.success('Nome de apresentação atualizado com sucesso!');
      setEditandoApresentacao(null);
      setNomeApresentacaoEditado('');
      
      // Recarregar dados
      await fetchApresentacaoVariaveis();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvandoApresentacao(false);
    }
  };

  // Função para iniciar edição
  const iniciarEdicao = (item) => {
    const config = tabsConfig[activeTab];
    setEditandoItem(item.id);
    setNomeEditado(item[config.campo]);
    if (config.hasTexto) {
      setTextoPromptEditado(item[config.campoTexto] || '');
    }
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setEditandoItem(null);
    setNomeEditado('');
    setTextoPromptEditado('');
  };

  // Função para salvar edição
  const salvarEdicao = async () => {
    if (!nomeEditado.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    try {
      setSalvandoEdicao(true);
      const config = tabsConfig[activeTab];
      const dados = getDadosAbaAtiva();
      
      // Verificar se já existe outro item com o mesmo nome (case insensitive)
      const nomeExistente = dados.find(item => 
        item.id !== editandoItem && 
        item[config.campo].toUpperCase() === nomeEditado.trim().toUpperCase()
      );
      
      if (nomeExistente) {
        toast.error(`Já existe ${config.artigo} ${config.singular} com este nome`);
        return;
      }

      // Preparar dados para atualização
      const updateData = { [config.campo]: nomeEditado.trim() };
      if (config.hasTexto) {
        updateData[config.campoTexto] = textoPromptEditado.trim();
      }

      const { error } = await supabase
        .from(config.tabela)
        .update(updateData)
        .eq('id', editandoItem);

      if (error) throw error;

      toast.success('Dados atualizados com sucesso!');
      setEditandoItem(null);
      setNomeEditado('');
      setTextoPromptEditado('');
      
      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // Função para cadastrar novo item
  const cadastrarItem = async () => {
    if (!novoNome.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    try {
      setCadastrando(true);
      const config = tabsConfig[activeTab];
      const dados = getDadosAbaAtiva();
      
      // Verificar se já existe item com o mesmo nome (case insensitive)
      const nomeExistente = dados.find(item => 
        item[config.campo].toUpperCase() === novoNome.trim().toUpperCase()
      );
      
      if (nomeExistente) {
        toast.error(`Já existe ${config.artigo} ${config.singular} com este nome`);
        return;
      }

      // Preparar dados para inserção
      const insertData = { [config.campo]: novoNome.trim() };
      if (config.hasTexto) {
        insertData[config.campoTexto] = novoTextoPrompt.trim();
      }

      // Inserir o novo item
      const { data: itemData, error } = await supabase
        .from(config.tabela)
        .insert([insertData])
        .select();

      if (error) throw error;

      // Se for um projeto, criar vinculação com o usuário
      if (activeTab === 'projetos' && itemData && itemData.length > 0) {
        const novoProjetoId = itemData[0].id;
        const userId = user.id;
        
        console.log('Vinculando usuário ao projeto:', { userId, novoProjetoId });
        
        // Inserir na tabela de relacionamento
        const { error: relacaoError } = await supabase
          .from('relacao_usuarios_projetos')
          .insert([{
            usuario_id: userId,
            projeto_id: novoProjetoId
          }]);
        
        if (relacaoError) {
          console.error('Erro ao criar vinculação usuário-projeto:', relacaoError);
          toast.warning('Projeto criado, mas houve um problema na vinculação com o usuário');
        } else {
          console.log('Vinculação usuário-projeto criada com sucesso');
        }
      }

      toast.success(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} cadastrado com sucesso!`);
      setShowCadastroDialog(false);
      setNovoNome('');
      setNovoTextoPrompt('');
      
      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      toast.error('Erro ao cadastrar item');
    } finally {
      setCadastrando(false);
    }
  };

  // Função para obter dados da aba ativa
  const getDadosAbaAtiva = () => {
    switch (activeTab) {
      case 'projetos': return projetos;
      case 'categorias': return categorias;
      case 'subcategorias': return subcategorias;
      case 'tiposUnidadeIndicador': return tiposUnidadeIndicador;
      case 'tiposIndicador': return tiposIndicador;
      case 'prompts': return prompts;
      default: return [];
    }
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  const dadosAtivos = getDadosAbaAtiva();
  const config = tabsConfig[activeTab];

  return (
    <div>
      <Head>
        <title>Cadastros</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Cadastros</h1>

        {/* Tabs de navegação */}
        <div className="border-b border-gray-200 mb-6">
          <ul className="flex flex-wrap -mb-px">
            {Object.entries(tabsConfig).map(([key, tabConfig]) => (
              <li key={key} className="mr-2">
                <button
                  onClick={() => setActiveTab(key)}
                  className={`inline-block py-4 px-4 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tabConfig.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Conteúdo da tab atual */}
        <div>
          {/* Tabela de Apresentação da Variável - apenas para projetos e categorias */}
          {config.hasApresentacao && (
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Configuração de Apresentação</h2>
              
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nome para Apresentação
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'] ? (
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editandoApresentacao === apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'].id ? (
                            <input
                              type="text"
                              value={nomeApresentacaoEditado}
                              onChange={(e) => setNomeApresentacaoEditado(e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              disabled={salvandoApresentacao}
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900">
                              {apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'].nome_apresentacao}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {editandoApresentacao === apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'].id ? (
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={salvarEdicaoApresentacao}
                                disabled={salvandoApresentacao}
                                className={`text-green-600 hover:text-green-900 ${
                                  salvandoApresentacao ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Salvar"
                              >
                                <FiSave className="h-5 w-5" />
                              </button>
                              <button
                                onClick={cancelarEdicaoApresentacao}
                                disabled={salvandoApresentacao}
                                className={`text-red-600 hover:text-red-900 ${
                                  salvandoApresentacao ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                title="Cancelar"
                              >
                                <FiX className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => iniciarEdicaoApresentacao(apresentacaoVariaveis[activeTab === 'projetos' ? 'projeto' : 'categoria'])}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <FiEdit className="h-5 w-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="2" className="px-6 py-4 text-center text-sm text-gray-500">
                          Configuração não encontrada
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Seção principal do Gerenciamento */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Gerenciamento de {config.label}</h2>
              
              {/* Botão para cadastrar novo item */}
              <button
                onClick={() => setShowCadastroDialog(true)}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                <FiPlus className="mr-2" />
                Cadastrar {config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}
              </button>
            </div>

            {/* Aviso sobre não poder apagar */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Atenção:</strong> Uma vez cadastrados, os {config.label.toLowerCase()} não podem ser apagados do sistema. 
                Certifique-se de que o nome está correto antes de cadastrar.
                {activeTab === 'projetos' && (
                  <span className="block mt-1">
                    <strong>Novo:</strong> Ao criar um projeto, você será automaticamente vinculado a ele.
                  </span>
                )}
              </p>
            </div>
            
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {config.campo === 'nome_prompt' ? 'Nome do Prompt' : 'Nome'}
                      </th>
                      {config.hasTexto && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Texto do Prompt
                        </th>
                      )}
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dadosAtivos.length > 0 ? (
                      dadosAtivos.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editandoItem === item.id ? (
                              <input
                                type="text"
                                value={nomeEditado}
                                onChange={(e) => setNomeEditado(e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                disabled={salvandoEdicao}
                              />
                            ) : (
                              <div className="text-sm font-medium text-gray-900">
                                {item[config.campo]}
                              </div>
                            )}
                          </td>
                          {config.hasTexto && (
                            <td className="px-6 py-4">
                              {editandoItem === item.id ? (
                                <textarea
                                  value={textoPromptEditado}
                                  onChange={(e) => setTextoPromptEditado(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                  rows="3"
                                  disabled={salvandoEdicao}
                                />
                              ) : (
                                <div className="text-sm text-gray-900 max-w-xs">
                                  {item[config.campoTexto] ? (
                                    <span className="truncate block" title={item[config.campoTexto]}>
                                      {item[config.campoTexto].length > 100 
                                        ? `${item[config.campoTexto].substring(0, 100)}...` 
                                        : item[config.campoTexto]
                                      }
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">Nenhum texto</span>
                                  )}
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {editandoItem === item.id ? (
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={salvarEdicao}
                                  disabled={salvandoEdicao}
                                  className={`text-green-600 hover:text-green-900 ${
                                    salvandoEdicao ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Salvar"
                                >
                                  <FiSave className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={cancelarEdicao}
                                  disabled={salvandoEdicao}
                                  className={`text-red-600 hover:text-red-900 ${
                                    salvandoEdicao ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Cancelar"
                                >
                                  <FiX className="h-5 w-5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => iniciarEdicao(item)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Editar"
                              >
                                <FiEdit className="h-5 w-5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={config.hasTexto ? "3" : "2"}
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          Nenhum {config.singular} encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modal para cadastrar novo item */}
      {showCadastroDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Cadastrar {config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}
              </h3>
              <button 
                onClick={() => {
                  setShowCadastroDialog(false);
                  setNovoNome('');
                  setNovoTextoPrompt('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {config.campo === 'nome_prompt' ? 'Nome do Prompt' : `Nome do ${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}`}
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={`Digite o nome do ${config.singular}`}
                  disabled={cadastrando}
                />
              </div>

              {config.hasTexto && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto do Prompt
                  </label>
                  <textarea
                    value={novoTextoPrompt}
                    onChange={(e) => setNovoTextoPrompt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Digite o texto do prompt"
                    rows="5"
                    disabled={cadastrando}
                  />
                </div>
              )}

              {activeTab === 'projetos' && (
                <p className="text-sm text-gray-600">
                  Você será automaticamente vinculado a este projeto.
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCadastroDialog(false);
                  setNovoNome('');
                  setNovoTextoPrompt('');
                }}
                disabled={cadastrando}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={cadastrarItem}
                disabled={cadastrando || !novoNome.trim()}
                className={`px-4 py-2 rounded-md text-white ${
                  cadastrando || !novoNome.trim()
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {cadastrando ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}