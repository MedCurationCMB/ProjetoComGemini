from http.server import BaseHTTPRequestHandler
import json
import os
from supabase import create_client, Client

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Rota para obter todos os conteúdos
        if self.path == "/api/conteudo":
            return self.get_conteudos()
        # Rota para obter conteúdo por ID
        elif self.path.startswith("/api/conteudo/"):
            id_str = self.path.split("/")[-1]
            # Converter ID para int se possível
            try:
                id = int(id_str)
            except ValueError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID inválido. Deve ser um número inteiro."}).encode())
                return
                
            return self.get_conteudo_by_id(id)
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Rota não encontrada"}).encode())

    def get_conteudos(self):
        try:
            # Verifica se o usuário está autenticado através do token JWT
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Token de autenticação não fornecido"}).encode())
                return

            token = auth_header.split(' ')[1]
            
            # Configura o token no cliente Supabase
            supabase.auth.set_auth(token)
            
            # Busca todos os conteúdos na tabela base_dados_conteudo
            response = supabase.table('base_dados_conteudo').select('*').execute()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response.data).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def get_conteudo_by_id(self, id):
        try:
            # Verifica se o usuário está autenticado através do token JWT
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Token de autenticação não fornecido"}).encode())
                return

            token = auth_header.split(' ')[1]
            
            # Configura o token no cliente Supabase
            supabase.auth.set_auth(token)
            
            # Busca o conteúdo pelo ID (que agora é um int)
            response = supabase.table('base_dados_conteudo').select('*').eq('id', id).execute()
            
            if not response.data:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Conteúdo não encontrado"}).encode())
                return
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response.data[0]).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())