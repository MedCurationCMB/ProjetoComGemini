import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import Navbar from '../components/Navbar';
import DocumentosSelectTable from '../components/DocumentosSelectTable';
import MultiDocAnalysisDialog from '../components/MultiDocAnalysisDialog';

export default function AnaliseMultipla({ user }) {
  const router = useRouter();
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);

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

  // Manipular mudança na seleção de documentos
  const handleSelectionChange = (docIds) => {
    setSelectedDocuments(docIds);
  };

  // Manipular finalização da análise
  const handleAnalysisComplete = (resultado, analysisId) => {
    console.log(`Análise concluída com sucesso! ID: ${analysisId}`);
  };

  return (
    <div>
      <Head>
        <title>Análise Múltipla de Documentos</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Análise Múltipla de Documentos</h1>
          
          <div className="flex space-x-4">
            <button
              onClick={() => setShowAnalysisDialog(true)}
              disabled={selectedDocuments.length === 0}
              className={`${
                selectedDocuments.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white px-4 py-2 rounded-md text-sm font-medium`}
            >
              Gerar Análise com IA ({selectedDocuments.length})
            </button>
            
            <Link 
              href="/welcome" 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Voltar
            </Link>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Selecione os documentos para análise</h2>
            <p className="text-gray-600 text-sm mb-4">
              Selecione os documentos que deseja analisar em conjunto. A IA combinará o texto de todos os documentos selecionados para gerar uma análise única.
            </p>
          </div>
          
          <DocumentosSelectTable onSelectionChange={handleSelectionChange} />
        </div>
      </main>

      {/* Diálogo de análise com IA */}
      {showAnalysisDialog && (
        <MultiDocAnalysisDialog
          selectedDocuments={selectedDocuments}
          onClose={() => setShowAnalysisDialog(false)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
    </div>
  );
}