// src/components/LogoDisplay.js
import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';

export default function LogoDisplay({ className = "", fallbackText = "MedCuration", showFallback = true }) {
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      setLoading(true);
      setError(false);
      
      const { data, error } = await supabase
        .from('config_logo')
        .select('logo')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setLogo(data[0].logo);
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Se estiver carregando
  if (loading) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className="animate-pulse">
          <div className="h-12 lg:h-14 w-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Se houver logo, exibir a logo
  if (logo && !error) {
    return (
      <div className={`flex items-center ${className}`}>
        <img 
          src={logo} 
          alt="Logo" 
          className="h-12 lg:h-14 max-w-full object-contain"
          onError={() => setError(true)}
        />
      </div>
    );
  }

  // Fallback: exibir texto original ou nada
  if (showFallback) {
    return (
      <div className={className}>
        <h1 className="text-2xl lg:text-3xl font-bold">
          <span className="text-blue-800">Med</span>
          <span className="text-green-800">Curation</span>
        </h1>
      </div>
    );
  }

  return null;
}