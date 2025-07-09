from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime, timezone
from supabase import create_client, Client
from urllib.parse import parse_qs

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def registrar_login(user_id):
    """
    Registra o login do usuário na tabela log_logins
    """
    try:
        # Criar cliente com chave de serviço para inserção
        service_supabase = create_client(supabase_url, supabase_service_key)
        
        # Obter data/hora atual com timezone UTC
        data_login = datetime.now(timezone.utc).isoformat()
        
        # Inserir log de login
        result = service_supabase.table('log_logins').insert({
            'usuario_id': user_id,
            'data_login': data_login
        }).execute()
        
        if result.error:
            print(f"Erro ao registrar login: {result.error}")
        else:
            print(f"Login registrado com sucesso para usuário {user_id} em {data_login}")
            
    except Exception as e:
        print(f"Erro ao registrar login: {str(e)}")
        # Não interromper o processo de login se houver erro no log

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Obtém o tamanho do conteúdo
        content_length = int(self.headers['Content-Length'])
        # Lê o conteúdo do corpo da requisição
        post_data = self.rfile.read(content_length)
        # Converte para objeto Python
        data = json.loads(post_data)
        
        # Rota para registro de usuário
        if self.path == "/api/auth/register":
            return self.register(data)
        # Rota para login de usuário
        elif self.path == "/api/auth/login":
            return self.login(data)
        # Rota para logout de usuário
        elif self.path == "/api/auth/logout":
            return self.logout()
        else:
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Rota não encontrada"}).encode())

    def register(self, data):
        try:
            # Extrai os dados do usuário
            email = data.get('email')
            password = data.get('password')
            nome = data.get('nome')
            
            if not email or not password or not nome:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Email, senha e nome são obrigatórios"}).encode())
                return
            
            # Registra o usuário no Supabase
            response = supabase.auth.sign_up({
                "email": email,
                "password": password,
                "options": {
                    "data": {
                        "nome": nome
                    }
                }
            })
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Retorna os dados do usuário (exceto a senha)
            self.wfile.write(json.dumps({
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "nome": nome
                }
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def login(self, data):
        try:
            # Extrai os dados de login
            email = data.get('email')
            password = data.get('password')
            
            if not email or not password:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Email e senha são obrigatórios"}).encode())
                return
            
            # Autentica o usuário no Supabase
            response = supabase.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            
            # ✅ NOVO: Registrar o login após autenticação bem-sucedida
            if response.user and response.user.id:
                registrar_login(response.user.id)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            # Retorna o token e dados do usuário
            self.wfile.write(json.dumps({
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                },
                "session": {
                    "access_token": response.session.access_token,
                    "refresh_token": response.session.refresh_token
                }
            }).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def logout(self):
        try:
            # Faz logout do usuário
            supabase.auth.sign_out()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Logout realizado com sucesso"}).encode())
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())