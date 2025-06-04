import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Navbar from '../components/Navbar';
import { isUserAdmin } from '../utils/userUtils';

export default function Welcome({ user }) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Verificar se o usuário é admin quando o componente carrega
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user?.id) {
        setCheckingAdmin(true);
        try {
          const adminStatus = await isUserAdmin(user.id);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Erro ao verificar status de admin:', error);
          setIsAdmin(false);
        } finally {
          setCheckingAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  return (
    <div>
      <Head>
        <title>Bem-vindo ao Sistema</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto text-center bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl font-bold mb-6">Bem-vindo ao Sistema de Conteúdo!</h1>
          
          <p className="text-lg mb-8">
            Olá, <span className="font-semibold">{user.email}</span>. É um prazer ter você conosco.
            Aqui você pode visualizar nossa base de dados de conteúdo e fazer upload de novos arquivos.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Link 
              href="/tabela" 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Visualizar Base de Dados
            </Link>
            
            <Link 
              href="/upload" 
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Upload de Arquivo PDF
            </Link>
          </div>
          
          <div className="grid grid-cols-1 gap-4 mt-4">
            <Link 
              href="/analise-multipla" 
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Análise Múltipla de Documentos
            </Link>
            
            <Link 
              href="/historico-analises" 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Histórico de Análises
            </Link>
            
            <Link 
              href="/controle-conteudo" 
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Controle de Conteúdo
            </Link>
            
            <Link 
              href="/controle-conteudo-geral" 
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Controle de Conteúdo Geral
            </Link>

            <Link 
              href="/controle-indicador" 
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Controle de Indicadores
            </Link>

            <Link 
              href="/med-curation-desktop" 
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Visualização MedCuration
            </Link>

            <Link 
              href="/cadastros" 
              className="bg-lime-600 hover:bg-lime-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Cadastros
            </Link>
          </div>
            
          {isAdmin && !checkingAdmin && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-gray-600 mb-4">Opções de administrador:</p>
              <Link 
                href="/admin" 
                className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Acessar painel administrativo
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}