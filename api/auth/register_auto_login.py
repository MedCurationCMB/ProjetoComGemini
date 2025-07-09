from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime, timezone
from supabase import create_client, Client

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Verificar autenticação
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
            
            # Obter dados do corpo da requisição
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            usuario_id = data.get('usuario_id')
            
            if not usuario_id:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "usuario_id é obrigatório"}).encode())
                return
            
            # Verificar se o usuário autenticado é o mesmo do corpo da requisição
            if user.id != usuario_id:
                self.send_response(403)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Não autorizado a registrar login para outro usuário"}).encode())
                return
            
            # Criar cliente com chave de serviço para inserção
            service_supabase = create_client(supabase_url, supabase_service_key)
            
            # Verificar se já existe um log recente (últimos 5 minutos) para evitar duplicatas
            from datetime import timedelta
            cinco_minutos_atras = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
            
            existing_log = service_supabase.table('log_logins').select('id').eq('usuario_id', usuario_id).gte('data_login', cinco_minutos_atras).execute()
            
            if existing_log.data and len(existing_log.data) > 0:
                # Já existe um log recente, não registrar novamente
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"message": "Login já registrado recentemente"}).encode())
                return
            
            # Obter data/hora atual com timezone UTC
            data_login = datetime.now(timezone.utc).isoformat()
            
            # Inserir log de login
            result = service_supabase.table('log_logins').insert({
                'usuario_id': usuario_id,
                'data_login': data_login
            }).execute()
            
            if result.error:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro ao registrar login: {result.error}"}).encode())
                return
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "message": "Login registrado com sucesso",
                "data_login": data_login
            }).encode())
            
        except Exception as e:
            print(f"Erro ao registrar login automático: {str(e)}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Erro interno do servidor: {str(e)}"}).encode())