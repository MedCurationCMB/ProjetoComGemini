import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../utils/supabaseClient';

export default function AcessoNegado() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div>
      <Head>
        <title>Acesso Negado</title>
      </Head>

      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="flex justify-center mb-6">
            <div className="bg-red-100 p-3 rounded-full">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-12 w-12 text-red-600" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-red-600 mb-4">
            Acesso Negado
          </h1>
          
          <p className="text-gray-600 text-center mb-6">
            Sua conta está desativada. Entre em contato com o administrador do sistema para reativar sua conta.
          </p>
          
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded focus:outline-none"
            >
              Voltar para o Login
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
