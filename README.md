# Sistema de Gerenciamento de Conteúdo

Sistema completo com frontend em Next.js e backend usando Python com funções serverless, banco de dados no Supabase e deploy no Vercel.

## Tecnologias Utilizadas

- **Frontend**: Next.js, React, TailwindCSS
- **Backend**: Python (funções serverless)
- **Banco de Dados**: Supabase (PostgreSQL)
- **Deploy**: Vercel

## Estrutura do Projeto

- **Frontend**: Interface de usuário construída com Next.js e estilizada com TailwindCSS
- **Backend**: Funções serverless em Python para autenticação e manipulação de dados
- **Banco de Dados**: Duas tabelas no Supabase - `usuarios` e `base_dados_conteudo`

## Funcionalidades

- Cadastro de usuários
- Login e autenticação
- Visualização da tabela de conteúdos (após login)

## Configuração do Ambiente de Desenvolvimento

1. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/nextjs-python-supabase.git
   cd nextjs-python-supabase
   ```

2. Instale as dependências do Node.js:
   ```
   npm install
   ```

3. Instale as dependências do Python:
   ```
   pip install -r requirements.txt
   ```

4. Configure as variáveis de ambiente:
   - Crie um arquivo `.env.local` na raiz do projeto
   - Adicione as seguintes variáveis:
     ```
     NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
     NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_do_supabase
     ```

5. Execute o projeto localmente:
   ```
   npm run dev
   ```

## Configuração do Supabase

1. Crie uma conta no [Supabase](https://supabase.io/)
2. Crie um novo projeto
3. Execute o script SQL presente no arquivo `supabase-schema.sql` para criar as tabelas e políticas necessárias

## Deploy no Vercel

1. Crie uma conta no [Vercel](https://vercel.com/)
2. Conecte o repositório do GitHub
3. Configure as variáveis de ambiente no Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

## Estrutura de Arquivos

```
projeto/
├── .env.local                  # Variáveis de ambiente
├── .gitignore                  # Arquivos ignorados pelo Git
├── next.config.js              # Configuração do Next.js
├── package.json                # Dependências do Node.js
├── postcss.config.js           # Configuração do PostCSS
├── requirements.txt            # Dependências do Python
├── supabase-schema.sql         # Script SQL para o Supabase
├── tailwind.config.js          # Configuração do TailwindCSS
├── vercel.json                 # Configuração do Vercel
├── api/                        # Funções serverless em Python
│   ├── __init__.py
│   ├── auth.py                 # Autenticação
│   └── conteudo.py             # Manipulação de conteúdos
└── src/
    ├── components/             # Componentes React
    │   ├── AuthForms.js        # Formulários de autenticação
    │   ├── ConteudoTable.js    # Tabela de conteúdos
    │   └── Navbar.js           # Barra de navegação
    ├── pages/                  # Páginas do Next.js
    │   ├── _app.js             # Componente App
    │   ├── _document.js        # Documento HTML
    │   ├── cadastro.js         # Página de cadastro
    │   ├── index.js            # Página inicial
    │   └── login.js            # Página de login
    ├── styles/                 # Estilos
    │   └── globals.css         # Estilos globais
    └── utils/                  # Utilitários
        └── supabaseClient.js   # Cliente do Supabase
```