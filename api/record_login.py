from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime
from supabase import create_client, Client

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_POST(self):
        try:
            # Headers CORS
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            
            # Verificar se todas as variáveis de ambiente estão configuradas
            if not all([supabase_url, supabase_key, supabase_service_key]):
                print("Erro: Variáveis de ambiente do Supabase não configuradas")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Configuração do servidor incompleta",
                    "details": "Variáveis de ambiente do Supabase não encontradas"
                }).encode())
                return

            # Obtém o tamanho do conteúdo
            content_length = int(self.headers.get('Content-Length', 0))
            
            if content_length == 0:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Nenhum dado enviado"}).encode())
                return
            
            # Lê o conteúdo do corpo da requisição
            post_data = self.rfile.read(content_length)
            
            # Converte para objeto Python
            try:
                data = json.loads(post_data.decode('utf-8'))
            except json.JSONDecodeError as e:
                print(f"Erro ao decodificar JSON: {e}")
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "JSON inválido"}).encode())
                return
            
            # Extrai os dados necessários
            usuario_id = data.get('usuario_id')
            nome_usuario = data.get('nome_usuario')
            email_usuario = data.get('email_usuario')
            
            print(f"Dados recebidos: usuario_id={usuario_id}, nome={nome_usuario}, email={email_usuario}")
            
            # Valida os campos necessários
            if not usuario_id or not nome_usuario or not email_usuario:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Campos obrigatórios não fornecidos",
                    "required": ["usuario_id", "nome_usuario", "email_usuario"],
                    "received": {
                        "usuario_id": bool(usuario_id),
                        "nome_usuario": bool(nome_usuario),
                        "email_usuario": bool(email_usuario)
                    }
                }).encode())
                return
            
            # Verificar se o usuário está autenticado através do token JWT
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                print("Token de autenticação não fornecido")
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Token de autenticação não fornecido"}).encode())
                return

            token = auth_header.split(' ')[1]
            print(f"Token recebido: {token[:20]}...")
            
            # Criar cliente Supabase para validação
            try:
                supabase_client = create_client(supabase_url, supabase_key)
                
                # Validar token
                user_response = supabase_client.auth.get_user(token)
                user = user_response.user
                if not user:
                    raise Exception("Usuário não autenticado")
                
                print(f"Usuário autenticado: {user.email}")
                
                # Verificar se o usuário que está registrando o login é o mesmo do token
                if user.id != usuario_id:
                    raise Exception("Token não corresponde ao usuário")
                    
            except Exception as auth_error:
                print(f"Erro de autenticação: {str(auth_error)}")
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Autenticação inválida: {str(auth_error)}"}).encode())
                return
            
            # Criar um cliente com a chave de serviço para inserir dados
            try:
                service_supabase = create_client(supabase_url, supabase_service_key)
                print("Cliente de serviço criado com sucesso")
            except Exception as service_error:
                print(f"Erro ao criar cliente de serviço: {str(service_error)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Erro interno do servidor"}).encode())
                return
            
            # Preparar dados para inserção
            agora = datetime.now().isoformat()
            
            login_data = {
                'usuario_id': usuario_id,
                'nome_usuario': nome_usuario,
                'email_usuario': email_usuario,
                'data_login': agora,
                'created_at': agora
            }
            
            print(f"Registrando login para usuário: {email_usuario} em {agora}")
            
            # Inserir registro de login
            try:
                response = service_supabase.table('historico_logins').insert(login_data).execute()
                
                if hasattr(response, 'error') and response.error:
                    print(f"Erro ao inserir registro de login: {response.error}")
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": f"Erro ao salvar registro de login: {response.error}"}).encode())
                    return
                
                print(f"Login registrado com sucesso para {email_usuario}")
                
                # Responder com sucesso
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": "Login registrado com sucesso",
                    "data_login": agora,
                    "usuario": email_usuario
                }).encode())
                
            except Exception as save_error:
                print(f"Erro ao salvar registro de login: {str(save_error)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro ao salvar registro de login: {str(save_error)}"}).encode())
                return
                
        except Exception as e:
            import traceback
            traceback_str = traceback.format_exc()
            print(f"Erro interno do servidor: {str(e)}")
            print(traceback_str)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"Erro interno do servidor: {str(e)}",
                "traceback": traceback_str if os.environ.get("NODE_ENV") == "development" else "Erro interno"
            }).encode())

    def do_GET(self):
        """Handle GET requests (for testing)"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({
            "message": "API de registro de login funcionando",
            "method": "POST",
            "endpoint": "/api/record_login"
        }).encode())