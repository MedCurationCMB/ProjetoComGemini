import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Navbar from '../components/Navbar';
import ControleIndicadorGeralTable from '../components/ControleIndicadorGeralTable';

export default function ControleIndicadorGeral({ user }) {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState('todos'); // 'todos', 'realizado', 'meta'
  const [filtroValorPendente, setFiltroValorPendente] = useState(false);

  // Redirecionar para a página de login se o usuário não estiver autenticado
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  // Não renderizar nada até que a verificação de autenticação seja concluída
  if (!user) {
    return null;
  }

  // Função para obter o título da aba ativa
  const getTituloAba = () => {
    switch (abaAtiva) {
      case 'realizado':
        return 'Indicadores - Realizado';
      case 'meta':
        return 'Indicadores - Meta';
      default:
        return 'Todos os Indicadores';
    }
  };

  // Função para obter a descrição da aba ativa
  const getDescricaoAba = () => {
    switch (abaAtiva) {
      case 'realizado':
        return 'Visualizando apenas indicadores do tipo "Realizado"';
      case 'meta':
        return 'Visualizando apenas indicadores do tipo "Meta"';
      default:
        return 'Visualizando todos os tipos de indicadores';
    }
  };

  return (
    <div>
      <Head>
        <title>Controle de Indicadores Geral</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Controle de Indicadores Geral</h1>
            <p className="text-gray-600 mt-1">{getDescricaoAba()}</p>
          </div>
          
          <div className="flex space-x-4">
            <Link 
              href="/controle-indicador" 
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Controle de Indicadores
            </Link>
            
            <Link 
              href="/welcome" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Voltar
            </Link>
          </div>
        </div>

        {/* Sistema de Abas */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              {/* Aba: Todos */}
              <button
                onClick={() => setAbaAtiva('todos')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'todos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Todos os Indicadores
                {abaAtiva === 'todos' && (
                  <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>

              {/* Aba: Realizado */}
              <button
                onClick={() => setAbaAtiva('realizado')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'realizado'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ✅ Realizado
                {abaAtiva === 'realizado' && (
                  <span className="ml-2 bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>

              {/* Aba: Meta */}
              <button
                onClick={() => setAbaAtiva('meta')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  abaAtiva === 'meta'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🎯 Meta
                {abaAtiva === 'meta' && (
                  <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-1 rounded-full text-xs">
                    Ativo
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div className="p-6">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                {getTituloAba()}
              </h2>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  {abaAtiva === 'todos' && (
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  )}
                  {abaAtiva === 'realizado' && (
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                  )}
                  {abaAtiva === 'meta' && (
                    <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                  )}
                  <span className="text-sm text-gray-600">
                    {abaAtiva === 'todos' && 'Mostrando todos os tipos de indicadores'}
                    {abaAtiva === 'realizado' && 'Filtrando apenas indicadores do tipo "Realizado"'}
                    {abaAtiva === 'meta' && 'Filtrando apenas indicadores do tipo "Meta"'}
                  </span>
                </div>
              </div>
            </div>

            {/* Componente da Tabela com filtro por tipo */}
            <ControleIndicadorGeralTable 
              user={user} 
              filtroTipoIndicador={abaAtiva} 
              filtroValorPendente={filtroValorPendente}
              setFiltroValorPendente={setFiltroValorPendente}
            />
          </div>
        </div>
      </main>
    </div>
  );
}