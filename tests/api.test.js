import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defaultClientConfig, prismaPostgres } from '@prisma/ppg';
import request from 'supertest';

const databaseUrl = process.env.TEST_DATABASE_URL;

test('persiste jogos e chamadas, impede duplicidade e desfaz a última', {
  skip: databaseUrl ? false : 'Defina TEST_DATABASE_URL para executar o teste de integração.',
}, async () => {
  process.env.DATABASE_URL = databaseUrl;
  process.env.VERCEL = '1';

  const database = prismaPostgres(defaultClientConfig(databaseUrl));
  const { default: app } = await import('../server.js');

  await database.sql.exec`DROP TABLE IF EXISTS calls`;
  await database.sql.exec`DROP TABLE IF EXISTS games`;

  try {
    const currentResponse = await request(app).get('/api/games/current').expect(200);
    const firstGame = currentResponse.body;

    const firstCall = await request(app)
      .post(`/api/games/${firstGame.id}/calls`)
      .send({ number: 52 })
      .expect(201);

    assert.equal(firstCall.body.number, 52);
    assert.equal(firstCall.body.sequence, 1);

    await request(app)
      .post(`/api/games/${firstGame.id}/calls`)
      .send({ number: 52 })
      .expect(409);

    await request(app)
      .post(`/api/games/${firstGame.id}/calls`)
      .send({ number: 7 })
      .expect(201);

    const undone = await request(app)
      .delete(`/api/games/${firstGame.id}/calls/last`)
      .expect(200);

    assert.equal(undone.body.number, 7);

    const newGame = await request(app).post('/api/games').expect(201);
    assert.notEqual(newGame.body.id, firstGame.id);

    const games = await request(app).get('/api/games').expect(200);
    assert.equal(games.body.length, 2);
    assert.equal(games.body[0].status, 'active');
    assert.equal(games.body[1].status, 'finished');
    assert.equal(games.body[1].call_count, 1);

    const archived = await request(app).get(`/api/games/${firstGame.id}`).expect(200);
    assert.deepEqual(archived.body.calls.map((call) => call.number), [52]);
  } finally {
    await database.sql.exec`DROP TABLE IF EXISTS calls`;
    await database.sql.exec`DROP TABLE IF EXISTS games`;
  }
});
