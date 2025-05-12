from http.server import BaseHTTPRequestHandler
import json
import os
from supabase import create_client, Client
import google.generativeai as genai

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Obtém o tamanho do conteúdo
            content_length = int(self.headers['Content-Length'])
            # Lê o conteúdo do corpo da requisição
            post_data = self.rfile.read(content_length)
            # Converte para objeto Python
            data = json.loads(post_data)
            
            # Extrai os dados necessários
            prompt_id = data.get('prompt_id')
            text_to_analyze = data.get('text_to_analyze')  # Texto combinado dos documentos
            
            # Valida os campos necessários
            if not prompt_id or not text_to_analyze:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Campos obrigatórios não fornecidos"}).encode())
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
            
            # Criar cliente Supabase
            supabase = create_client(supabase_url, supabase_key)
            
            # Validar token
            try:
                user_response = supabase.auth.get_user(token)
                user = user_response.user
                if not user:
                    raise Exception("Usuário não autenticado")
            except Exception as auth_error:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Autenticação inválida: {str(auth_error)}"}).encode())
                return
            
            # Criar um cliente com a chave de serviço
            service_supabase = create_client(supabase_url, supabase_service_key)
            
            # Buscar a chave API vigente no Supabase
            chave_response = service_supabase.table('configuracoes_gemini').select('chave').eq('vigente', True).execute()
            
            if not chave_response.data or len(chave_response.data) == 0:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Chave API da Gemini não configurada. Entre em contato com o administrador."}).encode())
                return
            
            api_key = chave_response.data[0].get('chave')
            
            # Buscar o prompt no Supabase
            prompt_response = service_supabase.table('prompts').select('*').eq('id', prompt_id).execute()
            
            if not prompt_response.data:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Prompt não encontrado"}).encode())
                return
            
            prompt_data = prompt_response.data[0]
            texto_prompt = prompt_data.get('texto_prompt', '')
            
            # Inicializar o cliente Gemini com a chave API
            genai.configure(api_key=api_key)
            
            # Preparar o prompt completo
            prompt_completo = f"{texto_prompt}\n\n{text_to_analyze}"
            
            # Chamar a API do Gemini
            try:
                # Criar um modelo generativo
                model = genai.GenerativeModel('gemini-2.0-flash')
                
                # Gerar resposta
                response = model.generate_content(prompt_completo)
                
                # Extrair o texto da resposta
                resultado = response.text
                
                # Responder com sucesso
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "resultado": resultado
                }).encode())
                
            except Exception as api_error:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": f"Erro na API Gemini: {str(api_error)}"
                }).encode())
                
        except Exception as e:
            import traceback
            traceback_str = traceback.format_exc()
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"Erro interno do servidor: {str(e)}",
                "traceback": traceback_str
            }).encode())