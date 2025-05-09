import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ConteudoTable from '../components/ConteudoTable';

export default function Home({ user }) {
  const router = useRouter();

  // Redirecionar para a página de login se o usuário não estiver autenticado
  // Ou para a página de boas-vindas se estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      router.replace('/welcome');
    }
  }, [user, router]);

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Sistema de Conteúdo - Página Inicial</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Base de Dados de Conteúdo</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <ConteudoTable />
        </div>
      </main>
    </div>
  );
}