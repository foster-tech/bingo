# Bingo • Painel de chamadas

Aplicação React para conduzir partidas de bingo de 75 bolas. Todos os jogos e todas as chamadas são gravados localmente em SQLite.

## Executar em desenvolvimento

```bash
npm install
npm run dev
```

- Interface: http://localhost:5173
- API: http://localhost:3001
- Banco: `data/bingo.db` (criado automaticamente)

## Executar a versão de produção

```bash
npm run build
npm start
```

A aplicação completa ficará disponível em http://localhost:3001.

## Dados persistidos

- `games`: início, encerramento e estado de cada jogo.
- `calls`: número, ordem e horário de cada chamada, associado ao jogo.

O banco usa chaves estrangeiras, evita números repetidos no mesmo jogo e mantém todo o histórico disponível no botão **Ver histórico**.

## Testes

```bash
npm test
```

O teste de integração usa um banco SQLite isolado e valida criação de jogos, chamadas, duplicidade, desfazer e histórico.
