import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';

export const ForgotPasswordForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Por favor, insira seu email');
      return;
    }

    try {
      setLoading(true);
      
      // Configurar URL de redirecionamento após resetar a senha
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        throw error;
      }
      
      // Mostrar mensagem de sucesso e limpar o formulário
      toast.success('Link de redefinição de senha enviado para seu email');
      setResetSent(true);
      setEmail('');
    } catch (error) {
      toast.error(error.message || 'Erro ao enviar link de redefinição de senha');
    } finally {
      setLoading(false);
    }
  };

  // Se o link já foi enviado, mostrar mensagem diferente
  if (resetSent) {
    return (
      <div className="text-center">
        <p className="text-green-600 mb-4">
          Link de redefinição de senha enviado. 
          Verifique sua caixa de entrada (e pasta de spam).
        </p>
        <button 
          onClick={() => setResetSent(false)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handlePasswordReset} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email para redefinição
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Digite seu email cadastrado"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {loading ? 'Enviando...' : 'Enviar link de redefinição'}
      </button>
      
      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Lembre-se de verificar sua caixa de spam
        </p>
      </div>
    </form>
  );
};