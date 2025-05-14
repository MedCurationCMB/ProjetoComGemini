from http.server import BaseHTTPRequestHandler
import json
import os
from supabase import create_client, Client
from datetime import datetime, timedelta

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
            id_controleconteudo = data.get('id_controleconteudo')  # ID do controle_conteudo
            repeticoes = data.get('repeticoes', 1)  # Número de repetições a adicionar
            
            # Valida os campos necessários
            if not id_controleconteudo or not repeticoes:
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
            
            # Buscar dados do item original em controle_conteudo
            controle_response = service_supabase.table('controle_conteudo').select('*').eq('id', id_controleconteudo).execute()
            
            if not controle_response.data or len(controle_response.data) == 0:
                self.send_response(404)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Item de controle não encontrado"}).encode())
                return
            
            controle_item = controle_response.data[0]
            
            # Buscar a última data de prazo_entrega para este id_controleconteudo em controle_conteudo_geral
            data_ultima_response = service_supabase.table('controle_conteudo_geral') \
                .select('prazo_entrega') \
                .eq('id_controleconteudo', id_controleconteudo) \
                .order('prazo_entrega', {'ascending': False}) \
                .limit(1) \
                .execute()
            
            ultima_data = None
            if data_ultima_response.data and len(data_ultima_response.data) > 0:
                ultima_data_str = data_ultima_response.data[0].get('prazo_entrega')
                if ultima_data_str:
                    ultima_data = datetime.fromisoformat(ultima_data_str.replace('Z', '+00:00'))
                    print(f"Última data encontrada: {ultima_data.isoformat()}")
            
            # Se não encontrou última data, usar prazo_entrega_inicial do controle_item
            if not ultima_data and controle_item.get('prazo_entrega_inicial'):
                ultima_data_str = controle_item.get('prazo_entrega_inicial')
                ultima_data = datetime.fromisoformat(ultima_data_str.replace('Z', '+00:00'))
                print(f"Usando data inicial: {ultima_data.isoformat()}")
            
            # Se ainda não tiver data, usar a data atual
            if not ultima_data:
                ultima_data = datetime.now()
                print(f"Nenhuma data encontrada, usando data atual: {ultima_data.isoformat()}")
                
            # Obter os parâmetros de recorrência
            recorrencia = controle_item.get('recorrencia')
            tempo_recorrencia = controle_item.get('tempo_recorrencia') or 1
            
            # Lista para armazenar os novos itens
            novos_itens = []
            
            # Gerar as novas datas e criar os novos itens
            data_atual = ultima_data
            
            for i in range(repeticoes):
                # Calcular a próxima data com base na recorrência
                if recorrencia == 'dia':
                    data_atual = data_atual + timedelta(days=tempo_recorrencia)
                elif recorrencia == 'mês':
                    # Para meses, precisamos ajustar manualmente
                    ano = data_atual.year
                    mes = data_atual.month + tempo_recorrencia
                    
                    # Ajustar o ano se necessário
                    while mes > 12:
                        mes -= 12
                        ano += 1
                    
                    # Ajustar para o último dia do mês se necessário
                    dia = min(data_atual.day, [31, 29 if (ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0)) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes-1])
                    
                    data_atual = data_atual.replace(year=ano, month=mes, day=dia)
                elif recorrencia == 'ano':
                    # Adicionar anos
                    ano = data_atual.year + tempo_recorrencia
                    
                    # Ajustar para 28 de fevereiro em anos não bissextos se for 29/02
                    dia = data_atual.day
                    if data_atual.month == 2 and data_atual.day == 29 and not (ano % 4 == 0 and (ano % 100 != 0 or ano % 400 == 0)):
                        dia = 28
                    
                    data_atual = data_atual.replace(year=ano, day=dia)
                
                # Criar o novo item com base no controle_item original
                novo_item = {
                    'projeto_id': controle_item.get('projeto_id'),
                    'categoria_id': controle_item.get('categoria_id'),
                    'descricao': controle_item.get('descricao'),
                    'prazo_entrega_inicial': controle_item.get('prazo_entrega_inicial'),
                    'recorrencia': controle_item.get('recorrencia'),
                    'tempo_recorrencia': controle_item.get('tempo_recorrencia'),
                    'obrigatorio': controle_item.get('obrigatorio'),
                    'tem_documento': False,
                    'prazo_entrega': data_atual.isoformat(),
                    'id_controleconteudo': id_controleconteudo
                }
                
                novos_itens.append(novo_item)
                print(f"Adicionando nova data: {data_atual.isoformat()}")
            
            # Inserir os novos itens no Supabase
            insert_response = service_supabase.table('controle_conteudo_geral').insert(novos_itens).execute()
            
            if hasattr(insert_response, 'error') and insert_response.error:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Erro ao adicionar repetições: {insert_response.error}"}).encode())
                return
                
            # Responder com sucesso
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "repetições_adicionadas": len(novos_itens),
                "ultima_data_base": ultima_data.isoformat(),
                "novas_datas": [item['prazo_entrega'] for item in novos_itens],
                "message": f"{len(novos_itens)} repetições adicionadas com sucesso"
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