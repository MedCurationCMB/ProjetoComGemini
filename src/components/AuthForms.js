import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';

// Função para obter data/hora no fuso horário de Brasília
const obterDataHoraBrasilia = () => {
  const agora = new Date();
  
  // Opção 1: Usando toLocaleString para obter a data no fuso de Brasília
  const dataBrasilia = new Date(agora.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  
  // Opção 2: Formatação manual para garantir o formato ISO correto
  const offset = -3; // UTC-3 (Brasília)
  const dataUTC = new Date(agora.getTime() + (agora.getTimezoneOffset() * 60000));
  const dataBrasiliaISO = new Date(dataUTC.getTime() + (offset * 60 * 60000));
  
  // Retornar no formato ISO com timezone
  return dataBrasiliaISO.toISOString().replace('Z', '-03:00');
};

// Função simples para registrar login diretamente no Supabase
const registrarLoginHistorico = async (usuario) => {
  try {
    console.log('Registrando login para:', usuario.email);

    // Obter data/hora no fuso horário de Brasília
    const dataHoraBrasilia = obterDataHoraBrasilia();
    
    console.log('Data/hora UTC:', new Date().toISOString());
    console.log('Data/hora Brasília:', dataHoraBrasilia);

    // Dados do login
    const loginData = {
      usuario_id: usuario.id,
      nome_usuario: usuario.user_metadata?.nome || usuario.email.split('@')[0],
      email_usuario: usuario.email,
      data_login: dataHoraBrasilia
    };

    console.log('Dados a inserir:', loginData);

    // Inserir diretamente na tabela usando o cliente Supabase
    const { data, error } = await supabase
      .from('historico_logins')
      .insert([loginData]);

    if (error) {
      console.error('Erro ao registrar login:', error);
      return false;
    }

    console.log('Login registrado com sucesso:', data);
    return true;

  } catch (error) {
    console.error('Erro ao registrar login:', error);
    return false;
  }
};

// Função para verificar permissões do usuário na tabela usuarios
const verificarPermissoesUsuario = async (userId) => {
  try {
    console.log('Verificando permissões do usuário:', userId);

    const { data, error } = await supabase
      .from('usuarios')
      .select('admin, gestor')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao verificar permissões:', error);
      return { admin: false, gestor: false };
    }

    console.log('Permissões encontradas:', data);
    
    return {
      admin: data?.admin === true,
      gestor: data?.gestor === true
    };

  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return { admin: false, gestor: false };
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
      
      // Fazer login usando o serviço de autenticação do Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      console.log('Login realizado com sucesso');
      
      // Registrar o login no histórico (simples e direto)
      const loginRegistrado = await registrarLoginHistorico(data.user);
      
      if (loginRegistrado) {
        console.log('Login registrado no histórico');
      } else {
        console.warn('Falha ao registrar login no histórico (não crítico)');
      }
      
      // Verificar permissões do usuário na tabela usuarios
      const permissoes = await verificarPermissoesUsuario(data.user.id);
      
      toast.success('Login realizado com sucesso!');
      
      // Lógica de redirecionamento baseada nas permissões
      if (permissoes.gestor) {
        // Se gestor for TRUE, redirecionar para /gestao-listas
        console.log('Usuário é gestor, redirecionando para /gestao-listas');
        router.push('/gestao-listas');
      } else if (permissoes.admin) {
        // Se admin for TRUE (e gestor for FALSE), redirecionar para /inicio
        console.log('Usuário é admin, redirecionando para /inicio');
        router.push('/inicio');
      } else {
        // Se ambas as condições forem false, redirecionar para /visualizacao-atividades
        console.log('Usuário é comum, redirecionando para /visualizacao-atividades');
        router.push('/visualizacao-atividades');
      }
      
    } catch (error) {
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
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
      >
        {loading ? 'Carregando...' : 'Cadastrar'}
      </button>
    </form>
  );
};