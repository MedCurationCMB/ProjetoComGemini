import { useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Navbar from "../components/Navbar";
import { LoginForm } from "../components/AuthForms";

export default function Login({ user }) {
  const router = useRouter();

  // Redirecionar para a página inicial se o usuário já estiver autenticado
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  // Não redirecionar automaticamente para permitir a visualização da página
  return (
    <div>
      <Head>
        <title>Sistema de Conteúdo - Login</title>
      </Head>

      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8">
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
