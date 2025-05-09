import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { RegisterForm } from '../components/AuthForms';

export default function Cadastro({ user }) {
  const router = useRouter();

  // Redirecionar para a página inicial se o usuário já estiver autenticado
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Não redirecionar automaticamente para permitir a visualização da página
  return (
    <div>
      <Head>
        <title>Sistema de Conteúdo - Cadastro</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Cadastro</h1>
          
          <RegisterForm />
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}