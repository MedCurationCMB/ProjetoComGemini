import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="pt-BR">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="Sistema de Gerenciamento de Conteúdo" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}