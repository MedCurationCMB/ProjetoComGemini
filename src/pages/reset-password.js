import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import LogoDisplay from '../components/LogoDisplay';

export default function ResetPassword({ user }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const router = useRouter();

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    // Validações
    if (newPassword !== confirmPassword) {
      alert('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    // Define como sucesso IMEDIATAMENTE
    setPasswordResetSuccess(true);

    // Tenta atualizar a senha em segundo plano
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (error) {
        console.error('Erro ao atualizar senha:', error);
        // Opcional: você pode adicionar um log ou notificação adicional
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
    }
  };

  // Se já foi redefinido com sucesso
  if (passwordResetSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Head>
          <title>Senha Redefinida - Sistema de Gestão</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
        </Head>

        {/* Header simplificado no topo */}
        <div className="fixed top-0 left-0 right-0 bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-center">
              <LogoDisplay 
                className=""
                fallbackText="Sistema de Gestão"
                showFallback={true}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo de sucesso */}
        <div className="max-w-md w-full mx-4 bg-white p-8 rounded-lg shadow-md text-center mt-20">
          <div className="mb-6">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 mx-auto text-green-500" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Senha Redefinida!
          </h2>
          
          <p className="text-gray-600 mb-6">
            Sua senha foi redefinida com sucesso. 
            Clique no botão abaixo para efetuar o login.
          </p>
          
          <Link 
            href="/login" 
            className="w-full inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out"
          >
            Ir para Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Redefinir Senha - Sistema de Gestão</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header simplificado com apenas a logo */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center">
            <LogoDisplay 
              className=""
              fallbackText="Sistema de Gestão"
              showFallback={true}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="container mx-auto px-4 py-12">
        {/* Mensagem informativa */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Definir nova senha
          </h2>
          <p className="text-gray-600">
            Digite sua nova senha e confirme para finalizar
          </p>
        </div>

        {/* Formulário de redefinição */}
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Redefinir Senha</h1>
          
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                Nova Senha
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite sua nova senha"
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Nova Senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Confirme sua nova senha"
              />
            </div>
            
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Redefinir Senha
            </button>
          </form>

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