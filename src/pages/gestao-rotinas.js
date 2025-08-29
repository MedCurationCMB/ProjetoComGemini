// Arquivo: src/pages/gestao-rotinas.js
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../utils/supabaseClient';
import { toast } from 'react-hot-toast';
import LogoDisplay from '../components/LogoDisplay';
import { 
  FiPlus,
  FiMenu, 
  FiHome, 
  FiStar, 
  FiClock, 
  FiClipboard,
  FiUser, 
  FiSettings, 
  FiLogOut,
  FiX,
  FiCheck,
  FiFolder,
  FiEdit3,
  FiCpu,
  FiList,
  FiTrendingUp,
  FiRepeat,
  FiCheckCircle,
  FiMoreVertical,
  FiTrash2,
  FiEdit,
  FiCalendar,
  FiSave,
  FiArrowLeft
} from 'react-icons/fi';

export default function GestaoRotinas({ user }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  
  // ✅ Estados para listas (substituindo projetos)
  const [listas, setListas] = useState({});
  const [listasVinculadas, setListasVinculadas] = useState([]);
  const [listaSelecionada, setListaSelecionada] = useState('');
  
  // Estados para rotinas
  const [rotinas, setRotinas] = useState([]);
  const [loadingRotinas, setLoadingRotinas] = useState(false);
  
  // Estados do formulário
  const [showForm, setShowForm] = useState(false);
  const [editandoRotina, setEditandoRotina] = useState(null);
  const [formData, setFormData] = useState({
    content: '',
    recurrence_type: 'daily',
    recurrence_interval: 1,
    recurrence_days: [],
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    persistent: true,
    note: ''
  });
  
  // Estados de ações
  const [salvandoRotina, setSalvandoRotina] = useState(false);
  const [menuAberto, setMenuAberto] = useState(null);

  // ===========================================
  // FUNÇÕES UTILITÁRIAS
  // ===========================================

  const diasDaSemana = [
    { valor: 1, nome: 'Segunda', abrev: 'SEG' },
    { valor: 2, nome: 'Terça', abrev: 'TER' },
    { valor: 3, nome: 'Quarta', abrev: 'QUA' },
    { valor: 4, nome: 'Quinta', abrev: 'QUI' },
    { valor: 5, nome: 'Sexta', abrev: 'SEX' },
    { valor: 6, nome: 'Sábado', abrev: 'SAB' },
    { valor: 7, nome: 'Domingo', abrev: 'DOM' }
  ];

  const tiposRecorrencia = [
    { valor: 'daily', nome: 'Diária' },
    { valor: 'weekly', nome: 'Semanal' },
    { valor: 'monthly', nome: 'Mensal' }
  ];

  const formatarRecorrencia = (rotina) => {
    if (rotina.recurrence_type === 'daily') {
      return `Diária${rotina.recurrence_interval > 1 ? ` (a cada ${rotina.recurrence_interval} dias)` : ''}`;
    } else if (rotina.recurrence_type === 'weekly') {
      const diasSelecionados = rotina.recurrence_days?.map(d => 
        diasDaSemana.find(dia => dia.valor === d)?.abrev
      ).join(', ');
      return `Semanal (${diasSelecionados})`;
    } else if (rotina.recurrence_type === 'monthly') {
      return `Mensal (dia ${new Date(rotina.start_date).getDate()})`;
    }
    return 'Não definida';
  };

  const resetForm = () => {
    setFormData({
      content: '',
      recurrence_type: 'daily',
      recurrence_interval: 1,
      recurrence_days: [],
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      persistent: true,
      note: ''
    });
    setEditandoRotina(null);
  };

  // ===========================================
  // ✅ FUNÇÕES DE CARREGAMENTO DE DADOS (ATUALIZADAS PARA LISTAS)
  // ===========================================

  const fetchListasVinculadas = async (userId) => {
    try {
      // ✅ Buscar listas vinculadas ao usuário
      const { data, error } = await supabase
        .from('relacao_usuario_list')
        .select('list_id')
        .eq('usuario_id', userId);
      
      if (error) throw error;
      
      const listIds = data.map(item => item.list_id);
      setListasVinculadas(listIds);
      
      if (listIds.length > 0) {
        // ✅ Buscar dados das listas
        const { data: listasData, error: listasError } = await supabase
          .from('tasks_list')
          .select('id, nome_lista')
          .in('id', listIds)
          .order('nome_lista');
        
        if (listasError) throw listasError;
        
        const listasObj = {};
        listasData.forEach(lista => {
          listasObj[lista.id] = lista.nome_lista;
        });
        
        setListas(listasObj);
        
        // Selecionar primeira lista por padrão
        if (!listaSelecionada && listasData.length > 0) {
          setListaSelecionada(listasData[0].id);
        }
      }
      
      return listIds;
    } catch (error) {
      console.error('Erro ao carregar listas vinculadas:', error);
      return [];
    }
  };

  const fetchRotinas = async () => {
    if (!listaSelecionada) return;
    
    try {
      setLoadingRotinas(true);
      
      // ✅ Buscar rotinas da lista selecionada
      const { data, error } = await supabase
        .from('routine_tasks')
        .select('*')
        .eq('usuario_id', user.id)
        .eq('task_list_id', listaSelecionada) // ✅ Mudança aqui
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setRotinas(data || []);
      
    } catch (error) {
      console.error('Erro ao carregar rotinas:', error);
      toast.error('Erro ao carregar rotinas');
    } finally {
      setLoadingRotinas(false);
    }
  };

  // ===========================================
  // ✅ FUNÇÕES DE AÇÕES (ATUALIZADAS PARA LISTAS)
  // ===========================================

  const validarFormulario = () => {
    if (!formData.content.trim()) {
      toast.error('Digite o conteúdo da rotina');
      return false;
    }
    
    if (!listaSelecionada) {
      toast.error('Selecione uma lista');
      return false;
    }
    
    if (formData.recurrence_type === 'weekly' && formData.recurrence_days.length === 0) {
      toast.error('Selecione pelo menos um dia da semana para rotinas semanais');
      return false;
    }
    
    if (formData.recurrence_interval < 1) {
      toast.error('O intervalo deve ser maior que 0');
      return false;
    }
    
    if (formData.end_date && formData.end_date < formData.start_date) {
      toast.error('A data de término deve ser posterior à data de início');
      return false;
    }
    
    return true;
  };

  const salvarRotina = async () => {
    if (!validarFormulario()) return;
    
    try {
      setSalvandoRotina(true);
      
      // ✅ Usar task_list_id em vez de projeto_id
      const dadosRotina = {
        usuario_id: user.id,
        task_list_id: listaSelecionada, // ✅ Mudança aqui
        content: formData.content.trim(),
        recurrence_type: formData.recurrence_type,
        recurrence_interval: formData.recurrence_interval,
        recurrence_days: formData.recurrence_type === 'weekly' ? formData.recurrence_days : null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        persistent: formData.persistent,
        note: formData.note.trim() || null
      };
      
      if (editandoRotina) {
        // Atualizar rotina existente
        const { error } = await supabase
          .from('routine_tasks')
          .update(dadosRotina)
          .eq('id', editandoRotina.id);
        
        if (error) throw error;
        
        toast.success('Rotina atualizada com sucesso!');
      } else {
        // Criar nova rotina
        const { error } = await supabase
          .from('routine_tasks')
          .insert([dadosRotina]);
        
        if (error) throw error;
        
        toast.success('Rotina criada com sucesso!');
      }
      
      setShowForm(false);
      resetForm();
      await fetchRotinas();
      
    } catch (error) {
      console.error('Erro ao salvar rotina:', error);
      toast.error('Erro ao salvar rotina');
    } finally {
      setSalvandoRotina(false);
    }
  };

  const iniciarEdicaoRotina = (rotina) => {
    setEditandoRotina(rotina);
    setFormData({
      content: rotina.content,
      recurrence_type: rotina.recurrence_type,
      recurrence_interval: rotina.recurrence_interval,
      recurrence_days: rotina.recurrence_days || [],
      start_date: rotina.start_date,
      end_date: rotina.end_date || '',
      persistent: rotina.persistent !== undefined ? rotina.persistent : true,
      note: rotina.note || ''
    });
    setShowForm(true);
    setMenuAberto(null);
  };

  const excluirRotina = async (rotinaId) => {
    if (!confirm('Tem certeza que deseja excluir esta rotina? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      // Primeiro, excluir todos os status relacionados (cascade já faz isso, mas sendo explícito)
      const { error: statusError } = await supabase
        .from('routine_tasks_status')
        .delete()
        .eq('routine_tasks_id', rotinaId);
      
      if (statusError) throw statusError;
      
      // Depois, excluir a rotina
      const { error } = await supabase
        .from('routine_tasks')
        .delete()
        .eq('id', rotinaId);
      
      if (error) throw error;
      
      toast.success('Rotina excluída com sucesso!');
      setMenuAberto(null);
      await fetchRotinas();
      
    } catch (error) {
      console.error('Erro ao excluir rotina:', error);
      toast.error('Erro ao excluir rotina');
    }
  };

  const toggleDiaSemana = (dia) => {
    setFormData(prev => ({
      ...prev,
      recurrence_days: prev.recurrence_days.includes(dia)
        ? prev.recurrence_days.filter(d => d !== dia)
        : [...prev.recurrence_days, dia].sort()
    }));
  };

  // ===========================================
  // FUNÇÕES DE NAVEGAÇÃO
  // ===========================================

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logout realizado com sucesso!');
      router.push('/login');
    } catch (error) {
      toast.error(error.message || 'Erro ao fazer logout');
    }
  };

  const handleInicioClick = () => {
    router.push('/inicio');
  };

  const handleConfiguracoesClick = () => {
    router.push('/configuracoes');
  };

  // ===========================================
  // ✅ EFFECTS (ATUALIZADOS PARA LISTAS)
  // ===========================================

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  useEffect(() => {
    const carregarDados = async () => {
      if (user) {
        setLoading(true);
        await fetchListasVinculadas(user.id); // ✅ Mudança aqui
        setLoading(false);
      }
    };
    
    carregarDados();
  }, [user]);

  useEffect(() => {
    if (listaSelecionada) { // ✅ Mudança aqui
      fetchRotinas();
    }
  }, [listaSelecionada]); // ✅ Mudança aqui

  // Fechar menu quando clicar fora
  useEffect(() => {
    const handleClickFora = (event) => {
      if (menuAberto && !event.target.closest('.menu-rotina')) {
        setMenuAberto(null);
      }
    };

    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, [menuAberto]);

  // ===========================================
  // RENDER
  // ===========================================

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Head>
        <title>Gestão de Rotinas</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header responsivo */}
      <div className="sticky top-0 bg-white shadow-sm z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/visualizacao-atividades')}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <FiArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <LogoDisplay 
                className=""
                fallbackText="Gestão de Rotinas"
                showFallback={true}
              />
            </div>
            
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 hover:bg-gray-100 rounded-md"
              >
                <FiMenu className="w-6 h-6 text-gray-600" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-30">
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleInicioClick();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center border-b border-gray-100"
                  >
                    <FiHome className="mr-3 h-4 w-4" />
                    Início
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push('/visualizacao-atividades');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiCheckCircle className="mr-3 h-4 w-4" />
                    Visualizar Atividades
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push('/visualizacao-indicadores');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiTrendingUp className="mr-3 h-4 w-4" />
                    Gestão Indicadores
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push('/documentos');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiFolder className="mr-3 h-4 w-4" />
                    Gestão Documentos
                  </button>
                  
                  {/* ✅ NOVO: Link para Gestão de Listas */}
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      router.push('/gestao-listas');
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center transition-colors"
                  >
                    <FiList className="mr-3 h-4 w-4" />
                    Gestão de Listas
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                  >
                    <FiUser className="mr-3 h-4 w-4" />
                    Perfil
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleConfiguracoesClick();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center"
                  >
                    <FiSettings className="mr-3 h-4 w-4" />
                    Configurações
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center text-red-600"
                  >
                    <FiLogOut className="mr-3 h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Seleção de Lista */}
      <div className="sticky top-[72px] bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#012060]"></div>
            </div>
          ) : listasVinculadas.length === 0 ? (
            <div className="text-center py-4">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <FiList className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma lista vinculada</h3>
              <p className="text-gray-500 text-sm">
                Entre em contato com o administrador para vincular você a listas relevantes.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <select
                className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-[#012060] focus:bg-white text-sm mr-4"
                value={listaSelecionada}
                onChange={(e) => setListaSelecionada(e.target.value)}
              >
                <option value="">Selecione uma lista</option>
                {Object.entries(listas).map(([id, nome]) => (
                  <option key={id} value={id}>{nome}</option>
                ))}
              </select>
              
              {listaSelecionada && (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-6 py-3 bg-[#012060] text-white rounded-full hover:bg-[#013080] focus:outline-none focus:ring-2 focus:ring-[#012060] flex items-center space-x-2 transition-colors"
                >
                  <FiPlus className="w-5 h-5" />
                  <span>Nova Rotina</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {listaSelecionada && (
            <>
              {/* Lista de Rotinas */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <FiRepeat className="w-5 h-5 text-[#012060] mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900">Rotinas Criadas</h3>
                  </div>
                  <span className="text-sm text-gray-500">{rotinas.length} rotina{rotinas.length !== 1 ? 's' : ''}</span>
                </div>
                
                {loadingRotinas ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#012060]"></div>
                  </div>
                ) : rotinas.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="mx-auto w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mb-3">
                      <FiRepeat className="w-6 h-6 text-[#012060]" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">Nenhuma rotina criada</h4>
                    <p className="text-gray-500 text-sm mb-4">
                      Crie sua primeira rotina para começar a organizar suas atividades recorrentes.
                    </p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="px-6 py-2 bg-[#012060] text-white rounded-full hover:bg-[#013080] transition-colors"
                    >
                      Criar Primeira Rotina
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rotinas.map((rotina) => (
                      <div
                        key={rotina.id}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900 mb-2">{rotina.content}</h4>
                            
                            <div className="space-y-1 text-xs text-gray-500">
                              <div className="flex items-center">
                                <FiRepeat className="w-3 h-3 mr-1" />
                                <span>{formatarRecorrencia(rotina)}</span>
                              </div>
                              
                              <div className="flex items-center">
                                <FiCalendar className="w-3 h-3 mr-1" />
                                <span>
                                  Início: {new Date(rotina.start_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                                  {rotina.end_date && (
                                    <> | Fim: {new Date(rotina.end_date + 'T12:00:00').toLocaleDateString('pt-BR')}</>
                                  )}
                                </span>
                              </div>
                              
                              <div className="flex items-center">
                                <FiClock className="w-3 h-3 mr-1" />
                                <span>
                                  Criada em {new Date(rotina.created_at).toLocaleDateString('pt-BR')} às {new Date(rotina.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Menu de ações */}
                          <div className="relative menu-rotina ml-4">
                            <button
                              onClick={() => setMenuAberto(menuAberto === rotina.id ? null : rotina.id)}
                              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              <FiMoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                            
                            {menuAberto === rotina.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white rounded-md shadow-lg border z-20 py-1 min-w-[120px]">
                                <button
                                  onClick={() => iniciarEdicaoRotina(rotina)}
                                  className="w-full px-3 py-2 text-left hover:bg-blue-50 flex items-center text-[#012060] text-sm"
                                >
                                  <FiEdit className="w-3 h-3 mr-2" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => excluirRotina(rotina.id)}
                                  className="w-full px-3 py-2 text-left hover:bg-red-50 flex items-center text-red-600 text-sm"
                                >
                                  <FiTrash2 className="w-3 h-3 mr-2" />
                                  Excluir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal do Formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editandoRotina ? 'Editar Rotina' : 'Nova Rotina'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FiX className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* ✅ Mostrar lista selecionada */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-center text-sm">
                    <FiList className="w-4 h-4 text-[#012060] mr-2" />
                    <span className="text-gray-700">
                      Lista selecionada: <strong>{listas[listaSelecionada]}</strong>
                    </span>
                  </div>
                </div>

                {/* Conteúdo da Rotina */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição da Rotina *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Ex: Fazer exercícios, Revisar emails, Estudar..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Tipo de Recorrência */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Recorrência *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {tiposRecorrencia.map((tipo) => (
                      <button
                        key={tipo.valor}
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          recurrence_type: tipo.valor,
                          recurrence_days: tipo.valor === 'weekly' ? prev.recurrence_days : []
                        }))}
                        className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                          formData.recurrence_type === tipo.valor
                            ? 'bg-[#012060] text-white border-[#012060]'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {tipo.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intervalo (apenas para diária) */}
                {formData.recurrence_type === 'daily' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intervalo (dias)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.recurrence_interval}
                      onChange={(e) => setFormData(prev => ({ ...prev, recurrence_interval: parseInt(e.target.value) || 1 }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-transparent"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.recurrence_interval === 1 ? 'Todos os dias' : `A cada ${formData.recurrence_interval} dias`}
                    </p>
                  </div>
                )}

                {/* Dias da Semana (apenas para semanal) */}
                {formData.recurrence_type === 'weekly' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dias da Semana *
                    </label>
                    <div className="grid grid-cols-7 gap-2">
                      {diasDaSemana.map((dia) => (
                        <button
                          key={dia.valor}
                          type="button"
                          onClick={() => toggleDiaSemana(dia.valor)}
                          className={`p-3 border rounded-lg text-xs font-medium transition-colors ${
                            formData.recurrence_days.includes(dia.valor)
                              ? 'bg-[#012060] text-white border-[#012060]'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {dia.abrev}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Selecione os dias da semana em que a rotina deve se repetir
                    </p>
                  </div>
                )}

                {/* Datas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Início *
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Término (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                      min={formData.start_date}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deixe em branco para rotina sem fim
                    </p>
                  </div>
                </div>

                {/* Campo Persistent */}
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Exibição
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                          id="persistent-true"
                          name="persistent"
                          type="radio"
                          checked={formData.persistent === true}
                          onChange={() => setFormData(prev => ({ ...prev, persistent: true }))}
                          className="focus:ring-[#012060] h-4 w-4 text-[#012060] border-gray-300"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label htmlFor="persistent-true" className="text-sm font-medium text-gray-900 cursor-pointer">
                          Persistente (Recomendado)
                        </label>
                        <p className="text-xs text-gray-500">
                          Se não fizer hoje, aparece amanhã como pendente até ser concluída
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                          id="persistent-false"
                          name="persistent"
                          type="radio"
                          checked={formData.persistent === false}
                          onChange={() => setFormData(prev => ({ ...prev, persistent: false }))}
                          className="focus:ring-[#012060] h-4 w-4 text-[#012060] border-gray-300"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <label htmlFor="persistent-false" className="text-sm font-medium text-gray-900 cursor-pointer">
                          Não Persistente
                        </label>
                        <p className="text-xs text-gray-500">
                          Só aparece no dia específico. Se não fizer, desaparece no dia seguinte
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campo de Nota */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nota (opcional)
                  </label>
                  <textarea
                    value={formData.note}
                    onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                    placeholder="Adicione uma nota para esta rotina (ex: instruções específicas, lembretes, observações)..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#012060] focus:border-transparent resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Esta nota aparecerá em todas as ocorrências desta rotina
                  </p>
                </div>

                {/* Preview da Recorrência */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Preview da Recorrência</h4>
                  <p className="text-sm text-blue-800">
                    <strong>Lista:</strong> {listas[listaSelecionada]}
                    <br />
                    <strong>Tipo:</strong> {tiposRecorrencia.find(t => t.valor === formData.recurrence_type)?.nome}
                    <br />
                    {formData.recurrence_type === 'daily' && (
                      <>
                        <strong>Frequência:</strong> {formData.recurrence_interval === 1 ? 'Todos os dias' : `A cada ${formData.recurrence_interval} dias`}
                        <br />
                      </>
                    )}
                    {formData.recurrence_type === 'weekly' && (
                      <>
                        <strong>Dias:</strong> {formData.recurrence_days.length > 0 
                          ? formData.recurrence_days.map(d => diasDaSemana.find(dia => dia.valor === d)?.nome).join(', ')
                          : 'Nenhum dia selecionado'
                        }
                        <br />
                      </>
                    )}
                    {formData.recurrence_type === 'monthly' && (
                      <>
                        <strong>Dia do mês:</strong> {formData.start_date ? formData.start_date.split('-')[2] : ''}
                        <br />
                      </>
                    )}
                    <strong>Período:</strong> {formData.start_date ? 
                      formData.start_date.split('-').reverse().join('/') : ''}
                    {formData.end_date && (
                      <> até {formData.end_date.split('-').reverse().join('/')}</>
                    )}
                    {!formData.end_date && <> (sem data de término)</>}
                    <br />
                    <strong>Persistência:</strong> {formData.persistent 
                      ? 'Persistente (aparece até ser concluída)' 
                      : 'Não persistente (só no dia específico)'
                    }
                    <br />
                    <strong>Nota:</strong> {formData.note.trim() 
                      ? formData.note.trim() 
                      : 'Nenhuma nota adicionada'
                    }
                  </p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarRotina}
                  disabled={salvandoRotina || !formData.content.trim()}
                  className="px-6 py-2 bg-[#012060] text-white rounded-lg hover:bg-[#013080] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                >
                  {salvandoRotina ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="w-4 h-4" />
                      <span>{editandoRotina ? 'Atualizar' : 'Criar'} Rotina</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para fechar menus quando clicar fora */}
      {(showMenu) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-5"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}