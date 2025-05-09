import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ConteudoTable from '../components/ConteudoTable';

export default function Tabela({ user }) {
  const router = useRouter();

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div>
      <Head>
      <title>Base de Dados de Conteúdo</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Base de Dados de Conteúdo</h1>
          
          <Link 
            href="/welcome" 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Voltar
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <ConteudoTable />
        </div>
      </main>
    </div>
  );
}
