import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';

// Lista de emails de administradores
const ADMIN_EMAILS = ['rhuanmateuscmb@gmail.com']; // Substitua pelo seu email de admin

const Navbar = ({ user }) => {
  const router = useRouter();
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
      router.push('/login');
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer logout');
    }
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href={user ? "/welcome" : "/"} className="text-xl font-bold">
          Sistema de Conteúdo
        </Link>
        <div className="flex space-x-4">
          {user ? (
            <>
              <span className="py-2">Olá, {user.email}</span>
              
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
                >
                  Admin
                </Link>
              )}
              
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-gray-300 py-2">
                Login
              </Link>
              <Link href="/cadastro" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
