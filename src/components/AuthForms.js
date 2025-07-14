import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { isUserAdmin } from '../utils/userUtils';
import { trackSuccessfulLogin, trackFailedLogin } from '../utils/loginTracker';
import { toast } from 'react-hot-toast';

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validação básica antes de tentar o login
      if (!email || !password) {
        // ✅ Rastrear tentativa de login com dados incompletos
        await trackFailedLogin(email || 'email_não_fornecido', 'email_password', 'Campos obrigatórios não preenchidos');
        toast.error('Por favor, preencha todos os campos');
        return;
      }
      
      // Fazer login usando o serviço de autenticação do Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // ✅ Rastrear login falhado
        await trackFailedLogin(email, 'email_password', error.message);
        throw error;
      }
      
      // ✅ Rastrear login bem-sucedido
      await trackSuccessfulLogin(data.user, data.session, 'email_password');
      
      // Verificar se o usuário é admin
      const adminStatus = await isUserAdmin(data.user.id);
      
      toast.success('Login realizado com sucesso!');
      
      // Redirecionar baseado no status de admin
      if (adminStatus) {
        router.push('/welcome');
      } else {
        router.push('/visualizacao-indicadores');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="seu@email.com"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Digite sua senha"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Entrando...
          </div>
        ) : (
          'Entrar'
        )}
      </button>
    </form>
  );
};

export const RegisterForm = () => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validação básica
      if (!nome || !email || !password) {
        toast.error('Por favor, preencha todos os campos');
        return;
      }
      
      if (password.length < 6) {
        toast.error('A senha deve ter pelo menos 6 caracteres');
        return;
      }
      
      // Fazer cadastro usando o serviço de autenticação do Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome,
          },
        },
      });
      
      if (error) throw error;
      
      // ✅ Opcional: Rastrear cadastro bem-sucedido
      // (Você pode criar uma função trackSuccessfulRegistration se quiser)
      console.log('Cadastro realizado para:', email);
      
      toast.success('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.');
      router.replace('/login');
    } catch (error) {
      console.error('Erro no cadastro:', error);
      toast.error(error.message || 'Erro ao fazer cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <label htmlFor="nome" className="block text-sm font-medium text-gray-700">
          Nome
        </label>
        <input
          id="nome"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Seu nome completo"
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="seu@email.com"
        />
      </div>
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Senha
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Mínimo 6 caracteres"
        />
        {password.length > 0 && password.length < 6 && (
          <p className="mt-1 text-sm text-red-600">A senha deve ter pelo menos 6 caracteres</p>
        )}
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cadastrando...
          </div>
        ) : (
          'Cadastrar'
        )}
      </button>
    </form>
  );
};