# api/gemini_analyze.py
from http.server import BaseHTTPRequestHandler
import json
import os
import google.generativeai as genai
from supabase import create_client, Client

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Obter o tamanho do conteúdo
            content_length = int(self.headers['Content-Length'])
            # Ler o conteúdo do corpo da requisição
            post_data = self.rfile.read(content_length)
            # Converter para objeto Python
            data = json.loads(post_data)
            
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
            
            # Extrair dados da requisição
            document_id = data.get('document_id')
            api_key = data.get('api_key')
            prompt_id = data.get('prompt_id')
            
            # Validar dados obrigatórios
            if not document_id or not api_key or not prompt_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID do documento, chave de API e ID do prompt são obrigatórios"}).encode())
                return
            
            # Buscar o texto do documento no Supabase
            document_response = supabase.table('base_dados_conteudo').select('conteudo').eq('id', document_id).single().execute()
            
            if document_response.error:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro ao buscar documento: {document_response.error.message}"}).encode())
                return
            
            document_content = document_response.data.get('conteudo', '')
            
            if not document_content:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "O documento não possui conteúdo extraído para analisar"}).encode())
                return
            
            # Buscar o prompt no Supabase
            prompt_response = supabase.table('prompts').select('conteudo').eq('id', prompt_id).single().execute()
            
            if prompt_response.error:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro ao buscar prompt: {prompt_response.error.message}"}).encode())
                return
            
            prompt_template = prompt_response.data.get('conteudo', '')
            
            if not prompt_template:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "O prompt selecionado não possui conteúdo"}).encode())
                return
            
            # Montar o prompt final combinando o template com o conteúdo do documento
            final_prompt = f"{prompt_template}\n\n{document_content}"
            
            # Configurar a API do Google Gemini
            genai.configure(api_key=api_key)
            
            # Definir o modelo
            model = genai.GenerativeModel('gemini-pro')
            
            # Fazer a chamada à API do Gemini
            try:
                response = model.generate_content(final_prompt)
                ai_response = response.text
                
                # Salvar a resposta no Supabase
                update_response = supabase.table('base_dados_conteudo').update({
                    'retorno_IA': ai_response
                }).eq('id', document_id).execute()
                
                if update_response.error:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": f"Erro ao salvar resposta da IA: {update_response.error.message}"}).encode())
                    return
                
                # Responder com sucesso
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "response": ai_response
                }).encode())
                
            except Exception as gemini_error:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro na API do Gemini: {str(gemini_error)}"}).encode())
                return
                
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Erro interno do servidor: {str(e)}"}).encode())