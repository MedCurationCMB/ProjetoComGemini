import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { isUserAdmin } from '../utils/userUtils';
import Navbar from '../components/Navbar';
import ConteudoTable from '../components/ConteudoTable';

export default function Home({ user }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // Redirecionar baseado no status do usuário
  useEffect(() => {
    const handleRedirect = async () => {
      if (!user) {
        router.replace('/login');
        return;
      }

      try {
        // Verificar se o usuário é admin
        const adminStatus = await isUserAdmin(user.id);
        
        // Redirecionar baseado no status de admin
        if (adminStatus) {
          router.replace('/inicio');
        } else {
          router.replace('/inicio');
        }
      } catch (error) {
        console.error('Erro ao verificar status de admin:', error);
        // Em caso de erro, redirecionar para welcome por padrão
        router.replace('/inicio');
      } finally {
        setChecking(false);
      }
    };

    handleRedirect();
  }, [user, router]);

  // Mostrar loading enquanto verifica e redireciona
  if (checking || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Este código nunca deve ser alcançado devido ao redirecionamento
  return (
    <div>
      <Head>
        <title>Sistema de Conteúdo - Página Inicial</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Base de Dados de Conteúdo</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <ConteudoTable user={user} />
        </div>
      </main>
    </div>
  );
}