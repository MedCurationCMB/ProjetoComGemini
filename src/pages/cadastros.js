import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-hot-toast";
import Navbar from "../components/Navbar";
import { supabase } from "../utils/supabaseClient";
import { FiEdit, FiSave, FiX, FiPlus } from "react-icons/fi";

export default function Cadastros({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('projetos'); // 'projetos' ou 'categorias'
  const [projetos, setProjetos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para edição
  const [editandoItem, setEditandoItem] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  
  // Estados para o diálogo de cadastro
  const [showCadastroDialog, setShowCadastroDialog] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [cadastrando, setCadastrando] = useState(false);

  // Novos estados para apresentação de variáveis
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});
  const [editandoApresentacao, setEditandoApresentacao] = useState(null);
  const [nomeApresentacaoEditado, setNomeApresentacaoEditado] = useState('');
  const [salvandoApresentacao, setSalvandoApresentacao] = useState(false);

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
      fetchApresentacaoVariaveis();
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
      
      if (activeTab === 'projetos') {
        const { data, error } = await supabase
          .from('projetos')
          .select('*')
          .order('nome', { ascending: true });
        
        if (error) throw error;
        setProjetos(data || []);
      } else {
        const { data, error } = await supabase
          .from('categorias')
          .select('*')
          .order('nome', { ascending: true });
        
        if (error) throw error;
        setCategorias(data || []);
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
    setEditandoItem(item.id);
    setNomeEditado(item.nome);
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setEditandoItem(null);
    setNomeEditado('');
  };

  // Função para salvar edição
  const salvarEdicao = async () => {
    if (!nomeEditado.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    try {
      setSalvandoEdicao(true);
      
      const tabela = activeTab === 'projetos' ? 'projetos' : 'categorias';
      const dados = activeTab === 'projetos' ? projetos : categorias;
      
      // Verificar se já existe outro item com o mesmo nome (case insensitive)
      const nomeExistente = dados.find(item => 
        item.id !== editandoItem && 
        item.nome.toUpperCase() === nomeEditado.trim().toUpperCase()
      );
      
      if (nomeExistente) {
        toast.error(`Já existe ${activeTab === 'projetos' ? 'um projeto' : 'uma categoria'} com este nome`);
        return;
      }

      const { error } = await supabase
        .from(tabela)
        .update({ nome: nomeEditado.trim() })
        .eq('id', editandoItem);

      if (error) throw error;

      toast.success('Nome atualizado com sucesso!');
      setEditandoItem(null);
      setNomeEditado('');
      
      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  // ✅ FUNÇÃO MODIFICADA: Cadastrar novo item com vinculação automática
  const cadastrarItem = async () => {
    if (!novoNome.trim()) {
      toast.error('O nome não pode estar vazio');
      return;
    }

    try {
      setCadastrando(true);
      
      const tabela = activeTab === 'projetos' ? 'projetos' : 'categorias';
      const dados = activeTab === 'projetos' ? projetos : categorias;
      
      // Verificar se já existe item com o mesmo nome (case insensitive)
      const nomeExistente = dados.find(item => 
        item.nome.toUpperCase() === novoNome.trim().toUpperCase()
      );
      
      if (nomeExistente) {
        toast.error(`Já existe ${activeTab === 'projetos' ? 'um projeto' : 'uma categoria'} com este nome`);
        return;
      }

      // Inserir o novo item
      const { data: itemData, error } = await supabase
        .from(tabela)
        .insert([{ nome: novoNome.trim() }])
        .select(); // ← IMPORTANTE: adicionar select() para obter o ID do item criado

      if (error) throw error;

      // ✅ NOVA FUNCIONALIDADE: Se for um projeto, criar vinculação com o usuário
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
          // Não interromper o processo, apenas logar o erro
          toast.warning('Projeto criado, mas houve um problema na vinculação com o usuário');
        } else {
          console.log('Vinculação usuário-projeto criada com sucesso');
        }
      }

      toast.success(`${activeTab === 'projetos' ? 'Projeto' : 'Categoria'} cadastrado com sucesso!`);
      setShowCadastroDialog(false);
      setNovoNome('');
      
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
    return activeTab === 'projetos' ? projetos : categorias;
  };

  // Função para obter título da aba
  const getTituloAba = () => {
    return activeTab === 'projetos' ? 'Projetos' : 'Categorias';
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  const dadosAtivos = getDadosAbaAtiva();

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
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('projetos')}
                className={`inline-block py-4 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'projetos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Projetos
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('categorias')}
                className={`inline-block py-4 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'categorias'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Categorias
              </button>
            </li>
          </ul>
        </div>

        {/* Conteúdo da tab atual */}
        <div>
          {/* Tabela de Apresentação da Variável */}
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

          {/* Seção original do Gerenciamento */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Gerenciamento de {getTituloAba()}</h2>
              
              {/* Botão para cadastrar novo item */}
              <button
                onClick={() => setShowCadastroDialog(true)}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                <FiPlus className="mr-2" />
                Cadastrar {activeTab === 'projetos' ? 'Projeto' : 'Categoria'}
              </button>
            </div>

            {/* Aviso sobre não poder apagar */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Atenção:</strong> Uma vez cadastrados, os {activeTab} não podem ser apagados do sistema. 
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
                        Nome
                      </th>
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
                                {item.nome}
                              </div>
                            )}
                          </td>
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
                          colSpan="2"
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          Nenhum {activeTab === 'projetos' ? 'projeto' : 'categoria'} encontrado
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
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Cadastrar {activeTab === 'projetos' ? 'Projeto' : 'Categoria'}
              </h3>
              <button 
                onClick={() => {
                  setShowCadastroDialog(false);
                  setNovoNome('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome do {activeTab === 'projetos' ? 'Projeto' : 'Categoria'}
              </label>
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={`Digite o nome do ${activeTab === 'projetos' ? 'projeto' : 'categoria'}`}
                disabled={cadastrando}
              />
              {activeTab === 'projetos' && (
                <p className="mt-2 text-sm text-gray-600">
                  Você será automaticamente vinculado a este projeto.
                </p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCadastroDialog(false);
                  setNovoNome('');
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