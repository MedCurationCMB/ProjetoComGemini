import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import ControleIndicadorTable from '../components/ControleIndicadorTable';
import UploadExcelIndicadorTemplate from '../components/UploadExcelIndicadorTemplate';

export default function ControleIndicador({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('tabela'); // 'tabela' ou 'upload'

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
    <div>
      <Head>
        <title>Controle de Indicadores</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Controle de Indicadores</h1>
          
          <div className="flex space-x-4">
            <Link 
              href="/welcome" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Voltar
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          {/* Tabs de navegação */}
          <div className="flex border-b mb-4">
            <button
              onClick={() => setActiveTab('tabela')}
              className={`px-4 py-2 font-medium text-sm rounded-t-md ${
                activeTab === 'tabela'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tabela de Controle
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`ml-2 px-4 py-2 font-medium text-sm rounded-t-md ${
                activeTab === 'upload'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upload de Planilha
            </button>
          </div>
          
          {/* Conteúdo da tab ativa */}
          {activeTab === 'tabela' ? (
            <ControleIndicadorTable user={user} />
          ) : (
            <UploadExcelIndicadorTemplate user={user} />
          )}
        </div>
      </main>
    </div>
  );
}