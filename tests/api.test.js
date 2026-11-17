import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

const databasePath = path.resolve('data/bingo-test.db');

for (const suffix of ['', '-shm', '-wal']) {
  fs.rmSync(`${databasePath}${suffix}`, { force: true });
}

process.env.BINGO_DB_PATH = databasePath;

let app;
let db;

before(async () => {
  ({ app, db } = await import('../server.js'));
});

after(() => {
  db.close();
  for (const suffix of ['', '-shm', '-wal']) {
    fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
});

test('persiste jogos e chamadas, impede duplicidade e desfaz a última', async () => {
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
});
