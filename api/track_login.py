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
    def do_POST(self):
        try:
            # Obtém o tamanho do conteúdo
            content_length = int(self.headers['Content-Length'])
            # Lê o conteúdo do corpo da requisição
            post_data = self.rfile.read(content_length)
            # Converte para objeto Python
            data = json.loads(post_data)
            
            # Extrai os dados necessários
            usuario_id = data.get('usuario_id')
            email = data.get('email')
            metodo_login = data.get('metodo_login', 'email_password')
            sessao_id = data.get('sessao_id')
            sucesso = data.get('sucesso', True)
            erro = data.get('erro')
            
            # Valida os campos obrigatórios
            if not usuario_id or not email:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "usuario_id e email são obrigatórios"}).encode())
                return
            
            print(f"📝 Recebendo tracking de login para: {email} (sucesso: {sucesso})")
            
            # Obter informações da requisição
            ip_address = self.get_client_ip()
            user_agent = self.headers.get('User-Agent', '')
            
            # Análise básica do User Agent (sem dependências externas)
            dispositivo = self.get_device_type_simple(user_agent)
            navegador = self.get_browser_simple(user_agent)
            sistema_operacional = self.get_os_simple(user_agent)
            
            # Criar um cliente com a chave de serviço para inserir dados
            service_supabase = create_client(supabase_url, supabase_service_key)
            
            # Dados para inserção
            login_data = {
                'usuario_id': usuario_id,
                'email': email,
                'data_login': datetime.now().isoformat(),
                'ip_address': ip_address,
                'user_agent': user_agent,
                'dispositivo': dispositivo,
                'navegador': navegador,
                'sistema_operacional': sistema_operacional,
                'pais': None,  # Pode ser implementado futuramente
                'cidade': None,  # Pode ser implementado futuramente
                'sucesso': sucesso,
                'metodo_login': metodo_login,
                'sessao_id': sessao_id
            }
            
            # Adicionar erro se fornecido
            if erro:
                # Truncar erro se muito longo
                login_data['erro'] = erro[:500] if len(erro) > 500 else erro
            
            print(f"💾 Salvando login data: {email} - {dispositivo} - {navegador}")
            
            # Inserir no Supabase
            response = service_supabase.table('historico_logins').insert(login_data).execute()
            
            if hasattr(response, 'error') and response.error:
                print(f"❌ Erro ao inserir login no banco: {response.error}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro ao salvar login: {response.error}"}).encode())
                return
            
            login_id = response.data[0]['id'] if response.data and len(response.data) > 0 else None
            print(f"✅ Login registrado com sucesso para {email} (ID: {login_id})")
            
            # Responder com sucesso
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "message": "Login registrado com sucesso",
                "login_id": login_id,
                "data_login": login_data['data_login']
            }).encode())
            
        except Exception as e:
            import traceback
            traceback_str = traceback.format_exc()
            print(f"❌ Erro interno do servidor: {str(e)}")
            print(traceback_str)
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"Erro interno do servidor: {str(e)}",
                "traceback": traceback_str
            }).encode())
    
    def get_client_ip(self):
        """Obtém o IP real do cliente considerando proxies"""
        # Verifica cabeçalhos comuns de proxy
        forwarded_for = self.headers.get('X-Forwarded-For')
        if forwarded_for:
            # Pega o primeiro IP da lista (IP original do cliente)
            return forwarded_for.split(',')[0].strip()
        
        real_ip = self.headers.get('X-Real-IP')
        if real_ip:
            return real_ip
        
        # Fallback para IP da conexão
        return getattr(self, 'client_address', ['unknown'])[0] if hasattr(self, 'client_address') else 'unknown'
    
    def get_device_type_simple(self, user_agent):
        """Detecta o tipo de dispositivo de forma simples"""
        ua_lower = user_agent.lower()
        
        if any(mobile in ua_lower for mobile in ['mobile', 'android', 'iphone', 'ipod', 'blackberry', 'iemobile', 'opera mini']):
            return "Mobile"
        elif any(tablet in ua_lower for tablet in ['tablet', 'ipad']):
            return "Tablet"
        else:
            return "Desktop"
    
    def get_browser_simple(self, user_agent):
        """Detecta o navegador de forma simples"""
        if 'Chrome' in user_agent and 'Edg' not in user_agent:
            return 'Chrome'
        elif 'Firefox' in user_agent:
            return 'Firefox'
        elif 'Safari' in user_agent and 'Chrome' not in user_agent:
            return 'Safari'
        elif 'Edg' in user_agent:
            return 'Edge'
        elif 'Opera' in user_agent or 'OPR' in user_agent:
            return 'Opera'
        else:
            return 'Desconhecido'
    
    def get_os_simple(self, user_agent):
        """Detecta o sistema operacional de forma simples"""
        if 'Windows NT' in user_agent:
            return 'Windows'
        elif 'Mac OS X' in user_agent or 'Macintosh' in user_agent:
            return 'macOS'
        elif 'Android' in user_agent:
            return 'Android'
        elif 'iPhone' in user_agent or 'iPad' in user_agent:
            return 'iOS'
        elif 'Linux' in user_agent:
            return 'Linux'
        else:
            return 'Desconhecido'
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()