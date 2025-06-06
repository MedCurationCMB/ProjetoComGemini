import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import { supabase } from '../utils/supabaseClient';
import { FiFolder } from 'react-icons/fi';

export default function Upload({ user }) {
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [projetos, setProjetos] = useState([]); // Projetos vinculados
  const [projetosVinculados, setProjetosVinculados] = useState([]); // IDs dos projetos vinculados
  const [projetoId, setProjetoId] = useState('');
  const [loading, setLoading] = useState(true);
  const [apresentacaoVariaveis, setApresentacaoVariaveis] = useState({});

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Carregar dados quando o usuário estiver disponível
  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
      fetchApresentacaoVariaveis();
    }
  }, [user]);

  // Carregar categorias e projetos quando os projetos vinculados estiverem disponíveis
  useEffect(() => {
    if (projetosVinculados.length >= 0) { // Permitir execução mesmo se não há projetos vinculados
      fetchData();
    }
  }, [projetosVinculados]);

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
        apresentacaoObj[item.nome_variavel] = item.nome_apresentacao;
      });
      
      setApresentacaoVariaveis(apresentacaoObj);
    } catch (error) {
      console.error('Erro ao carregar apresentação das variáveis:', error);
    }
  };

  // Função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async () => {
    try {
      console.log('Buscando projetos vinculados para o usuário:', user.id);
      
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

  // Carregar categorias e projetos
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar categorias (todas)
      const { data: categoriasData, error: categoriasError } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      
      if (categoriasError) {
        throw categoriasError;
      }
      
      setCategorias(categoriasData || []);
      
      // Buscar APENAS projetos vinculados ao usuário
      if (projetosVinculados.length > 0) {
        console.log('Carregando projetos com IDs:', projetosVinculados);
        
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('*')
          .in('id', projetosVinculados) // Filtrar apenas projetos vinculados
          .order('nome');
        
        if (projetosError) {
          throw projetosError;
        }
        
        console.log('Projetos carregados:', projetosData);
        setProjetos(projetosData || []);
        console.log('Projetos carregados para upload:', projetosData?.length || 0);
      } else {
        // Se não há projetos vinculados, definir como array vazio
        console.log('Nenhum projeto vinculado encontrado');
        setProjetos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Não foi possível carregar as categorias ou projetos');
    } finally {
      setLoading(false);
    }
  };

  // Função que é chamada quando o upload é concluído
  const handleUploadComplete = (data) => {
    console.log('Upload concluído com sucesso:', data);
    router.push('/tabela');
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  // Se não há projetos vinculados, mostrar mensagem informativa
  if (projetosVinculados.length === 0 && !loading) {
    return (
      <div>
        <Head>
          <title>Upload de Arquivo - Sistema de Conteúdo</title>
        </Head>

        <Navbar user={user} />

        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Upload de Arquivo PDF</h1>
            
            <Link 
              href="/welcome" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Voltar
            </Link>
          </div>
          
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FiFolder className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes antes de fazer upload de arquivos.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      <Head>
        <title>Upload de Arquivo - Sistema de Conteúdo</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Upload de Arquivo PDF</h1>
          
          <Link 
            href="/welcome" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Voltar
          </Link>
        </div>
        
        {/* ✅ ADIÇÃO: Debug info - remover em produção */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-yellow-100 rounded-md">
            <h3 className="font-bold mb-2">Debug Info (apenas em desenvolvimento):</h3>
            <p><strong>Usuário ID:</strong> {user?.id}</p>
            <p><strong>Projetos vinculados (IDs):</strong> {JSON.stringify(projetosVinculados)}</p>
            <p><strong>Total de projetos carregados:</strong> {projetos.length}</p>
            <p><strong>Projeto selecionado:</strong> {projetoId} (tipo: {typeof projetoId})</p>
            <p><strong>Categoria selecionada:</strong> {categoriaId}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Selecione {apresentacaoVariaveis.categoria || 'Categoria'} e {apresentacaoVariaveis.projeto || 'Projeto'}</h2>
              
              {/* Campo de Categoria */}
              <div className="mb-4">
                <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                  {apresentacaoVariaveis.categoria || 'Categoria'} do Documento
                </label>
                <select
                  id="categoria"
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma {apresentacaoVariaveis.categoria?.toLowerCase() || 'categoria'}</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                
                {!categoriaId && (
                  <p className="mt-2 text-sm text-gray-500">
                    Você precisa selecionar uma {apresentacaoVariaveis.categoria?.toLowerCase() || 'categoria'} antes de fazer upload
                  </p>
                )}
              </div>
              
              {/* Campo de Projeto */}
              <div className="mb-4">
                <label htmlFor="projeto" className="block text-sm font-medium text-gray-700 mb-2">
                  {apresentacaoVariaveis.projeto || 'Projeto'} (apenas projetos vinculados)
                </label>
                <select
                  id="projeto"
                  value={projetoId}
                  onChange={(e) => {
                    console.log('Projeto selecionado:', e.target.value, 'Tipo:', typeof e.target.value);
                    setProjetoId(e.target.value);
                  }}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um {apresentacaoVariaveis.projeto?.toLowerCase() || 'projeto'}</option>
                  {projetos.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </option>
                  ))}
                </select>
                
                {!projetoId && (
                  <p className="mt-2 text-sm text-gray-500">
                    Você precisa selecionar um {apresentacaoVariaveis.projeto?.toLowerCase() || 'projeto'} antes de fazer upload
                  </p>
                )}
                
                {/* Mostrar lista de projetos disponíveis para debug */}
                {process.env.NODE_ENV === 'development' && projetos.length > 0 && (
                  <div className="mt-2 text-xs text-gray-600">
                    <strong>Projetos disponíveis:</strong>
                    <ul className="ml-4">
                      {projetos.map(projeto => (
                        <li key={projeto.id}>ID: {projeto.id} - {projeto.nome}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  As {apresentacaoVariaveis.categoria?.toLowerCase() || 'categorias'} e {apresentacaoVariaveis.projeto?.toLowerCase() || 'projetos'} ajudam a organizar seus documentos para facilitar a busca posteriormente.
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  <strong>Nota:</strong> Apenas {apresentacaoVariaveis.projeto?.toLowerCase() || 'projetos'} aos quais você está vinculado são exibidos.
                </p>
              </div>
            </div>
            
            <FileUpload 
              categoria_id={categoriaId}
              projeto_id={projetoId}
              projetosVinculados={projetosVinculados} // Passar projetos vinculados para validação
              onUploadComplete={handleUploadComplete} 
            />
          </div>
        )}
      </main>
    </div>
  );
}