import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import HistoricoAnalises from '../components/HistoricoAnalises';

export default function HistoricoPage({ user }) {
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
        <title>Histórico de Análises</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Histórico de Análises</h1>
          
          <div className="flex space-x-4">
            <Link 
              href="/analise-multipla" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Nova Análise
            </Link>
            
            <Link 
              href="/welcome" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Voltar
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Análises Realizadas</h2>
            <p className="text-gray-600 text-sm mb-4">
              Aqui você encontra todas as análises múltiplas de documentos que você realizou.
              Você pode visualizar o resultado da análise, os textos dos documentos utilizados ou excluir análises.
              <br />
              <span className="font-medium text-blue-600">Observação:</span> Apenas análises de documentos dos projetos aos quais você está vinculado são exibidas.
            </p>
          </div>
          
          <HistoricoAnalises user={user} />
        </div>
      </main>
    </div>
  );
}