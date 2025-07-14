import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';

const HistoricoLogins = () => {
  const [logins, setLogins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filtroEmail, setFiltroEmail] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const itemsPerPage = 20;

  const carregarLogins = async () => {
    try {
      setLoading(true);

      // Obter sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa estar logado para ver o histórico');
        return;
      }

      // Construir query
      let query = supabase
        .from('historico_logins')
        .select('*', { count: 'exact' })
        .order('data_login', { ascending: false });

      // Aplicar filtros
      if (filtroEmail) {
        query = query.ilike('email_usuario', `%${filtroEmail}%`);
      }

      if (filtroData) {
        const dataInicio = `${filtroData}T00:00:00`;
        const dataFim = `${filtroData}T23:59:59`;
        query = query.gte('data_login', dataInicio).lte('data_login', dataFim);
      }

      // Aplicar paginação
      const startIndex = (page - 1) * itemsPerPage;
      query = query.range(startIndex, startIndex + itemsPerPage - 1);

      const { data, error, count } = await query;

      if (error) {
        console.error('Erro ao carregar histórico de logins:', error);
        toast.error('Erro ao carregar histórico de logins');
        return;
      }

      setLogins(data || []);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));

    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de logins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarLogins();
  }, [page, filtroEmail, filtroData]);

  const formatarData = (dataString) => {
    const data = new Date(dataString);
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const aplicarFiltros = () => {
    setPage(1);
    carregarLogins();
  };

  const limparFiltros = () => {
    setFiltroEmail('');
    setFiltroData('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Histórico de Logins</h2>
        <button
          onClick={carregarLogins}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Atualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={filtroEmail}
              onChange={(e) => setFiltroEmail(e.target.value)}
              placeholder="Filtrar por email..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={aplicarFiltros}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Aplicar
            </button>
            <button
              onClick={limparFiltros}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data e Hora do Login
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logins.length > 0 ? (
                logins.map((login) => (
                  <tr key={login.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {login.nome_usuario}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {login.email_usuario}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatarData(login.data_login)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                    Nenhum login registrado encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Página {page} de {totalPages}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === totalPages}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoricoLogins;