import React from 'react';
import './TipTapEditor.css'; // Importar os mesmos estilos para consistência

const VisualizarTextoAnalise = ({ htmlContent, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Texto Análise</h2>
          <button 
            onClick={onClose}
            className="text-red-500 hover:text-red-700 bg-gray-100 p-2 rounded"
          >
            Fechar
          </button>
        </div>
        
        <div className="tiptap-preview prose prose-sm max-w-none bg-gray-50 p-4 rounded-md border border-gray-200">
          <div 
            className="tiptap-editor ProseMirror" 
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};

export default VisualizarTextoAnalise;