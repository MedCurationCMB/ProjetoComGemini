// src/pages/controle-conteudo-visivel.js
import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ControleConteudoVisivelTable from '../components/ControleConteudoVisivelTable';

export default function ControleConteudoVisivel({ user }) {
  const router = useRouter();
  
  // Estados para filtros
  const [filtroProjetoId, setFiltroProjetoId] = useState('');
  const [filtroCategoriaId, setFiltroCategoriaId] = useState('');

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
        <title>Controle de Conteúdo Visível</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Controle de Conteúdo Visível</h1>
          
          <div className="flex space-x-4">
            <Link 
              href="/controle-conteudo-geral" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Controle Geral
            </Link>
            
            <Link 
              href="/controle-conteudo" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Controle de Conteúdo
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
          <ControleConteudoVisivelTable 
            user={user} 
            filtroProjetoId={filtroProjetoId}
            filtroCategoriaId={filtroCategoriaId}
            setFiltroProjetoId={setFiltroProjetoId}
            setFiltroCategoriaId={setFiltroCategoriaId}
          />
        </div>
      </main>
    </div>
  );
}