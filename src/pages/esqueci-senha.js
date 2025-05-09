import { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

export default function EsqueciSenha({ user }) {
  const router = useRouter();

  // Redirecionar para a página inicial se o usuário já estiver autenticado
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  return (
    <div>
      <Head>
        <title>Recuperar Senha</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Recuperar Senha</h1>
          
          <ForgotPasswordForm />
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Lembrou sua senha?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Voltar para Login
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}