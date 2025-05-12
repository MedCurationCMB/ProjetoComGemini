from http.server import BaseHTTPRequestHandler
import json
import os
from supabase import create_client, Client
from b2sdk.v2 import InMemoryAccountInfo, B2Api
from urllib.parse import parse_qs

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Configuração do Backblaze B2
b2_application_key_id = os.environ.get("B2_APPLICATION_KEY_ID")
b2_application_key = os.environ.get("B2_APPLICATION_KEY")
b2_bucket_name = os.environ.get("B2_BUCKET_NAME")

def get_temporary_url(backblaze_filename, valid_duration=600):
    """Função para gerar URL de download temporária"""
    try:
        # Inicializar o cliente Backblaze B2
        info = InMemoryAccountInfo()
        b2_api = B2Api(info)
        b2_api.authorize_account("production", b2_application_key_id, b2_application_key)
        
        # Obter bucket
        bucket = b2_api.get_bucket_by_name(b2_bucket_name)
        
        # Gerar autorização de download
        download_auth = bucket.get_download_authorization(
            backblaze_filename, 
            valid_duration
        )
        
        # Gerar URL base
        base_url = bucket.get_download_url(backblaze_filename)
        
        # Retornar URL autorizada
        return f"{base_url}?Authorization={download_auth}"
    except Exception as e:
        print(f"Erro ao gerar URL de download temporária: {e}")
        
        # Fallback para URL direta (caso a autorização falhe)
        return f"https://f002.backblazeb2.com/file/{b2_bucket_name}/{backblaze_filename}"

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Verificar se o usuário está autenticado através do token JWT
            auth_header = self.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Token de autenticação não fornecido"}).encode())
                return

            token = auth_header.split(' ')[1]
            
            # Validar o token do usuário (igual ao upload.py)
            try:
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
            
            # Extrair o ID do documento da URL
            # A URL deve ser algo como /api/get_download_url?id=123
            query_components = parse_qs(self.path.split('?')[1]) if '?' in self.path else {}
            document_id_str = query_components.get('id', [''])[0]
            
            if not document_id_str:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID do documento não fornecido"}).encode())
                return
            
            # Converter document_id para int se for string de dígitos
            try:
                document_id = int(document_id_str)
            except ValueError:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "ID do documento inválido. Deve ser um número."}).encode())
                return
            
            # Criar um cliente com a chave de serviço (como em upload.py)
            service_supabase = create_client(supabase_url, supabase_service_key)
            
            # Buscar o backblaze_filename no Supabase usando o cliente de serviço
            response = service_supabase.table('base_dados_conteudo').select('backblaze_filename, nome_arquivo').eq('id', document_id).execute()
            
            if not response.data:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Documento não encontrado"}).encode())
                return
            
            backblaze_filename = response.data[0].get('backblaze_filename')
            nome_arquivo = response.data[0].get('nome_arquivo')
            
            if not backblaze_filename:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Nome do arquivo no Backblaze não encontrado"}).encode())
                return
            
            # Gerar URL temporária
            temp_url = get_temporary_url(backblaze_filename)
            
            if not temp_url:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Erro ao gerar URL temporária"}).encode())
                return
            
            # Retornar a URL temporária
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "url": temp_url,
                "filename": nome_arquivo
            }).encode())
            
        except Exception as e:
            print(f"Erro interno do servidor: {str(e)}")
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Erro interno do servidor: {str(e)}"}).encode())