# Bingo • Painel de chamadas

Aplicação React para conduzir partidas de bingo de 75 bolas. Todos os jogos e todas as chamadas são gravados em Prisma Postgres.

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

## Testes

```bash
npm test
```

O teste de integração valida criação de jogos, chamadas, duplicidade, desfazer e histórico. Use exclusivamente um banco descartável:

```bash
TEST_DATABASE_URL="postgres://..." npm test
```

Sem `TEST_DATABASE_URL`, o teste é ignorado para evitar alterações acidentais no banco de produção.
