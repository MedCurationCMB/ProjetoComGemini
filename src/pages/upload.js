import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import FileUpload from '../components/FileUpload';
import { supabase } from '../utils/supabaseClient';

export default function Upload({ user }) {
  const router = useRouter();
  const [categorias, setCategorias] = useState([]);
  const [categoriaId, setCategoriaId] = useState('');
  const [projetos, setProjetos] = useState([]); // Novo estado para projetos
  const [projetoId, setProjetoId] = useState(''); // Novo estado para o ID do projeto selecionado
  const [loading, setLoading] = useState(true);

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Carregar categorias e projetos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar categorias
        const { data: categoriasData, error: categoriasError } = await supabase
          .from('categorias')
          .select('*')
          .order('nome');
        
        if (categoriasError) {
          throw categoriasError;
        }
        
        setCategorias(categoriasData || []);
        
        // Buscar projetos
        const { data: projetosData, error: projetosError } = await supabase
          .from('projetos')
          .select('*')
          .order('nome');
        
        if (projetosError) {
          throw projetosError;
        }
        
        setProjetos(projetosData || []);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        toast.error('Não foi possível carregar as categorias ou projetos');
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user]);

  // Função que é chamada quando o upload é concluído
  const handleUploadComplete = (data) => {
    console.log('Upload concluído com sucesso:', data);
    router.push('/tabela');
  };

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
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
        
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Selecione Categoria e Projeto</h2>
              
              {/* Campo de Categoria */}
              <div className="mb-4">
                <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
                  Categoria do Documento
                </label>
                <select
                  id="categoria"
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione uma categoria</option>
                  {categorias.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </select>
                
                {!categoriaId && (
                  <p className="mt-2 text-sm text-gray-500">
                    Você precisa selecionar uma categoria antes de fazer upload
                  </p>
                )}
              </div>
              
              {/* Novo Campo de Projeto */}
              <div className="mb-4">
                <label htmlFor="projeto" className="block text-sm font-medium text-gray-700 mb-2">
                  Projeto
                </label>
                <select
                  id="projeto"
                  value={projetoId}
                  onChange={(e) => setProjetoId(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um projeto</option>
                  {projetos.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </option>
                  ))}
                </select>
                
                {!projetoId && (
                  <p className="mt-2 text-sm text-gray-500">
                    Você precisa selecionar um projeto antes de fazer upload
                  </p>
                )}
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600">
                  As categorias e projetos ajudam a organizar seus documentos para facilitar a busca posteriormente.
                </p>
              </div>
            </div>
            
            <FileUpload 
              categoria_id={categoriaId}
              projeto_id={projetoId} // Passando o projeto_id para o componente FileUpload
              onUploadComplete={handleUploadComplete} 
            />
          </div>
        )}
      </main>
    </div>
  );
}