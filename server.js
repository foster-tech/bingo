import express from 'express';
import cors from 'cors';
import {
  addCall,
  createGame,
  getCurrentGame,
  getGame,
  listGames,
  undoLastCall,
} from './src/database.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  await getCurrentGame();
  res.json({ ok: true, database: 'postgres' });
});

app.get('/api/games/current', async (_req, res) => {
  res.json(await getCurrentGame());
});

app.get('/api/games', async (_req, res) => {
  res.json(await listGames());
});

app.get('/api/games/:id', async (req, res) => {
  const game = await getGame(Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Jogo não encontrado.' });
  res.json(game);
});

app.post('/api/games', async (_req, res) => {
  res.status(201).json(await createGame());
});

app.post('/api/games/:id/calls', async (req, res) => {
  const result = await addCall(Number(req.params.id), Number(req.body.number));
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result.call);
});

app.delete('/api/games/:id/calls/last', async (req, res) => {
  const result = await undoLastCall(Number(req.params.id));
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result.call);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const missingDatabase = error.message?.includes('DATABASE_URL');
  res.status(500).json({
    error: missingDatabase
      ? 'Banco de dados não configurado. Defina DATABASE_URL.'
      : 'Não foi possível concluir a operação.',
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Bingo API disponível em http://localhost:${port}`);
  });
}

export default app;
