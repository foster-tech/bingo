import express from 'express';
import cors from 'cors';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const databasePath = process.env.BINGO_DB_PATH || path.join(dataDir, 'bingo.db');
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished'))
  );

  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    number INTEGER NOT NULL CHECK (number BETWEEN 1 AND 75),
    sequence INTEGER NOT NULL,
    called_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE (game_id, number),
    UNIQUE (game_id, sequence)
  );

  CREATE INDEX IF NOT EXISTS idx_calls_game_sequence
  ON calls (game_id, sequence DESC);
`);

const getActiveGame = db.prepare("SELECT * FROM games WHERE status = 'active' ORDER BY id DESC LIMIT 1");
const createGameRow = db.prepare("INSERT INTO games (status) VALUES ('active') RETURNING *");

if (!getActiveGame.get()) createGameRow.get();

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

function gameWithCalls(game) {
  if (!game) return null;
  const calls = db.prepare(`
    SELECT id, game_id, number, sequence, called_at
    FROM calls
    WHERE game_id = ?
    ORDER BY sequence ASC
  `).all(game.id);
  return { ...game, calls };
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: 'sqlite' });
});

app.get('/api/games/current', (_req, res) => {
  let game = getActiveGame.get();
  if (!game) game = createGameRow.get();
  res.json(gameWithCalls(game));
});

app.get('/api/games', (_req, res) => {
  const games = db.prepare(`
    SELECT
      g.id,
      g.started_at,
      g.ended_at,
      g.status,
      COUNT(c.id) AS call_count
    FROM games g
    LEFT JOIN calls c ON c.game_id = g.id
    GROUP BY g.id
    ORDER BY g.id DESC
  `).all();
  res.json(games);
});

app.get('/api/games/:id', (req, res) => {
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Jogo não encontrado.' });
  res.json(gameWithCalls(game));
});

app.post('/api/games', (_req, res) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare(`
      UPDATE games
      SET status = 'finished', ended_at = datetime('now')
      WHERE status = 'active'
    `).run();
    const game = createGameRow.get();
    db.exec('COMMIT');
    res.status(201).json(gameWithCalls(game));
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
});

app.post('/api/games/:id/calls', (req, res) => {
  const gameId = Number(req.params.id);
  const number = Number(req.body.number);
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);

  if (!game) return res.status(404).json({ error: 'Jogo não encontrado.' });
  if (game.status !== 'active') return res.status(409).json({ error: 'Este jogo já foi encerrado.' });
  if (!Number.isInteger(number) || number < 1 || number > 75) {
    return res.status(400).json({ error: 'Digite um número inteiro entre 1 e 75.' });
  }

  const existing = db.prepare('SELECT id FROM calls WHERE game_id = ? AND number = ?').get(gameId, number);
  if (existing) return res.status(409).json({ error: `O número ${number} já foi chamado neste jogo.` });

  const next = db.prepare('SELECT COALESCE(MAX(sequence), 0) + 1 AS value FROM calls WHERE game_id = ?').get(gameId);
  const call = db.prepare(`
    INSERT INTO calls (game_id, number, sequence)
    VALUES (?, ?, ?)
    RETURNING id, game_id, number, sequence, called_at
  `).get(gameId, number, next.value);

  res.status(201).json(call);
});

app.delete('/api/games/:id/calls/last', (req, res) => {
  const gameId = Number(req.params.id);
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId);
  if (!game) return res.status(404).json({ error: 'Jogo não encontrado.' });
  if (game.status !== 'active') return res.status(409).json({ error: 'Este jogo já foi encerrado.' });

  const lastCall = db.prepare(`
    SELECT * FROM calls WHERE game_id = ? ORDER BY sequence DESC LIMIT 1
  `).get(gameId);
  if (!lastCall) return res.status(404).json({ error: 'Ainda não há chamadas para desfazer.' });

  db.prepare('DELETE FROM calls WHERE id = ?').run(lastCall.id);
  res.json(lastCall);
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('{*splat}', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (!fs.existsSync(indexPath)) return res.status(404).send('Execute npm run build para gerar a aplicação.');
  res.sendFile(indexPath);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Não foi possível concluir a operação.' });
});

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  app.listen(port, () => {
    console.log(`Bingo API disponível em http://localhost:${port}`);
  });
}

export { app, db };
