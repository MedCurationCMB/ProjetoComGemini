from http.server import BaseHTTPRequestHandler
import json
import os
from datetime import datetime
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
            prompt_id = data.get('prompt_id')  # UUID como string
            text_to_analyze = data.get('text_to_analyze')  # Texto combinado dos indicadores
            indicadores_info = data.get('indicadores_info', [])  # Lista com ID e nome dos indicadores
            
            # Valida os campos necessários
            if not prompt_id or not text_to_analyze or not indicadores_info:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Campos obrigatórios não fornecidos (prompt_id, text_to_analyze, indicadores_info)"}).encode())
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
            
            # Validar token e obter usuário
            try:
                user_response = supabase.auth.get_user(token)
                user = user_response.user
                if not user:
                    raise Exception("Usuário não autenticado")
                user_id = user.id
            except Exception as auth_error:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Autenticação inválida: {str(auth_error)}"}).encode())
                return
            
            # Criar um cliente com a chave de serviço
            service_supabase = create_client(supabase_url, supabase_service_key)
            
            # Buscar a chave API vigente no Supabase
            try:
                chave_response = service_supabase.table('configuracoes_gemini').select('chave').eq('vigente', True).execute()
                
                if not chave_response.data or len(chave_response.data) == 0:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Chave API da Gemini não configurada. Entre em contato com o administrador."}).encode())
                    return
                
                api_key = chave_response.data[0].get('chave')
            except Exception as chave_error:
                print(f"Erro ao buscar chave API: {str(chave_error)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Erro ao acessar configurações da API Gemini."}).encode())
                return
            
            # Buscar o prompt no Supabase - PRIMEIRO TENTAR prompts_indicadores
            prompt_response = None
            texto_prompt = None
            
            # Tentar primeiro na tabela prompts_indicadores
            try:
                prompt_response = service_supabase.table('prompts_indicadores').select('*').eq('id', prompt_id).execute()
                
                if prompt_response.data and len(prompt_response.data) > 0:
                    texto_prompt = prompt_response.data[0].get('texto_prompt', '')
                    print(f"Prompt encontrado na tabela prompts_indicadores: {prompt_id}")
                else:
                    print(f"Prompt não encontrado na tabela prompts_indicadores: {prompt_id}")
            except Exception as e:
                print(f"Erro ao buscar na tabela prompts_indicadores (pode não existir): {str(e)}")
            
            # Se não encontrou na tabela prompts_indicadores, tentar na tabela prompts
            if not texto_prompt:
                try:
                    prompt_response = service_supabase.table('prompts').select('*').eq('id', prompt_id).execute()
                    
                    if prompt_response.data and len(prompt_response.data) > 0:
                        texto_prompt = prompt_response.data[0].get('texto_prompt', '')
                        print(f"Prompt encontrado na tabela prompts: {prompt_id}")
                    else:
                        print(f"Prompt não encontrado na tabela prompts: {prompt_id}")
                except Exception as e:
                    print(f"Erro ao buscar na tabela prompts: {str(e)}")
            
            # Se ainda não encontrou o prompt
            if not texto_prompt:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": "Prompt não encontrado nas tabelas disponíveis",
                    "debug": {
                        "prompt_id": prompt_id,
                        "tables_checked": ["prompts_indicadores", "prompts"]
                    }
                }).encode())
                return
            
            # Inicializar o cliente Gemini com a chave API
            genai.configure(api_key=api_key)
            
            # Preparar o prompt completo
            prompt_completo = f"{texto_prompt}\n\n{text_to_analyze}"
            
            print(f"Enviando para Gemini - Tamanho do prompt: {len(prompt_completo)} caracteres")
            
            # Chamar a API do Gemini
            try:
                # Criar um modelo generativo
                model = genai.GenerativeModel('gemini-2.0-flash')
                
                # Gerar resposta
                response = model.generate_content(prompt_completo)
                
                # Extrair o texto da resposta
                resultado = response.text
                
                print(f"Resposta do Gemini recebida - Tamanho: {len(resultado)} caracteres")
                
                # ✅ NOVO: Salvar a análise múltipla no banco de dados
                agora = datetime.now().isoformat()
                
                # Extrair IDs e nomes dos indicadores
                indicadores_ids = [info['id'] for info in indicadores_info]
                nomes_indicadores = [info['nome'] for info in indicadores_info]
                
                print(f"Salvando análise múltipla para usuário {user_id}")
                print(f"Indicadores IDs: {indicadores_ids}")
                print(f"Nomes dos indicadores: {nomes_indicadores}")
                
                # Salvar no banco
                try:
                    save_response = service_supabase.table('historico_analises_multiplas').insert({
                        'indicadores_ids': indicadores_ids,
                        'nomes_indicadores': nomes_indicadores,
                        'resultado_analise': resultado,
                        'prompt_utilizado': prompt_completo,
                        'prompt_id': prompt_id,
                        'usuario_id': user_id,
                        'data_analise': agora,
                        'created_at': agora,
                        'updated_at': agora
                    }).execute()
                    
                    analise_salva = True
                    analise_id = None
                    
                    if save_response.data and len(save_response.data) > 0:
                        analise_id = save_response.data[0].get('id')
                        print(f"ID da análise salva: {analise_id}")
                    
                    print(f"Análise múltipla salva com sucesso")
                    
                except Exception as save_error:
                    print(f"Erro ao salvar análise múltipla: {str(save_error)}")
                    analise_salva = False
                    analise_id = None
                
                # Responder com sucesso
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "resultado": resultado,
                    "analise_salva": analise_salva,
                    "analise_id": analise_id,
                    "indicadores_analisados": len(indicadores_ids),
                    "timestamp": agora
                }).encode())
                
            except Exception as api_error:
                print(f"Erro na API Gemini: {str(api_error)}")
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": f"Erro na API Gemini: {str(api_error)}"
                }).encode())
                
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
                "traceback": traceback_str
            }).encode())