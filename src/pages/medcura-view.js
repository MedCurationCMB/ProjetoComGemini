// src/pages/medcura-view.js
import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { FiSearch, FiFilter, FiMenu, FiEyeOff, FiCalendar, FiStar, FiHome, FiBookmark, FiGrid3X3 } from 'react-icons/fi';

export default function MedCuraView({ user }) {
  const router = useRouter();

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>MedCura</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-blue-600">MedCura</h1>
            <button className="p-2">
              <FiMenu className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="w-full pl-12 pr-12 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
              placeholder="Buscar conteúdo médico..."
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
              <FiFilter className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Medcura</h2>
            <div className="flex items-center">
              <FiEyeOff className="w-4 h-4 text-gray-500 mr-2" />
              <span className="text-gray-600 font-medium">Conteúdos não lidos</span>
              <span className="ml-auto text-blue-600 font-medium">Ver todos</span>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <p className="text-gray-600 mb-6">2 conteúdos encontrados</p>

        {/* Content Cards */}
        <div className="space-y-4">
          {/* First Card */}
          <div className="bg-white rounded-lg border-l-4 border-blue-500 shadow-sm p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Novas Diretrizes para Hipertensão Arterial 2024
              </h3>
              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1"></div>
            </div>
            
            <p className="text-gray-600 mb-4 leading-relaxed">
              Atualização das diretrizes da Sociedade Brasileira de Cardiologia para manejo da hipertensão arterial sistêmica.
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  Cardiologia
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  Diretriz
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center text-gray-500">
                <FiCalendar className="w-4 h-4 mr-1" />
                <span className="text-sm">19/05/2024</span>
              </div>
              <div className="flex items-center bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                <span className="text-lg mr-1">⭐</span>
                <span className="text-sm font-medium">Destaque</span>
              </div>
            </div>
          </div>

          {/* Second Card */}
          <div className="bg-white rounded-lg border-l-4 border-blue-500 shadow-sm p-4">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                Manejo da Dor Crônica em Idosos
              </h3>
              <div className="flex space-x-2 flex-shrink-0 ml-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex space-x-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                  Geriatria
                </span>
                <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-sm font-medium">
                  Revisão
                </span>
              </div>
              <div className="flex items-center text-gray-500">
                <FiCalendar className="w-4 h-4 mr-1" />
                <span className="text-sm">14/05/2024</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="max-w-md mx-auto flex justify-around">
          <button className="flex flex-col items-center space-y-1 py-2 px-3 rounded-lg bg-blue-100 text-blue-600">
            <FiHome className="w-6 h-6" />
            <span className="text-xs font-medium">Início</span>
          </button>

          <button className="flex flex-col items-center space-y-1 py-2 px-3 rounded-lg text-gray-500 hover:text-gray-700">
            <FiStar className="w-6 h-6" />
            <span className="text-xs font-medium">Importantes</span>
          </button>

          <button className="flex flex-col items-center space-y-1 py-2 px-3 rounded-lg text-gray-500 hover:text-gray-700">
            <FiBookmark className="w-6 h-6" />
            <span className="text-xs font-medium">Ler Depois</span>
          </button>

          <button className="flex flex-col items-center space-y-1 py-2 px-3 rounded-lg text-gray-500 hover:text-gray-700">
            <FiGrid3X3 className="w-6 h-6" />
            <span className="text-xs font-medium">Ver Todos</span>
          </button>
        </div>
      </div>

      {/* Spacer for bottom navigation */}
      <div className="pb-20"></div>
    </div>
  );
}