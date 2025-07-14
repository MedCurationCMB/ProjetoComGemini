import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { isUserAdmin } from '../utils/userUtils';
import { toast } from 'react-hot-toast';

// Função para registrar login com debug detalhado
const registrarLogin = async (usuario) => {
  try {
    console.log('=== INÍCIO DEBUG REGISTRO LOGIN ===');
    console.log('Usuário:', {
      id: usuario.id,
      email: usuario.email,
      metadata: usuario.user_metadata
    });
    
    // Obter sessão atual para o token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.error('❌ Sessão não encontrada');
      return { success: false, error: 'Sessão não encontrada' };
    }

    console.log('✅ Sessão obtida:', {
      user_id: session.user.id,
      expires_at: session.expires_at
    });

    // Preparar dados do login
    const loginData = {
      usuario_id: usuario.id,
      nome_usuario: usuario.user_metadata?.nome || usuario.email.split('@')[0],
      email_usuario: usuario.email
    };

    console.log('📤 Dados a serem enviados:', loginData);

    // URL da API
    const apiUrl = '/api/record_login';
    console.log('📍 URL da API:', apiUrl);

    // Headers da requisição
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };
    console.log('📋 Headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': `Bearer ${session.access_token.substring(0, 20)}...`
    });

    // Fazer a requisição
    console.log('🚀 Fazendo requisição...');
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(loginData)
    });

    console.log('📥 Resposta recebida:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    // Verificar content-type
    const contentType = response.headers.get('content-type');
    console.log('📄 Content-Type:', contentType);

    // Ler a resposta como texto primeiro
    const responseText = await response.text();
    console.log('📝 Resposta como texto (primeiros 500 chars):', responseText.substring(0, 500));

    // Verificar se é JSON válido
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Resposta não é JSON:', {
        contentType,
        responsePreview: responseText.substring(0, 200)
      });
      return { success: false, error: 'Resposta não é JSON', debug: { contentType, responsePreview: responseText.substring(0, 200) } };
    }

    // Tentar fazer parse do JSON
    let result;
    try {
      result = JSON.parse(responseText);
      console.log('✅ JSON parseado com sucesso:', result);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      return { success: false, error: 'Erro de parsing JSON', debug: { parseError: parseError.message, responseText: responseText.substring(0, 200) } };
    }

    if (!response.ok) {
      console.error('❌ Resposta não OK:', result);
      return { success: false, error: result.error || 'Erro da API', debug: result };
    }

    console.log('✅ Login registrado com sucesso:', result);
    console.log('=== FIM DEBUG REGISTRO LOGIN ===');
    return { success: true, data: result };
    
  } catch (error) {
    console.error('💥 ERRO DURANTE REGISTRO:', error);
    console.error('Stack trace:', error.stack);
    
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido',
      debug: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
  }
};

export const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      console.log('🔐 Iniciando login para:', email);
      
      // Fazer login usando o serviço de autenticação do Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Erro no login:', error);
        throw error;
      }
      
      console.log('✅ Login no Supabase realizado com sucesso');
      
      // Verificar se o usuário é admin
      const adminStatus = await isUserAdmin(data.user.id);
      console.log('👑 Status de admin:', adminStatus);
      
      // Tentar registrar o login (com debug detalhado)
      console.log('📝 Iniciando registro do login...');
      const loginRegistrado = await registrarLogin(data.user);
      
      if (loginRegistrado.success) {
        console.log('✅ Login registrado no histórico com sucesso');
      } else {
        console.warn('⚠️ Falha ao registrar login no histórico:', loginRegistrado);
        
        // Mostrar detalhes do erro no console para debug
        if (loginRegistrado.debug) {
          console.error('🔍 Debug info:', loginRegistrado.debug);
        }
        
        // Opcional: mostrar toast com erro (pode comentar se não quiser mostrar para o usuário)
        // toast.error(`Erro no registro: ${loginRegistrado.error}`);
      }
      
      toast.success('Login realizado com sucesso!');
      
      // Redirecionar baseado no status de admin
      if (adminStatus) {
        router.push('/welcome');
      } else {
        router.push('/visualizacao-indicadores');
      }
    } catch (error) {
      console.error('💥 Erro durante o login:', error);
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
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {loading ? 'Carregando...' : 'Entrar'}
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
      
      toast.success('Cadastro realizado com sucesso! Verifique seu email para confirmar a conta.');
      router.replace('/login');
    } catch (error) {
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
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
      >
        {loading ? 'Carregando...' : 'Cadastrar'}
      </button>
    </form>
  );
};