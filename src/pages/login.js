import { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import LogoDisplay from "../components/LogoDisplay";
import { LoginForm } from "../components/AuthForms";

export default function Login({ user }) {
  const router = useRouter();

  // Redirecionar para a página inicial se o usuário já estiver autenticado
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Sistema de Conteúdo - Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </Head>

      {/* Header simplificado com apenas a logo */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-center">
            <LogoDisplay 
              className=""
              fallbackText="Sistema de Gestão"
              showFallback={true}
            />
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <main className="container mx-auto px-4 py-12">
        {/* Mensagem de boas-vindas */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Bem-vindo de volta!
          </h2>
          <p className="text-gray-600">
            Faça login para acessar sua conta
          </p>
        </div>

        {/* Formulário de login */}
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>

          <LoginForm />

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Não tem uma conta?{" "}
              <Link href="/cadastro" className="text-blue-600 hover:underline">
                Cadastre-se
              </Link>
            </p>
            <Link
              href="/esqueci-senha"
              className="text-sm text-blue-600 hover:underline block mt-2"
            >
              Esqueci minha senha
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}