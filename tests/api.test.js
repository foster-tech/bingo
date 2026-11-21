import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultClientConfig, prismaPostgres } from '@prisma/ppg';
import request from 'supertest';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('separa contas, jogos e histórico por paróquia', {
  skip: databaseUrl ? false : 'Defina TEST_DATABASE_URL para executar o teste de integração.',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.VERCEL = '1';

  const database = prismaPostgres(defaultClientConfig(databaseUrl));
  await database.sql.exec`DROP TABLE IF EXISTS sessions CASCADE`;
  await database.sql.exec`DROP TABLE IF EXISTS memberships CASCADE`;
  await database.sql.exec`DROP TABLE IF EXISTS calls CASCADE`;
  await database.sql.exec`DROP TABLE IF EXISTS games CASCADE`;
  await database.sql.exec`DROP TABLE IF EXISTS users CASCADE`;
  await database.sql.exec`DROP TABLE IF EXISTS parishes CASCADE`;

  const { default: app } = await import('../server.js');
  const parishA = request.agent(app);
  const parishB = request.agent(app);

  try {
    const accountA = await parishA
      .post('/api/auth/register')
      .send({
        parishName: 'Paróquia São José',
        name: 'Ana',
        email: 'ana@example.com',
        password: 'senha-segura-a',
      })
      .expect(201);

    assert.equal(accountA.body.parish.name, 'Paróquia São José');
    assert.equal(accountA.body.parish.logoData, null);

    const branding = await parishA
      .put('/api/parish/branding')
      .send({ kind: 'logo', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' })
      .expect(200);
    assert.equal(branding.body.logoData, 'data:image/png;base64,iVBORw0KGgo=');

    const refreshedAccountA = await parishA.get('/api/auth/me').expect(200);
    assert.equal(refreshedAccountA.body.parish.logoData, branding.body.logoData);

    const firstGame = (await parishA.get('/api/games/current').expect(200)).body;
    await parishA.post(`/api/games/${firstGame.id}/calls`).send({ number: 52 }).expect(201);
    await parishA.post(`/api/games/${firstGame.id}/calls`).send({ number: 52 }).expect(409);

    const accountB = await parishB
      .post('/api/auth/register')
      .send({
        parishName: 'Paróquia Santa Rita',
        name: 'Bruno',
        email: 'bruno@example.com',
        password: 'senha-segura-b',
      })
      .expect(201);

    assert.notEqual(accountB.body.parish.id, accountA.body.parish.id);
    assert.equal(accountB.body.parish.logoData, null);

    const secondGame = (await parishB.get('/api/games/current').expect(200)).body;
    assert.notEqual(secondGame.id, firstGame.id);
    assert.deepEqual(secondGame.calls, []);

    await parishB.get(`/api/games/${firstGame.id}`).expect(404);
    await parishB.post(`/api/games/${firstGame.id}/calls`).send({ number: 7 }).expect(404);

    const gamesA = (await parishA.get('/api/games').expect(200)).body;
    const gamesB = (await parishB.get('/api/games').expect(200)).body;
    assert.equal(gamesA.length, 1);
    assert.equal(gamesA[0].call_count, 1);
    assert.equal(gamesB.length, 1);
    assert.equal(gamesB[0].call_count, 0);

    await parishA.post('/api/auth/logout').expect(204);
    await parishA.get('/api/games/current').expect(401);

    await parishA
      .post('/api/auth/login')
      .send({ email: 'ana@example.com', password: 'senha-segura-a' })
      .expect(200);

    const restored = (await parishA.get('/api/games/current').expect(200)).body;
    assert.deepEqual(restored.calls.map((call) => call.number), [52]);
  } finally {
    await database.sql.exec`DROP TABLE IF EXISTS sessions CASCADE`;
    await database.sql.exec`DROP TABLE IF EXISTS memberships CASCADE`;
    await database.sql.exec`DROP TABLE IF EXISTS calls CASCADE`;
    await database.sql.exec`DROP TABLE IF EXISTS games CASCADE`;
    await database.sql.exec`DROP TABLE IF EXISTS users CASCADE`;
    await database.sql.exec`DROP TABLE IF EXISTS parishes CASCADE`;
  }
});
