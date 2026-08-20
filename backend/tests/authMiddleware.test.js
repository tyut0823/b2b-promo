const { test } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const auth = require('../src/middlewares/auth');
const requireRole = require('../src/middlewares/requireRole');
const errorHandler = require('../src/middlewares/errorHandler');

const testApp = express();
testApp.get('/__protected', auth, (req, res) => res.status(200).json({ user: req.user }));
testApp.get('/__admin-only', auth, requireRole('ADMIN'), (req, res) => res.status(200).json({ ok: true }));
testApp.use(errorHandler);

function issueToken(payload, options) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: '1h', ...options });
}

test('Authorization 헤더가 없으면 401을 반환한다', async () => {
  const res = await request(testApp).get('/__protected');
  assert.strictEqual(res.status, 401);
});

test('Authorization 헤더가 Bearer 형식이 아니면 401을 반환한다', async () => {
  const resBasic = await request(testApp).get('/__protected').set('Authorization', 'Basic abc');
  assert.strictEqual(resBasic.status, 401);

  const token = issueToken({ sub: 'user-1', role: 'BUYER' });
  const resNoPrefix = await request(testApp).get('/__protected').set('Authorization', token);
  assert.strictEqual(resNoPrefix.status, 401);
});

test('유효한 BUYER 토큰이면 200과 함께 payload가 반영된 req.user를 반환한다', async () => {
  const token = issueToken({ sub: 'user-1', role: 'BUYER' });
  const res = await request(testApp).get('/__protected').set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.user.id, 'user-1');
  assert.strictEqual(res.body.user.role, 'BUYER');
});

test('만료된 토큰이면 401을 반환한다', async () => {
  const token = issueToken({ sub: 'user-1', role: 'BUYER' }, { expiresIn: '-1s' });
  const res = await request(testApp).get('/__protected').set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 401);
});

test('위조된 토큰이면 401을 반환한다', async () => {
  const tokenWithWrongSecret = jwt.sign({ sub: 'user-1', role: 'BUYER' }, 'wrong-secret', { expiresIn: '1h' });
  const resWrongSecret = await request(testApp).get('/__protected').set('Authorization', `Bearer ${tokenWithWrongSecret}`);
  assert.strictEqual(resWrongSecret.status, 401);

  const resGarbage = await request(testApp).get('/__protected').set('Authorization', 'Bearer not-a-jwt');
  assert.strictEqual(resGarbage.status, 401);
});

test('BUYER 역할 토큰으로 관리자 전용 라우트에 접근하면 403을 반환한다', async () => {
  const token = issueToken({ sub: 'user-1', role: 'BUYER' });
  const res = await request(testApp).get('/__admin-only').set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 403);
});

test('ADMIN 역할 토큰으로 관리자 전용 라우트에 접근하면 200을 반환한다', async () => {
  const token = issueToken({ sub: 'admin-1', role: 'ADMIN' });
  const res = await request(testApp).get('/__admin-only').set('Authorization', `Bearer ${token}`);

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { ok: true });
});

test('유효하지 않은 토큰으로 관리자 전용 라우트에 접근하면 403이 아닌 401을 반환한다', async () => {
  const res = await request(testApp).get('/__admin-only').set('Authorization', 'Bearer not-a-jwt');

  assert.strictEqual(res.status, 401);
});
