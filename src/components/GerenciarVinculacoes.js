// src/components/GerenciarVinculacoes.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import { FiPlus, FiX, FiUser, FiFolder } from 'react-icons/fi';

const GerenciarVinculacoes = () => {
  const [vinculacoes, setVinculacoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [projetos, setProjetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Estados para nova vinculação
  const [usuarioSelecionado, setUsuarioSelecionado] = useState('');
  const [projetoSelecionado, setProjetoSelecionado] = useState('');
  const [adicionando, setAdicionando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar vinculações com dados de usuários e projetos
      const { data: vinculacoesData, error: vinculacoesError } = await supabase
        .from('relacao_usuarios_projetos')
        .select(`
          id,
          created_at,
          usuarios:usuario_id (
            id,
            email,
            raw_user_meta_data
          ),
          projetos:projeto_id (
            id,
            nome
          )
        `)
        .order('created_at', { ascending: false });
      
      if (vinculacoesError) throw vinculacoesError;
      
      // Carregar todos os usuários
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('id, email, raw_user_meta_data')
        .order('email');
      
      if (usuariosError) throw usuariosError;
      
      // Carregar todos os projetos
      const { data: projetosData, error: projetosError } = await supabase
        .from('projetos')
        .select('id, nome')
        .order('nome');
      
      if (projetosError) throw projetosError;
      
      setVinculacoes(vinculacoesData || []);
      setUsuarios(usuariosData || []);
      setProjetos(projetosData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados das vinculações');
    } finally {
      setLoading(false);
    }
  };

  const adicionarVinculacao = async () => {
    if (!usuarioSelecionado || !projetoSelecionado) {
      toast.error('Selecione um usuário e um projeto');
      return;
    }

    try {
      setAdicionando(true);
      
      // Verificar se a vinculação já existe
      const vinculacaoExistente = vinculacoes.find(v => 
        v.usuarios?.id === usuarioSelecionado && 
        v.projetos?.id === projetoSelecionado
      );
      
      if (vinculacaoExistente) {
        toast.error('Esta vinculação já existe');
        return;
      }
      
      // Criar nova vinculação
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .insert([{
          usuario_id: usuarioSelecionado,
          projeto_id: projetoSelecionado
        }])
        .select(`
          id,
          created_at,
          usuarios:usuario_id (
            id,
            email,
            raw_user_meta_data
          ),
          projetos:projeto_id (
            id,
            nome
          )
        `);
      
      if (error) throw error;
      
      // Atualizar lista local
      setVinculacoes([...data, ...vinculacoes]);
      
      // Limpar formulário
      setUsuarioSelecionado('');
      setProjetoSelecionado('');
      setShowAddDialog(false);
      
      toast.success('Vinculação criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar vinculação:', error);
      toast.error('Erro ao criar vinculação');
    } finally {
      setAdicionando(false);
    }
  };

  const removerVinculacao = async (vinculacaoId) => {
    if (!confirm('Tem certeza que deseja remover esta vinculação?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('relacao_usuarios_projetos')
        .delete()
        .eq('id', vinculacaoId);
      
      if (error) throw error;
      
      // Atualizar lista local
      setVinculacoes(vinculacoes.filter(v => v.id !== vinculacaoId));
      
      toast.success('Vinculação removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover vinculação:', error);
      toast.error('Erro ao remover vinculação');
    }
  };

  const getNomeUsuario = (usuario) => {
    if (!usuario) return 'Usuário não encontrado';
    return usuario.raw_user_meta_data?.nome || usuario.email;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Gerenciar Vinculações Usuário-Projeto</h2>
        
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          <FiPlus className="mr-2" />
          Nova Vinculação
        </button>
      </div>

      {/* Modal para adicionar nova vinculação */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Nova Vinculação</h3>
              <button 
                onClick={() => {
                  setShowAddDialog(false);
                  setUsuarioSelecionado('');
                  setProjetoSelecionado('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuário
                </label>
                <select
                  value={usuarioSelecionado}
                  onChange={(e) => setUsuarioSelecionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um usuário</option>
                  {usuarios.map((usuario) => (
                    <option key={usuario.id} value={usuario.id}>
                      {getNomeUsuario(usuario)} ({usuario.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projeto
                </label>
                <select
                  value={projetoSelecionado}
                  onChange={(e) => setProjetoSelecionado(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione um projeto</option>
                  {projetos.map((projeto) => (
                    <option key={projeto.id} value={projeto.id}>
                      {projeto.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setUsuarioSelecionado('');
                  setProjetoSelecionado('');
                }}
                disabled={adicionando}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={adicionarVinculacao}
                disabled={adicionando || !usuarioSelecionado || !projetoSelecionado}
                className={`px-4 py-2 rounded-md text-white ${
                  adicionando || !usuarioSelecionado || !projetoSelecionado
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {adicionando ? 'Criando...' : 'Criar Vinculação'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de vinculações */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Usuário
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Projeto
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Data de Criação
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vinculacoes.length > 0 ? (
              vinculacoes.map((vinculacao) => (
                <tr key={vinculacao.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiUser className="mr-2 h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getNomeUsuario(vinculacao.usuarios)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {vinculacao.usuarios?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiFolder className="mr-2 h-4 w-4 text-gray-400" />
                      <div className="text-sm font-medium text-gray-900">
                        {vinculacao.projetos?.nome || 'Projeto não encontrado'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(vinculacao.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => removerVinculacao(vinculacao.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Remover vinculação"
                    >
                      <FiX className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                  Nenhuma vinculação encontrada
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        Total de vinculações: {vinculacoes.length}
      </div>
    </div>
  );
};

export default GerenciarVinculacoes;