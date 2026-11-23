# Bingo • Painel de chamadas

Aplicação React para conduzir partidas de bingo de 75 bolas. Cada paróquia possui uma conta própria, com jogos, chamadas e histórico separados no Prisma Postgres.

## Executar em desenvolvimento

```bash
npm install
npm run dev
```

- Interface: http://localhost:5173
- API: http://localhost:3001
- Banco: Prisma Postgres definido pela variável `DATABASE_URL`

## Executar a versão de produção

```bash
npm run build
npm start
```

A aplicação completa ficará disponível em http://localhost:3001. Para desenvolvimento, copie `.env.example` para `.env.local` e preencha a conexão antes de iniciar.

## Dados persistidos

- `games`: início, encerramento e estado de cada jogo.
- `calls`: número, ordem e horário de cada chamada, associado ao jogo.

O banco usa chaves estrangeiras, evita números repetidos no mesmo jogo e mantém todo o histórico disponível no botão **Ver histórico**. As tabelas são criadas automaticamente na primeira chamada à API.

## Contas e paróquias

- O cadastro solicita nome da paróquia, nome do responsável, e-mail e senha.
- A senha é armazenada com hash `scrypt`, nunca em texto puro.
- A sessão permanece ativa por 30 dias em cookie `HttpOnly`.
- Todas as rotas de jogos validam a paróquia da sessão antes de consultar ou alterar dados.
- No primeiro cadastro, jogos antigos ainda sem paróquia são vinculados automaticamente à primeira conta.
- Logo e banner personalizados são redimensionados no navegador e armazenados por paróquia.
- A condição da rodada (linha ou cartela cheia) é armazenada junto ao jogo e pode ser alternada no painel.

## Testes

```bash
npm test
```

O teste de integração valida criação de jogos, chamadas, duplicidade, desfazer e histórico. Use exclusivamente um banco descartável:

```bash
TEST_DATABASE_URL="postgres://..." npm test
```

Sem `TEST_DATABASE_URL`, o teste é ignorado para evitar alterações acidentais no banco de produção.
