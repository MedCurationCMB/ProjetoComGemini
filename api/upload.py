from http.server import BaseHTTPRequestHandler
import json
import os
import uuid
import time
from datetime import datetime
import cgi
import sys
import traceback
from supabase import create_client, Client
from b2sdk.v2 import InMemoryAccountInfo, B2Api, UploadSourceBytes
from PyPDF2 import PdfReader
import tempfile

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Configuração do Backblaze B2
b2_application_key_id = os.environ.get("B2_APPLICATION_KEY_ID")
b2_application_key = os.environ.get("B2_APPLICATION_KEY")
b2_bucket_name = os.environ.get("B2_BUCKET_NAME")

def extrair_texto_pdf(pdf_file):
    """Extrai texto de um arquivo PDF usando PyPDF2"""
    try:
        pdf_file.seek(0)
        reader = PdfReader(pdf_file)
        texto = ""
        for page in reader.pages:
            texto += page.extract_text() or ""
        
        return texto.strip()
    except Exception as e:
        print(f"Erro ao extrair texto do PDF: {str(e)}")
        return ""

def analisar_com_ia(file_id, texto_extraido, service_supabase):
    """Função para analisar o texto com a API Gemini"""
    try:
        # Verificar se o texto extraído existe e não está vazio
        if not texto_extraido or texto_extraido.strip() == '':
            print("Texto extraído vazio, pulando análise de IA")
            return None
            
        # Verificar se existe um prompt padrão configurado
        prompt_response = service_supabase.table('prompts').select('*').eq('padrao', True).execute()
        
        if not prompt_response.data or len(prompt_response.data) == 0:
            print("Nenhum prompt padrão configurado, usando prompt genérico")
            # Usar prompt genérico se não houver prompt padrão
            prompt_id = None
            texto_prompt = "Faça uma análise do texto abaixo:"
        else:
            # Usar o prompt padrão configurado
            prompt_data = prompt_response.data[0]
            prompt_id = prompt_data.get('id')
            texto_prompt = prompt_data.get('texto_prompt', "Faça uma análise do texto abaixo:")
        
        # Buscar a chave API vigente do Gemini
        chave_response = service_supabase.table('configuracoes_gemini').select('chave').eq('vigente', True).execute()
        
        if not chave_response.data or len(chave_response.data) == 0:
            print("Chave API Gemini não configurada, pulando análise")
            return None
            
        api_key = chave_response.data[0].get('chave')
        
        # Importar Google Generative AI
        import google.generativeai as genai
        
        # Configurar API
        genai.configure(api_key=api_key)
        
        # Preparar o prompt completo
        prompt_completo = f"{texto_prompt}\n\n{texto_extraido}"
        
        print(f"Enviando texto para análise com IA (Prompt: {texto_prompt[:50]}...)")
        
        # Chamar a API Gemini
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt_completo)
        
        # Extrair o texto da resposta
        resultado = response.text
        
        print(f"Resposta da IA recebida. Tamanho: {len(resultado)} caracteres")
        
        # Atualizar o documento com o resultado da análise
        update_response = service_supabase.table('base_dados_conteudo').update({
            'retorno_ia': resultado
        }).eq('id', file_id).execute()
        
        print(f"Análise de IA concluída e salva para o documento {file_id}")
        return resultado
        
    except Exception as e:
        print(f"Erro ao analisar com IA: {str(e)}")
        traceback.print_exc()  # Imprime stack trace completo
        return None

def get_download_url(bucket, filename, valid_duration=600):
    """Função para gerar URL de download segura"""
    try:
        # Método 1: Tentar autorização de download
        try:
            download_auth = bucket.get_download_authorization(filename, valid_duration)
            base_url = bucket.get_download_url(filename)
            return f"{base_url}?Authorization={download_auth}"
        except Exception as auth_err:
            print(f"Erro na autorização de download: {auth_err}")
        
        # Método 2: URL base do Backblaze
        base_url = f"https://f002.backblazeb2.com/file/{bucket.name}/{filename}"
        return base_url
    except Exception as e:
        print(f"Erro ao gerar URL de download: {e}")
        return None

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Verificar se as variáveis de ambiente estão configuradas
            if not b2_application_key_id or not b2_application_key or not b2_bucket_name:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Erro de configuração: Credenciais do Backblaze B2 não encontradas",
                    "debug": {
                        "key_id_set": bool(b2_application_key_id),
                        "app_key_set": bool(b2_application_key),
                        "bucket_set": bool(b2_bucket_name)
                    }
                }).encode())
                return
                
            # Verificar se o usuário está autenticado através do token JWT
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Token de autenticação não fornecido"}).encode())
                return

            token = auth_header.split(' ')[1]
            
            # Verificar a autenticação do usuário
            try:
                # Validar o token via Supabase
                user_response = supabase.auth.get_user(token)
                user = user_response.user
                if not user:
                    raise Exception("Usuário não autenticado")
            except Exception as auth_error:
                print(f"Erro de autenticação: {str(auth_error)}")
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Autenticação inválida: {str(auth_error)}"}).encode())
                return
            
            # Processar o upload do arquivo usando cgi FieldStorage
            content_type = self.headers.get('Content-Type')
            if not content_type or not content_type.startswith('multipart/form-data'):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Formato de conteúdo inválido. Esperado multipart/form-data"}).encode())
                return
            
            # Configurar ambiente para o cgi.FieldStorage
            environ = {'REQUEST_METHOD': 'POST'}
            headers = {}
            for name, value in self.headers.items():
                headers[name] = value
                
            environ['CONTENT_TYPE'] = headers.get('Content-Type', '')
            environ['CONTENT_LENGTH'] = headers.get('Content-Length', '0')
            
            # Processar os campos do formulário
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=headers,
                environ=environ
            )
            
            # Verificar se o arquivo está presente
            if 'file' not in form:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Nenhum arquivo foi enviado"}).encode())
                return
            
            # Obter os campos do formulário
            fileitem = form['file']
            categoria_id = form.getvalue('categoria_id')
            projeto_id = form.getvalue('projeto_id')
            descricao = form.getvalue('descricao') or ""  # Valor padrão vazio se não for fornecido

            # Verificar campos obrigatórios (descricao removida)
            if not fileitem.filename or not categoria_id or not projeto_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Campos obrigatórios não fornecidos"}).encode())
                return
            
            # Ler o conteúdo do arquivo
            file_data = fileitem.file.read()
            filename = fileitem.filename
            filetype = 'application/pdf'  # Estamos apenas aceitando PDFs
            filesize = len(file_data)
            
            # Verificar tamanho do arquivo (limite de 10MB)
            if filesize > 10 * 1024 * 1024:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "O arquivo não pode ter mais de 10MB"}).encode())
                return
            
            # Gerar um ID único para o arquivo
            file_id = str(uuid.uuid4())
            
            # Inicializar o cliente Backblaze B2 com tratamento de erro detalhado
            try:
                print("Inicializando cliente B2 com credenciais")
                
                info = InMemoryAccountInfo()
                b2_api = B2Api(info)
                b2_api.authorize_account("production", b2_application_key_id, b2_application_key)
                
                # Verificar se o bucket existe
                try:
                    bucket = b2_api.get_bucket_by_name(b2_bucket_name)
                    print(f"Bucket encontrado: {bucket.name}")
                except Exception as bucket_error:
                    print(f"Erro ao obter bucket: {str(bucket_error)}")
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": f"Erro ao acessar bucket: {str(bucket_error)}"}).encode())
                    return
                
                # Criar um nome de arquivo único para evitar colisões
                timestamp = int(time.time())
                unique_filename = f"{file_id}_{timestamp}_{filename}"
                
                # Criar um objeto de arquivo temporário para extração de texto
                with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
                    tmp_file.write(file_data)
                    tmp_file.seek(0)
                    texto_extraido = extrair_texto_pdf(tmp_file)
                
                # Fazer upload do arquivo para o Backblaze B2
                file_info = {
                    'categoria_id': categoria_id,
                    'projeto_id': projeto_id,  # Adicionando o projeto_id ao file_info
                    'descricao': descricao
                }
                
                print(f"Fazendo upload do arquivo: {unique_filename}")
                uploaded_file = bucket.upload_bytes(
                    file_data,
                    unique_filename,
                    file_info=file_info,
                    content_type=filetype
                )
                print(f"Upload concluído: {uploaded_file.id_}")
                
                # Gerar URL de download
                download_url = get_download_url(bucket, unique_filename)
                
                if not download_url:
                    print("Falha ao gerar URL de download")
                    download_url = f"https://f002.backblazeb2.com/file/{b2_bucket_name}/{unique_filename}"
                
                print(f"URL final gerada: {download_url}")
                
            except Exception as b2_error:
                print(f"Erro no Backblaze B2: {str(b2_error)}")
                print(traceback.format_exc())
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro no serviço de armazenamento: {str(b2_error)}"}).encode())
                return
            
            # Salvar os metadados do arquivo no Supabase
            current_time = datetime.now().isoformat()
            
            # Limitar o tamanho do texto extraído
            MAX_TEXTO_LENGTH = 100000
            texto_extraido = texto_extraido[:MAX_TEXTO_LENGTH] if texto_extraido else ""
            
            file_data = {
                'id': file_id,
                'nome_arquivo': filename,
                'tipo_arquivo': filetype,
                'tamanho_arquivo': filesize,
                'url_arquivo': download_url,
                'categoria_id': categoria_id,
                'projeto_id': projeto_id,  # Adicionando o projeto_id aos metadados
                'descricao': descricao,
                'data_upload': current_time,
                'conteudo': texto_extraido,  # Adicionar o texto extraído
                'backblaze_filename': unique_filename  # Adicionar o nome do arquivo no Backblaze
            }
            
            # Criar um cliente Supabase com a chave de serviço para poder inserir dados
            try:
                print("Conectando ao Supabase com chave de serviço")
                service_supabase = create_client(supabase_url, supabase_service_key)
                
                # Inserir no Supabase usando o cliente com a chave de serviço
                response = service_supabase.table('base_dados_conteudo').insert(file_data).execute()
                
                # Verificar se houve erro na inserção
                if hasattr(response, 'error') and response.error:
                    print(f"Erro ao inserir no Supabase: {response.error}")
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": f"Erro ao salvar no banco de dados: {response.error}"}).encode())
                    return
                
                print("Registro inserido com sucesso no Supabase")
                
                # Variável para indicar se análise com IA foi realizada
                analise_realizada = False
                resultado_analise = None
                
                # Verificar se tem texto extraído e realizar análise direta (não assíncrona)
                if texto_extraido and texto_extraido.strip() != "":
                    print("Texto extraído com sucesso, iniciando análise com IA")
                    
                    # Chamar análise diretamente (sem asyncio)
                    resultado_analise = analisar_com_ia(file_id, texto_extraido, service_supabase)
                    
                    if resultado_analise:
                        analise_realizada = True
                        print("Análise de IA completada e salva")
                    else:
                        print("Falha ao realizar análise de IA")
                else:
                    print("Sem texto extraído, pulando análise de IA")
                
            except Exception as db_error:
                print(f"Erro ao inserir no banco de dados: {str(db_error)}")
                print(traceback.format_exc())  # Adicionar stack trace
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro ao salvar no banco de dados: {str(db_error)}"}).encode())
                return
            
            # Responder com sucesso
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Retornar os dados do arquivo
            self.wfile.write(json.dumps({
                "id": file_id,
                "nome_arquivo": filename,
                "tipo_arquivo": filetype,
                "tamanho_arquivo": filesize,
                "url_arquivo": download_url,
                "categoria_id": categoria_id,
                "projeto_id": projeto_id,  # Incluindo projeto_id na resposta
                "descricao": descricao,
                "data_upload": current_time,
                "conteudo": texto_extraido,
                "backblaze_filename": unique_filename,  # Incluindo backblaze_filename na resposta
                "analise_ia_realizada": analise_realizada,  # Informar se a análise foi realizada
                "message": "Arquivo enviado com sucesso" + (" e analisado com IA" if analise_realizada else "")
            }).encode())
            
        except Exception as e:
            print(f"Erro no servidor: {str(e)}")
            print(traceback.format_exc())
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Erro interno do servidor: {str(e)}"}).encode())