from http.server import BaseHTTPRequestHandler
import json
import os
from supabase import create_client

# Configuração do cliente Supabase
supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
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
            
            # Criar cliente Supabase com a chave de serviço
            supabase = create_client(supabase_url, supabase_service_key)
            
            # Validar token
            try:
                client_supabase = create_client(supabase_url, supabase_key)
                user_response = client_supabase.auth.get_user(token)
                user = user_response.user
                if not user:
                    raise Exception("Usuário não autenticado")
            except Exception as auth_error:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Autenticação inválida: {str(auth_error)}"}).encode())
                return
            
            # Buscar os documentos principais
            docs_response = supabase.table('base_dados_conteudo').select('*').order('created_at', {'ascending': False}).execute()
            
            if docs_response.error:
                raise Exception(docs_response.error.message)
            
            documents = docs_response.data
            
            # Para cada documento, buscar os vínculos na tabela de relacionamento
            for doc in documents:
                # Iniciar com o vínculo principal (id_controleconteudogeral)
                all_links = [doc.get('id_controleconteudogeral')] if doc.get('id_controleconteudogeral') else []
                
                # Buscar vínculos adicionais
                links_response = supabase.table('documento_controle_geral_rel').select('controle_id').eq('documento_id', doc['id']).execute()
                
                if not links_response.error and links_response.data:
                    additional_links = [item['controle_id'] for item in links_response.data]
                    all_links.extend(additional_links)
                
                # Remover duplicatas e None
                all_links = [link for link in all_links if link is not None]
                all_links = list(set(all_links))
                
                # Adicionar ao documento
                doc['all_linked_ids'] = all_links
            
            # Responder com sucesso
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(documents).encode())
            
        except Exception as e:
            import traceback
            print(f"Erro ao buscar documentos com links: {str(e)}")
            print(traceback.format_exc())
            
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "error": f"Erro interno do servidor: {str(e)}",
                "traceback": traceback.format_exc()
            }).encode())