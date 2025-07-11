import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { FiBarChart3, FiCpu, FiArrowLeft, FiHome, FiTrendingUp, FiInfo } from 'react-icons/fi';
import Navbar from '../components/Navbar';
import IndicadoresSelectTable from '../components/IndicadoresSelectTable';
import MultiIndicatorAnalysisDialog from '../components/MultiIndicatorAnalysisDialog';

export default function AnaliseMultiplaIndicadores({ user }) {
  const router = useRouter();
  const [selectedIndicadores, setSelectedIndicadores] = useState([]);
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

  // Manipular mudança na seleção de indicadores
  const handleSelectionChange = (indicadorIds) => {
    setSelectedIndicadores(indicadorIds);
  };

  // Manipular finalização da análise
  const handleAnalysisComplete = (resultado, analysisId) => {
    console.log(`Análise múltipla de indicadores concluída com sucesso! ID: ${analysisId}`);
    toast.success('Análise salva com sucesso! Você pode encontrá-la no histórico.');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Análise Múltipla de Indicadores</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <Navbar user={user} />

      {/* Header da página */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Lado esquerdo - Navegação */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/welcome"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5 mr-2" />
                <span className="text-sm font-medium">Voltar</span>
              </Link>
              
              <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
              
              <div className="flex items-center">
                <FiBarChart3 className="w-6 h-6 text-blue-600 mr-3" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Análise Múltipla de Indicadores</h1>
                  <p className="text-sm text-gray-500 hidden sm:block">
                    Compare e analise múltiplos indicadores simultaneamente com IA
                  </p>
                </div>
              </div>
            </div>

            {/* Lado direito - Botão de análise */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowAnalysisDialog(true)}
                disabled={selectedIndicadores.length === 0}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedIndicadores.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                <FiCpu className="w-4 h-4 mr-2" />
                Gerar Análise com IA
                {selectedIndicadores.length > 0 && (
                  <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {selectedIndicadores.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Card informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <FiInfo className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h2 className="text-lg font-semibold text-blue-900 mb-2">
                Como funciona a Análise Múltipla
              </h2>
              <div className="text-blue-800 space-y-2">
                <p className="text-sm">
                  • <strong>Selecione os indicadores:</strong> Escolha múltiplos indicadores da tabela abaixo
                </p>
                <p className="text-sm">
                  • <strong>Dados combinados:</strong> A IA analisará todos os dados históricos dos indicadores selecionados
                </p>
                <p className="text-sm">
                  • <strong>Insights cruzados:</strong> Obtenha comparações, correlações e tendências entre os indicadores
                </p>
                <p className="text-sm">
                  • <strong>Visão estratégica:</strong> Perfeito para análises executivas e tomada de decisão
                </p>
              </div>
              <div className="mt-3 text-xs text-blue-600 bg-blue-100 rounded px-3 py-2">
                💡 <strong>Dica:</strong> Selecione indicadores relacionados (mesmo projeto ou categoria) para obter insights mais relevantes
              </div>
            </div>
          </div>
        </div>

        {/* Status da seleção */}
        {selectedIndicadores.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <FiTrendingUp className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">
                {selectedIndicadores.length} indicador(es) selecionado(s) para análise
              </span>
              <button
                onClick={() => setShowAnalysisDialog(true)}
                className="ml-auto bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                Iniciar Análise
              </button>
            </div>
          </div>
        )}
        
        {/* Card principal com a tabela */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Header do card */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Selecione os Indicadores</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Escolha os indicadores que deseja analisar em conjunto. 
                  Apenas indicadores dos projetos aos quais você está vinculado são exibidos.
                </p>
              </div>
              
              {/* Contador de seleção no header */}
              {selectedIndicadores.length > 0 && (
                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedIndicadores.length} selecionado(s)
                </div>
              )}
            </div>
          </div>
          
          {/* Tabela de indicadores */}
          <div className="p-6">
            <IndicadoresSelectTable 
              user={user} 
              onSelectionChange={handleSelectionChange} 
            />
          </div>
        </div>

        {/* Card de instruções adicionais */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <FiInfo className="w-5 h-5 mr-2 text-gray-600" />
            Dicas para uma melhor análise
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">📊 Seleção Estratégica</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Combine indicadores do mesmo período temporal</li>
                <li>• Selecione indicadores relacionados ou complementares</li>
                <li>• Evite misturar indicadores de escalas muito diferentes</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">🎯 Melhores Práticas</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Escolha um prompt específico para seu objetivo</li>
                <li>• Analise entre 2-5 indicadores por vez para melhor clareza</li>
                <li>• Use o preview para verificar a qualidade dos dados</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Links relacionados */}
        <div className="mt-8 flex justify-center">
          <div className="flex items-center space-x-6 text-sm">
            <Link 
              href="/visualizacao-indicadores" 
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FiBarChart3 className="w-4 h-4 mr-1" />
              Ver Todos os Indicadores
            </Link>
            
            <span className="text-gray-300">|</span>
            
            <Link 
              href="/analise-multipla" 
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FiCpu className="w-4 h-4 mr-1" />
              Análise de Documentos
            </Link>
            
            <span className="text-gray-300">|</span>
            
            <Link 
              href="/welcome" 
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <FiHome className="w-4 h-4 mr-1" />
              Página Inicial
            </Link>
          </div>
        </div>
      </main>

      {/* Diálogo de análise com IA */}
      {showAnalysisDialog && (
        <MultiIndicatorAnalysisDialog
          selectedIndicadores={selectedIndicadores}
          onClose={() => setShowAnalysisDialog(false)}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}
    </div>
  );
}