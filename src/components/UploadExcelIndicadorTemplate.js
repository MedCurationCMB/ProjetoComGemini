import React, { useState, useEffect } from "react";
import { supabase } from "../utils/supabaseClient";
import { toast } from "react-hot-toast";
import { FiUpload, FiDownload, FiFile, FiX, FiFolder } from "react-icons/fi";
import ExcelJS from "exceljs";

const UploadExcelIndicadorTemplate = ({ user }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [projetos, setProjetos] = useState({});
  const [projetosVinculados, setProjetosVinculados] = useState([]);
  const [categorias, setCategorias] = useState({});
  const [tiposIndicador, setTiposIndicador] = useState({});
  const [subcategorias, setSubcategorias] = useState({});
  const [loading, setLoading] = useState(true);

  // Buscar projetos vinculados e dados relacionados ao carregar o componente
  useEffect(() => {
    if (user?.id) {
      fetchProjetosVinculados();
    }
  }, [user]);

  useEffect(() => {
    if (projetosVinculados.length >= 0) {
      fetchDadosCompletos();
    }
  }, [projetosVinculados]);

  // Função para buscar projetos vinculados ao usuário
  const fetchProjetosVinculados = async () => {
    try {
      const { data, error } = await supabase
        .from('relacao_usuarios_projetos')
        .select('projeto_id')
        .eq('usuario_id', user.id);
      
      if (error) throw error;
      
      const projetoIds = data.map(item => item.projeto_id);
      setProjetosVinculados(projetoIds);
      
      console.log('Projetos vinculados ao usuário:', projetoIds);
    } catch (error) {
      console.error('Erro ao carregar projetos vinculados:', error);
      setProjetosVinculados([]);
    }
  };

  // Função para normalizar texto (remover acentos, converter para minúsculas, remover espaços extras)
  const normalizeText = (text) => {
    if (!text) return "";

    const str = String(text);
    const withoutAccents = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return withoutAccents.toLowerCase().trim().replace(/\s+/g, " ");
  };

  // Função para buscar APENAS projetos vinculados e dados relacionados
  const fetchDadosCompletos = async () => {
    try {
      setLoading(true);

      // Se não há projetos vinculados, definir tudo como vazio
      if (projetosVinculados.length === 0) {
        setProjetos({ nomeParaId: {}, idParaNome: {}, lista: [] });
        setCategorias({ nomeParaId: {}, idParaNome: {}, lista: [] });
        setTiposIndicador({ nomeParaId: {}, idParaNome: {}, lista: [] });
        setSubcategorias({ nomeParaId: {}, idParaNome: {}, lista: [] });
        setLoading(false);
        return;
      }

      // Buscar APENAS projetos vinculados
      const { data: projetosData, error: projetosError } = await supabase
        .from("projetos")
        .select("id, nome")
        .in('id', projetosVinculados);

      if (projetosError) throw projetosError;

      // Buscar categorias
      const { data: categoriasData, error: categoriasError } = await supabase
        .from("categorias")
        .select("id, nome");

      if (categoriasError) throw categoriasError;

      // Buscar tipos de indicador
      const { data: tiposData, error: tiposError } = await supabase
        .from("tipos_indicador")
        .select("id, tipo");

      if (tiposError) throw tiposError;

      // Buscar subcategorias
      const { data: subcategoriasData, error: subcategoriasError } = await supabase
        .from("subcategorias")
        .select("id, nome");

      if (subcategoriasError) throw subcategoriasError;

      // Criar mapeamentos para projetos
      const projetosNomeParaId = {};
      const projetosIdParaNome = {};
      projetosData.forEach((proj) => {
        projetosNomeParaId[proj.nome.toLowerCase()] = proj.id;
        projetosIdParaNome[proj.id] = proj.nome;
      });

      // Criar mapeamentos para categorias
      const categoriasNomeParaId = {};
      const categoriasIdParaNome = {};
      categoriasData.forEach((cat) => {
        categoriasNomeParaId[cat.nome.toLowerCase()] = cat.id;
        categoriasIdParaNome[cat.id] = cat.nome;
      });

      // Criar mapeamentos para tipos de indicador
      const tiposNomeParaId = {};
      const tiposIdParaNome = {};
      tiposData.forEach((tipoItem) => {
        tiposNomeParaId[tipoItem.tipo.toLowerCase()] = tipoItem.id;
        tiposIdParaNome[tipoItem.id] = tipoItem.tipo;
      });

      // Criar mapeamentos para subcategorias
      const subcategoriasNomeParaId = {};
      const subcategoriasIdParaNome = {};
      subcategoriasData.forEach((sub) => {
        subcategoriasNomeParaId[sub.nome.toLowerCase()] = sub.id;
        subcategoriasIdParaNome[sub.id] = sub.nome;
      });

      setProjetos({
        nomeParaId: projetosNomeParaId,
        idParaNome: projetosIdParaNome,
        lista: projetosData,
      });

      setCategorias({
        nomeParaId: categoriasNomeParaId,
        idParaNome: categoriasIdParaNome,
        lista: categoriasData,
      });

      setTiposIndicador({
        nomeParaId: tiposNomeParaId,
        idParaNome: tiposIdParaNome,
        lista: tiposData,
      });

      setSubcategorias({
        nomeParaId: subcategoriasNomeParaId,
        idParaNome: subcategoriasIdParaNome,
        lista: subcategoriasData,
      });
      
      console.log('Dados carregados para template de indicadores');
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Não foi possível carregar os dados necessários");
    } finally {
      setLoading(false);
    }
  };

  // Função para gerar e baixar o template Excel
  const downloadTemplate = async () => {
    try {
      if (projetosVinculados.length === 0) {
        toast.error("Você não está vinculado a nenhum projeto. Entre em contato com o administrador.");
        return;
      }

      if (
        Object.keys(projetos).length === 0 ||
        Object.keys(categorias).length === 0 ||
        Object.keys(tiposIndicador).length === 0 ||
        Object.keys(subcategorias).length === 0
      ) {
        toast.error("Aguarde o carregamento dos dados");
        return;
      }

      // Criar workbook com ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template Indicadores");

      // ✅ DEFINIR CABEÇALHOS COM AS NOVAS COLUNAS
      worksheet.columns = [
        { header: "projeto_id", key: "projeto_id", width: 20 },
        { header: "categoria_id", key: "categoria_id", width: 20 },
        { header: "indicador", key: "indicador", width: 40 },
        { header: "observacao", key: "observacao", width: 40 },
        { header: "descricao_detalhada", key: "descricao_detalhada", width: 50 }, // ✅ NOVA COLUNA
        { header: "descricao_resumida", key: "descricao_resumida", width: 40 },   // ✅ NOVA COLUNA
        { header: "tipo_indicador", key: "tipo_indicador", width: 20 },
        { header: "subcategoria_id", key: "subcategoria_id", width: 20 },
        { header: "prazo_entrega_inicial", key: "prazo_entrega_inicial", width: 15 },
        { header: "recorrencia", key: "recorrencia", width: 15 },
        { header: "tempo_recorrencia", key: "tempo_recorrencia", width: 15 },
        { header: "repeticoes", key: "repeticoes", width: 15 },
        { header: "obrigatorio", key: "obrigatorio", width: 12 },
      ];

      // ✅ ADICIONAR LINHA DE INFORMAÇÃO COM AS NOVAS COLUNAS
      const infoRow = worksheet.addRow({
        projeto_id: "Nome do Projeto (apenas vinculados)",
        categoria_id: "Nome da Categoria",
        indicador: "Nome do indicador",
        observacao: "Observações (opcional)",
        descricao_detalhada: "Descrição detalhada do indicador (opcional)", // ✅ NOVA INFORMAÇÃO
        descricao_resumida: "Descrição resumida do indicador (opcional)",   // ✅ NOVA INFORMAÇÃO
        tipo_indicador: "Nome do tipo de indicador",
        subcategoria_id: "Nome da subcategoria",
        prazo_entrega_inicial: "Formato: AAAA-MM-DD",
        recorrencia: "dia, mês, ano, sem recorrencia",
        tempo_recorrencia: "Número inteiro",
        repeticoes: "Número de repetições (0 ou mais)",
        obrigatorio: "SIM ou NÃO",
      });

      // Estilizar a linha de informação
      infoRow.eachCell((cell) => {
        cell.font = { italic: true, color: { argb: "FF999999" } };
      });

      // ✅ ADICIONAR DADOS DE EXEMPLO COM AS NOVAS COLUNAS
      worksheet.addRow({
        projeto_id: Object.values(projetos.idParaNome)[0] || "Nome do Projeto",
        categoria_id: Object.values(categorias.idParaNome)[0] || "Nome da Categoria",
        indicador: "Taxa de conversão",
        observacao: "Indicador mensal de performance",
        descricao_detalhada: "Este indicador mede a eficácia da conversão de leads em clientes, considerando todo o funil de vendas desde o primeiro contato até o fechamento do negócio", // ✅ EXEMPLO DETALHADO
        descricao_resumida: "Percentual de conversão de leads em clientes", // ✅ EXEMPLO RESUMIDO
        tipo_indicador: Object.values(tiposIndicador.idParaNome)[0] || "Nome do Tipo",
        subcategoria_id: Object.values(subcategorias.idParaNome)[0] || "Nome da Subcategoria",
        prazo_entrega_inicial: "2024-01-31",
        recorrencia: "mês",
        tempo_recorrencia: 1,
        repeticoes: 11,
        obrigatorio: "SIM",
      });

      // Formatar cabeçalhos
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Gerar arquivo e baixar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "template_controle_indicadores_projetos_vinculados.xlsx";
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Template baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar template:", error);
      toast.error("Erro ao gerar template");
    }
  };

  // Função para lidar com a seleção de arquivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      return;
    }

    // Verificar se o arquivo é um Excel
    const fileTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel.sheet.macroEnabled.12",
    ];

    if (!fileTypes.includes(selectedFile.type)) {
      toast.error("Por favor, selecione apenas arquivos Excel (.xls, .xlsx)");
      return;
    }

    setFile(selectedFile);
  };

  // Função para fazer upload e processar o arquivo Excel
  const uploadExcel = async (e) => {
    e.preventDefault();

    if (!file) {
      toast.error("Por favor, selecione um arquivo para upload");
      return;
    }

    if (projetosVinculados.length === 0) {
      toast.error("Você não está vinculado a nenhum projeto. Entre em contato com o administrador.");
      return;
    }

    // Verificar se os mapeamentos estão disponíveis
    if (
      Object.keys(projetos.nomeParaId || {}).length === 0 ||
      Object.keys(categorias.nomeParaId || {}).length === 0 ||
      Object.keys(tiposIndicador.nomeParaId || {}).length === 0 ||
      Object.keys(subcategorias.nomeParaId || {}).length === 0
    ) {
      toast.error("Dados não carregados. Recarregue a página.");
      return;
    }

    try {
      setUploading(true);
      setProgress(0);

      // Simulação de progresso
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 100);

      // Ler o arquivo Excel usando FileReader
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const buffer = e.target.result;

          // Carregar o arquivo Excel com ExcelJS
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);

          const worksheet = workbook.worksheets[0];

          if (!worksheet) {
            throw new Error("A planilha não pôde ser carregada");
          }

          // Extrair cabeçalhos
          const headers = [];
          worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell) => {
            headers.push(cell.value?.toString() || "");
          });

          // ✅ VERIFICAR SE OS CABEÇALHOS NECESSÁRIOS ESTÃO PRESENTES (incluindo os novos)
          const requiredHeaders = ["projeto_id", "categoria_id", "indicador", "tipo_indicador", "subcategoria_id"];
          for (const header of requiredHeaders) {
            if (!headers.includes(header)) {
              throw new Error(`Cabeçalho obrigatório "${header}" não encontrado no arquivo`);
            }
          }

          // Extrair dados (pulando as duas primeiras linhas)
          const excelData = [];
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 2) {
              const rowData = {};
              row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                if (colNumber <= headers.length) {
                  const header = headers[colNumber - 1];
                  if (header) {
                    rowData[header] = cell.value;
                  }
                }
              });
              if (
                Object.values(rowData).some(
                  (val) => val !== null && val !== undefined && val !== ""
                )
              ) {
                excelData.push(rowData);
              }
            }
          });

          if (!excelData || excelData.length === 0) {
            throw new Error("A planilha não contém dados válidos");
          }

          // Criar mapeamentos normalizados
          const normalizedProjetoMap = {};
          Object.entries(projetos.nomeParaId || {}).forEach(([nome, id]) => {
            normalizedProjetoMap[normalizeText(nome)] = id;
          });

          const normalizedCategoriaMap = {};
          Object.entries(categorias.nomeParaId || {}).forEach(([nome, id]) => {
            normalizedCategoriaMap[normalizeText(nome)] = id;
          });

          const normalizedTipoMap = {};
          Object.entries(tiposIndicador.nomeParaId || {}).forEach(([nome, id]) => {
            normalizedTipoMap[normalizeText(nome)] = id;
          });

          const normalizedSubcategoriaMap = {};
          Object.entries(subcategorias.nomeParaId || {}).forEach(([nome, id]) => {
            normalizedSubcategoriaMap[normalizeText(nome)] = id;
          });

          // Validar os dados e converter nomes para IDs
          const validatedData = [];
          const errors = [];

          for (let i = 0; i < excelData.length; i++) {
            const row = excelData[i];
            const rowNumber = i + 3;

            try {
              // Converter nome do projeto para ID
              const projetoNome = String(row.projeto_id || "").trim();
              const normalizedProjetoNome = normalizeText(projetoNome);
              const projetoId = normalizedProjetoMap[normalizedProjetoNome];

              if (!projetoId) {
                throw new Error(`Projeto "${projetoNome}" não encontrado ou não está vinculado (linha ${rowNumber})`);
              }

              if (!projetosVinculados.includes(projetoId)) {
                throw new Error(`Projeto "${projetoNome}" não está vinculado ao seu usuário (linha ${rowNumber})`);
              }

              // Converter nome da categoria para ID
              const categoriaNome = String(row.categoria_id || "").trim();
              const normalizedCategoriaNome = normalizeText(categoriaNome);
              const categoriaId = normalizedCategoriaMap[normalizedCategoriaNome];

              if (!categoriaId) {
                throw new Error(`Categoria "${categoriaNome}" não encontrada (linha ${rowNumber})`);
              }

              // Converter nome do tipo de indicador para ID
              const tipoNome = String(row.tipo_indicador || "").trim();
              const normalizedTipoNome = normalizeText(tipoNome);
              const tipoId = normalizedTipoMap[normalizedTipoNome];

              if (!tipoId) {
                throw new Error(`Tipo de indicador "${tipoNome}" não encontrado (linha ${rowNumber})`);
              }

              // Converter nome da subcategoria para ID
              const subcategoriaNome = String(row.subcategoria_id || "").trim();
              const normalizedSubcategoriaNome = normalizeText(subcategoriaNome);
              const subcategoriaId = normalizedSubcategoriaMap[normalizedSubcategoriaNome];

              if (!subcategoriaId) {
                throw new Error(`Subcategoria "${subcategoriaNome}" não encontrada (linha ${rowNumber})`);
              }

              // Processar o campo obrigatório
              const obrigatorioText = normalizeText(String(row.obrigatorio || ""));
              let obrigatorio;

              if (obrigatorioText === "sim") {
                obrigatorio = true;
              } else if (obrigatorioText === "nao" || obrigatorioText === "não") {
                obrigatorio = false;
              } else {
                throw new Error(`Valor inválido para campo obrigatório: "${row.obrigatorio}". Use "SIM" ou "NÃO" (linha ${rowNumber})`);
              }

              // Processar recorrência
              let recorrencia = row.recorrencia;
              if (recorrencia) {
                const normalizedRecorrencia = normalizeText(recorrencia);
                if (!["dia", "mes", "mês", "ano", "sem recorrencia"].includes(normalizedRecorrencia) && !normalizedRecorrencia.startsWith("sem")) {
                  throw new Error(`Valor inválido para recorrência: "${recorrencia}" (linha ${rowNumber})`);
                }

                if (normalizedRecorrencia === "dia") {
                  recorrencia = "dia";
                } else if (normalizedRecorrencia === "mes" || normalizedRecorrencia === "mês") {
                  recorrencia = "mês";
                } else if (normalizedRecorrencia === "ano") {
                  recorrencia = "ano";
                } else if (normalizedRecorrencia.startsWith("sem")) {
                  recorrencia = "sem recorrencia";
                }
              } else {
                recorrencia = "sem recorrencia";
              }

              // ✅ CRIAR OBJETO VALIDADO COM AS NOVAS COLUNAS
              const item = {
                projeto_id: projetoId,
                categoria_id: categoriaId,
                indicador: String(row.indicador || "").trim(),
                observacao: String(row.observacao || "").trim() || null,
                descricao_detalhada: String(row.descricao_detalhada || "").trim() || null, // ✅ NOVA COLUNA
                descricao_resumida: String(row.descricao_resumida || "").trim() || null,   // ✅ NOVA COLUNA
                tipo_indicador: tipoId,
                subcategoria_id: subcategoriaId,
                prazo_entrega_inicial: row.prazo_entrega_inicial ? new Date(row.prazo_entrega_inicial) : null,
                recorrencia: recorrencia,
                tempo_recorrencia: row.tempo_recorrencia ? parseInt(row.tempo_recorrencia) : null,
                repeticoes: row.repeticoes ? parseInt(row.repeticoes) : 0,
                obrigatorio: obrigatorio,
                tem_documento: false,
              };

              // Verificar campos obrigatórios
              if (!item.indicador) {
                throw new Error(`Campo indicador é obrigatório (linha ${rowNumber})`);
              }

              validatedData.push(item);
            } catch (rowError) {
              errors.push(rowError.message);
            }
          }

          // Se houve erros, exibir para o usuário
          if (errors.length > 0) {
            const errorMessage = `Foram encontrados ${errors.length} erros:\n\n- ${errors.join("\n- ")}`;
            throw new Error(errorMessage);
          }

          // Obter a sessão do usuário
          const { data: { session } } = await supabase.auth.getSession();

          if (!session) {
            throw new Error("Você precisa estar logado para esta ação");
          }

          // Inserir os dados no Supabase
          const { data: insertedData, error } = await supabase
            .from("controle_indicador")
            .insert(validatedData)
            .select();

          if (error) throw error;

          // Upload completo
          clearInterval(progressInterval);
          setProgress(100);

          // Resetar estado
          setTimeout(() => {
            setFile(null);
            setUploading(false);
            setProgress(0);

            toast.success(`${insertedData.length} indicadores importados com sucesso!`);
          }, 1000);
        } catch (error) {
          console.error("Erro ao processar planilha:", error);
          toast.error(error.message || "Erro ao processar a planilha");
          setUploading(false);
          clearInterval(progressInterval);
          setProgress(0);
        }
      };

      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo");
        setUploading(false);
        clearInterval(progressInterval);
        setProgress(0);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error(error.message || "Falha ao enviar o arquivo");
      setUploading(false);
      setProgress(0);
    }
  };

  // Se não há projetos vinculados, mostrar mensagem informativa
  if (projetosVinculados.length === 0 && !loading) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FiFolder className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto vinculado</h3>
        <p className="text-gray-500 max-w-md mx-auto">
          Você não está vinculado a nenhum projeto. Entre em contato com o administrador para vincular você a projetos relevantes antes de fazer upload de planilhas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-medium text-blue-700 mb-2">
          Como funciona
        </h3>
        <p className="text-blue-600 mb-4">
          Você pode importar vários indicadores de uma vez usando uma planilha Excel. 
          Baixe o template, preencha com seus dados dos projetos vinculados e faça o upload.
        </p>
        <p className="text-blue-600 mb-4 text-sm">
          <strong>Importante:</strong> O template mostrará apenas os projetos aos quais você está vinculado.
        </p>
        {/* ✅ ATUALIZAR A DESCRIÇÃO PARA MENCIONAR AS NOVAS COLUNAS */}
        <p className="text-blue-600 mb-4 text-sm">
          <strong>Novidade:</strong> Agora você pode incluir <em>Descrição Detalhada</em> e <em>Descrição Resumida</em> para cada indicador (campos opcionais).
        </p>
        <button
          onClick={downloadTemplate}
          disabled={loading || projetosVinculados.length === 0}
          className={`flex items-center px-4 py-2 ${
            loading || projetosVinculados.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          } text-white rounded`}
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              Carregando dados...
            </>
          ) : (
            <>
              <FiDownload className="mr-2" />
              Baixar Template Excel (Indicadores)
            </>
          )}
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium mb-4">Upload de Planilha</h3>

        <form onSubmit={uploadExcel} className="space-y-4">
          {/* Upload de arquivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a planilha Excel
            </label>

            {!file ? (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>Selecionar arquivo</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xls,.xlsx"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                    </label>
                    <p className="pl-1">ou arraste e solte</p>
                  </div>
                  <p className="text-xs text-gray-500">Excel (.xls, .xlsx)</p>
                </div>
              </div>
            ) : (
              <div className="mt-1 flex items-center p-4 border border-gray-300 rounded-md bg-gray-50">
                <FiFile className="h-8 w-8 text-blue-500 mr-3" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  disabled={uploading}
                  className="ml-4 flex-shrink-0 p-1 rounded-full text-gray-400 hover:text-gray-500"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>

          {/* Barra de progresso */}
          {uploading && (
            <div>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                      Upload em progresso
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold inline-block text-blue-600">
                      {progress}%
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-blue-200">
                  <div
                    style={{ width: `${progress}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-300"
                  ></div>
                </div>
              </div>
            </div>
          )}

          {/* Botão de envio */}
          <div>
            <button
              type="submit"
              disabled={!file || uploading || loading || projetosVinculados.length === 0}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !file || uploading || loading || projetosVinculados.length === 0
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              }`}
            >
              {uploading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processando...
                </span>
              ) : (
                "Enviar Planilha"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadExcelIndicadorTemplate;