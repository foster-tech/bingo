import express from 'express';
import cors from 'cors';
import {
  addCall,
  authenticateAccount,
  createGame,
  createSession,
  deleteSession,
  getCurrentGame,
  getGame,
  getSessionAccount,
  listGames,
  registerAccount,
  undoLastCall,
  updateParishBranding,
} from './src/database.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const sessionCookie = 'bingo_session';
const sessionMaxAge = 30 * 24 * 60 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function readCookie(request, name) {
  const cookies = String(request.headers.cookie ?? '').split(';');
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    if (cookie.slice(0, separator).trim() === name) {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    }
  }
  return null;
}

function setSessionCookie(response, token) {
  response.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.VERCEL === '1' || process.env.NODE_ENV === 'production',
    maxAge: sessionMaxAge,
    path: '/',
  });
}

function clearSessionCookie(response) {
  response.clearCookie(sessionCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.VERCEL === '1' || process.env.NODE_ENV === 'production',
    path: '/',
  });
}

async function requireAuth(request, response, next) {
  const account = await getSessionAccount(readCookie(request, sessionCookie));
  if (!account) return response.status(401).json({ error: 'Entre na sua conta para continuar.' });
  request.account = account;
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: 'prisma-postgres' });
});

app.post('/api/auth/register', async (req, res) => {
  const account = await registerAccount(req.body ?? {});
  const token = await createSession(account.user.id);
  setSessionCookie(res, token);
  res.status(201).json(account);
});

app.post('/api/auth/login', async (req, res) => {
  const account = await authenticateAccount(req.body?.email, req.body?.password);
  const token = await createSession(account.user.id);
  setSessionCookie(res, token);
  res.json(account);
});

app.post('/api/auth/logout', async (req, res) => {
  await deleteSession(readCookie(req, sessionCookie));
  clearSessionCookie(res);
  res.status(204).end();
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json(req.account);
});

app.put('/api/parish/branding', requireAuth, async (req, res) => {
  const branding = await updateParishBranding(
    req.account.parish.id,
    req.body?.kind,
    req.body?.dataUrl,
  );
  res.json(branding);
});

app.use('/api/games', requireAuth);

app.get('/api/games/current', async (req, res) => {
  res.json(await getCurrentGame(req.account.parish.id));
});

app.get('/api/games', async (req, res) => {
  res.json(await listGames(req.account.parish.id));
});

app.get('/api/games/:id', async (req, res) => {
  const game = await getGame(req.account.parish.id, Number(req.params.id));
  if (!game) return res.status(404).json({ error: 'Jogo não encontrado.' });
  res.json(game);
});

app.post('/api/games', async (req, res) => {
  res.status(201).json(await createGame(req.account.parish.id));
});

app.post('/api/games/:id/calls', async (req, res) => {
  const result = await addCall(req.account.parish.id, Number(req.params.id), Number(req.body.number));
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.status(201).json(result.call);
});

app.delete('/api/games/:id/calls/last', async (req, res) => {
  const result = await undoLastCall(req.account.parish.id, Number(req.params.id));
  if (result.error) return res.status(result.status).json({ error: result.error });
  res.json(result.call);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const missingDatabase = error.message?.includes('DATABASE_URL');
  res.status(error.status ?? 500).json({
    error: missingDatabase
      ? 'Banco de dados não configurado. Defina DATABASE_URL.'
      : error.status
        ? error.message
        : 'Não foi possível concluir a operação.',
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Bingo API disponível em http://localhost:${port}`);
  });
}

export default app;
